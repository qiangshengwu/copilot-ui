import { Card, Button, Tag, message } from 'antd';
import { ShieldAlert, Check, X, ShieldCheck } from 'lucide-react';
import { highlightJson } from '@/utils/jsonHighlight';

interface ApprovalCardProps {
  tool?: string;
  params?: unknown;
  onApprove: (ok: boolean) => void;
  onApproveAndTrust: () => void;
}

export default function ApprovalCard({ tool, params, onApprove, onApproveAndTrust }: ApprovalCardProps) {
  return (
    <Card
      size="small"
      style={{
        marginBottom: 10,
        borderColor: 'rgba(239,68,68,0.4)',
        background: 'rgba(239,68,68,0.05)',
      }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <ShieldAlert size={15} color="#ef4444" />
          需要审批 · {tool || ''}
          <Tag color="red">danger</Tag>
        </span>
      }
    >
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>参数</div>
      <div dangerouslySetInnerHTML={{ __html: highlightJson(params) }} />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Button type="primary" danger block icon={<Check size={14} />} onClick={() => onApprove(true)}>
          批准
        </Button>
        <Button block icon={<X size={14} />} onClick={() => onApprove(false)}>
          拒绝
        </Button>
      </div>
      <Button
        block
        style={{ marginTop: 8, borderColor: '#f59e0b', color: '#f59e0b' }}
        icon={<ShieldCheck size={14} />}
        onClick={() => {
          onApproveAndTrust();
        }}
      >
        批准并信任本对话后续所有操作（有风险）
      </Button>
    </Card>
  );
}
