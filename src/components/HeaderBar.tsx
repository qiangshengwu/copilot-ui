import { Bot, Trash2, Moon, Sun, Monitor, Building2, ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { Select, Switch, Tooltip, Input } from 'antd';
import type { Tenant } from '@/types';

interface HeaderBarProps {
  tenants: Tenant[];
  tenantId: string;
  onTenantChange: (v: string) => void;
  base: string;
  onBaseChange: (v: string) => void;
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
    tenants,
    tenantId,
    onTenantChange,
    base,
    onBaseChange,
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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-soft)',
        background: dark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'linear-gradient(135deg,#34d399,#0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Bot size={18} />
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            Copilot
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: 4,
                background: dark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)',
                color: 'var(--emerald)',
              }}
            >
              Agent
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--md-muted)' }}>控制台</div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* 过程开关 */}
      <Tooltip title="显示/隐藏推理与工具调用过程">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          过程
          <Switch size="small" checked={showProcess} onChange={onShowProcessChange} />
        </label>
      </Tooltip>

      {/* 自动滚动跟随 */}
      <Tooltip title={autoFollow ? '自动滚动到底部（上翻查看时自动暂停）' : '已暂停自动滚动，点击恢复'}>
        <button
          type="button"
          onClick={onToggleFollow}
          className="icon-btn"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 8,
            color: autoFollow ? 'var(--emerald)' : 'var(--md-muted)',
          }}
        >
          <ArrowDownToLine size={16} />
        </button>
      </Tooltip>

      {/* 删除当前会话 */}
      <Tooltip title="删除当前会话">
        <button
          type="button"
          onClick={onClear}
          className="icon-btn"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--md-muted)' }}
        >
          <Trash2 size={16} />
        </button>
      </Tooltip>

      {/* 一键批准状态 */}
      {autoApprove && (
        <Tooltip title="本对话自动批准已开启，点击关闭">
          <button
            type="button"
            onClick={onDisableAutoApprove}
            className="icon-btn"
            style={{
              border: '1px solid rgba(16,185,129,0.4)',
              background: dark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 8,
              color: 'var(--emerald)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
            }}
          >
            <ShieldCheck size={14} /> 自动批准
          </button>
        </Tooltip>
      )}

      {/* 主题切换 */}
      <Tooltip title="切换深浅主题">
        <button
          type="button"
          onClick={onToggleTheme}
          className="icon-btn"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--md-muted)' }}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </Tooltip>

      {/* 租户下拉 */}
      <Select
        size="small"
        style={{ minWidth: 140, maxWidth: 180 }}
        placeholder={
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Building2 size={12} /> 自动识别租户
          </span>
        }
        value={tenantId || undefined}
        onChange={onTenantChange}
        allowClear
        options={tenants.map((t) => ({
          value: t.id,
          label: t.alias && t.alias !== t.name ? `${t.name}（${t.alias}）` : t.name,
        }))}
      />

      {/* Agent 地址 */}
      <Tooltip title="留空=同源（dev 走 proxy）；非空则所有 API 前缀到该地址">
        <Input
          size="small"
          style={{ width: 150 }}
          placeholder="Agent 地址(同源)"
          value={base}
          onChange={(e) => onBaseChange(e.target.value)}
          prefix={<Monitor size={12} style={{ color: 'var(--md-muted)' }} />}
        />
      </Tooltip>
    </div>
  );
}
