import {defineConfig} from '@umijs/max';

// agent dev server（9091）：新路由为 /{workspaceID}/...（workspaceID=租户 id）
// A2UI 联调：/*/copilot/** 与 /health 指本地新后端（build\agent-a2ui-local.exe，9091）；
// /auth/login 与 /graphql 属平台能力（copilot 服务不提供），仍走远端 nginx 统一入口。
// 服务器部署新版后可把 copilot 两条也改回 http://192.168.1.14。
const AGENT_TARGET = 'http://192.168.1.14';
const AGENT_LOCAL = 'http://localhost:9091';

// dev server 的 compression 中间件会把 SSE 流 gzip 缓冲，
// 浏览器 fetch ReadableStream 收不到字节；用 no-transform 跳过压缩。
const noTransform = (proxyRes: any, _req: any, _res: any) => {
    proxyRes.headers['cache-control'] = 'no-cache, no-transform';
};

export default defineConfig({
    title: 'Copilot Agent 控制台',
    // hash 路由，避免后端对前端深路径回源；dev 下通过 proxy 转发 API
    history: {type: 'hash'},
    // 禁用 MFSU（其 eager 预编译会把本地组件 import 编译失效，导致
    // "ConversationSidebar is not defined"）；本地边改边测用全量编译最稳。
    mfsu: false,
    // 消除 umi esbuildHelperChecker 的 helper 冲突报错（构建 fatal）
    esbuildMinifyIIFE: true,
    // max 内置 antd 插件（无需手动注册）；theme:variable 供 ConfigProvider 动态主色
    antd: {
        configProvider: {},
        appConfig: {},
    },
    theme: {
        'root-entry-name': 'variable',
    },
    // max request：后端直接返回业务体（非 { data: ... } 包裹），dataField 置空，
    // 使 useRequest 的 data 即为接口返回的业务体（如 {conversations:[...]}）。
    request: {
        dataField: '',
    },
    // model 插件：提供 useModel
    model: {},
    // initialState 插件：认领 app.tsx 的 getInitialState（登录 + 默认租户初始化）
    initialState: {},
    routes: [
        {path: '/', component: 'index'},
    ],
    proxy: {
        '/auth/login': {target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform},
        '/graphql': {target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform},
        '/*/copilot/**': {target: AGENT_LOCAL, changeOrigin: true, onProxyRes: noTransform},
        // SSE 流与任务轮询：前端使用 /{workspaceID}/task/{id}/stream 与 /{workspaceID}/task/{id}（无 /copilot 段），
        // 本地后端路由带 /copilot，故 rewrite 补上（与服务器 nginx 行为一致）
        '/*/task/**': {
            target: AGENT_LOCAL,
            changeOrigin: true,
            onProxyRes: noTransform,
            pathRewrite: (path: string) => path.replace(/\/task\//, '/copilot/task/'),
        },
        // health：顶层
        '/health': {target: AGENT_LOCAL, changeOrigin: true},
    },
    npmClient: 'npm',
});
