import { Trash2, ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { Switch, Tooltip } from 'antd';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { theme } from 'antd';

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

  // 顶栏图标按钮：实体背景 + 边框（不用透明），保证在亮/暗背景下都清晰可点
  const iconBtn = useEmotionCss(({ token }) => ({
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    cursor: 'pointer',
    padding: 6,
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
      <Tooltip title="显示/隐藏推理与工具调用过程">
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
          过程
          <Switch size="small" checked={showProcess} onChange={onShowProcessChange} />
        </label>
      </Tooltip>

      {/* 自动滚动跟随 */}
      <Tooltip title={autoFollow ? '自动滚动到底部（上翻查看时自动暂停）' : '已暂停自动滚动，点击恢复'}>
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
      <Tooltip title="删除当前会话">
        <button type="button" onClick={onClear} className={iconBtn}>
          <Trash2 size={16} />
        </button>
      </Tooltip>

      {/* 一键批准状态 */}
      {autoApprove && (
        <Tooltip title="本对话自动批准已开启，点击关闭">
          <button type="button" onClick={onDisableAutoApprove} className={autoApproveBtn}>
            <ShieldCheck size={14} /> 自动批准
          </button>
        </Tooltip>
      )}
    </div>
  );
}
