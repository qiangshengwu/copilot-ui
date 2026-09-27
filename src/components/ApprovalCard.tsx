import { Card, Button, Tag } from 'antd';
import { ShieldAlert, Check, X, ShieldCheck } from 'lucide-react';
import { theme } from 'antd';
import JsonView from './JsonView';
import { useIntl } from '@umijs/max';

interface ApprovalCardProps {
  tool?: string;
  params?: unknown;
  onApprove: (ok: boolean) => void;
  onApproveAndTrust: () => void;
}

export default function ApprovalCard({ tool, params, onApprove, onApproveAndTrust }: ApprovalCardProps) {
  const { token } = theme.useToken();
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });
  return (
    <Card
      size="small"
      style={{
        marginBottom: 10,
        borderColor: token.colorErrorBorder,
        background: token.colorErrorBg,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
      }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <ShieldAlert size={15} color={token.colorError} />
          {intl.formatMessage({ id: 'copilot.msg.approval' }, { tool: tool || '' })}
          <Tag color="red">danger</Tag>
        </span>
      }
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: token.colorTextSecondary,
          marginBottom: 6,
        }}
      >
        {fm('copilot.msg.params')}
      </div>
      <JsonView value={params} />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Button type="primary" danger block icon={<Check size={14} />} onClick={() => onApprove(true)}>
          {fm('copilot.msg.approve')}
        </Button>
        <Button block icon={<X size={14} />} onClick={() => onApprove(false)}>
          {fm('copilot.msg.reject')}
        </Button>
      </div>
      <Button
        block
        style={{
          marginTop: 8,
          borderColor: token.colorWarning,
          color: token.colorWarning,
          background: token.colorWarningBg,
          fontWeight: 500,
        }}
        icon={<ShieldCheck size={14} />}
        onClick={() => {
          onApproveAndTrust();
        }}
      >
        {fm('copilot.msg.approve.and.trust')}
      </Button>
    </Card>
  );
}
