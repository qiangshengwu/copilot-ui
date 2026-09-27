# Copilot 示例对话「统计当前租户下的设备总数」卡住 — 复现与根因报告

- 复现时间：2026-09-27（Asia/Shanghai）
- 方式：真实 HTTP 调用（PowerShell `Invoke-RestMethod` / `curl.exe -N`），只读排查，未改任何代码
- 涉及后端：`E:\workspace\go\src\copilot`（只读）；前端：`E:\workspace\web\copilot`（只读）
- 平台入口：`http://192.168.1.14`（nginx），平台 GraphQL `http://192.168.1.14:8080/graphql`
- 目标租户：`51248012-9d39-4eca-a32f-6e470b676b95`（交泰智能 / alias=linkedti，status=active）
- 凭据：已通过 `/auth/login` 取得有效平台 JWT（下文不再出现 token 本身）

---

## 1. 结论先行

**「卡住」不是 LLM 无响应、不是工具失败、不是 token 链路断、也不是数据为空。任务在服务端正常跑完并到达 `done`，正确结论是「该租户设备总数为 0 台」。**

真正原因：**agent 服务 HTTP server 的 `WriteTimeout` 默认为 15s（magistrala 上游默认值），而 SSE 流式处理器 `handleTaskStream` 没有为长连接抬写超时。** 带推理能力的真实 LLM 跑这个示例需要 ~18–20s（2 次 LLM 往返 + 2 次工具调用）。连接在请求开始后第 **15.019 秒** 被 server 强行切断，此时 `step3(thinking/final)` 与 `done` 事件尚未发出；任务 goroutine 用的是 `context.Background()`，仍在后台跑完并落库为 `done`，但 `done/final` 事件被发布到一个已经没有订阅者的 SSE broker channel 上，前端永远收不到终态事件 → 界面停在「正在整理结果…」/半截回答，表现为「卡住」。

一句话：**这是 agent HTTP server 的 15s WriteTimeout 切断 SSE 长连接导致的「假死」，是代码/部署配置问题，不是环境数据问题。**

---

## 2. 复现步骤与关键响应

### 2.1 健康探测
- `GET http://192.168.1.14/health` → 200（返回平台健康 JSON：database ok / migrations 2 / signing_keys loaded 等）。
- `GET http://192.168.1.14:8080/health` → 200，内容同上。
- 两个入口均在线。注：`/health` 由 nginx 转给平台，agent 自身 `/health` 在 `transport.go:295` 只返回 `{"status":"ok"}`。

### 2.2 登录与租户确认
- `POST http://192.168.1.14:8080/auth/login` `{"identifier":"admin","secret":"***","kind":"password"}` → 200，返回有效 JWT。
- `POST /graphql`：
  ```graphql
  query($limit:Int){tenants(limit:$limit){total items{id name alias status}}}
  ```
  → `total=1`，唯一租户即目标 `51248012-…6b95`，alias=`linkedti`，status=`active`。

### 2.3 数据侧直查（绕开 Agent，直接打平台 GraphQL）
后端工具 `list_devices`（`agent/tools/platform/platform_tools.go:64-69`）实际发出的查询是：
```graphql
query($tenantId: ID, $kind: EntityKind, $status: EntityStatus, $limit: Int, $offset: Int) {
  entities(tenantId: $tenantId, kind: $kind, status: $status, limit: $limit, offset: $offset) {
    total
    items { id name alias externalId tenantId status attributes createdAt }
  }
}
```
用同一 token 直接打 `/graphql`，变量 `{kind:"device", tenantId:"51248012-…6b95", limit:5, offset:0}`：
```json
{"data":{"entities":{"total":0,"items":[]}}}
```
- **数据侧正常、无报错、token 有效**；该租户下确实没有设备实体（total=0）。
- 这本身不会让对话卡住——LLM 拿到 total=0 应直接给结论。

### 2.4 完整模拟前端任务流（全程带 Authorization: Bearer）
a. `POST /{tid}/copilot/conversations` `{"title":"自测-设备统计"}` → 201，返回 conversation id。
b. `POST /{tid}/copilot/task` `{"prompt":"统计当前租户下的设备总数","history":[]}`（UTF-8 字节体，避免 PS5.1 默认编码把中文发成 `?`）→ 201，返回 task id（如 `009b8e3a-…`、`eeb47e17-…`）。
c. `GET /{tid}/copilot/task/{taskId}/stream`（SSE），用 `curl.exe -N -s --max-time 35` 抓取。

---

## 3. SSE 事件时间线（关键证据）

以第二次干净复现（task `eeb47e17-ce8b-418d-9fd6-42a7f16a3a3f`）为例，连接建立时刻记为 t=0：

| 相对 t(s) | 事件 | 内容摘要 |
|---|---|---|
| 0.1 | `task_started` | prompt=统计当前租户下的设备总数，tenant_id 正确 |
| ~4.5 | `step` thinking(step1) | 真实中文推理：「…选用设备查询工具，拉取最大数量统计总数」 |
| ~4.5 | `step` tool_call(step1) | `list_devices`，params `{limit:200, tenant_id:…}` |
| ~4.5 | `step` tool_result(step1) | `{"entities":{"items":[],"total":0}}` |
| ~9.7 | `step` thinking(step2) | 「total=0，设备有歧义，查通道补充核实」 |
| ~9.7 | `step` tool_call(step2) | `list_channels`，params `{limit:500, tenant_id:…}` |
| ~9.7 | `step` tool_result(step2) | `{"resources":{"items":[],"total":0}}` |
| **15.019** | **连接被切断** | **curl 退出码 18（CURLE_PARTIAL_FILE），time_total=15.019s，http=200** |
| (未到达前端) | step3 thinking / final / `done` | 服务端 DB 里其实都产生了，但 SSE 已断，事件被 broker 丢弃 |

第一次复现（PowerShell 流式读取）时间线一致：`task_started(0.1s)` → step1 thinking/tool_call/list_devices(7.8s) → tool_result(7.8s) → step2 thinking/tool_call/list_entities(14.1s) → tool_result(14.1s)，随后读取在 ~19.7s 因底层连接断开而报错，同样没收到 final/done。

**服务端事后 GET /task/{id} 取证：两个被切断的 task 最终 `state=done`、`steps=8`、`final_answer` 完整：**
- task `009b8e3a…`：「当前租户（ID：…）下的设备总数为 **0 台**。统计范围包含该租户下的全部硬件设备实体，未查询到任何设备记录。」
- task `eeb47e17…`：「…硬件设备（entity）：**0 台**；数据通道/业务资源（channel…）」

这证明：任务执行链（LLM→tool_call→tool_result→LLM→final→done）完全正常，**唯一丢的是最后一段 SSE 传输**。

---

## 4. 根因定位（文件:行号）

### 4.1 直接原因：15s WriteTimeout 切断 SSE
- **`E:\workspace\go\pkg\mod\github.com\absmach\magistrala@v1.0.0\pkg\server\server.go:36`**
  ```go
  WriteTimeout time.Duration `env:"SERVER_WRITE_TIMEOUT" envDefault:"15s"`
  ```
  magistrala 上游 HTTP server 默认 `WriteTimeout=15s`。Go `net/http` 的 `WriteTimeout` 是从请求头读完起算的**整段响应写入硬上限**，对 SSE 这种长连接流式响应会在到点后掐断连接。
- **`E:\workspace\go\src\copilot\cmd\agent\main.go:360-361`**
  ```go
  httpServerConfig := mgserver.Config{Port: defSvcHTTPPort}
  if err := env.ParseWithOptions(&httpServerConfig, env.Options{Prefix: envPrefixHTTP}); err != nil { ... }
  ```
  这里只显式设了 Port；`WriteTimeout` 走 env `LT_COPILOT_HTTP_SERVER_WRITE_TIMEOUT`，未配置即取上游默认 **15s**。实测连接在 15.019s 被切，与默认值精确吻合。
- **`E:\workspace\go\src\copilot\agent\api\transport.go:252-292`** `handleTaskStream`：
  - 266-269 行设置了 SSE 响应头（含 `X-Accel-Buffering: no`，nginx 不缓冲）；
  - 281-291 行的转发循环只 `w.Write(data)` + `flusher.Flush()`，**没有为该长连接抬写超时**（未用 `http.NewResponseController(w).SetWriteDeadline(...)` 把 write deadline 置零）。

### 4.2 为什么任务没挂、前端却「卡住」
- **`E:\workspace\go\src\copilot\agent\task\manager.go:133`**：`runTask` 用的是 `context.WithCancel(context.Background())`，**不是** SSE 请求的 `r.Context()`。所以 SSE 连接被 server 切断后，后台任务 goroutine 不受影响，继续跑完并在 18-20s 时发布 `done`。
- **`E:\workspace\go\src\copilot\agent\task\sse.go:46-60`** `SSEBroker.Publish` 是**非阻塞发送，慢订阅者积压直接 `default` 丢弃**。连接已断时 `Unsubscribe` 已把 channel 删掉，`done/final` 事件发出去无人接收 → 前端永远等不到终态。
- 连接切断时刻（15s）落在「step2 tool_result 已发、step3 最终回答尚未产生」之间：
  - step1 LLM 往返 ~6-7s，step2 ~6-7s，step3(final) 再 ~6-7s，总计 ~19-20s；
  - 只要任务总时长 > 15s（推理模型 + 多工具调用几乎必然），SSE 必被切。

### 4.3 前端为何表现成「卡住」（而非明确报错）
- **`E:\workspace\web\copilot\src\hooks\useTask.ts:386-395`** 用 `fetch` + `XStream` 逐帧解析 SSE（能正确带 Authorization 头，不是原生 EventSource）。
- **`useTask.ts:398-407`**：流在非 `done/failed/cancelled` 情况下结束时，只设置 `disconnected:true`、清掉 phase/phaseBusy，**并不回查 `GET /task/{id}` 把已完成的 final_answer 拉回来**。于是用户看到：思考过程 + 工具调用都在，最终回答缺失，界面停在「正在整理结果…」后变成一个不显眼的「断线」态——体感就是「卡住」。
- 旁证：会话列表里已存在 7 条用户此前手动重试的同名会话「统计当前租户下的设备总数」（20:18/20:32/20:42/20:55/21:12/21:16/21:18），说明这是稳定复现、用户反复重试的现象。

---

## 5. 排除项（逐项证伪）

| 假设 | 证据 | 结论 |
|---|---|---|
| LLM 无响应/挂死 | step1/step2 thinking 内容按时到达（真实中文推理，非 Mock）；GET /task 显示 steps=8、state=done | 排除 |
| 跑的是 Mock LLM | Mock（`agent/llm/mock.go`）只出一次 tool_call、tool_result 后立即 final；实际观察到 LLM 主动二次调用 `list_channels` 交叉验证，且 reasoning_content 为长段中文 | 排除，跑的是真实 OpenAI 兼容 LLM |
| 工具失败 / 数据报错 | list_devices/list_entities/list_channels 都在 ~25ms 内返回 total=0，无 `工具执行失败` | 排除 |
| 租户无设备导致异常 | 直查 GraphQL total=0，工具正常返回；LLM 正确得出「0 台」结论 | 数据事实，非故障 |
| token 链路断（"platform token not provided"） | 工具成功调用平台 GraphQL 并返回数据，说明 `WithToken` 已注入 ctx（`manager.go:156-158` → `platform/client.go:48-53` 校验通过） | 排除 |
| SSE JSON 解析失败 | curl 原样收到合法 `data:{...}\n\n`，前端 `JSON.parse(frame.data)` 不报错（解析失败在 `useTask.ts:391` 仅 `continue`） | 排除 |
| nginx proxy_read_timeout=15s 静默切断 | 该超时是「两次读之间」计时，会在最后一帧(9.7s)+15s≈24.7s 才断；实测 15.0s 整断，是从连接起算的硬上限，即 Go WriteTimeout | 排除 nginx，指向 server WriteTimeout |

---

## 6. 修复建议（按优先级）

### P0 — 立即缓解（运维侧，不改代码）
在 agent 服务环境变量里放宽写超时后重启：
```
LT_COPILOT_HTTP_SERVER_WRITE_TIMEOUT=0     # 或一个足够大的值，如 300s
```
对应配置绑定见 `cmd/agent/main.go:361`（prefix=`LT_COPILOT_HTTP_`，字段 `SERVER_WRITE_TIMEOUT`）。
代价：会把所有路由的写超时都放开，仅适合内网服务。

### P1 — 代码侧正修（推荐）
在 `agent/api/transport.go:252 handleTaskStream` 写完 SSE 响应头后，**仅对该长连接**抬写超时（Go 1.20+）：
```go
import "net/http"
// ...在 w.Header().Set(...) 之后、Subscribe 之前：
if rc := http.NewResponseController(w); rc != nil {
    _ = rc.SetWriteDeadline(time.Time{}) // 取消写超时
    _ = rc.SetReadDeadline(time.Time{})
}
```
这样保留普通 JSON 路由的默认写超时，只给 SSE 长连接开绿灯。

### P2 — 韧性加固（前后端）
1. **后端 SSE 心跳**：在 `handleTaskStream` 转发循环里加每 ~10s 一次 `: ping\n\n` 注释帧，既防中间代理静默断开，也能及早发现死连接。
2. **前端断线回查**：`useTask.ts:398` 检测到非终态结束时，不要只标 `disconnected`，应轮询 `GET /{tid}/copilot/task/{id}` 直到 `state in (done/failed/cancelled)`，把 `final_answer` 渲染出来。这样即使 SSE 被切，用户仍能拿到最终答案。
3. （可选）`SSEBroker.Publish`（`sse.go:46`）可考虑在任务终态时持久化最近事件，便于断线重连/新订阅者补投；当前非阻塞丢弃对「连接已断」是合理的，但终态事件丢失需要 P2-2 兜底。

---

## 7. 环境问题 vs 代码问题

- **代码/部署配置问题（本次根因）**：agent HTTP server 沿用 magistrala 默认 15s `WriteTimeout`，SSE 流式端点未抬写超时 → 长任务必被切。属配置缺失 + 代码未对 SSE 做特判。
- **环境/数据现状（非故障，但需知道）**：目标租户下当前设备实体确实为 0；这是真实业务数据状态，Agent 结论正确。
- **附带发现（不在本次范围，仅记录）**：测试会话删除 `DELETE /{tid}/copilot/conversations/{id}` 返回 `403 {"message":"failed to perform authorization over the entity"}`，admin 对 conversation 的删除鉴权策略似乎缺失；本次测试会话 `88d14986-…`（标题「自测-设备统计」）因此未能删除，留待鉴权策略补齐后清理。

---

## 8. 遗留问题
1. agent 实际部署环境是否真的没设 `LT_COPILOT_HTTP_SERVER_WRITE_TIMEOUT`？本机只读代码无法看运行时 env；建议在服务器上 `systemctl show`/`docker inspect` 确认。若已设为 15s 则同因；若未设则是上游默认值，结论不变。
2. P1 改完后需复测：本示例总时长 ~19-20s，应能完整收到 step3 + `done`，前端不再出现 disconnected。
3. 403 删除鉴权问题需单独排查（SpiceDB/权限策略），不在本任务改动范围。
