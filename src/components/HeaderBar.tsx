import { Bot, Trash2, Moon, Sun, ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { Switch, Tooltip } from 'antd';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { theme } from 'antd';

interface HeaderBarProps {
  showProcess: boolean;
  onShowProcessChange: (v: boolean) => void;
  autoFollow: boolean;
  onToggleFollow: () => void;
  onClear: () => void;
  dark: boolean;
  onToggleTheme: () => void;
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
    dark,
    onToggleTheme,
    autoApprove,
    onDisableAutoApprove,
  } = props;

  const { token } = theme.useToken();

  // 顶栏图标按钮：悬停浮现底色（替代全局 .icon-btn）
  const iconBtn = useEmotionCss(({ token }) => ({
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 6,
    borderRadius: token.borderRadius,
    color: token.colorTextSecondary,
    transition: 'background 150ms ease, color 150ms ease',
    '&:hover': { background: token.colorFillSecondary },
  }));

  const container = useEmotionCss(({ token }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    padding: '8px 16px',
    borderBottom: `1px solid ${token.colorSplit}`,
    background: token.colorBgContainer,
    backdropFilter: 'blur(8px)',
    zIndex: 10,
  }));

  const logo = useEmotionCss(({ token }) => ({
    width: 32,
    height: 32,
    borderRadius: token.borderRadiusLG,
    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  }));

  const brandTag = useEmotionCss(({ token }) => ({
    fontSize: 10,
    fontWeight: 500,
    padding: '1px 6px',
    borderRadius: token.borderRadiusSM,
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
  }));

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
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div className={logo}>
          <Bot size={18} />
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            Copilot
            <span className={brandTag}>Agent</span>
          </div>
          <div style={{ fontSize: 11, color: token.colorTextSecondary }}>控制台</div>
        </div>
      </div>

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

      {/* 主题切换 */}
      <Tooltip title="切换深浅主题">
        <button type="button" onClick={onToggleTheme} className={iconBtn}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </Tooltip>
    </div>
  );
}
