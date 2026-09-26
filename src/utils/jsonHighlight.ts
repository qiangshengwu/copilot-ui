// JSON 语法高亮（输出 HTML 字符串）。
// 颜色类名 kd(key) / ks(string) / kn(number) / kb(boolean|null) 在全局 less 中定义。

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function walk(v: unknown): string {
  if (v === null) return '<span class="kb">null</span>';
  if (typeof v === 'number') return '<span class="kn">' + esc(String(v)) + '</span>';
  if (typeof v === 'boolean') return '<span class="kb">' + esc(String(v)) + '</span>';
  if (typeof v === 'string') return '<span class="ks">"' + esc(v) + '"</span>';
  if (Array.isArray(v)) {
    return '[ ' + v.map(walk).join(', ') + ' ]';
  }
  if (typeof v === 'object' && v !== undefined) {
    const obj = v as Record<string, unknown>;
    return (
      '{ ' +
      Object.keys(obj)
        .map((k) => '<span class="kd">"' + esc(k) + '"</span>: ' + walk(obj[k]))
        .join(', ') +
      ' }'
    );
  }
  return esc(String(v));
}

/** 入参可以是对象、JSON 字符串或未知类型；返回高亮 HTML */
export function highlightJson(input: unknown): string {
  let obj: unknown = input;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return '<pre class="json-plain">' + esc(obj as string) + '</pre>';
    }
  }
  return '<pre class="json-hl">' + walk(obj) + '</pre>';
}
