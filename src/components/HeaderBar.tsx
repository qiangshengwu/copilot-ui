import { Trash2, ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { Switch, Tooltip } from 'antd';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { theme } from 'antd';
import { useIntl } from '@umijs/max';

interface HeaderBarProps {
  showProcess: boolean;
  onShowProcessChange: (v: boolean) => void;
  autoFollow: boolean;
  onToggleFollow: () => void;
  onClear: () => void;
  autoApprove: boolean;
  onDisableAutoApprove: () => void;
}

export default function HeaderBar(props: HeaderBarProps) {
  const {
    showProcess,
    onShowProcessChange,
    autoFollow,
    onToggleFollow,
    onClear,
    autoApprove,
    onDisableAutoApprove,
  } = props;

  const { token } = theme.useToken();
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });

  // 顶栏图标按钮：正方形（宽高一致）+ 实体背景 + 边框，圆角保留，亮/暗背景下清晰可点
  const iconBtn = useEmotionCss(({ token }) => ({
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    cursor: 'pointer',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    borderRadius: token.borderRadius,
    color: token.colorTextSecondary,
    boxShadow: token.boxShadowTertiary,
    transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
    '&:hover': { background: token.colorFillSecondary, borderColor: token.colorBorder },
  }));

  const container = useEmotionCss(({ token }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    padding: '8px 16px',
    // 顶栏与输入框一样 absolute 悬浮在顶部：不占文档流、无底色、无分割线，
    // 消息区背景透出，形成无边框浮动工具条。
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: 'transparent',
  }));

  // logo 已移至左侧会话栏顶部（ConversationSidebar），此处只保留功能按钮区
  const autoApproveBtn = useEmotionCss(({ token }) => ({
    border: `1px solid ${token.colorPrimaryBorder}`,
    background: token.colorPrimaryBg,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: token.borderRadius,
    color: token.colorPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
  }));

  return (
    <div className={container}>
      <div style={{ flex: 1 }} />

      {/* 过程开关 */}
      <Tooltip title={fm('copilot.header.process.tip')}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            cursor: 'pointer',
            color: token.colorTextSecondary,
          }}
        >
          {fm('copilot.header.process')}
          <Switch size="small" checked={showProcess} onChange={onShowProcessChange} />
        </label>
      </Tooltip>

      {/* 自动滚动跟随 */}
      <Tooltip title={autoFollow ? fm('copilot.header.follow.on') : fm('copilot.header.follow.off')}>
        <button
          type="button"
          onClick={onToggleFollow}
          className={iconBtn}
          style={{ color: autoFollow ? token.colorPrimary : token.colorTextSecondary }}
        >
          <ArrowDownToLine size={16} />
        </button>
      </Tooltip>

      {/* 删除当前会话 */}
      <Tooltip title={fm('copilot.header.clear')}>
        <button type="button" onClick={onClear} className={iconBtn}>
          <Trash2 size={16} />
        </button>
      </Tooltip>

      {/* 一键批准状态 */}
      {autoApprove && (
        <Tooltip title={fm('copilot.header.auto.approve.on')}>
          <button type="button" onClick={onDisableAutoApprove} className={autoApproveBtn}>
            <ShieldCheck size={14} /> {fm('copilot.header.auto.approve')}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
