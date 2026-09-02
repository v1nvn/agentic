/**
 * Usage query. Fetches model usage, tool usage, and quota limits from the GLM
 * Coding Plan monitor API of the resolved base URL (paths are fixed) and
 * renders the plain-text report.
 */

import type { ZaiModelUsage, ZaiQuota, ZaiToolUsage } from './format.js';
import type { ResolvedConfig } from './resolve.js';

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

export async function fetchReport(config: ResolvedConfig): Promise<string> {
  const platform = config.url.includes('bigmodel') ? 'ZHIPU' : 'ZAI';

  const query = queryParams();
  try {
    const [model, tool, quotaRaw] = await Promise.all([
      fetchJson(
        `${config.url}/api/monitor/usage/model-usage`,
        'Model usage',
        config.token,
        query,
      ),
      fetchJson(
        `${config.url}/api/monitor/usage/tool-usage`,
        'Tool usage',
        config.token,
        query,
      ),
      fetchJson(
        `${config.url}/api/monitor/usage/quota/limit`,
        'Quota limit',
        config.token,
      ),
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
