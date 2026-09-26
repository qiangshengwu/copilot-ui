import { defineConfig } from 'umi';

// agent dev server（9091）：新路由为 /{workspaceID}/...（workspaceID=租户 id）
const AGENT_TARGET = 'http://127.0.0.1:9091';

// dev server 的 compression 中间件会把 SSE 流 gzip 缓冲，
// 浏览器 fetch ReadableStream 收不到字节；用 no-transform 跳过压缩。
const noTransform = (proxyRes: any, _req: any, _res: any) => {
  proxyRes.headers['cache-control'] = 'no-cache, no-transform';
};

export default defineConfig({
  title: 'Copilot Agent 控制台',
  // hash 路由，避免后端对前端深路径回源；dev 下通过 proxy 转发 API
  history: { type: 'hash' },
  // 显式注册 antd 插件（plain umi 不自动加载 @umijs/plugins）
  plugins: ['@umijs/plugins/dist/antd'],
  antd: {},
  routes: [
    { path: '/', component: 'index' },
  ],
  proxy: {
    // 平台后端（认证 + GraphQL 租户列表）。
    // 前端统一走 /platform 前缀；后端实际路由为 /auth/login、/graphql，故剥离前缀。
    '/platform': {
      target: 'http://192.168.1.14:8080',
      changeOrigin: true,
      pathRewrite: { '^/platform': '' },
    },
    // agent：旧 /api/v1/agent 前缀已下线，新路由挂在 /{workspaceID}/... 顶层。
    // workspaceID 动态未知，用 glob 匹配第二段（micromatch，见 http-proxy-middleware v2）。
    '/*/conversations': { target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform },
    '/*/conversations/**': { target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform },
    '/*/task': { target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform },
    '/*/task/**': { target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform },
    // health：顶层
    '/health': { target: AGENT_TARGET, changeOrigin: true },
  },
  npmClient: 'npm',
});
