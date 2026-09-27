// @umijs/max 类型补齐。
// max 的运行时（useRequest/request）由 request 插件注入 .umi/plugin-request，
// 而 @umijs/max 的 index.d.ts 仅 `export * from 'umi'`（无 useRequest/request）。
// 这里合并 umi（defineConfig 等构建期导出）与 .umi/plugin-request（运行时 useRequest/request）。
declare module '@umijs/max' {
  export * from 'umi';
  export {
    useRequest,
    UseRequestProvider,
    request,
    getRequestInstance,
  } from './.umi/plugin-request';
  export * from './.umi/plugin-request/types';
  export { useModel } from './.umi/plugin-model';
}
