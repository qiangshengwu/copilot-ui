import { useEffect, useRef, useState } from 'react';
import { Sender } from '@ant-design/x';
import { Sparkles } from 'lucide-react';
import { useCopilot } from '../context';

interface ComposerProps {
  running: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function Composer({ running, onSend, onStop }: ComposerProps) {
  const { t } = useCopilot();
  const fm = (id: string) => t(id);
  const [value, setValue] = useState('');
  const ref = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    // 移动端不自动聚焦，避免一进页面就弹出软键盘
    if (!running && typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches) {
      ref.current?.focus();
    }
  }, [running]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || running) return;
    setValue('');
    onSend(t);
  };

  return (
    <div className={`cp-composer-card${running ? ' is-running' : ''}`}>
      <Sender
        ref={ref as never}
        value={value}
        onChange={setValue}
        onSubmit={submit}
        loading={running}
        onCancel={onStop}
        disabled={running}
        placeholder={running ? fm('copilot.composer.running.placeholder') : fm('copilot.composer.placeholder')}
        autoSize={{ minRows: 1, maxRows: 7 }}
        prefix={<Sparkles size={15} />}
        style={{ borderRadius: 16, background: 'transparent', boxShadow: 'none', border: 'none' }}
      />
      <div className="cp-composer-meta">
        <span>{running ? fm('copilot.composer.running.hint') : fm('copilot.composer.disclaimer')}</span>
        <span>
          <kbd>Enter</kbd> {fm('copilot.composer.send')} · <kbd>Shift</kbd>+<kbd>Enter</kbd>{' '}
          {fm('copilot.composer.newline')}
        </span>
      </div>
    </div>
  );
}
