// Markdown 渲染：基于 markdown-it（与 Ant Design XMarkdown 同一引擎）+ DOMPurify 防 XSS。
// 说明：官方 XMarkdown 组件随 @ant-design/x@2.x 发布，依赖 antd v6；本工程锁定 antd v5，
// 故直接使用同一 markdown-it 引擎 + DOMPurify 实现等价渲染（表格/代码块/标题/列表/引用/行内 code）。
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
  html: false, // 不允许原始 HTML，防 XSS
  linkify: true,
  breaks: false,
});

// 链接新窗口打开
const defaultRender = md.renderer.rules.link_open || ((tokens, idx, options, _env, self) => {
  return self.renderToken(tokens, idx, options);
});
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultRender(tokens, idx, options, env, self);
};

/** 渲染 markdown 文本为安全 HTML 字符串 */
export function renderMarkdown(src: string): string {
  const raw = md.render(src || '');
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'h1','h2','h3','h4','h5','h6','p','br','ul','ol','li','blockquote','pre','code',
      'a','strong','em','table','thead','tbody','tr','th','td','span','div','hr','del',
    ],
    ALLOWED_ATTR: ['href','target','rel','class'],
  });
}
