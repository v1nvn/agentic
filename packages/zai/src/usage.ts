/**
 * Usage query. Determines whether to call the Z.ai or ZHIPU endpoint based on
 * ANTHROPIC_BASE_URL and authenticates with ANTHROPIC_AUTH_TOKEN. Fetches model
 * usage, tool usage, and quota limits, then renders the plain-text report.
 */

import type { ZaiModelUsage, ZaiQuota, ZaiToolUsage } from './format.js';

import { render } from './format.js';

interface RawLimit {
  currentValue?: number;
  nextResetTime?: string;
  percentage?: number;
  type?: string;
  usage?: number;
  usageDetails?: { modelCode?: string; usage?: number }[];
}

interface RawQuota {
  level?: string;
  limits?: RawLimit[];
}

function requireEnv(): { authToken: string; baseUrl: string } {
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? '';
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN ?? '';

  if (!authToken) {
    throw new Error(
      [
        'Error: ANTHROPIC_AUTH_TOKEN is not set',
        '',
        'Set the environment variable and retry:',
        '  export ANTHROPIC_AUTH_TOKEN="your-token-here"',
      ].join('\n'),
    );
  }
  if (!baseUrl) {
    throw new Error(
      [
        'Error: ANTHROPIC_BASE_URL is not set',
        '',
        'Set the environment variable and retry:',
        '  export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"',
        '  or',
        '  export ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"',
      ].join('\n'),
    );
  }
  return { baseUrl, authToken };
}

// The monitor API labels every bucket in Beijing time; the query window runs
// from yesterday at the current hour to the end of today's current hour.
function queryParams(now = new Date()): string {
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    now.getHours(),
    0,
    0,
    0,
  );
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    59,
    59,
    999,
  );
  function formatDateTime(date: Date): string {
    function p(n: number): string {
      return String(n).padStart(2, '0');
    }
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
  }
  return `?startTime=${encodeURIComponent(formatDateTime(startDate))}&endTime=${encodeURIComponent(formatDateTime(endDate))}`;
}

// Rename the API's limit kinds to their display names; `totol` is the field the
// renderer reads (sic — the upstream spelling).
function processQuotaLimit(data: RawQuota): ZaiQuota {
  if (!data.limits) {
    return data;
  }
  data.limits = data.limits.map(item => {
    if (item.type === 'TOKENS_LIMIT') {
      return {
        type: 'Token usage(5 Hour)',
        percentage: item.percentage,
        nextResetTime: item.nextResetTime,
      };
    }
    if (item.type === 'TIME_LIMIT') {
      return {
        type: 'MCP usage(1 Month)',
        percentage: item.percentage,
        currentUsage: item.currentValue,
        totol: item.usage,
        usageDetails: item.usageDetails,
        nextResetTime: item.nextResetTime,
      };
    }
    return item;
  });
  return data;
}

async function fetchJson(
  apiUrl: string,
  label: string,
  authToken: string,
  query = '',
): Promise<unknown> {
  const res = await fetch(apiUrl + query, {
    headers: {
      Authorization: authToken,
      'Accept-Language': 'en-US,en',
      'Content-Type': 'application/json',
    },
  });
  const body = await res.text();
  if (res.status !== 200) {
    throw new Error(`[${label}] HTTP ${res.status}\n${body}`);
  }
  try {
    const json = JSON.parse(body) as { data?: unknown };
    return json.data ?? json;
  } catch (e) {
    throw new Error(
      `[${label}] could not parse response: ${(e as Error).message}`,
      { cause: e },
    );
  }
}

export async function fetchReport(): Promise<string> {
  const { baseUrl, authToken } = requireEnv();

  const parsedBaseUrl = new URL(baseUrl);
  const baseDomain = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;
  let platform: string;
  let modelUsageUrl: string;
  let toolUsageUrl: string;
  let quotaLimitUrl: string;

  if (baseUrl.includes('api.z.ai')) {
    platform = 'ZAI';
    modelUsageUrl = `${baseDomain}/api/monitor/usage/model-usage`;
    toolUsageUrl = `${baseDomain}/api/monitor/usage/tool-usage`;
    quotaLimitUrl = `${baseDomain}/api/monitor/usage/quota/limit`;
  } else if (
    baseUrl.includes('open.bigmodel.cn') ||
    baseUrl.includes('dev.bigmodel.cn')
  ) {
    platform = 'ZHIPU';
    modelUsageUrl = `${baseDomain}/api/monitor/usage/model-usage`;
    toolUsageUrl = `${baseDomain}/api/monitor/usage/tool-usage`;
    quotaLimitUrl = `${baseDomain}/api/monitor/usage/quota/limit`;
  } else {
    throw new Error(
      [
        `Error: Unrecognized ANTHROPIC_BASE_URL: ${baseUrl}`,
        '',
        'Supported values:',
        '  - https://api.z.ai/api/anthropic',
        '  - https://open.bigmodel.cn/api/anthropic',
      ].join('\n'),
    );
  }

  const query = queryParams();
  try {
    const [model, tool, quotaRaw] = await Promise.all([
      fetchJson(modelUsageUrl, 'Model usage', authToken, query),
      fetchJson(toolUsageUrl, 'Tool usage', authToken, query),
      fetchJson(quotaLimitUrl, 'Quota limit', authToken),
    ]);
    return render({
      platform,
      model: model as ZaiModelUsage,
      tool: tool as ZaiToolUsage,
      quota: processQuotaLimit(quotaRaw as RawQuota),
    });
  } catch (e) {
    throw new Error(`Request failed: ${(e as Error).message}`, { cause: e });
  }
}
