# Copilot Agent 控制台

基于 **UmiJS 4 + React 18 + TypeScript + Ant Design 6 + @ant-design/x 2.x** 的 AI 聊天控制台，对接 Go Agent 服务（`/{workspaceID}/copilot/...`）。

## 技术栈

- UmiJS 4.7 / React 18 / TypeScript 5.6
- Ant Design 6 + @ant-design/x（Bubble / ThoughtChain / Sender / Prompts）
- @ant-design/x-card（A2UI 结构化卡片）、@ant-design/x-markdown（流式 Markdown，内部 DOMPurify）
- ECharts 5（按需异步加载）
- @tanstack/react-query（会话列表无限滚动）
- openapi-fetch + `src/types/copilot.d.ts`（由后端 OpenAPI 生成）

## 登录与鉴权

- 启动时读取 `localStorage.login`；无 token/已过期则展示**账号密码登录页**（`POST /auth/login`）。
- 登录成功后调用 `/graphql` 拉取租户，默认取第一条作为当前租户。
- 所有请求统一走 `src/services/http.ts` 的 `authFetch`：自动注入 Bearer token，401 时清 token 并派发 `copilot:unauthorized`，由 `LoginGate` 切回登录页（不再整页 reload）。
- 代码中**不内置任何账号密码**；测试/生产均由用户输入。

## 目录

```
src/
  app.tsx                 Umi getInitialState（已登录时的租户初始化）
  pages/index.tsx         主页面 + LoginGate
  components/
    LoginGate.tsx         账号密码登录
    MessageItem.tsx       消息/过程块/Markdown/A2UI 渲染
    A2UICard.tsx          自定义 A2UI 命令 -> XCard v0.9
    ChartBlock.tsx        ECharts 懒加载封装
    ChartBlockImpl.tsx    ECharts 实例与 option 安全化
    DataResultView.tsx    时序/波形/FFT 专用展示
    ConversationSidebar.tsx / HeaderBar.tsx / Composer.tsx / ApprovalCard.tsx
  hooks/
    useTask.ts            发送、SSE、审批、停止、断线轮询、落库
    useChatState.ts       消息/块/rAF 流式合并
    useConversations.ts   会话列表与 CRUD
  services/
    http.ts               authFetch + 401 事件
    auth.ts               /auth/login
    responseInterceptor.ts openapi-fetch 适配器
  utils/
    chartOption.ts        ECharts option 白名单/降级
    token.ts              localStorage token/tenant
  types/
    copilot.d.ts          OpenAPI 生成类型（勿手改）
```

## 本地运行

```bash
npm install
npm run dev          # 默认 8000
npm run typecheck    # tsc --noEmit
npm run build
npm run openapi      # 需要后端仓库位于 ../../go/src/copilot
```

`config/config.ts` 中的开发代理：

- `/auth/login`、`/graphql`、`/health` → 平台入口
- `/*/copilot/**` → 本机 Agent（默认 `127.0.0.1:9091`）

SSE 需要 `Cache-Control: no-cache, no-transform`，否则 dev server 的 gzip 会缓冲事件。

## 主要 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/auth/login` | 平台账号密码登录 |
| POST | `/{workspaceID}/copilot/task` | 创建任务 |
| GET | `/{workspaceID}/copilot/task/{id}/stream` | SSE 订阅并启动任务 |
| GET | `/{workspaceID}/copilot/task/{id}` | 断线后查询任务状态 |
| POST | `/{workspaceID}/copilot/task/approve` | 审批 |
| DELETE | `/{workspaceID}/copilot/task/{id}` | 停止任务 |
| GET/POST/PATCH/DELETE | `/{workspaceID}/copilot/conversations...` | 会话与消息 |

## 约定

- A2UI 是自定义协议（`createSurface/updateComponents/updateDataModel/deleteSurface`），前端只接受 `Text/Table/Chart/Statistic/Column`，未知类型降级为占位。
- 图表 option 来自模型/后端，渲染前统一经 `sanitizeChartOption`：tooltip 强制 `richText`，限制深度/节点/数组长度。
- 审批卡展示风险等级；提交中禁用按钮，避免重复审批。
- 测试环境优先；正式部署的 nginx/账号体系按目标环境再接入。
