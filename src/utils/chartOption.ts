/**
 * ECharts option 安全化。
 *
 * 业务数据 / LLM 输出的 option 不可信：ECharts 的 tooltip HTML 模式会把
 * formatter 字符串写入 innerHTML，可能造成 XSS（面板同源持有平台 token）。
 * 这里做三件事：
 *  1. 只保留 JSON 可表达的数据，丢弃函数/原型对象；
 *  2. tooltip 强制 richText 渲染（canvas，不注入 DOM），移除 extraCssText 等 HTML 钩子；
 *  3. 限制深度/节点数/数组长度，避免超大 option 卡死渲染。
 */

const MAX_DEPTH = 12;
const MAX_NODES = 20_000;
const MAX_ARRAY = 5_000;

const DROP_KEYS = new Set([
  'extraCssText',
  'appendTo',
  'appendToBody',
  'className',
  'renderMode',
]);

interface SanitizeState {
  nodes: number;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeValue(value: unknown, depth: number, state: SanitizeState): unknown {
  if (state.nodes++ > MAX_NODES || depth > MAX_DEPTH) return undefined;
  if (value == null) return value;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((v) => sanitizeValue(v, depth + 1, state));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (DROP_KEYS.has(k)) continue;
      // 事件回调/函数不能来自 JSON；这里只是防御性丢弃。
      if (k.startsWith('on') && typeof v === 'function') continue;
      const next = sanitizeValue(v, depth + 1, state);
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  return undefined;
}

/** 返回安全化后的 option；非对象返回 null（调用方降级为错误占位）。 */
export function sanitizeChartOption(option: unknown): Record<string, unknown> | null {
  if (!isPlainObject(option)) return null;
  const safe = sanitizeValue(option, 0, { nodes: 0 });
  if (!isPlainObject(safe)) return null;

  const tooltip = isPlainObject(safe.tooltip) ? safe.tooltip : {};
  safe.tooltip = {
    ...tooltip,
    // 关键：richText 模式用 canvas 渲染，formatter 不会写入 innerHTML
    renderMode: 'richText',
    confine: true,
  };
  return safe;
}
