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
      {/* 居中限宽，ChatGPT 式底部浮动输入卡片 */}
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
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
            borderRadius: token.borderRadiusLG,
            boxShadow: running
              ? `0 0 0 2px ${token.colorWarningBg}, ${token.boxShadowSecondary}`
              : token.boxShadowSecondary,
          }}
        />
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: token.colorTextSecondary,
            marginTop: 8,
          }}
        >
          Agent 可调用平台 API 查询租户 / 设备 / 告警，并读取设备时序数据做统计与图表
        </div>
      </div>
    </div>
  );
}
