import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useModel } from '@umijs/max';
import LoginGate from '@/components/LoginGate';
import CopilotChat from '@/components/CopilotChat';
import { authFetch } from '@/services/http';
import type { GetTenantQuery } from '@/graphql/generated/graphql';

/**
 * copilot-ui 演示页：真实项目应直接在业务页面渲染 <CopilotChat />。
 * 登录、租户选择由宿主负责；组件只接收 tenantId，鉴权由宿主 fetch 拦截器处理。
 */
export default function HomePage() {
  const { initialState } = useModel('@@initialState') as {
    initialState?: { tenant?: GetTenantQuery['tenant'] };
  };
  const tenant = initialState?.tenant;

  return (
    <ConfigProvider locale={zhCN}>
      <LoginGate>
        <div style={{ height: '100dvh', minHeight: 0 }}>
          {tenant?.id ? (
            <CopilotChat
              tenantId={tenant.id}
              tenantName={tenant.name}
              fetch={authFetch}
            />
          ) : null}
        </div>
      </LoginGate>
    </ConfigProvider>
  );
}
