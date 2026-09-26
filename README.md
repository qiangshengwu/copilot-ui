# Copilot Agent 控制台面板

基于 **UmiJS 4 + React 18 + TypeScript + Ant Design 5 + @ant-design/x** 重写的 AI 聊天控制台面板，对应 Go 服务内嵌的 panel.html。

## 技术栈

- UmiJS ^4.x（devDependencies）
- React ^18 + TypeScript
- Ant Design ^5（XProvider + zhCN + darkAlgorithm 暗色，跟随系统 prefers-color-scheme）
- Ant Design X ^1.6：XProvider / Bubble / ThoughtChain / Sender / Prompts
- @ant-design/x-sdk ^2.9：XStream 解析 SSE 流
- Markdown：markdown-it（与官方 XMarkdown 同一引擎）+ dompurify 防 XSS
- 图标：lucide-react（不使用 Tailwind）
- 图表：echarts（自封装 React 组件，渲染失败降级占位）
- 包管理：npm

> 说明：官方 XMarkdown 与 x-cards（User/Team/List Card）随 @ant-design/x@2.x 发布，依赖 antd v6；本工程锁定 antd v5，故 Markdown 直接采用同引擎 markdown-it + DOMPurify，实体/结果展示用 antd 原生 Card/Table/List 承载。

## 组件映射（自写实现 -> antd 生态）

| 功能 | 旧自写 | 现用 antd 生态 |
| --- | --- | --- |
| 主题/语言/暗色 | ConfigProvider | XProvider（透传 antd ConfigProvider） |
| 消息气泡 | 手写 div | Bubble（placement start/end + 自定义头像） |
| 推理/工具过程块 | 手写折叠卡 | ThoughtChain（items：status pending/success/error） |
| 底部输入 | 手写 TextArea+按钮 | Sender（loading 显示停止按钮、Enter 发送） |
| 欢迎空状态/示例 | 手写胶囊 | Prompts（能力项 + 可点击示例） |
| SSE 解析 | 手写 fetch+ReadableStream | @ant-design/x-sdk 的 XStream |
| Markdown | 手写轻量解析 | markdown-it + DOMPurify |
| 实体结果 | antd Table | antd Card 容器 + Table |
| 工具参数/原始 JSON | hlJson 自写高亮 | 保留 highlightJson（与 Markdown 用途区分） |

## 工程结构

    src/
      global.less
      types.ts
      utils/
        api.ts            # Agent 基址解析（localStorage 记忆）
        markdown.ts       # markdown-it + DOMPurify
        jsonHighlight.ts  # JSON 语法高亮（工具参数/原始结果）
      components/
        HeaderBar.tsx     # 顶栏
        MessageItem.tsx   # Bubble + ThoughtChain + 实体 Card/Table
        ApprovalCard.tsx   # 待审批卡片
        ChartBlock.tsx     # ECharts 自封装组件
        Welcome.tsx        # Prompts 空状态
        Composer.tsx       # Sender 输入区
      pages/index.tsx      # 主页面与 SSE 状态机（XStream）

## 功能清单

1. SSE 流式任务：POST /api/v1/agent/task，用 @ant-design/x-sdk 的 XStream 解析 fetch ReadableStream；兼容 task_created / task_started / step(thinking|tool_call|tool_result|final|approval) / done / failed / cancelled / approval。
2. 消息流：Bubble 渲染用户气泡与助手流式回答；Markdown 用 markdown-it 渲染（表格/代码块/标题/列表/引用/行内 code/粗斜体/链接），DOMPurify 过滤防 XSS。
3. 过程展示：ThoughtChain 渲染 thinking（紫色流式、status pending->success）与 tool_call（risk 徽标 read/modify/danger + 参数 JSON 高亮 + status pending/success/error）；tool_result 实体列表用 antd Card+Table；含 chart.option 时抽独立 ECharts 块（始终显示，不随过程开关隐藏），失败降级。
4. 审批：approval 事件渲染 danger 卡片，批准/拒绝（POST /task/approve）、一键信任（confirm 确认，顶栏状态指示可关闭）。
5. 顶栏：logo、过程开关、自动滚动跟随（上翻暂停）、清空会话、主题切换（跟随系统+localStorage）、租户下拉（GET /tenants）、Agent 地址配置。
6. 历史持久化：最近 40 条对话存 localStorage['copilot-thread']，刷新恢复；无历史显示 Prompts 欢迎空状态。
7. 运行控制：执行中 Sender 变 loading（显示停止按钮，DELETE /task/{id}），禁用输入；SSE 未收到完成事件显示连接中断。
8. ECharts：按 chart.option 动态渲染。

## 本地运行

    npm install
    npm run dev        # 默认 8000，/api 代理到 http://127.0.0.1:9091
    npm run build      # 生产构建到 dist/

## 与后端联调

- 后端 Agent 服务监听 127.0.0.1:9091；dev 下 Umi proxy 转发 /api、/health。
- 顶栏 Agent 地址留空=同源；非空则所有 API 前缀到该地址（localStorage 记忆）。
- dev SSE 注意：Umi dev server 默认 gzip 会缓冲 text/event-stream，已在 onProxyRes 把 Cache-Control 改为 no-cache, no-transform 让 compression 跳过 SSE。生产由 Go 后端同域托管，无此问题。
- API 契约：POST /api/v1/agent/task（SSE）、POST /task/approve、DELETE /task/{id}、GET /tenants、GET /health。

## localStorage 键

| 键 | 含义 |
| --- | --- |
| copilot-thread | 最近 40 条对话 [{role,content}] |
| copilot-theme | dark / light（未选择跟随系统） |
| copilot-base | Agent 基址（留空=同源） |