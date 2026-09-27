import { Prompts } from '@ant-design/x';
import { Sparkles, Building2, ChartLine, ShieldCheck, Terminal } from 'lucide-react';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { theme } from 'antd';
import { useIntl } from '@umijs/max';

interface WelcomeProps {
  onPick: (text: string) => void;
}

export default function Welcome({ onPick }: WelcomeProps) {
  const { token } = theme.useToken();
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });

  const CAPS = [
    { icon: <Building2 size={14} />, label: fm('copilot.welcome.cap.tenant') },
    { icon: <ChartLine size={14} />, label: fm('copilot.welcome.cap.data') },
    { icon: <ShieldCheck size={14} />, label: fm('copilot.welcome.cap.admin') },
    { icon: <Terminal size={14} />, label: fm('copilot.welcome.cap.system') },
  ];

  const SAMPLES = [
    { key: 's1', label: fm('copilot.welcome.sample.count') },
    { key: 's2', label: fm('copilot.welcome.sample.alarm') },
    { key: 's3', label: fm('copilot.welcome.sample.trend') },
  ];

  const heroIcon = useEmotionCss(({ token }) => ({
    width: 64,
    height: 64,
    borderRadius: token.borderRadiusLG,
    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: `0 0 0 6px ${token.colorPrimaryBg}, 0 10px 30px ${token.colorPrimaryBg}`,
  }));

  // 让两个 Prompts 区块在换行时也整体居中：
  // 通过官方 classNames API 设置 items 容器 justify-content center（换行胶囊居中）
  // 与标题 textAlign center。
  const promptsList = useEmotionCss(() => ({
    display: 'flex',
    justifyContent: 'center',
  }));
  const promptsTitle = useEmotionCss(() => ({
    textAlign: 'center',
  }));

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 14,
        padding: '24px 16px',
        margin: 'auto',
      }}
    >
      <div className={heroIcon}>
        <Sparkles size={32} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: token.colorText }}>
        {fm('copilot.welcome.title')}
      </div>
      <div
        style={{
          fontSize: 13,
          color: token.colorTextSecondary,
          maxWidth: 460,
          lineHeight: 1.7,
        }}
      >
        {fm('copilot.welcome.desc')}
      </div>

      <Prompts
        classNames={{ list: promptsList, title: promptsTitle }}
        title={fm('copilot.welcome.i.can.help')}
        wrap
        items={CAPS.map((c, i) => ({ key: `c${i}`, icon: c.icon, label: c.label, disabled: true }))}
        style={{ maxWidth: 560, marginTop: 8 }}
      />

      <Prompts
        classNames={{ list: promptsList, title: promptsTitle }}
        title={fm('copilot.welcome.try')}
        wrap
        items={SAMPLES.map((s) => ({ key: s.key, label: s.label }))}
        onItemClick={(info) => {
          const label =
            (info as { data?: { label?: unknown } } | undefined)?.data?.label ??
            (info as { label?: unknown } | undefined)?.label;
          if (typeof label === 'string' && label.trim()) onPick(label);
        }}
        style={{ maxWidth: 560 }}
      />
    </div>
  );
}
