import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Spin } from 'antd';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { ChartLine, Lock, ShieldCheck, Sparkles, User, Waypoints } from 'lucide-react';
import { useIntl, useModel } from '@umijs/max';
import { apiLogin } from '@/services/auth';
import { AUTH_UNAUTHORIZED_EVENT } from '@/services/http';
import { getLogin, setLogin, setTenant, tokenExpired, delLogin } from '@/utils/token';
import { graphqlClient } from '@/utils/graphql/client';
import {
  ListTenantsDocument,
  type ListTenantsQuery,
  type ListTenantsQueryVariables,
  type GetTenantQuery,
} from '@/graphql/generated/graphql';

interface LoginFormValues {
  identifier: string;
  secret: string;
}

/**
 * 登录闸门：没有有效 token 时展示账号密码登录；登录成功后加载租户并挂载业务页面。
 * 401 由 authFetch 派发 copilot:unauthorized，这里切回登录页，不再整页 reload。
 */
export default function LoginGate({ children }: { children: React.ReactNode }) {
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });
  const { initialState, setInitialState, loading } = useModel('@@initialState') as {
    initialState?: { tenant?: GetTenantQuery['tenant'] };
    setInitialState: (state: any) => Promise<void> | void;
    loading?: boolean;
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [authVersion, setAuthVersion] = useState(0);
  const loginCss = useEmotionCss(({ token }) => ({
    '--cp-bg': token.colorBgLayout,
    '--cp-surface': token.colorBgContainer,
    '--cp-border-soft': token.colorBorderSecondary,
    '--cp-text': token.colorText,
    '--cp-muted': token.colorTextSecondary,
    '--cp-faint': token.colorTextTertiary,
    '--cp-primary': token.colorPrimary,
    '--cp-primary-soft': token.colorPrimaryBg,
    '--cp-shadow-lg': token.boxShadow,
    '.cp-login': {
      minHeight: '100vh',
      overflowY: 'auto',
      display: 'grid',
      gridTemplateColumns: '1.05fr 0.95fr',
      background: 'var(--cp-bg)',
    },
    '.cp-login-hero': {
      position: 'relative',
      overflow: 'hidden',
      padding: 56,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#fff',
      background: `radial-gradient(700px 500px at 15% 20%, ${token.colorPrimaryBg}, transparent 60%), linear-gradient(145deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    },
    '.cp-login-hero::after': {
      content: "''",
      position: 'absolute',
      width: 460,
      height: 460,
      right: -140,
      bottom: -180,
      borderRadius: '50%',
      border: '1px solid rgba(255,255,255,.22)',
      boxShadow: '0 0 0 80px rgba(255,255,255,.04), 0 0 0 160px rgba(255,255,255,.03)',
    },
    '.cp-login-brand': { display: 'flex', alignItems: 'center', gap: 11, fontWeight: 650, fontSize: 15 },
    '.cp-login-brand-mark': {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: 'rgba(255,255,255,.16)',
      border: '1px solid rgba(255,255,255,.28)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '.cp-login-copy': { maxWidth: 460, position: 'relative', zIndex: 1 },
    '.cp-login-copy h1': { margin: 0, fontSize: 'clamp(30px,3.6vw,46px)', lineHeight: 1.1, letterSpacing: '-0.04em', fontWeight: 750 },
    '.cp-login-copy p': { margin: '16px 0 0', fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,.78)' },
    '.cp-login-points': { display: 'grid', gap: 10, marginTop: 30 },
    '.cp-login-point': { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'rgba(255,255,255,.86)' },
    '.cp-login-form-wrap': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: 32,
      background: `radial-gradient(600px 400px at 80% 10%, ${token.colorPrimaryBg}, transparent 65%), var(--cp-bg)`,
    },
    '.cp-login-mobile-brand': { display: 'none', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 650, color: 'var(--cp-text)' },
    '.cp-login-mobile-brand .cp-brand-mark': {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    },
    '.cp-login-card': {
      width: 'min(400px, 100%)',
      background: 'var(--cp-surface)',
      border: '1px solid var(--cp-border-soft)',
      borderRadius: 22,
      padding: 30,
      boxShadow: 'var(--cp-shadow-lg)',
    },
    '.cp-login-card h2': { margin: 0, fontSize: 22, letterSpacing: '-0.02em', fontWeight: 700, color: 'var(--cp-text)' },
    '.cp-login-card .cp-login-sub': { margin: '7px 0 22px', fontSize: 12.5, color: 'var(--cp-faint)' },
    '.cp-login-card .ant-form-item-label > label': { fontSize: 12, color: 'var(--cp-muted)' },
    '@media (max-width: 900px)': {
      '.cp-login': { gridTemplateColumns: '1fr' },
      '.cp-login-hero': { display: 'none' },
      '.cp-login-mobile-brand': { display: 'flex' },
    },
    '@media (max-width: 520px)': {
      '.cp-login-form-wrap': { padding: 18 },
      '.cp-login-card': { padding: 22 },
    },
  }));


  const login = getLogin();
  const hasValidToken = !!login?.token && !tokenExpired(login.token);
  const ready = hasValidToken && !!initialState?.tenant?.id;

  useEffect(() => {
    const onUnauthorized = () => {
      delLogin();
      setError('');
      setAuthVersion((v) => v + 1);
      void setInitialState((s: any) => ({ ...(s || {}), tenant: undefined }));
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [setInitialState, authVersion]);

  useEffect(() => {
    if (login?.token && tokenExpired(login.token)) delLogin();
  }, [login?.token]);

  if (loading) {
    return (
      <div className={loginCss}>
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--cp-bg)',
          }}
        >
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (ready) return <>{children}</>;

  const onFinish = async (values: LoginFormValues) => {
    const identifier = values.identifier?.trim();
    if (!identifier || !values.secret) {
      setError(fm('copilot.login.required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const auth = await apiLogin({ identifier, secret: values.secret, kind: 'password' });
      setLogin(auth);
      const res = await graphqlClient<ListTenantsQuery, ListTenantsQueryVariables>({
        query: ListTenantsDocument,
        variables: { limit: 10, offset: 0 },
      });
      const tenant = res.tenants?.items?.[0];
      if (!tenant) {
        throw new Error(fm('copilot.login.noTenant'));
      }
      setTenant(tenant);
      await setInitialState((s: any) => ({ ...(s || {}), tenant }));
      setAuthVersion((v) => v + 1);
    } catch (e) {
      delLogin();
      setError((e as Error)?.message || fm('copilot.login.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: <Waypoints size={15} />, text: fm('copilot.login.feature.tenant') },
    { icon: <ChartLine size={15} />, text: fm('copilot.login.feature.data') },
    { icon: <ShieldCheck size={15} />, text: fm('copilot.login.feature.approval') },
  ];

  return (
    <div className={loginCss}>
    <div className="cp-login">
      <section className="cp-login-hero">
        <div className="cp-login-brand">
          <div className="cp-login-brand-mark">
            <Sparkles size={20} />
          </div>
          Copilot Agent
        </div>

        <div className="cp-login-copy">
          <h1>{fm('copilot.login.heroTitle')}</h1>
          <p>{fm('copilot.login.heroDesc')}</p>
          <div className="cp-login-points">
            {features.map((f) => (
              <div className="cp-login-point" key={f.text}>
                {f.icon}
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
          {fm('copilot.login.footer')}
        </div>
      </section>

      <section className="cp-login-form-wrap">
        <div className="cp-login-mobile-brand">
          <div className="cp-brand-mark">
            <Sparkles size={20} />
          </div>
          <span>Copilot Agent</span>
        </div>
        <div className="cp-login-card cp-fade-up">
          <h2>{fm('copilot.login.title')}</h2>
          <p className="cp-login-sub">{fm('copilot.login.subtitle')}</p>

          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          <Form<LoginFormValues> layout="vertical" onFinish={onFinish} disabled={submitting} requiredMark={false}>
            <Form.Item
              name="identifier"
              label={fm('copilot.login.identifier')}
              rules={[{ required: true, message: fm('copilot.login.required') }]}
            >
              <Input size="large" prefix={<User size={15} />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item
              name="secret"
              label={fm('copilot.login.password')}
              rules={[{ required: true, message: fm('copilot.login.required') }]}
            >
              <Input.Password size="large" prefix={<Lock size={15} />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting} style={{ marginTop: 6 }}>
              {fm('copilot.login.submit')}
            </Button>
          </Form>
        </div>
      </section>
    </div>
    </div>
  );
}
