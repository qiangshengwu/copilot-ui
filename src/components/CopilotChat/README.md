# CopilotChat

可直接嵌入业务页面的 Agent 聊天组件。登录、租户选择、token 刷新由宿主负责；组件只依赖 props。

## 最小用法

```tsx
import CopilotChat from '@/components/CopilotChat';

export default function WorkspacePage() {
  const tenant = useCurrentTenant();
  const token = useAuthToken();

  return (
    <div style={{ height: 'calc(100vh - 64px)' }}>
      <CopilotChat
        tenantId={tenant.id}
        tenantName={tenant.name}
        getToken={() => token}
        onUnauthorized={() => {
          // 跳登录/刷新 token
        }}
        baseUrl=""        // 同源；或 https://host/api
        locale="zh-CN"
        height="100%"
      />
    </div>
  );
}
```

## Props

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `tenantId` | `string` | 必填，API 路径为 `/{tenantId}/copilot/...` |
| `tenantName` | `string` | 侧栏底部展示 |
| `getToken` | `() => string \| undefined` | 每次请求读取 token，组件不读写 localStorage |
| `onUnauthorized` | `() => void` | 401 回调，由宿主跳登录或刷新 token |
| `baseUrl` | `string` | API 前缀，默认同源 |
| `locale` | `'zh-CN' \| 'en-US'` | 组件文案与 antd locale |
| `height` | `number \| string` | 默认 `100%`，宿主容器必须有高度 |
| `className` / `style` | - | 外层容器 |
| `title` | `string` | 顶栏兜底标题 |
| `queryClient` | `QueryClient` | 可选，复用宿主的 react-query |
| `initialConversationId` | `string` | 初始打开的会话 |
| `onConversationChange` | `(id) => void` | 当前会话变化 |

## 迁移到正式项目

复制以下文件/目录：

```text
src/components/CopilotChat/
src/types.ts
src/types/copilot.d.ts
src/locales/zh-CN.ts
src/locales/en-US.ts
src/utils/date.ts
```

组件不依赖 Umi，不需要 `@@initialState`、`useRequest`、`useIntl` 或页面路由。

依赖：

```text
react antd @ant-design/x @ant-design/x-sdk
@ant-design/use-emotion-css
@tanstack/react-query
lucide-react
openapi-fetch
echarts
```

样式全部在 `styles.ts` 中通过 `useEmotionCss` 注入，没有全局 CSS 文件。主题继承宿主的 antd `ConfigProvider`。

## 后端契约

```text
GET/POST/PATCH/DELETE /{tenantId}/copilot/conversations...
POST                     /{tenantId}/copilot/task
GET                      /{tenantId}/copilot/task/{id}
GET                      /{tenantId}/copilot/task/{id}/stream
POST                     /{tenantId}/copilot/task/approve
DELETE                   /{tenantId}/copilot/task/{id}
```

SSE 使用 `Authorization: Bearer <getToken()>`。
