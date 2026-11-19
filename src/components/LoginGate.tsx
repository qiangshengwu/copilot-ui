import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Spin, Typography, theme } from 'antd';
import { Lock, User } from 'lucide-react';
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
  const { token } = theme.useToken();
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
      // 让 Umi initialState 也清空，避免旧租户继续渲染
      void setInitialState((s: any) => ({ ...(s || {}), tenant: undefined }));
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [setInitialState, authVersion]);

  // 启动时 token 已过期：清理缓存，直接显示登录页
  useEffect(() => {
    if (login?.token && tokenExpired(login.token)) delLogin();
  }, [login?.token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: token.colorBgLayout,
      }}
    >
      <Card style={{ width: 380, boxShadow: token.boxShadowSecondary }}>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
          {fm('copilot.login.title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
          {fm('copilot.login.subtitle')}
        </Typography.Paragraph>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form<LoginFormValues> layout="vertical" onFinish={onFinish} disabled={submitting}>
          <Form.Item
            name="identifier"
            label={fm('copilot.login.identifier')}
            rules={[{ required: true, message: fm('copilot.login.required') }]}
          >
            <Input prefix={<User size={14} />} autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item
            name="secret"
            label={fm('copilot.login.password')}
            rules={[{ required: true, message: fm('copilot.login.required') }]}
          >
            <Input.Password prefix={<Lock size={14} />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            {fm('copilot.login.submit')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
