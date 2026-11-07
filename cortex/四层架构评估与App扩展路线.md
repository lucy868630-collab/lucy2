# 四层架构评估：现有「商业工作台」→ 手机 App

> 核查日期：2026-11-07 ｜ 代码库：`cortex/`（Next.js 15 + React 19，端口 3000）
> 说明：你给的分层表末尾又出现一次 `Frontend`，按复制残留处理；若你是想强调「前端优先」，见第 4 节判断。

## 0. 你的划分

| 层 | 你定义的职责 |
|---|---|
| Frontend | 网页界面、按钮、表格、仪表板 |
| Backend | 数据处理、用户账号、业务逻辑 |
| Database | 保存用户、订单、商品数据 |
| AI Integration | 接入 AI 模型、自动分析、智能助手 |

## 1. 四层现状核查（基于实际代码，非推测）

### Frontend — 已落地，但不可复用

- 已具备：`app/page.js`（登录/注册）、`app/dashboard/page.js`（仪表板，621 行）、`app/globals.css`、`lib/i18n.js` 中英双语；KPI 卡片、Chart.js 图表、明细表、拖拽上传、字段映射、AI 画像卡、CSV/TSV/TXT/XLSX/JSON 解析。
- 缺口：
  - **没有 `components/` 目录**，UI 全部内联在两个页面文件里，`dashboard/page.js` 单文件 621 行。
  - `new Chart(document.getElementById("chMonthly"), ...)` 直接操作 canvas DOM；`window.location`、`Blob` + `URL.createObjectURL` 下载、`onDrop` 拖拽、`<input type="file">` 深度耦合浏览器。
  - 结论：这些代码**一行都搬不到 App**。Chart.js 是 DOM 库，React Native / Flutter 都不能用。

### Backend — 名不副实，是最严重的一层

- 已具备：`app/api/report/route.js`（AI 商业报告）、`app/api/profile/route.js`（AI 数据画像），都只导出 `POST`，都是服务端代调 DeepSeek。
- 缺口：
  - **没有任何业务数据 API**：无订单 CRUD、无聚合查询、无 `GET/PUT/DELETE`、无 `middleware.js`、无 `next.config.*`。
  - 订单读写在前端直连 Supabase：`dashboard/page.js` 中 `supabase.from("orders").select("*")...` 与 `supabase.from("orders").insert(...)`（每 500 行一批）。
  - 业务逻辑全在浏览器里算：`aggregateRows()` 按月/品类/区域/渠道/产品聚合、`buildSmartView()` 按 AI 画像再聚合、`buildPayload()` 拼装入库数据、`parseAnyFile()` 解析文件。
  - 一句话：**Frontend 干了 Backend 该干的活**。

### Database — 有雏形，但模型不完整

- 已具备：`schema.sql` 定义 `public.orders` 表、启用 RLS、三条 `auth.uid() = user_id` 策略（select/insert/delete）、索引；`lib/supabaseClient.js` 客户端；登录/注册/`signInWithOAuth` Google 开关。
- 缺口：
  - **只有 `orders` 一张表**——你表里的「用户、商品」没有对应表（用户交给 Supabase Auth 托管，可接受；商品完全没有）。
  - 无 `migrations/`，SQL 需手工贴进 Supabase SQL Editor。
  - 前端用 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 直连，靠 RLS 隔离；无 `service_role`、无服务端调用。
  - session 由 supabase-js 默认存在浏览器 localStorage，**无服务端 session / cookie 校验**，路由守卫是客户端 `getSession()` + `router.replace("/")`。

### AI Integration — 有，但裸奔

- 已具备：DeepSeek `deepseek-chat`（report `max_tokens 1200`；profile `temperature 0.2, max_tokens 900`）；`DEEPSEEK_API_KEY` 只在服务端 `process.env` 读取，不带 `NEXT_PUBLIC_`，不进浏览器包——这点做对了。
- 缺口：
  - **两个 `/api/*` 完全无鉴权**：不查库、不校验用户，任何人都能 POST 白嫖你的 AI 额度。
  - 无超时、无重试、无备选模型、无结果缓存；未配置 key 直接 500，上游报错 502，画像非 JSON 报 502。
  - 前端降级粗糙：`profileDataset()` `catch` 里静默失败并保留示例销售视图，用户不知道 AI 没生效。

## 2. 关键结论：按现在架构，App 做不出来

| # | 障碍 | 具体位置 | 对 App 的影响 |
|---|---|---|---|
| 1 | 没有业务 JSON API | `app/api/` 仅 2 个 AI 代理 | App 拿不到 KPI / 图表 / 明细；不能也不该在 App 里内嵌 anon key 自己拼 Supabase 查询 |
| 2 | 业务逻辑在前端 | `aggregateRows`、`buildSmartView`、`parseAnyFile` 都在 `dashboard/page.js` | 网页和 App 各写一套聚合与字段映射，规则一改两端立刻不同步 |
| 3 | 认证是浏览器态 | `getSession()` + localStorage session + 客户端守卫 | App 没有这套机制，需改成 token 化 + 服务端校验 |
| 4 | 业务数据存浏览器 | `localStorage("cortex_dataset")` 存最多 5000 行原始行 + AI 画像 | 上传的数据和画像跨设备、跨端不共享；手机上看到的是另一份 |
| 5 | AI 接口无鉴权 | `api/report`、`api/profile` | 一旦 App 暴露调用，额度风险放大 |
| 6 | 图表库绑 DOM | Chart.js + `document.getElementById` | App 端必须换渲染方案 |

## 3. 达标改造路线（App 前置条件，按优先级）

### Phase 1 · 后端 API 化（最小必需，现在就该做）

- 新增统一 JSON 接口：
  - `POST /api/datasets` — 上传并写入原始行 + 字段 + 文件名
  - `GET /api/datasets` — 数据集列表
  - `GET /api/insights?datasetId=...` — 直接返回**已聚合**的 KPI、趋势/分组/Top series、AI 画像（App 拿来即渲染，零计算）
  - `GET /api/orders` — 明细分页
- 把 `aggregateRows`、`buildSmartView`、`parseAnyFile`、`normRows` 从 `dashboard/page.js` 抽到 `lib/`，供服务端复用；`lib/smart.js` 已经是纯函数，可直接复用。
- 统一 `Authorization: Bearer <supabase access token>`；新增 `lib/apiAuth.js` 在服务端用 `supabase.auth.getUser(token)` 校验——**不需要引入新依赖**，现有 `@supabase/supabase-js` 就够。
- 前端改为只 `fetch` 上述接口，不再 `import { supabase }` 写库。
- 顺手给 `/api/report`、`/api/profile` 补上同一套校验。

### Phase 2 · 数据模型补齐

- 新增 `datasets` 表：文件元信息、`fields` JSON、AI 画像 JSON（**替代 `cortex_dataset`**）、`user_id`。
- 新增 `dataset_rows` 表（或 JSONB 列）存原始行，解决跨端共享。
- 按需补 `products`、`customers` 表。
- 建 `migrations/` 目录管理版本，别再手工贴 SQL。

### Phase 3 · AI 层加固

- 超时 + 1 次重试 + 画像结果按文件 hash 缓存（同一文件不重复烧 token）。
- 失败返回结构化错误码，前端 / App 各自决定降级文案，不再静默回退示例数据。
- 保留「AI 画像失败时用规则推断兜底」作为可选降级，但必须明确告知用户当前是规则模式。

### Phase 4 · App 才启动

- 选型：沿用 React 技术栈 → **Expo / React Native**，可复用 `lib/i18n.js`、`lib/smart.js` 和业务 API 的类型定义；追求速度 → Flutter。
- App 只做 UI + 调 `/api/*`，**零业务逻辑**。
- 认证用 Supabase 原生 SDK 拿 access token，之后所有请求走 Bearer。
- 图表换 `react-native-svg` / Victory / `react-native-chart-kit`（Chart.js 无法迁移）。

## 4. 一个判断：顺序对，但时间点不对

「网站 → 商业分析平台 → 最后扩展到 App」这个顺序没问题，但**不能等网站打磨完再补 Backend**。App 的成本约 80% 取决于今天 Backend 是否 API 化：

- 现在补：只是在现有代码外加一层接口 + 抽几个纯函数，仪表板 UI 基本不动。
- 以后补：等于把 621 行 `dashboard/page.js` 拆开重写，双语、字段映射、AI 画像逻辑全部要重新验证，且届时 App 和网页会有一段时间数据不一致。

所以如果你确实要走到 App，**下一步应该是 Phase 1，而不是继续打磨前端 UI**（这也回应了末尾重复出现的 `Frontend`：前端已经不是当前瓶颈）。

## 5. 建议下一步（三选一）

- **A｜补后端（推荐）**：按 Phase 1 实现 `/api/datasets`、`/api/insights`、`lib/apiAuth.js`，并把仪表板改为只调 API。改完网页功能不变，但从此任何客户端都能接。
- **B｜先补数据模型**：先做 Phase 2 的 `datasets` / `dataset_rows` 表和 migrations，把 `localStorage` 里的业务数据搬进数据库。
- **C｜先要一份完整技术方案**：把四层 + App 的接口契约、表结构、认证时序、目录结构写成可直接执行的开发文档，之后再动代码。

确认选哪个，我直接动手；不选的话默认按 A 开始。
