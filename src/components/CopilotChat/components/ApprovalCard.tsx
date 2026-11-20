import { Button, Tag, theme } from 'antd';
import { AlertTriangle, Check, ShieldCheck, X } from 'lucide-react';
import JsonView from './JsonView';
import { useCopilot } from '../context';

interface ApprovalCardProps {
  tool?: string;
  risk?: string;
  params?: unknown;
  submitting?: boolean;
  onApprove: (ok: boolean) => void;
  onApproveAndTrust: () => void;
}

export default function ApprovalCard({
  tool,
  risk = 'danger',
  params,
  submitting = false,
  onApprove,
  onApproveAndTrust,
}: ApprovalCardProps) {
  const { token } = theme.useToken();
  const { t } = useCopilot();
  const fm = (id: string) => t(id);

  const riskColor = risk === 'danger' ? token.colorError : risk === 'modify' ? token.colorWarning : token.colorInfo;

  return (
    <section
      role="alertdialog"
      aria-label={t('copilot.msg.approval', { tool: tool || '' })}
      style={{
        border: `1px solid color-mix(in srgb, ${riskColor} 34%, ${token.colorBorderSecondary})`,
        background: token.colorBgContainer,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        boxShadow: `0 12px 32px color-mix(in srgb, ${riskColor} 10%, transparent)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: riskColor,
            background: `color-mix(in srgb, ${riskColor} 10%, transparent)`,
          }}
        >
          <AlertTriangle size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 650 }}>
              {t('copilot.msg.approval', { tool: tool || '' })}
            </span>
            <Tag
              color={risk === 'danger' ? 'red' : risk === 'modify' ? 'orange' : 'blue'}
              style={{ marginInlineEnd: 0, borderRadius: 999, fontSize: 10.5 }}
            >
              {risk}
            </Tag>
          </div>
          <div style={{ fontSize: 11.5, color: token.colorTextSecondary, marginTop: 4, lineHeight: 1.55 }}>
            {fm('copilot.msg.approval.desc')}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 11,
          background: token.colorFillQuaternary,
          padding: '10px 12px',
          maxHeight: 240,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 650,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: token.colorTextTertiary,
            marginBottom: 7,
          }}
        >
          {fm('copilot.msg.params')}
        </div>
        <JsonView value={params} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 13 }}>
        <Button
          type="primary"
          danger
          icon={<Check size={14} />}
          loading={submitting}
          disabled={submitting}
          onClick={() => onApprove(true)}
        >
          {fm('copilot.msg.approve')}
        </Button>
        <Button icon={<X size={14} />} disabled={submitting} onClick={() => onApprove(false)}>
          {fm('copilot.msg.reject')}
        </Button>
        <div style={{ flex: 1 }} />
        <Button
          type="text"
          size="small"
          icon={<ShieldCheck size={13} />}
          disabled={submitting}
          style={{ color: token.colorTextSecondary, fontSize: 11.5 }}
          onClick={onApproveAndTrust}
        >
          {fm('copilot.msg.approve.and.trust')}
        </Button>
      </div>
    </section>
  );
}
