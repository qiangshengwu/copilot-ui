import {
  ArrowDown,
  Loader2,
  Menu,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Switch, Tooltip } from 'antd';
import { useCopilot } from '../context';

interface HeaderBarProps {
  title?: string;
  running?: boolean;
  showProcess: boolean;
  onShowProcessChange: (v: boolean) => void;
  autoFollow: boolean;
  onToggleFollow: () => void;
  onClear: () => void;
  autoApprove: boolean;
  onDisableAutoApprove: () => void;
  onOpenSidebar: () => void;
}

export default function HeaderBar(props: HeaderBarProps) {
  const {
    title,
    running,
    showProcess,
    onShowProcessChange,
    autoFollow,
    onToggleFollow,
    onClear,
    autoApprove,
    onDisableAutoApprove,
    onOpenSidebar,
  } = props;
  const { t } = useCopilot();
  const fm = (id: string) => t(id);

  return (
    <header className="copilot-header">
      <button
        type="button"
        className="cp-icon-btn cp-mobile-menu"
        aria-label={fm('copilot.header.menu')}
        onClick={onOpenSidebar}
      >
        <Menu size={18} />
      </button>

      <div className="cp-header-title">
        <strong>{title || fm('copilot.app.console')}</strong>
        <span>
          {running ? (
            <>
              <Loader2 size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
              {fm('copilot.header.running')}
            </>
          ) : (
            fm('copilot.header.ready')
          )}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <Tooltip title={fm('copilot.header.process.tip')}>
        <label className="cp-process-toggle">
          <span>{fm('copilot.header.process')}</span>
          <Switch
            size="small"
            checked={showProcess}
            onChange={onShowProcessChange}
            aria-label={fm('copilot.header.process')}
          />
        </label>
      </Tooltip>

      {autoApprove && (
        <Tooltip title={fm('copilot.header.auto.approve.on')}>
          <button
            type="button"
            aria-label={fm('copilot.header.auto.approve.on')}
            onClick={onDisableAutoApprove}
            className="cp-auto-approve"
          >
            <ShieldCheck size={13} />
            {fm('copilot.header.auto.approve')}
          </button>
        </Tooltip>
      )}



      <Tooltip title={autoFollow ? fm('copilot.header.follow.on') : fm('copilot.header.follow.off')}>
        <button
          type="button"
          aria-label={autoFollow ? fm('copilot.header.follow.on') : fm('copilot.header.follow.off')}
          onClick={onToggleFollow}
          className={`cp-icon-btn${autoFollow ? ' is-active' : ''}`}
        >
          <ArrowDown size={17} />
        </button>
      </Tooltip>

      <Tooltip title={fm('copilot.header.clear')}>
        <button
          type="button"
          aria-label={fm('copilot.header.clear')}
          onClick={onClear}
          className="cp-icon-btn"
        >
          <Trash2 size={17} />
        </button>
      </Tooltip>
    </header>
  );
}
