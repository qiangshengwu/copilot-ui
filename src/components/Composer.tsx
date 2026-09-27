import { useState, useEffect, useRef } from 'react';
import { Sender } from '@ant-design/x';
import { Send } from 'lucide-react';

interface ComposerProps {
  running: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function Composer({ running, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState('');
  const ref = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    if (!running) ref.current?.focus();
  }, [running]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || running) return;
    setValue('');
    onSend(t);
  };

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '10px 16px 12px',
        borderTop: '1px solid var(--border-soft)',
        background: 'var(--surface-sider)',
      }}
    >
      <Sender
        ref={ref as never}
        value={value}
        onChange={setValue}
        onSubmit={submit}
        loading={running}
        onCancel={onStop}
        disabled={running}
        placeholder={running ? '任务执行中…' : '给 Agent 发送消息，例如：统计当前租户下的设备总数…'}
        autoSize={{ minRows: 1, maxRows: 6 }}
        prefix={<Send size={15} style={{ color: 'var(--md-muted)' }} />}
        style={{
          borderRadius: 'var(--radius-lg)',
          boxShadow: running ? '0 0 0 2px var(--phase-tool-bg), var(--shadow-md)' : 'var(--shadow-sm)',
        }}
      />
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--md-muted)', marginTop: 8 }}>
        Agent 可调用平台 API 查询租户 / 设备 / 告警，并读取设备时序数据做统计与图表
      </div>
    </div>
  );
}
