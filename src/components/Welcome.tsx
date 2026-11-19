import { ArrowRight, Building2, ChartLine, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { useIntl } from '@umijs/max';

interface WelcomeProps {
  onPick: (text: string) => void;
}

export default function Welcome({ onPick }: WelcomeProps) {
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });

  const CAPS = [
    { icon: <Building2 size={16} />, title: fm('copilot.welcome.cap.tenant'), desc: fm('copilot.welcome.cap.tenant.desc') },
    { icon: <ChartLine size={16} />, title: fm('copilot.welcome.cap.data'), desc: fm('copilot.welcome.cap.data.desc') },
    { icon: <ShieldCheck size={16} />, title: fm('copilot.welcome.cap.admin'), desc: fm('copilot.welcome.cap.admin.desc') },
    { icon: <Terminal size={16} />, title: fm('copilot.welcome.cap.system'), desc: fm('copilot.welcome.cap.system.desc') },
  ];

  const SAMPLES = [
    fm('copilot.welcome.sample.count'),
    fm('copilot.welcome.sample.alarm'),
    fm('copilot.welcome.sample.trend'),
  ];

  return (
    <section className="cp-welcome cp-fade-up">
      <div className="cp-welcome-mark">
        <Sparkles size={27} />
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'center',
          padding: '4px 10px',
          borderRadius: 999,
          border: '1px solid var(--cp-border-soft)',
          background: 'var(--cp-surface)',
          color: 'var(--cp-muted)',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        <span className="cp-spin" style={{ color: 'var(--cp-primary)' }} />
        {fm('copilot.welcome.badge')}
      </div>

      <h1>
        {fm('copilot.welcome.titlePrefix')} <em>{fm('copilot.welcome.titleAccent')}</em>
      </h1>
      <p className="cp-welcome-desc">{fm('copilot.welcome.desc')}</p>

      <div className="cp-cap-grid">
        {CAPS.map((c) => (
          <div className="cp-cap-card" key={c.title}>
            <div className="cp-cap-icon">{c.icon}</div>
            <div>
              <div className="cp-cap-title">{c.title}</div>
              <div className="cp-cap-desc">{c.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="cp-samples">
        <div className="cp-samples-label">{fm('copilot.welcome.try')}</div>
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            className="cp-sample"
            onClick={() => onPick(s)}
            aria-label={s}
          >
            <span>{s}</span>
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}
