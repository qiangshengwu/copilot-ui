import {defineConfig} from 'umi';

// agent dev server（9091）：新路由为 /{workspaceID}/...（workspaceID=租户 id）
const AGENT_TARGET = 'http://192.168.1.14';

// dev server 的 compression 中间件会把 SSE 流 gzip 缓冲，
// 浏览器 fetch ReadableStream 收不到字节；用 no-transform 跳过压缩。
const noTransform = (proxyRes: any, _req: any, _res: any) => {
    proxyRes.headers['cache-control'] = 'no-cache, no-transform';
};

export default defineConfig({
    title: 'Copilot Agent 控制台',
    // hash 路由，避免后端对前端深路径回源；dev 下通过 proxy 转发 API
    history: {type: 'hash'},
    // 显式注册 antd 插件（plain umi 不自动加载 @umijs/plugins）
    plugins: ['@umijs/plugins/dist/antd'],
    antd: {},
    routes: [
        {path: '/', component: 'index'},
    ],
    proxy: {
        '/auth/login': {target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform},
        '/graphql': {target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform},
        '/*/copilot/**': {target: AGENT_TARGET, changeOrigin: true, onProxyRes: noTransform},
        // health：顶层
        '/health': {target: AGENT_TARGET, changeOrigin: true},
    },
    npmClient: 'npm',
});
