import { useEmotionCss } from '@ant-design/use-emotion-css';

const base = {
  "*": {
    "boxSizing": "border-box"
  },
  "button": {
    "fontFamily": "inherit"
  },
  ".copilot-shell": {
    "display": "flex",
    "height": "100%",
    "overflow": "hidden",
    "background": "var(--cp-bg)"
  },
  ".copilot-sidebar": {
    "width": "292px",
    "flex": "0 0 292px",
    "height": "100%",
    "borderRight": "1px solid var(--cp-border-soft)",
    "background": "color-mix(in srgb, var(--cp-surface) 88%, var(--cp-bg))",
    "display": "flex",
    "flexDirection": "column",
    "minWidth": "0"
  },
  ".copilot-main": {
    "flex": "1",
    "minWidth": "0",
    "display": "flex",
    "flexDirection": "column",
    "position": "relative",
    "background": "radial-gradient(1000px 500px at 15% -10%, color-mix(in srgb, var(--cp-primary) 7%, transparent), transparent 60%),\n    var(--cp-bg)"
  },
  ".copilot-header": {
    "flex": "0 0 auto",
    "height": "64px",
    "padding": "0 22px",
    "display": "flex",
    "alignItems": "center",
    "gap": "14px",
    "borderBottom": "1px solid var(--cp-border-soft)",
    "background": "color-mix(in srgb, var(--cp-surface) 76%, transparent)",
    "backdropFilter": "blur(18px) saturate(140%)",
    "WebkitBackdropFilter": "blur(18px) saturate(140%)",
    "zIndex": "20"
  },
  ".copilot-scroll": {
    "flex": "1 1 auto",
    "minHeight": "0",
    "overflowY": "auto",
    "overflowX": "hidden"
  },
  ".copilot-column": {
    "width": "100%",
    "maxWidth": "900px",
    "margin": "0 auto",
    "padding": "28px 28px 20px",
    "display": "flex",
    "flexDirection": "column",
    "gap": "22px",
    "minHeight": "100%"
  },
  ".copilot-composer-wrap": {
    "flex": "0 0 auto",
    "padding": "10px 24px 16px",
    "background": "linear-gradient(to bottom, transparent, var(--cp-bg) 36%)",
    "zIndex": "15"
  },
  ".copilot-composer-inner": {
    "maxWidth": "880px",
    "margin": "0 auto"
  },
  ".cp-icon-btn": {
    "width": "34px",
    "height": "34px",
    "padding": "0",
    "display": "inline-flex",
    "alignItems": "center",
    "justifyContent": "center",
    "borderRadius": "10px",
    "border": "1px solid transparent",
    "background": "transparent",
    "color": "var(--cp-muted)",
    "cursor": "pointer",
    "transition": "background 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease"
  },
  ".cp-icon-btn:hover": {
    "background": "var(--cp-surface-3)",
    "color": "var(--cp-text)",
    "borderColor": "var(--cp-border-soft)"
  },
  ".cp-icon-btn:active": {
    "transform": "scale(0.96)"
  },
  ".cp-icon-btn.is-active": {
    "color": "var(--cp-primary)",
    "background": "var(--cp-primary-soft)"
  },
  ".cp-header-title": {
    "display": "flex",
    "flexDirection": "column",
    "minWidth": "0",
    "lineHeight": "1.25"
  },
  ".cp-header-title strong": {
    "fontSize": "14px",
    "fontWeight": "600",
    "color": "var(--cp-text)",
    "whiteSpace": "nowrap",
    "overflow": "hidden",
    "textOverflow": "ellipsis"
  },
  ".cp-header-title span": {
    "fontSize": "11px",
    "color": "var(--cp-faint)",
    "marginTop": "2px"
  },
  ".cp-process-toggle": {
    "display": "inline-flex",
    "alignItems": "center",
    "gap": "8px",
    "padding": "5px 10px 5px 12px",
    "borderRadius": "999px",
    "border": "1px solid var(--cp-border-soft)",
    "background": "var(--cp-surface)",
    "color": "var(--cp-muted)",
    "fontSize": "12px",
    "cursor": "pointer",
    "userSelect": "none"
  },
  ".cp-auto-approve": {
    "display": "inline-flex",
    "alignItems": "center",
    "gap": "6px",
    "border": "1px solid color-mix(in srgb, var(--cp-danger) 30%, transparent)",
    "background": "color-mix(in srgb, var(--cp-danger) 9%, transparent)",
    "color": "var(--cp-danger)",
    "borderRadius": "999px",
    "padding": "5px 10px",
    "fontSize": "12px",
    "fontWeight": "500",
    "cursor": "pointer"
  },
  ".cp-mobile-menu": {
    "display": "none"
  },
  ".cp-sidebar-head": {
    "padding": "18px 16px 14px",
    "display": "flex",
    "flexDirection": "column",
    "gap": "14px"
  },
  ".cp-brand": {
    "display": "flex",
    "alignItems": "center",
    "gap": "11px",
    "minWidth": "0"
  },
  ".cp-brand-mark": {
    "width": "38px",
    "height": "38px",
    "borderRadius": "12px",
    "flexShrink": "0",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "color": "#fff",
    "background": "linear-gradient(135deg, #6d6af0, #9a7bf5 55%, #f0a6ca)",
    "boxShadow": "0 8px 20px color-mix(in srgb, var(--cp-primary) 28%, transparent)"
  },
  ".cp-brand-name": {
    "fontSize": "15px",
    "fontWeight": "650",
    "letterSpacing": "-0.01em",
    "color": "var(--cp-text)",
    "display": "flex",
    "alignItems": "center",
    "gap": "7px"
  },
  ".cp-brand-tag": {
    "fontSize": "9.5px",
    "fontWeight": "600",
    "letterSpacing": "0.03em",
    "textTransform": "uppercase",
    "color": "var(--cp-primary)",
    "background": "var(--cp-primary-soft)",
    "borderRadius": "999px",
    "padding": "2px 6px"
  },
  ".cp-brand-sub": {
    "fontSize": "11px",
    "color": "var(--cp-faint)",
    "marginTop": "2px"
  },
  ".cp-new-chat.ant-btn": {
    "height": "40px",
    "borderRadius": "12px",
    "fontWeight": "600",
    "boxShadow": "0 6px 16px color-mix(in srgb, var(--cp-primary) 24%, transparent)"
  },
  ".cp-search.ant-input-affix-wrapper": {
    "borderRadius": "10px",
    "background": "var(--cp-surface-3)",
    "borderColor": "transparent",
    "paddingInline": "10px"
  },
  ".cp-search.ant-input-affix-wrapper:hover": {
    "background": "var(--cp-surface)",
    "borderColor": "var(--cp-border)"
  },
  ".cp-search.ant-input-affix-wrapper-focused": {
    "background": "var(--cp-surface)",
    "borderColor": "var(--cp-border)"
  },
  ".cp-sidebar-section": {
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "space-between",
    "padding": "0 10px 6px",
    "fontSize": "10.5px",
    "fontWeight": "650",
    "letterSpacing": "0.09em",
    "textTransform": "uppercase",
    "color": "var(--cp-faint)"
  },
  ".cp-sidebar-list": {
    "flex": "1",
    "minHeight": "0",
    "padding": "2px 8px 8px",
    "display": "flex",
    "flexDirection": "column"
  },
  ".cp-sidebar-list .ant-listy-item": {
    "borderBottom": "none",
    "padding": "0",
    "background": "transparent"
  },
  ".cp-conv-item": {
    "position": "relative",
    "display": "flex",
    "alignItems": "center",
    "gap": "10px",
    "padding": "9px 10px",
    "borderRadius": "11px",
    "cursor": "pointer",
    "transition": "background 150ms ease, color 150ms ease",
    "border": "1px solid transparent"
  },
  ".cp-conv-item:hover": {
    "background": "var(--cp-surface-3)"
  },
  ".cp-conv-item.is-active": {
    "background": "var(--cp-primary-soft)",
    "borderColor": "color-mix(in srgb, var(--cp-primary) 16%, transparent)"
  },
  ".cp-conv-icon": {
    "width": "28px",
    "height": "28px",
    "borderRadius": "8px",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "flexShrink": "0",
    "color": "var(--cp-muted)",
    "background": "var(--cp-surface-3)"
  },
  ".cp-conv-item.is-active .cp-conv-icon": {
    "color": "var(--cp-primary)",
    "background": "var(--cp-surface)"
  },
  ".cp-conv-title": {
    "fontSize": "13px",
    "color": "var(--cp-text)",
    "whiteSpace": "nowrap",
    "overflow": "hidden",
    "textOverflow": "ellipsis"
  },
  ".cp-conv-item.is-active .cp-conv-title": {
    "fontWeight": "600",
    "color": "var(--cp-primary-ink)"
  },
  ".cp-conv-time": {
    "fontSize": "10.5px",
    "color": "var(--cp-faint)",
    "marginTop": "3px"
  },
  ".cp-conv-actions": {
    "display": "flex",
    "alignItems": "center",
    "gap": "2px",
    "opacity": "0",
    "transition": "opacity 150ms ease"
  },
  ".cp-conv-item:hover .cp-conv-actions": {
    "opacity": "1"
  },
  ".cp-conv-item.is-active .cp-conv-actions": {
    "opacity": "1"
  },
  ".cp-sidebar-empty": {
    "flex": "1",
    "display": "flex",
    "flexDirection": "column",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": "10px",
    "padding": "24px",
    "color": "var(--cp-faint)",
    "fontSize": "12px",
    "textAlign": "center"
  },
  ".cp-sidebar-empty svg": {
    "opacity": "0.55"
  },
  ".cp-sidebar-foot": {
    "padding": "10px 12px 12px",
    "borderTop": "1px solid var(--cp-border-soft)"
  },
  ".cp-tenant": {
    "display": "flex",
    "alignItems": "center",
    "gap": "10px",
    "padding": "8px 9px",
    "borderRadius": "12px",
    "background": "var(--cp-surface-3)",
    "minWidth": "0"
  },
  ".cp-tenant-mark": {
    "width": "30px",
    "height": "30px",
    "borderRadius": "9px",
    "background": "var(--cp-surface)",
    "color": "var(--cp-primary)",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "flexShrink": "0",
    "fontWeight": "700",
    "fontSize": "12px"
  },
  ".cp-tenant-name": {
    "fontSize": "12px",
    "fontWeight": "600",
    "color": "var(--cp-text)",
    "whiteSpace": "nowrap",
    "overflow": "hidden",
    "textOverflow": "ellipsis"
  },
  ".cp-tenant-sub": {
    "fontSize": "10.5px",
    "color": "var(--cp-faint)"
  },
  ".cp-msg": {
    "display": "flex",
    "gap": "12px",
    "width": "100%",
    "animation": "cp-fade-up 240ms ease both"
  },
  ".cp-msg-user": {
    "justifyContent": "flex-end",
    "alignItems": "flex-start"
  },
  ".cp-msg-assistant": {
    "alignItems": "flex-start"
  },
  ".cp-msg-avatar": {
    "flexShrink": "0",
    "marginTop": "2px",
    "boxShadow": "var(--cp-shadow-sm)"
  },
  ".cp-msg-body": {
    "minWidth": "0",
    "flex": "1",
    "maxWidth": "100%"
  },
  ".cp-msg-user-bubble": {
    "maxWidth": "min(76%, 660px)",
    "padding": "11px 16px",
    "borderRadius": "18px 18px 5px 18px",
    "background": "linear-gradient(135deg, #6360e8, #7c6cf0)",
    "color": "#fff",
    "fontSize": "14px",
    "lineHeight": "1.65",
    "whiteSpace": "pre-wrap",
    "wordBreak": "break-word",
    "boxShadow": "0 10px 24px color-mix(in srgb, var(--cp-primary) 22%, transparent)"
  },
  ".cp-msg-head": {
    "display": "flex",
    "alignItems": "center",
    "gap": "8px",
    "minHeight": "22px",
    "marginBottom": "7px"
  },
  ".cp-msg-name": {
    "fontSize": "12px",
    "fontWeight": "650",
    "color": "var(--cp-text)"
  },
  ".cp-msg-time": {
    "fontSize": "10.5px",
    "color": "var(--cp-faint)"
  },
  ".cp-phase": {
    "display": "inline-flex",
    "alignItems": "center",
    "gap": "6px",
    "padding": "3px 10px",
    "borderRadius": "999px",
    "border": "1px solid var(--cp-border-soft)",
    "fontSize": "11px",
    "fontWeight": "500",
    "color": "var(--cp-muted)",
    "background": "var(--cp-surface)"
  },
  ".cp-msg-actions": {
    "display": "flex",
    "alignItems": "center",
    "gap": "4px",
    "marginTop": "10px",
    "opacity": "0",
    "transition": "opacity 160ms ease"
  },
  ".cp-msg:hover .cp-msg-actions": {
    "opacity": "1"
  },
  ".cp-msg:focus-within .cp-msg-actions": {
    "opacity": "1"
  },
  ".cp-action-btn": {
    "display": "inline-flex",
    "alignItems": "center",
    "gap": "5px",
    "border": "1px solid transparent",
    "background": "transparent",
    "color": "var(--cp-faint)",
    "fontSize": "11px",
    "padding": "4px 8px",
    "borderRadius": "7px",
    "cursor": "pointer"
  },
  ".cp-action-btn:hover": {
    "background": "var(--cp-surface-3)",
    "color": "var(--cp-text)"
  },
  ".cp-result-card": {
    "border": "1px solid var(--cp-border-soft)",
    "background": "var(--cp-surface)",
    "borderRadius": "var(--cp-radius)",
    "padding": "14px 16px",
    "marginBottom": "12px",
    "boxShadow": "var(--cp-shadow-sm)",
    "overflow": "hidden"
  },
  ".cp-result-head": {
    "display": "flex",
    "alignItems": "center",
    "gap": "8px",
    "fontSize": "12px",
    "fontWeight": "600",
    "color": "var(--cp-text)",
    "marginBottom": "10px"
  },
  ".cp-process": {
    "border": "1px solid var(--cp-border-soft)",
    "background": "color-mix(in srgb, var(--cp-surface) 70%, transparent)",
    "borderRadius": "var(--cp-radius)",
    "padding": "10px 12px",
    "marginBottom": "12px"
  },
  ".cp-process .ant-thought-chain-item": {
    "color": "var(--cp-text)"
  },
  ".cp-process .ant-thought-chain-item-title": {
    "fontWeight": "600"
  },
  ".cp-process .ant-thought-chain-node-title": {
    "color": "var(--cp-text)"
  },
  ".cp-error": {
    "display": "flex",
    "alignItems": "flex-start",
    "gap": "8px",
    "padding": "10px 12px",
    "borderRadius": "10px",
    "border": "1px solid color-mix(in srgb, var(--cp-danger) 30%, transparent)",
    "background": "color-mix(in srgb, var(--cp-danger) 8%, transparent)",
    "color": "var(--cp-danger)",
    "fontSize": "12.5px",
    "marginBottom": "10px"
  },
  ".type-cursor": {
    "display": "inline-block",
    "width": "2px",
    "height": "1em",
    "verticalAlign": "-0.12em",
    "marginLeft": "2px",
    "borderRadius": "2px",
    "background": "var(--cp-primary)",
    "animation": "cp-blink 1s steps(2, start) infinite"
  },
  ".cp-composer-card": {
    "border": "1px solid var(--cp-border)",
    "background": "color-mix(in srgb, var(--cp-surface) 94%, transparent)",
    "borderRadius": "22px",
    "boxShadow": "var(--cp-shadow-md)",
    "padding": "6px",
    "transition": "border-color 160ms ease, box-shadow 160ms ease"
  },
  ".cp-composer-card:focus-within": {
    "borderColor": "color-mix(in srgb, var(--cp-primary) 42%, var(--cp-border))",
    "boxShadow": "0 0 0 4px var(--cp-primary-soft), var(--cp-shadow-md)"
  },
  ".cp-composer-card.is-running": {
    "borderColor": "color-mix(in srgb, var(--cp-danger) 30%, var(--cp-border))"
  },
  ".cp-composer-card .ant-sender": {
    "border": "none",
    "background": "transparent",
    "boxShadow": "none"
  },
  ".cp-composer-card .ant-sender-content": {
    "padding": "6px 8px 2px"
  },
  ".cp-composer-card .ant-sender-actions-btn": {
    "borderRadius": "10px"
  },
  ".cp-composer-meta": {
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "space-between",
    "gap": "12px",
    "padding": "2px 10px 6px",
    "fontSize": "10.5px",
    "color": "var(--cp-faint)"
  },
  ".cp-composer-meta kbd": {
    "fontFamily": "inherit",
    "fontSize": "10px",
    "padding": "1px 5px",
    "borderRadius": "5px",
    "border": "1px solid var(--cp-border-soft)",
    "background": "var(--cp-surface-3)",
    "color": "var(--cp-muted)"
  },
  ".cp-scroll-bottom": {
    "position": "absolute",
    "left": "50%",
    "bottom": "104px",
    "transform": "translateX(-50%)",
    "zIndex": "30",
    "display": "inline-flex",
    "alignItems": "center",
    "gap": "6px",
    "border": "1px solid var(--cp-border)",
    "background": "var(--cp-surface)",
    "color": "var(--cp-muted)",
    "borderRadius": "999px",
    "padding": "7px 12px",
    "fontSize": "11.5px",
    "cursor": "pointer",
    "boxShadow": "var(--cp-shadow-md)",
    "animation": "cp-fade-up 180ms ease both"
  },
  ".cp-scroll-bottom:hover": {
    "color": "var(--cp-text)",
    "borderColor": "var(--cp-primary)"
  },
  ".cp-welcome": {
    "flex": "1",
    "display": "flex",
    "flexDirection": "column",
    "justifyContent": "center",
    "maxWidth": "780px",
    "margin": "0 auto",
    "padding": "18px 0 10px",
    "textAlign": "center"
  },
  ".cp-welcome-mark": {
    "width": "48px",
    "height": "48px",
    "margin": "0 auto 12px",
    "borderRadius": "17px",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "color": "#fff",
    "background": "linear-gradient(135deg, #6d6af0, #9a7bf5 55%, #f0a6ca)",
    "boxShadow": "0 18px 45px color-mix(in srgb, var(--cp-primary) 30%, transparent)"
  },
  ".cp-welcome h1": {
    "margin": "0",
    "fontSize": "clamp(24px, 3.1vw, 34px)",
    "lineHeight": "1.2",
    "letterSpacing": "-0.035em",
    "fontWeight": "750",
    "color": "var(--cp-text)"
  },
  ".cp-welcome h1 em": {
    "fontStyle": "normal",
    "background": "linear-gradient(100deg, #5b5bd6, #9a7bf5 48%, #e28ab8)",
    "WebkitBackgroundClip": "text",
    "backgroundClip": "text",
    "WebkitTextFillColor": "transparent"
  },
  ".cp-welcome-desc": {
    "maxWidth": "540px",
    "margin": "10px auto 0",
    "fontSize": "13px",
    "lineHeight": "1.7",
    "color": "var(--cp-muted)"
  },
  ".cp-cap-grid": {
    "display": "grid",
    "gridTemplateColumns": "repeat(2, minmax(0, 1fr))",
    "gap": "9px",
    "marginTop": "20px",
    "textAlign": "left"
  },
  ".cp-cap-card": {
    "display": "flex",
    "gap": "11px",
    "alignItems": "flex-start",
    "padding": "10px 12px",
    "borderRadius": "var(--cp-radius)",
    "border": "1px solid var(--cp-border-soft)",
    "background": "var(--cp-surface)",
    "transition": "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease"
  },
  ".cp-cap-card:hover": {
    "transform": "translateY(-2px)",
    "boxShadow": "var(--cp-shadow-md)",
    "borderColor": "color-mix(in srgb, var(--cp-primary) 22%, var(--cp-border))"
  },
  ".cp-cap-icon": {
    "width": "30px",
    "height": "30px",
    "flexShrink": "0",
    "borderRadius": "9px",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "color": "var(--cp-primary)",
    "background": "var(--cp-primary-soft)"
  },
  ".cp-cap-title": {
    "fontSize": "12.5px",
    "fontWeight": "600",
    "color": "var(--cp-text)"
  },
  ".cp-cap-desc": {
    "fontSize": "11.5px",
    "color": "var(--cp-faint)",
    "marginTop": "3px",
    "lineHeight": "1.5"
  },
  ".cp-samples": {
    "marginTop": "18px",
    "textAlign": "left"
  },
  ".cp-samples-label": {
    "fontSize": "10.5px",
    "fontWeight": "650",
    "letterSpacing": "0.09em",
    "textTransform": "uppercase",
    "color": "var(--cp-faint)",
    "marginBottom": "8px"
  },
  ".cp-sample": {
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "space-between",
    "gap": "12px",
    "width": "100%",
    "padding": "8px 11px",
    "border": "1px solid transparent",
    "borderRadius": "11px",
    "background": "transparent",
    "color": "var(--cp-muted)",
    "fontSize": "12.5px",
    "textAlign": "left",
    "cursor": "pointer",
    "transition": "background 150ms ease, color 150ms ease, border-color 150ms ease"
  },
  ".cp-sample:hover": {
    "background": "var(--cp-surface)",
    "borderColor": "var(--cp-border-soft)",
    "color": "var(--cp-text)"
  },
  ".cp-sample svg": {
    "flexShrink": "0",
    "opacity": "0.5",
    "transition": "transform 150ms ease, opacity 150ms ease"
  },
  ".cp-sample:hover svg": {
    "opacity": "1",
    "transform": "translateX(2px)"
  },
  ".cp-login": {
    "minHeight": "100vh",
    "overflowY": "auto",
    "display": "grid",
    "gridTemplateColumns": "1.05fr 0.95fr",
    "background": "var(--cp-bg)"
  },
  ".cp-login-hero": {
    "position": "relative",
    "overflow": "hidden",
    "padding": "56px",
    "display": "flex",
    "flexDirection": "column",
    "justifyContent": "space-between",
    "color": "#fff",
    "background": "radial-gradient(700px 500px at 15% 20%, rgba(255, 255, 255, 0.22), transparent 60%),\n    linear-gradient(145deg, #4d49c8, #6d5de8 45%, #b76bd9 100%)"
  },
  ".cp-login-hero::after": {
    "content": "''",
    "position": "absolute",
    "width": "460px",
    "height": "460px",
    "right": "-140px",
    "bottom": "-180px",
    "borderRadius": "50%",
    "border": "1px solid rgba(255, 255, 255, 0.22)",
    "boxShadow": "0 0 0 80px rgba(255, 255, 255, 0.04), 0 0 0 160px rgba(255, 255, 255, 0.03)"
  },
  ".cp-login-brand": {
    "display": "flex",
    "alignItems": "center",
    "gap": "11px",
    "fontWeight": "650",
    "fontSize": "15px"
  },
  ".cp-login-brand-mark": {
    "width": "38px",
    "height": "38px",
    "borderRadius": "12px",
    "background": "rgba(255, 255, 255, 0.16)",
    "border": "1px solid rgba(255, 255, 255, 0.28)",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "backdropFilter": "blur(8px)"
  },
  ".cp-login-copy": {
    "maxWidth": "460px",
    "position": "relative",
    "zIndex": "1"
  },
  ".cp-login-copy h1": {
    "margin": "0",
    "fontSize": "clamp(30px, 3.6vw, 46px)",
    "lineHeight": "1.1",
    "letterSpacing": "-0.04em",
    "fontWeight": "750"
  },
  ".cp-login-copy p": {
    "margin": "16px 0 0",
    "fontSize": "14px",
    "lineHeight": "1.8",
    "color": "rgba(255, 255, 255, 0.78)"
  },
  ".cp-login-points": {
    "display": "grid",
    "gap": "10px",
    "marginTop": "30px"
  },
  ".cp-login-point": {
    "display": "flex",
    "alignItems": "center",
    "gap": "10px",
    "fontSize": "12.5px",
    "color": "rgba(255, 255, 255, 0.86)"
  },
  ".cp-login-point svg": {
    "opacity": "0.8"
  },
  ".cp-login-form-wrap": {
    "display": "flex",
    "flexDirection": "column",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": "20px",
    "padding": "32px",
    "background": "radial-gradient(600px 400px at 80% 10%, var(--cp-primary-soft), transparent 65%),\n    var(--cp-bg)"
  },
  ".cp-login-mobile-brand": {
    "display": "none",
    "alignItems": "center",
    "gap": "10px",
    "fontSize": "15px",
    "fontWeight": "650",
    "color": "var(--cp-text)"
  },
  ".cp-login-mobile-brand .cp-brand-mark": {
    "width": "34px",
    "height": "34px",
    "borderRadius": "10px"
  },
  ".cp-login-card": {
    "width": "min(400px, 100%)",
    "background": "var(--cp-surface)",
    "border": "1px solid var(--cp-border-soft)",
    "borderRadius": "22px",
    "padding": "30px",
    "boxShadow": "var(--cp-shadow-lg)"
  },
  ".cp-login-card h2": {
    "margin": "0",
    "fontSize": "22px",
    "letterSpacing": "-0.02em",
    "fontWeight": "700",
    "color": "var(--cp-text)"
  },
  ".cp-login-card .cp-login-sub": {
    "margin": "7px 0 22px",
    "fontSize": "12.5px",
    "color": "var(--cp-faint)"
  },
  ".cp-login-card .ant-form-item-label > label": {
    "fontSize": "12px",
    "color": "var(--cp-muted)"
  },
  ".cp-fade-up": {
    "animation": "cp-fade-up 220ms ease both"
  },
  ".cp-spin": {
    "width": "7px",
    "height": "7px",
    "borderRadius": "50%",
    "background": "currentColor",
    "animation": "cp-pulse 1s ease-in-out infinite"
  },
  "@media (prefers-reduced-motion: reduce)": {
    "*": {
      "animationDuration": "0.01ms",
      "transitionDuration": "0.01ms",
      "scrollBehavior": "auto"
    },
    "*::before": {
      "animationDuration": "0.01ms",
      "transitionDuration": "0.01ms",
      "scrollBehavior": "auto"
    },
    "*::after": {
      "animationDuration": "0.01ms",
      "transitionDuration": "0.01ms",
      "scrollBehavior": "auto"
    }
  },
  "@media (max-width: 900px)": {
    ".copilot-sidebar": {
      "display": "none"
    },
    ".cp-mobile-menu": {
      "display": "inline-flex"
    },
    ".copilot-header": {
      "height": "58px",
      "padding": "0 12px",
      "gap": "8px"
    },
    ".copilot-column": {
      "padding": "20px 14px 14px",
      "gap": "18px"
    },
    ".copilot-composer-wrap": {
      "padding": "8px 12px calc(10px + env(safe-area-inset-bottom))"
    },
    ".cp-msg-user-bubble": {
      "maxWidth": "88%"
    },
    ".cp-cap-grid": {
      "gridTemplateColumns": "1fr"
    },
    ".cp-welcome": {
      "paddingTop": "18px"
    },
    ".cp-login": {
      "gridTemplateColumns": "1fr"
    },
    ".cp-login-hero": {
      "display": "none"
    },
    ".cp-login-mobile-brand": {
      "display": "flex"
    },
    ".cp-msg-actions": {
      "opacity": "1"
    },
    ".cp-conv-actions": {
      "opacity": "1"
    }
  },
  "@media (max-width: 620px)": {
    ".cp-composer-meta span:last-child": {
      "display": "none"
    },
    ".cp-composer-meta": {
      "justifyContent": "flex-start"
    }
  },
  "@media (max-width: 520px)": {
    ".cp-header-title span": {
      "display": "none"
    },
    ".cp-welcome h1": {
      "fontSize": "26px"
    },
    ".cp-login-form-wrap": {
      "padding": "18px"
    },
    ".cp-login-card": {
      "padding": "22px"
    },
    ".cp-scroll-bottom": {
      "bottom": "96px"
    }
  }
};

function copilotStyles({ token }: any) {
  return {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    color: 'var(--cp-text)',
    background: 'var(--cp-bg)',
    fontFamily:
      'Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    '--cp-bg': token.colorBgLayout,
    '--cp-surface': token.colorBgContainer,
    '--cp-surface-2': token.colorBgElevated,
    '--cp-surface-3': token.colorFillTertiary,
    '--cp-border': token.colorBorder,
    '--cp-border-soft': token.colorBorderSecondary,
    '--cp-text': token.colorText,
    '--cp-muted': token.colorTextSecondary,
    '--cp-faint': token.colorTextTertiary,
    '--cp-primary': token.colorPrimary,
    '--cp-primary-soft': `color-mix(in srgb, ${token.colorPrimary} 12%, transparent)`,
    '--cp-primary-ink': token.colorPrimary,
    '--cp-danger': token.colorError,
    '--cp-shadow-sm': token.boxShadowTertiary,
    '--cp-shadow-md': token.boxShadowSecondary,
    '--cp-shadow-lg': token.boxShadow,
    '--cp-radius': token.borderRadius + 'px',
    ...base,
    // 品牌渐变跟随 antd 主色，避免自定义主题色与组件主题脱节。
    // 注意必须展开原规则，否则会覆盖掉尺寸/圆角/阴影等基础样式。
    '.cp-brand-mark': {
      ...(base as any)['.cp-brand-mark'],
      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    },
    '.cp-welcome-mark': {
      ...(base as any)['.cp-welcome-mark'],
      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    },
    '.cp-msg-user-bubble': {
      ...(base as any)['.cp-msg-user-bubble'],
      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    },
    '.cp-welcome h1 em': {
      ...(base as any)['.cp-welcome h1 em'],
      background: `linear-gradient(100deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    '.cp-login-hero': {
      ...(base as any)['.cp-login-hero'],
      background: `radial-gradient(700px 500px at 15% 20%, ${token.colorPrimaryBg}, transparent 60%), linear-gradient(145deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    },
  };
}


export function useCopilotStyles() {
  return useEmotionCss(copilotStyles);
}
