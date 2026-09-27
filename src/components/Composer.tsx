import { useState, useEffect, useRef } from 'react';
import { Sender } from '@ant-design/x';
import { Send } from 'lucide-react';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { theme } from 'antd';

interface ComposerProps {
  running: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function Composer({ running, onSend, onStop }: ComposerProps) {
  const { token } = theme.useToken();
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

  const container = useEmotionCss(({ token }) => ({
    // 输入框 absolute 悬浮在右栏底部：不占文档流，消息区（scrollRef）可滚到真正底部，
    // 滚动条延伸到输入框之下，完整底部内容不被遮挡；容器透明，仅保留输入卡片。
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    padding: '8px 16px 14px',
    background: 'transparent',
  }));

  return (
    <div className={container}>
      {/* 只保留聊天输入框：外层实体背景（不透明，悬浮在消息之上不透出底层），
          无底部说明文字与额外卡片 */}
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          // 左右大圆角（胶囊感）+ 降低阴影（用更弱的 boxShadowTertiary）
          borderRadius: 24,
          boxShadow: token.boxShadowTertiary,
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
          prefix={<Send size={15} style={{ color: token.colorTextSecondary }} />}
          style={{
            borderRadius: 20,
            boxShadow: running ? `0 0 0 2px ${token.colorWarningBg}` : 'none',
          }}
        />
      </div>
    </div>
  );
}
