import ReactJson from 'react-json-view';
import { theme } from 'antd';
import { useEmotionCss } from '@ant-design/use-emotion-css';

interface JsonViewProps {
  /** 可以是对象、JSON 字符串或任意值（组件内自动规范化） */
  value: unknown;
  /** 默认展开层数 */
  maxDepth?: number;
}

/**
 * JSON 查看组件：基于 react-json-view（ReactJson）。
 * 可折叠 / 复制 / 语法高亮；theme 用 useToken 自定义 base16 颜色，跟随 antd 亮暗主题；
 * 容器样式由 useEmotionCss 组件内提供。
 */
export default function JsonView({ value, maxDepth = 3 }: JsonViewProps) {
  const { token } = theme.useToken();

  const css = useEmotionCss(({ token }) => ({
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: '8px 10px',
    overflow: 'auto',
    maxHeight: 340,
    fontFamily: 'ui-monospace, Consolas, monospace',
    fontSize: 12.5,
    lineHeight: 1.55,
  }));

  // 规范化：字符串先尝试解析为对象；标量/空值包一层，保证 ReactJson 能渲染
  let v: unknown = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      v = { 内容: v };
    }
  }
  if (v === null || typeof v !== 'object') v = { value: v };

  // base16 主题，映射 antd token（亮/暗自动适配）
  const rjvTheme = {
    scheme: 'copilot',
    base00: token.colorFillQuaternary, // 背景
    base01: token.colorFillSecondary,
    base02: token.colorBorderSecondary,
    base03: token.colorTextTertiary,
    base04: token.colorTextSecondary,
    base05: token.colorText,
    base06: token.colorText,
    base07: token.colorText,
    base08: token.colorError, // 红
    base09: token.colorWarning, // 橙
    base0A: token.colorWarning,
    base0B: token.colorSuccess, // 绿
    base0C: token.colorInfo, // 青
    base0D: token.colorPrimary, // 蓝（键名）
    base0E: token.colorInfo, // 紫
    base0F: token.colorError,
  };

  return (
    <div className={css}>
      <ReactJson
        src={v as object}
        theme={rjvTheme}
        name={false}
        collapsed={maxDepth}
        enableClipboard
        displayObjectSize={false}
        displayDataTypes={false}
        iconStyle="triangle"
        style={{ fontSize: 12.5, background: 'transparent', fontFamily: 'ui-monospace, Consolas, monospace' }}
      />
    </div>
  );
}
