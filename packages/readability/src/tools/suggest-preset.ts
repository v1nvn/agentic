import { z } from 'zod';

import type { GatingSignal } from '../policy/gating.js';
import type { PresetScope } from '../policy/presets.js';
import type { SelectorViolation } from '../policy/selector-lint.js';
import type { ToolHandle } from '../server.js';
import type { StructuredContent } from './output-schema.js';

import { describeError, toErrorResult } from '../errors.js';
import { sampleJson, SuggestParseError } from '../host-sampling.js';
import { logger } from '../logger.js';
import { buildDocument } from '../pipeline/dom.js';
import { normalizeDocument, resolveLazyImages } from '../pipeline/normalize.js';
import { assessLostSignal } from '../policy/lost-signal.js';
import { buildChainOutline } from '../policy/outline-chains.js';
import {
  addPreset,
  normalizeSiteKey,
  presetForSite,
  removePreset,
} from '../policy/presets.js';
import { lintProposal } from '../policy/selector-lint.js';
import { savePreset } from '../preset-cache.js';
import { extractArticleFromHtml } from './extract.js';
import { readHtmlFile } from './html-source.js';
import { localPathField } from './schemas.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const SUGGEST_SYSTEM_PROMPT = `You propose site-level CSS presets for a web-article extractor. The extractor removes every "exclude" match document-wide, then keeps the FIRST match of "include" in document order as the entire page body (the search runs inside <body>). An exclude matching an ancestor of the include root destroys it.

Rules:
- "include": exactly ONE selector that matches an element inside <body> on THIS page. A non-matching selector silently does nothing.
- "exclude": selectors naming debris containers (video players, carousels, caption figures, comment blocks, promo modules).
- "detectors": 1-3 selectors naming stable site-template containers that also match on other pages of the same site. Their loss is what retires the preset, so they must be structural, not per-page.
- Forbidden — statically rejected and fed back to you: :nth-child and every positional pseudo (:first-child, :last-of-type, :only-child, ...), :contains, and generated hash class names (css-1a2b3c, content_1tsiE, BoxStyles_x__Wo6Z4).
- Prefer itemprop, role, data-testid, ids, and stable class-name stems; quote attribute values exactly as rendered in the material.
- The material shows every text-bearing node as a CSS chain with text sizes. It deliberately carries no article prose.
Return strict JSON only — no prose, no code fences.`;

const suggestPresetInputShape = {
  localPath: localPathField,
  baseUrl: z
    .url()
    .describe(
      'A URL of the site the page belongs to — its host names the preset. Required: without a host there is no site key to store a preset under, and presets only resolve for pages whose site matches.',
    ),
  secondPath: localPathField
    .optional()
    .describe(
      'A second capture of the SAME site. The converged preset must verify on it too — detectors match, extraction clean — before anything is persisted; without it the preset is verified on the proposal page alone.',
    ),
  maxSamplingCalls: z
    .number()
    .int()
    .min(1)
    .max(8)
    .describe(
      'Upper bound on host-model sampling calls for this run. Round one (include + detectors) and round two (excludes) each consume a call, rejected proposals consume retries. A budget of 1 skips round two.',
    )
    .default(4),
} as const;

const suggestPresetInputSchema = z.object(suggestPresetInputShape);

const proposalSchema = z.object({
  detectors: z.array(z.string().min(1)).min(1).max(6),
  scope: z.object({
    include: z.string().min(1),
    exclude: z.array(z.string().min(1)).max(12).optional(),
  }),
});

const excludeProposalSchema = z.object({
  exclude: z.array(z.string().min(1)).max(12),
});

const MAX_SAMPLING_TOKENS = 8192;

export const SUGGEST_PRESET_TOOL_DESCRIPTION = `Ask the HOST's model to propose a site preset (detectors + selectors) for a page whose extraction was lost, then verify it: proposals are validated deterministically, applied through the real pipeline, and a converged preset is stored in memory and persisted to the local preset cache so later extractions of the same site apply it automatically. Runs a bounded two-round loop over MCP \`sampling/createMessage\` — the server embeds no model. The tool is only listed when the connected client advertises the sampling capability, and it refuses to run when the baseline extraction looks healthy: call it after \`extract\` reports gated content, a fallback extraction, a near-empty result, or visible debris such as video-player controls.`;

const triggerShape = {
  fired: z.boolean().describe('Whether the suggest loop ran at all.'),
  reasons: z
    .array(z.string())
    .describe(
      'Why the loop ran (the lost signals observed on the baseline extraction), or why it refused.',
    ),
  wordCount: z
    .number()
    .describe(
      'Word count of the baseline extraction; 0 when the loop never ran.',
    ),
  debrisProbes: z
    .array(z.string())
    .describe('Debris signatures matched in the baseline extraction text.'),
  gatedReason: z
    .string()
    .optional()
    .describe('The gating signal reported by the baseline extraction, if any.'),
} as const;

const suggestPresetOutputShape = {
  schemaVersion: z.literal(1).describe('Structured-content schema version.'),
  content: z.string().describe('Human-readable report of the run.'),
  trigger: z.object(triggerShape).describe('Baseline lost-signal verdict.'),
  preset: z
    .object({
      site: z.string().describe('The host the preset is keyed by.'),
      detectors: z
        .array(z.string())
        .describe('Template fingerprints that must keep matching.'),
      scope: z
        .object({
          include: z.string().optional(),
          exclude: z.array(z.string()).optional(),
        })
        .describe('The accepted selector scope.'),
    })
    .optional()
    .describe(
      'The preset that converged, present only when one was accepted and verified.',
    ),
  verification: z
    .object({
      applied: z
        .boolean()
        .describe(
          'Whether the stored preset resolved and applied during the verification extraction.',
        ),
      converged: z
        .boolean()
        .describe('Whether the verification extraction came back clean.'),
      verifiedPages: z
        .number()
        .int()
        .min(1)
        .max(2)
        .describe(
          'Pages the preset verified on: 2 only when secondPath was given and the preset verified on that capture too.',
        ),
      wordCountBefore: z.number().describe('Baseline extraction word count.'),
      wordCountAfter: z
        .number()
        .describe('Verification extraction word count.'),
    })
    .optional()
    .describe('Result of extracting with the preset actually stored.'),
  secondVerification: z
    .object({
      applied: z
        .boolean()
        .describe(
          'Whether the preset resolved and applied on the second capture.',
        ),
      converged: z
        .boolean()
        .describe('Whether the second-capture extraction came back clean.'),
      wordCountAfter: z
        .number()
        .describe('Second-capture extraction word count.'),
    })
    .optional()
    .describe(
      'Verification on the secondPath capture; absent when secondPath was not given or the capture belongs to another site.',
    ),
  persistence: z
    .object({
      persisted: z
        .boolean()
        .describe(
          'Whether the preset file was written to the local preset cache directory.',
        ),
      path: z.string().optional().describe('The file written, when persisted.'),
      reason: z
        .string()
        .optional()
        .describe('Why nothing was persisted, when it was not.'),
    })
    .optional()
    .describe(
      'Outcome of the disk write; absent when the run never accepted a preset.',
    ),
  sampling: z
    .object({
      calls: z.number().int().describe('Sampling calls actually made.'),
      budget: z.number().int().describe('The budget this run was given.'),
      budgetExhausted: z
        .boolean()
        .describe('Whether the budget ran out before the loop could converge.'),
    })
    .describe('Sampling accounting for this run.'),
} as const;

export function registerSuggestPresetTool(server: McpServer): ToolHandle {
  return server.registerTool(
    'suggest_preset',
    {
      title: 'Suggest a site preset using the host model',
      description: SUGGEST_PRESET_TOOL_DESCRIPTION,
      inputSchema: suggestPresetInputShape,
      outputSchema: suggestPresetOutputShape,
    },
    async (rawArgs: unknown): Promise<CallToolResult> => {
      const args = suggestPresetInputSchema.parse(rawArgs);
      try {
        return await runSuggestLoop(args, server);
      } catch (err) {
        logger.error(`suggest_preset failed: ${describeError(err)}`);
        return toErrorResult(err);
      }
    },
  );
}

interface Trigger {
  debrisProbes: readonly string[];
  fired: boolean;
  gatedReason?: string;
  reasons: readonly string[];
  wordCount: number;
}

interface AcceptedPreset {
  detectors: readonly string[];
  scope: PresetScope;
  site: string;
}

interface Verification {
  applied: boolean;
  converged: boolean;
  verifiedPages: 1 | 2;
  wordCountAfter: number;
  wordCountBefore: number;
}

interface SecondVerification {
  applied: boolean;
  converged: boolean;
  wordCountAfter: number;
}

interface LoopState {
  budget: number;
  calls: number;
  // A sampling attempt was blocked by the budget — distinct from a run that
  // simply never needed the remaining calls.
  exhausted: boolean;
  persistence?: { path?: string; persisted: boolean; reason?: string };
}

export async function runSuggestLoop(
  args: {
    baseUrl: string;
    localPath: string;
    maxSamplingCalls: number;
    secondPath?: string;
  },
  server: McpServer,
): Promise<CallToolResult> {
  const site = normalizeSiteKey(args.baseUrl);
  if (!site) {
    throw new Error(`baseUrl does not name a site: ${args.baseUrl}`);
  }
  const html = readHtmlFile(args.localPath);
  const secondHtml = args.secondPath
    ? readHtmlFile(args.secondPath)
    : undefined;
  const state: LoopState = {
    budget: args.maxSamplingCalls,
    calls: 0,
    exhausted: false,
  };

  if (presetForSite(site)) {
    return report(state, {
      trigger: {
        debrisProbes: [],
        fired: false,
        reasons: ['preset-exists'],
        wordCount: 0,
      },
    });
  }

  const baseline = extractText(html, args.baseUrl);
  const canonicalSite = normalizeSiteKey(baseline.metadata.canonical);
  if (canonicalSite && canonicalSite !== site) {
    throw new Error(
      `baseUrl names ${site} but the page's canonical URL names ${canonicalSite} — the capture does not belong to the site the preset would be keyed by.`,
    );
  }
  const baselineEvidence = assessLostSignal({
    contentText: baseline.content,
    fallbackUsed: baseline.diagnostics.fallbackUsed ?? false,
    gated: baseline.diagnostics.gated,
  });
  const trigger: Trigger = {
    debrisProbes: baselineEvidence.debrisProbes,
    fired: baselineEvidence.reasons.length > 0,
    gatedReason: baselineEvidence.gatedReason,
    reasons: baselineEvidence.reasons,
    wordCount: baselineEvidence.wordCount,
  };
  if (!trigger.fired) {
    return report(state, { trigger });
  }

  const core = await proposeCore(
    html,
    args.baseUrl,
    site,
    baseline,
    trigger,
    state,
    server,
  );
  if (!core) {
    return report(state, { trigger });
  }

  const excludes = await proposeExcludes(
    html,
    args.baseUrl,
    core,
    state,
    server,
  );
  const preset: AcceptedPreset = {
    detectors: core.detectors,
    site,
    scope: {
      exclude: excludes.length > 0 ? excludes : undefined,
      include: core.scope.include,
    },
  };

  addPreset({
    detectors: preset.detectors,
    scope: preset.scope,
    site: preset.site,
  });
  const verification = extractText(html, args.baseUrl);
  const verificationEvidence = assessLostSignal({
    contentText: verification.content,
    fallbackUsed: verification.diagnostics.fallbackUsed ?? false,
    gated: verification.diagnostics.gated,
  });
  const applied = verification.presetSignal?.applied === true;
  const converged = applied && verificationEvidence.reasons.length === 0;
  const verdict: Verification = {
    applied,
    converged,
    verifiedPages: 1,
    wordCountAfter: verificationEvidence.wordCount,
    wordCountBefore: trigger.wordCount,
  };

  if (!converged) {
    removePreset(preset.site);
    state.persistence = { persisted: false, reason: 'not-converged' };
    return report(state, { preset, trigger, verification: verdict });
  }

  let secondVerification: SecondVerification | undefined;
  if (secondHtml) {
    const second = extractText(secondHtml, args.baseUrl);
    const secondCanonicalSite = normalizeSiteKey(second.metadata.canonical);
    if (secondCanonicalSite && secondCanonicalSite !== site) {
      removePreset(preset.site);
      state.persistence = {
        persisted: false,
        reason: 'second-page-canonical-mismatch',
      };
      return report(state, { preset, trigger, verification: verdict });
    }
    const secondEvidence = assessLostSignal({
      contentText: second.content,
      fallbackUsed: second.diagnostics.fallbackUsed ?? false,
      gated: second.diagnostics.gated,
    });
    const secondApplied = second.presetSignal?.applied === true;
    const secondConverged =
      secondApplied && secondEvidence.reasons.length === 0;
    secondVerification = {
      applied: secondApplied,
      converged: secondConverged,
      wordCountAfter: secondEvidence.wordCount,
    };
    if (!secondConverged) {
      removePreset(preset.site);
      state.persistence = {
        persisted: false,
        reason: 'second-page-not-converged',
      };
      return report(state, {
        preset,
        secondVerification,
        trigger,
        verification: verdict,
      });
    }
    verdict.verifiedPages = 2;
  }

  state.persistence = savePreset(preset);
  return report(state, {
    preset,
    secondVerification,
    trigger,
    verification: verdict,
  });
}

function report(
  state: LoopState,
  parts: {
    preset?: AcceptedPreset;
    secondVerification?: SecondVerification;
    trigger: Trigger;
    verification?: Verification;
  },
): CallToolResult {
  const lines: string[] = [];
  if (!parts.trigger.fired) {
    lines.push(
      parts.trigger.reasons.length > 0
        ? `No suggest loop run: ${parts.trigger.reasons.join(', ')}.`
        : `No suggest loop run: the baseline extraction looks healthy (${parts.trigger.wordCount} words, no lost signal).`,
    );
  } else {
    lines.push(
      `Lost signals on the baseline extraction (${parts.trigger.wordCount} words): ${parts.trigger.reasons.join(', ')}.`,
    );
  }
  if (state.calls > 0) {
    lines.push(
      `Sampling: ${state.calls}/${state.budget} call(s)${state.exhausted ? ' — budget exhausted' : ''}.`,
    );
  }
  if (parts.verification) {
    lines.push(
      `Verification with the preset stored: applied=${parts.verification.applied}, converged=${parts.verification.converged}, ${parts.verification.wordCountAfter} words, pages verified: ${parts.verification.verifiedPages}.`,
    );
  }
  if (parts.secondVerification) {
    lines.push(
      `Second-page verification: applied=${parts.secondVerification.applied}, converged=${parts.secondVerification.converged}, ${parts.secondVerification.wordCountAfter} words.`,
    );
  }
  if (parts.preset) {
    lines.push(
      `Accepted preset for ${parts.preset.site}: include=${parts.preset.scope.include ?? '(none)'}, exclude=${(parts.preset.scope.exclude ?? []).join(', ') || '(none)'}, detectors=${parts.preset.detectors.join(', ')}.`,
    );
  }
  if (state.persistence) {
    lines.push(
      state.persistence.persisted
        ? `Persisted to ${state.persistence.path}.`
        : `Not persisted: ${state.persistence.reason}.`,
    );
  }

  return {
    content: [{ text: lines.join('\n'), type: 'text' }],
    structuredContent: {
      content: lines.join('\n'),
      persistence: state.persistence,
      preset: parts.preset,
      sampling: {
        budget: state.budget,
        budgetExhausted: state.exhausted,
        calls: state.calls,
      },
      schemaVersion: 1 as const,
      secondVerification: parts.secondVerification,
      trigger: parts.trigger,
      verification: parts.verification,
    },
  };
}

interface CoreProposal {
  detectors: readonly string[];
  scope: PresetScope & { include: string };
}

function coreProposalUserText(
  site: string,
  title: string,
  evidence: {
    debrisProbes: readonly string[];
    gatedReason?: string;
    wordCount: number;
  },
  outline: { text: string; truncated: boolean },
  rejection: string | undefined,
): string {
  return [
    `SITE: ${site}`,
    `PAGE: ${title || '(untitled)'}`,
    `BASELINE: ${evidence.wordCount} words; debris probes: ${evidence.debrisProbes.join(', ') || 'none'}; gating: ${evidence.gatedReason ?? 'none'}. The extraction lost to page junk — propose a preset.`,
    '',
    'MATERIAL — ancestor chains of every node holding at least 200 chars of its own text, hop format tag#id.classes[attr="value"] (own:X, all:Y):',
    outline.text,
    ...(outline.truncated
      ? [
          '(material truncated at the budget — the largest own-text chains come first)',
        ]
      : []),
    ...(rejection
      ? [
          '',
          'YOUR PREVIOUS PROPOSAL WAS REJECTED:',
          rejection,
          'Return corrected strict JSON.',
        ]
      : ['']),
    'Return JSON: {"detectors": ["..."], "scope": {"include": "...", "exclude": ["..."]}}',
  ].join('\n');
}

async function proposeCore(
  html: string,
  baseUrl: string,
  site: string,
  baseline: { metadata: { title?: string } },
  evidence: Trigger,
  state: LoopState,
  server: McpServer,
): Promise<CoreProposal | undefined> {
  const outline = buildChainOutline({
    baseUrl,
    cleanChrome: true,
    html,
    mode: 'page',
  });
  let rejection: string | undefined;
  while (state.calls < state.budget) {
    state.calls += 1;
    let reply: unknown;
    try {
      reply = await sampleJson(server, {
        maxTokens: MAX_SAMPLING_TOKENS,
        systemPrompt: SUGGEST_SYSTEM_PROMPT,
        userText: coreProposalUserText(
          site,
          baseline.metadata.title ?? '',
          evidence,
          outline,
          rejection,
        ),
      });
    } catch (err) {
      if (err instanceof SuggestParseError) {
        rejection = err.message;
        continue;
      }
      throw err;
    }
    const parsed = proposalSchema.safeParse(reply);
    if (!parsed.success) {
      rejection = `the reply must parse as {"detectors": [...], "scope": {"include": "...", "exclude": [...]}} — ${parsed.error.issues[0]?.message}`;
      continue;
    }
    const violations = lintProposal({
      detectors: parsed.data.detectors,
      document: normalizedDocument(html, baseUrl),
      scope: parsed.data.scope,
    });
    if (violations.length > 0) {
      rejection = renderViolations(violations);
      continue;
    }
    return {
      detectors: parsed.data.detectors,
      scope: {
        exclude: parsed.data.scope.exclude,
        include: parsed.data.scope.include,
      },
    };
  }
  state.exhausted = true;
  return undefined;
}

async function proposeExcludes(
  html: string,
  baseUrl: string,
  core: CoreProposal,
  state: LoopState,
  server: McpServer,
): Promise<readonly string[]> {
  if (state.calls >= state.budget) {
    // Documented skip: the round-one scope stands, nothing was blocked.
    return core.scope.exclude ?? [];
  }
  const outline = buildChainOutline({
    baseUrl,
    cleanChrome: true,
    html,
    mode: { scope: { include: core.scope.include } },
  });
  let rejection: string | undefined;
  while (state.calls < state.budget) {
    state.calls += 1;
    let reply: unknown;
    try {
      reply = await sampleJson(server, {
        maxTokens: MAX_SAMPLING_TOKENS,
        systemPrompt: SUGGEST_SYSTEM_PROMPT,
        userText: [
          `ACCEPTED SO FAR: {"detectors": ${JSON.stringify(core.detectors)}, "scope": {"include": ${JSON.stringify(core.scope.include)}}}`,
          '',
          'MATERIAL — text blocks remaining inside the included subtree after the include was applied, grouped by chain, smallest own text first, each with a text sample:',
          outline.text,
          ...(rejection
            ? [
                '',
                'YOUR PREVIOUS PROPOSAL WAS REJECTED:',
                rejection,
                'Return corrected strict JSON.',
              ]
            : ['']),
          'Propose excludes for the debris groups (video players, carousels, caption figures, comment blocks, promos) — never for prose paragraphs. Return [] if none. Return JSON: {"exclude": ["..."]}',
        ].join('\n'),
      });
    } catch (err) {
      if (err instanceof SuggestParseError) {
        rejection = err.message;
        continue;
      }
      throw err;
    }
    const parsed = excludeProposalSchema.safeParse(reply);
    if (!parsed.success) {
      rejection = `the reply must parse as {"exclude": ["..."]} — ${parsed.error.issues[0]?.message}`;
      continue;
    }
    const violations = lintProposal({
      detectors: core.detectors,
      document: normalizedDocument(html, baseUrl),
      scope: { exclude: parsed.data.exclude, include: core.scope.include },
    });
    if (violations.length > 0) {
      rejection = renderViolations(violations);
      continue;
    }
    const merged = [...(core.scope.exclude ?? [])];
    for (const selector of parsed.data.exclude) {
      if (!merged.includes(selector)) {
        merged.push(selector);
      }
    }
    return merged;
  }
  state.exhausted = true;
  return core.scope.exclude ?? [];
}

function renderViolations(violations: readonly SelectorViolation[]): string {
  return violations
    .map(
      violation =>
        `- ${violation.kind}: ${violation.selector} — ${violation.detail}`,
    )
    .join('\n');
}

// The tree proposals are validated against is normalized exactly as the
// extract pipeline normalizes it — preset validation at extraction time runs
// on the same tree, so a lint pass here is a faithful rehearsal.
function normalizedDocument(html: string, baseUrl: string): Document {
  const { document } = buildDocument(html, baseUrl);
  normalizeDocument(document, { cleanChrome: true });
  resolveLazyImages(document);
  return document;
}

function extractText(
  html: string,
  baseUrl: string,
): {
  content: string;
  diagnostics: {
    fallbackUsed?: boolean;
    gated?: GatingSignal;
  };
  metadata: { canonical?: string; title?: string };
  presetSignal?: { applied: boolean };
} {
  const result = extractArticleFromHtml({
    baseUrl,
    cache: false,
    format: 'text',
    html,
  });
  if (result.isError || !result.structuredContent) {
    throw new Error('extraction failed inside the suggest loop');
  }
  const structured = result.structuredContent as StructuredContent;
  return {
    content: structured.content,
    diagnostics: {
      fallbackUsed: structured.diagnostics.fallbackUsed,
      gated: structured.diagnostics.gated,
    },
    metadata: structured.metadata,
    presetSignal: structured.diagnostics.preset,
  };
}
