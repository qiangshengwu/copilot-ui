import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Spin } from 'antd';
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
  );
}
