# 商业工作台 v3.1 — Next.js + Supabase + DeepSeek

面向新西兰小企业的 BI 数据分析 / AI 自动化工作台：中英双语、任意表格上传、AI 数据画像驱动的动态仪表板。

> **唯一正式入口**：`http://localhost:3000`（`cortex/`）。`website/` 是已停用的归档静态原型，不要再启动。

## 目录结构

```
仓库根 20261107092205/
├── .gitignore                     # 忽略 node_modules / .next / .env.local / 日志
├── cortex/                        # 正式产品（Next.js 全栈应用）
│   ├── app/
│   │   ├── page.js                # 登录 / 注册（Supabase Auth）
│   │   ├── dashboard/page.js      # 仪表板：图表、上传、字段映射、AI 报告
│   │   ├── api/report/route.js    # AI 商业报告（服务端代理 DeepSeek）
│   │   ├── api/profile/route.js   # AI 数据画像
│   │   ├── layout.js / globals.css
│   │   └── README.md              # 本文件
│   ├── lib/
│   │   ├── guard.js               # 基础安全网关：鉴权 / 限流 / 体积限制
│   │   ├── i18n.js                # 中英双语字典
│   │   ├── smart.js               # 按 AI 画像构建动态视图
│   │   └── supabaseClient.js
│   ├── .env.example               # 环境变量模板（可提交）
│   ├── .env.local                 # 真实密钥（已忽略，绝不提交）
│   ├── schema.sql                 # orders 表 + 行级安全 RLS
│   └── 四层架构评估与App扩展路线.md
├── setup/python_pipeline/         # Python 数据汇总 / AI 报告 / 采集流水线
└── website/                       # 归档原型 v2.1（已停用）
```

## 环境变量

复制 `cortex/.env.example` 为 `cortex/.env.local` 并填入真实值。

| 变量 | 是否进浏览器包 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | 项目 URL，非机密 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | anon public key，非机密，靠 `schema.sql` 的 RLS 隔离数据 |
| `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN` | 是 | `true` / `false` |
| `DEEPSEEK_API_KEY` | **否** | 只在服务端 `process.env` 读取，无 `NEXT_PUBLIC_` 前缀 |

**红线**：任何真实密钥都不得加 `NEXT_PUBLIC_` 前缀，也不得写进前端代码或提交到 GitHub。

## 本地启动

```powershell
cd cortex
npm install
npm run dev
```

若 PowerShell 提示找不到 `npm`（本机 Node 不在 PATH），先执行：

```powershell
$env:PATH = "C:\Users\yinxi\.workbuddy\binaries\node\versions\22.12.0;$env:PATH"
```

生产构建与生产模式启动：

```powershell
npm run build
npm run start
```

### Supabase 配置

1. https://supabase.com → New project（Region 建议 Singapore / Sydney）
2. Project Settings → API：复制 **Project URL** 与 **anon public key** 填入 `.env.local`
3. SQL Editor → 粘贴 `schema.sql` 全文执行（建 `orders` 表 + 三条 RLS 策略）
4. Authentication → Providers → Email：本地可先关闭 **Confirm email**，上线再打开
5. 上线后：Authentication → URL Configuration → Site URL 改为部署域名

未配置 Supabase 时网站进入**演示模式**：展示内置示例数据，登录/注册给出配置提示；AI 接口此时只做同源校验与限流，不要放入真实业务数据。

## 上传任意数据

不再要求固定列名或固定模板。支持 CSV / TSV / TXT / XLSX / XLS / JSON；列名兼容 BOM、空格、大小写与常见别名；上传后由 `/api/profile` 让 AI 判断数据领域、时间列、维度与指标，`lib/smart.js` 据此动态生成 KPI 与图表。缺失列会自动补齐后写入 `orders` 表。

图片 / PDF / 压缩包等二进制文件会给出明确错误提示。上传成功、失败、字段映射均有可关闭的中英双语提示。

**语言自动跟随**：界面选「中文」时，即使上传的是英文或其它语言的数据，AI 商业报告与数据画像也会把列名、品类、地区、渠道等术语自动译成简体中文（首次出现可括号附原文）；选「EN」时反向译成英文。用于程序匹配的原始列名保持不变，不影响图表与数值。

**界面语言与内容一致**：KPI、图表标签、AI 数据画像随界面语言即时切换，AI 报告按 `lang` 生成。若切换语言后已生成的报告语言与界面不一致，报告区会出现「翻译为 中文 / Translate to English」按钮，调用 `/api/translate` 一键翻译，无需重新生成报告，数字、货币与原始列名保持不变。`/api/translate` 同时支持 `items` 批量模式：营销落地页 `relaywork.html` 的中英文使用内置字典，其它语言（日 / 西 / 法）由模型分批翻译，结果缓存在浏览器与服务端。

## GitHub 代码管理

建议**仓库根设在工作区根**（`20261107092205/`），这样 `cortex/`、`setup/`、`website/` 都在同一个仓库里。

本机已安装 Git 2.56；换机器时用 `winget install --id Git.Git -e --source winget` 安装。

代码已推送到 `https://github.com/lucy868630-collab/lucy2.git`（公开仓库，默认分支 `main`），云端 CI 已全绿。以下命令是首次搭建的记录，**换机器时请直接 `git clone` 该仓库，不要在现有仓库里重复执行 `git init`**：

```powershell
cd C:\Users\yinxi\CodeBuddy\20261107092205
git config --global user.name "你的名字"       # 首次使用 Git 必须设置提交身份
git config --global user.email "你的邮箱"
git check-ignore -v cortex\.env.local          # 必须输出一条命中规则，确认密钥被忽略
git add .
git grep --cached -l -E 'sk-[A-Za-z0-9]{24,}|apify_api_[A-Za-z0-9]{20,}' # 必须无输出，确认没有密钥被暂存
git status                                     # 再确认 .env.local、node_modules、*.log 都不在列表里
git commit -m "feat: 商业工作台 v3.1 — 双语仪表板 / AI 数据画像 / 基础安全"
git branch -M main
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git push -u origin main
```

> 若密钥曾经被误提交过，**删除文件是不够的**：必须先在 DeepSeek / Supabase 控制台轮换密钥，再清理 Git 历史。

## CI（GitHub Actions）

`.github/workflows/ci.yml` 在每次 `push` / `pull_request` 到 `main` 时自动运行，共四步：

1. **明文密钥扫描**：`git grep -nIE` 同时匹配 DeepSeek/OpenAI `sk-`、Apify `apify_api_`、JWT `eyJ`、GitHub PAT `ghp_`、Google `AIza` 等常见格式，命中即失败。特意用 `git grep` 而非系统 `grep`——后者的 `{24,}` 量词在 Windows 参数解析下会被拆坏；同时显式检查退出码，`1` 才是「无匹配」，其他非 0 都判为扫描失败。
2. **忽略规则校验**：`git check-ignore cortex/.env.local` 必须命中。
3. **依赖安装**：`npm ci`，按 `cortex/package-lock.json` 锁定版本。
4. **生产构建**：`npm run build`，验证没有编译错误。

CI 不需要任何真实密钥；`NEXT_PUBLIC_*` 与 `DEEPSEEK_API_KEY` 只在部署平台控制台配置。推送后在仓库的 **Actions** 标签页查看结果，全绿再部署。

## 基础安全（当前实现）

- `.gitignore` 排除 `.env.local`、`.env.*.local`、`*.pem`、`*.key` 与日志。
- `lib/guard.js` 统一保护两个 AI 接口：
  - 已配置 Supabase 时，必须携带有效 `Authorization: Bearer <access_token>`，服务端用 `auth.getUser(token)` 校验；
  - 演示模式（未配置）要求请求同源（`Origin` / `Referer` 的 host 与 Host 一致）；
  - 每 IP 每分钟最多 12 次，超出返回 `429`；
  - 请求体上限 128KB，非法 JSON 返回 `400`。
- `schema.sql` 的 RLS 保证每个用户只能 select / insert / delete 自己的 `orders` 行。
- AI 密钥只在服务端读取，浏览器包里不含 `DEEPSEEK_API_KEY`。

**历史遗留已清理**：`setup/gen_ai_report.ps1`、`website/ai_config.json`、`setup/run_apify_scrape.ps1` 曾分别硬编码 DeepSeek 与 Apify 的真实令牌，现已全部改为「从环境变量 / `.env.local` 读取」或占位符。首次推送时被 **GitHub Secret Scanning 拦截**（命中提交内的 Apify token），清理后 `git commit --amend` 重写提交才放行——只改工作区文件是没用的，令牌已进入提交历史就必须重写历史。**这些旧令牌都应视为已泄露，请到 DeepSeek / Apify 控制台轮换**，并同步更新 `cortex/.env.local`。归档原型 `website/` 是前端直连 AI 的旧架构，已停用，不要把它当成正式版使用。

**已知局限（基础安全 ≠ 生产安全）**：内存限流在 Serverless 多实例之间不共享，正式运营应换成 Vercel KV / Upstash 等集中式限流；anon key 本来就是公开的，安全性完全依赖 RLS 策略是否正确。

## 现代全栈 AI 技术栈（v3.1 增量升级）

按「Modern Full-Stack AI Tech Stack」六层图升级。原有登录、上传、AI 报告页面与线上部署完全保留，新增能力走独立目录、可单独启用或关闭。访问 **`/stack`** 可看到六层组件的实时状态（数据来自 `/api/ready`）。

### 六层落地对照

| 层 | 图中技术 | 本项目实现 |
|---|---|---|
| Frontend | React / Next.js / TailwindCSS / TypeScript | React 19 + Next.js 15（已有）；`tsconfig.json` + `src/types/insights.ts` + `src/shared/api-client.ts`；Tailwind 加 `tw-` 前缀并关闭 preflight，与 `globals.css` 零冲突 |
| Backend | Node.js / Express / FastAPI | Next Route Handlers（已有）；`services/gateway` Express 网关（3001：helmet / CORS / 限流 / 代理 / 探针 / 优雅关闭）；`services/ai` FastAPI 微服务（8000：Pydantic 边界校验） |
| Database | PostgreSQL / MongoDB / Redis | Supabase PostgreSQL + RLS（已有，权威数据）；`src/shared/db/mongo.js` 可选事件存储；`src/shared/cache.js` 缓存旁路，有 `REDIS_URL` 走 Redis，否则内存 TTL |
| AI & ML | OpenAI API / LangChain / Vector DB / Hugging Face | `src/shared/ai/provider.js` 统一 DeepSeek / OpenAI / HF（OpenAI 兼容协议 + 重试）；`chain.js` prompt→model→parser 编排（可替换 LangChain）；`vector.js` + `embeddings.js` 余弦检索，无密钥时用本地哈希向量 |
| DevOps | Docker / Kubernetes / GitHub Actions / Vercel / AWS Lambda | `cortex/Dockerfile`、`docker-compose.yml`、`k8s/*.yaml`、`services/lambda/handler.mjs`；CI 增加 typecheck 与测试；Vercel 生产部署不变 |
| Auth & Security | JWT / OAuth 2.0 | Supabase Auth 的 JWT Bearer（已有 `guard.js`）+ Google OAuth 2.0（已有开关）；新增接口全部走鉴权、限流、输入校验与结构化脱敏日志 |

### 分层与新增接口

`src/` 采用 feature-first 三层：`controller → service → repository`，共享基础设施在 `src/shared/`（config / errors / logger / auth / cache / http / ai / db）。环境变量**只在** `src/shared/config.js` 读取，可选组件缺失时自动降级。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 存活探针 |
| GET | `/api/ready` | 六层逐层就绪状态 |
| GET | `/api/insights?group=&from=&to=&top=` | 业务 JSON API：JWT 鉴权、读 `orders` 聚合、缓存旁路 |
| POST | `/api/insights` | 对提交行即时聚合（不写库），输入白名单校验 |
| GET / POST | `/api/vector` | 向量库状态 / `add`、`search` |
| GET / POST | `/api/ai/chain` | 模型链路信息 / 双语问答（返回调用轨迹） |
| GET / POST | `/api/translate` | 通用 AI 翻译（单文本 / 批量，保留数字与列名，带缓存） |

`GET /api/insights` 即早先规划的 Phase 1 JSON 接口，后续 App 可直接用 `src/shared/api-client.ts` 调用。

### 本地运行

```powershell
# 主应用（3000）
cd cortex; npm ci; npm run dev

# Express 网关（3001，另开终端）
cd services/gateway; npm install; npm start

# FastAPI AI 微服务（8000，另开终端）
cd services/ai; pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000

# 或一键起全栈（需 Docker）
docker compose up -d --build
# 需要本地 PostgreSQL：docker compose --profile local-db up -d
```

验证：`npm run typecheck`、`npm test`（9 个用例）、`npm run build`、`python -m compileall -q services/ai/app`。

### 哪些组件需要外部账号

- **零配置即可运行**：主应用、网关、AI 微服务的 embeddings / 聚合 / 向量检索、`/stack` 页面、内存缓存。
- **需配置才生效**：Redis 直连（`REDIS_URL`）、MongoDB 事件存储（`MONGODB_URI`）、OpenAI / HuggingFace 模型（`OPENAI_API_KEY` / `HF_API_TOKEN`）、K8s 集群与镜像仓库、AWS Lambda 部署、Supabase Site URL（Google 登录）。
- Docker / Kubernetes / Lambda 均已交付可用的编排配置与适配器，但**本机未安装 Docker / kubectl，集群部署未在本机实测**。
- `NEXT_PUBLIC_*` 是构建期内联变量：Docker 通过 build args 注入、Vercel 通过项目环境变量注入，运行时修改不会生效。

## 测试与修复

改完代码后按此顺序验证：

```powershell
$env:PATH = "C:\Users\yinxi\.workbuddy\binaries\node\versions\22.12.0;$env:PATH"
cd cortex
npm run build          # 生产构建必须通过
npm run start          # 生产模式启动，端口 3000
```

另开一个 PowerShell 做冒烟测试：

```powershell
$base = "http://localhost:3000"
(Invoke-WebRequest "$base/").StatusCode                    # 200
(Invoke-WebRequest "$base/dashboard").StatusCode           # 200

# 站外无凭证调用 AI 接口：演示模式应 401（无 Origin），已配置 Supabase 也应 401（无 token）
try { Invoke-WebRequest -Method Post -Uri "$base/api/profile" `
  -Headers @{ "Content-Type" = "application/json" } -Body '{"fields":["Year"],"sample":[],"rowCount":0,"fileName":"t.csv"}' }
catch { $_.Exception.Response.StatusCode.value__ }

# 同源调用：应放行（演示模式）或要求 token（已配置 Supabase）
$h = @{ "Content-Type" = "application/json"; Origin = $base }
try { Invoke-WebRequest -Method Post -Uri "$base/api/profile" -Headers $h `
  -Body '{"fields":["Year"],"sample":[],"rowCount":0,"fileName":"t.csv"}' }
catch { $_.Exception.Response.StatusCode.value__ }
```

前端验收：注册 → 登录 → 上传一份非销售数据（如游客统计）→ 出现 AI 画像卡与对应领域图表 → 生成 AI 报告 → 切换中英文 → 上传成功/失败提示均可关闭。

## 网站部署：发布可实际访问的原型

### 当前线上状态（2026-11-08，已修复并验收）

- **生产地址：https://lucy2-jo6a.vercel.app** —— 公开可访问，`/` 与 `/dashboard` 返回 200，首页不显示「尚未配置 Supabase」。
- Vercel 项目 `lucy2-jo6a`（team `lucy-6fe2`），Root Directory `cortex`，Framework `Next.js`。3 个 `NEXT_PUBLIC_*` 为**明文 Config**、`DEEPSEEK_API_KEY` 为 Sensitive，均为 Production + Preview 作用域，值与 `cortex/.env.local` 一致。
- **根因与修复（2026-11-08）**：线上前端一度内联 `https://placeholder.supabase.co`，`supabaseConfigured=false`，站点停留在演示模式，注册请求根本不会发给 Supabase——这才是「收不到确认邮件」的真实原因。原因是 3 个 `NEXT_PUBLIC_*` 被建成 Sensitive 类型，从 GitHub 构建时没有内联进浏览器包；CLI 部署靠 `--build-env` 显式注入可以临时绕过，但随后一次 `git push` 自动部署又把生产别名覆盖回演示模式。现已把这 3 个变量删除并以明文 Config 重建（它们本来就会进浏览器包，无需加密），`vercel env pull` 校验与本地值一致。
- **Git push 会自动触发生产部署并切换生产别名**（此前判断「未生效」是误判）。`NEXT_PUBLIC_*` 是构建时内联的，改完环境变量必须重新部署才生效，不会即时生效。
- 手动部署（备用）：从**仓库根**执行 `vercel deploy --prod --force --yes --project lucy2-jo6a --scope lucy-6fe2`；从 `cortex/` 内上传会因找不到 Root Directory 而失败。项目级变量修好后不再强制需要 `--build-env`，保留显式注入更保险。
- **注册不发送邮件是预期行为**：Supabase 项目 `mailer_autoconfirm=true`（Confirm email 已关闭），`/auth/v1/signup` 直接返回 access token，前端拿到 session 后自动跳转 `/dashboard`，无需查收确认邮件。若日后需要找回密码等邮件，需在 Supabase 配置自定义 SMTP（免费默认邮件服务有严格限流且常进垃圾箱）。
- 线上验收：注册直接拿到 session；带 token 调 `/api/profile` 返回 200 且包含 AI 数据画像；无凭证请求返回 401。
- **端到端验收（2026-11-08）**：线上注册 → 上传写入 → 双语 AI 全链路通过。数据画像的 `*_zh` 字段全中文，而 `time_column` / `dimension_columns` / `metrics[].column` / `primary_metric` 逐字保留 `OrderDate`、`Revenue_NZD` 等英文原列名；中文报告把 `Electronics`、`Auckland` 译成中文并括号附原文，英文报告反向翻译（中文仅出现在括号内原文）。上传链路做了一组对照：经 `lib/date.js` 规范化后的日期写入 `orders` 返回 201，原始坏值 `+111132-12` 返回 400，确认报错根因与修复有效；测试行已删除，残留 0 行。
- 成功页里带 hash 的 `…-vercel.app` 受 Vercel Authentication 保护（打开会看到 `Login – Vercel`），**交付只用生产域名**。
- **已知待办（不阻塞交付）**：Supabase 的 Site URL / Redirect URLs 仍指向本地，只影响 Google 登录与邮件确认链接（需在 Supabase 控制台修改）；冒烟与端到端测试产生的 `smoke_*@example.com`、`e2e_*@example.com` 账号可在 Supabase → Authentication → Users 删除（本项目未开启用户自删除，Admin API 需要 service_role key）。

Next.js 带服务端 API 路由，**不能**部署到 GitHub Pages 等纯静态托管。推荐 Vercel（Next.js 官方平台，免费额度够原型用）：

1. 先把代码推到 GitHub 并确认 **Actions 全绿**（见上节）
2. 直接打开 **https://vercel.com/new**（新版 UI 的按钮叫右上角 `New Project`，不叫 "Add New → Project"）→ 在仓库列表选 `lucy2`；若列表里没有，用 **Import third-party Git repository** 直接贴仓库 URL
3. **Root Directory 填 `cortex`**：它在配置页 Framework Preset 附近，点 `Edit` 修改。`cortex/vercel.json` 已固定 `framework: nextjs`、`npm ci`、`npm run build`，其余保持默认
4. Environment Variables 在**同一个配置页往下滚**的折叠区，填入 `.env.example` 里的 4 个变量（**在 Vercel 控制台填，不要写进代码**）
5. Region 不在导入流程里（部署后到 Settings → Functions 才能调，Hobby 计划可能不支持），先跳过，不影响上线
6. Deploy → 得到 `https://<项目>.vercel.app`，全世界可访问
7. Supabase → Authentication → URL Configuration：Site URL 改成该域名，Redirect URLs 加上 `https://<项目>.vercel.app/dashboard`
8. 用真实浏览器走一遍「注册 → 上传 → AI 报告」，确认线上环境变量生效

也可通过 IDE 的部署集成（CloudBase / EdgeOne Makers / Cloud Studio）发布；选择支持 **Node 服务端运行** 的方案，不要选纯静态托管。**当前 IDE 里的部署集成处于未连接状态**，需先在集成面板完成连接，才能由工具直接发布并拿到公网 URL。

### Waitlist 上线前置（容易踩的坑）

`cortex/waitlist_schema.sql` 必须在**与 `NEXT_PUBLIC_SUPABASE_URL` 指向的同一个 Supabase 项目**里，用 SQL Editor 整体执行一次。跑在账号下的另一个项目里不会生效——两个项目 ID 不同，anon key 也不通用。

- 核对方式：Supabase → Settings → API → Project URL，应与环境变量里的域名完全一致（**不含** `/rest/v1/`）。
- `/api/ready` 的 `postgres: ok` 只说明 URL 与 anon key 已配置，**不检测 `public.waitlist` 是否存在**。表缺失时 `/api/waitlist` 返回 502，Supabase 原始报错为 `PGRST205: Could not find the table 'public.waitlist' in the schema cache`。
- 脚本末尾的 `notify pgrst, 'reload schema';` 会立刻刷新 PostgREST schema cache；脚本幂等，可重复执行。
- 权限设计：`anon` 只有 `insert`、没有 `select`，名单在 Supabase 控制台查看。
- **别给 `anon` 开 `SELECT`**：`/api/waitlist` 用 `Prefer: return=minimal`，重复邮箱靠 `email` 唯一约束返回的 409/23505 幂等处理。若改用 `resolution=ignore-duplicates`，PostgREST 会额外要求 `SELECT` 权限，所有提交都会变成 `42501 permission denied for table waitlist`。
- `42501 permission denied for table waitlist` 是**健康状态**（表存在、RLS 生效），`/api/waitlist/status` 会报 `ready: true`；只有 `Invalid API key` 才是密钥与项目不匹配。不要为了消掉 401 去 `grant select`。
- 部署后打开 `/api/waitlist/status` 自助核对：`ready: true` 表示表已就绪；`table_missing` 表示表未建；`key_mismatch` 表示 URL 与 anon key 不是同一个项目。该端点只读，不返回名单内容，也不返回任何密钥。

### 落地页分享图

`og:image` / `twitter:image` 指向 1200×630 的 PNG（微信 / X / Facebook 基本不抓 SVG），中英文各一张。改文案后运行 `python cortex/scripts/generate-og.py` 重新生成（依赖 Pillow，字体取自 Windows 系统目录）；仓库里的 SVG 保留作源稿参考。

### Waitlist 运营（全部可选，不配置也不影响收名单）

- **确认邮件**：填 `RESEND_API_KEY` + `WAITLIST_MAIL_FROM`（发件域名需在 Resend 验证）后，`POST /api/waitlist` 入库成功会按界面语言发一封事务性确认邮件。未配置、超时或 Resend 拒收都只返回 `notification: "skipped" / "failed"`，**不会让报名失败**；日志只记邮箱域名与状态，不记完整地址。可用 `WAITLIST_CONFIRM_ENABLED=false` 显式关闭。
- **名单后台**：`GET /api/waitlist/admin`（`Authorization: Bearer <WAITLIST_ADMIN_TOKEN>`）读取名单，管理页在 `/waitlist-admin`。`WAITLIST_ADMIN_TOKEN` 与 `SUPABASE_SERVICE_ROLE_KEY` **两项都填**才启用，缺任一项直接拒绝，绝不回退到匿名读取；凭证用常量时间比较并受限流保护，token 只存在浏览器 `sessionStorage`。service_role 是高权限密钥，只放服务端环境变量，绝不加 `NEXT_PUBLIC_` 前缀。
- **不配置也能用**：名单始终可在 Supabase 控制台查看，管理页会明确提示未配置，而不是假装成功。
- **联系邮箱**：落地页可见文案、页脚、JSON-LD 与确认邮件模板统一使用 `lucy868630@gmail.com`。邮件模板的值可用 `SITE_CONTACT_EMAIL` 覆盖；落地页是静态 HTML，换邮箱时需在 `public/relaywork.html` 里搜索旧地址一并替换。个人邮箱会出现在页面源码与结构化数据里，若不想被爬虫采集，可删掉 JSON-LD 的 `email` 字段。

### 冷启动执行看板

`https://lucy2-jo6a.vercel.app/pipeline.html`（内部工具，已设 `noindex`），配合 `relaywork/cold-outbound.txt` 使用。记录目标公司、联系人、渠道、状态、下一步与备注，带 7 天未跟进提醒、中英双语、亮暗主题、CSV 导入导出。状态流：待联系 → 已联系 → 已回复 → 已预约 → 成交 / 暂缓。

- 数据只存在浏览器 `localStorage`，不上传、无外部请求、**不代找联系人、不代发邮件、不代外呼**。清除浏览器数据会丢失，重要记录请定期导出 CSV。
- 外联仍需人工、低量、个性化执行，并遵守 CAN-SPAM / GDPR / PECR / TCPA 与当地法规；工具里的联系人信息由使用者自行依法获取。

### 交付验收清单

- [x] `npm run build` 通过，无报错
- [x] 本地 `/`、`/dashboard` 返回 200
- [x] 无凭证调用 AI 接口被拒绝
- [x] `.env.local` 未被 Git 跟踪，暂存区无明文密钥
- [x] 代码已推送 GitHub（`main`，公开仓库）
- [x] Actions 在云端全绿：密钥扫描 / 忽略规则 / `npm ci` / `npm run build`
- [x] 公网 URL 可打开：`https://lucy2-jo6a.vercel.app`
- [x] Vercel 4 个环境变量已配置，生产部署已重建并生效
- [x] 线上前端已内联真实 Supabase 地址（不再是 placeholder 演示模式）
- [x] 线上注册免邮件确认，直接拿到 session 并跳转工作台
- [x] 线上注册 + 带 token 调 AI 画像接口返回 200
- [ ] Supabase Site URL / Redirect URLs 指向该域名（可选，仅影响 Google 登录 / 邮件确认）
- [x] 线上端到端验收：注册 → 上传写入（含异常日期 201/400 对照）→ 双语 AI 画像 / 报告 → 测试数据清理
- [ ] Waitlist 建表已在**正确项目**执行：`/api/waitlist` 真实入库 200、anon 读不到名单、测试数据已清理

## React Native / Expo → iOS（了解路径，尚未实施）

**现在不要开始写 App**：Backend 还没有业务 JSON API，业务逻辑仍在前端，详见 `四层架构评估与App扩展路线.md` 的 Phase 1–4。

建议的学习与接入顺序：

1. **前置**：先完成 Phase 1（`/api/insights` 等 JSON 接口 + Bearer token 认证）。`lib/guard.js` 已经支持 `Bearer <access_token>`，App 可直接沿用。
2. **Expo 起步**：`npx create-expo-app` → Expo Go 在真机预览 → 熟悉 `app/` 文件路由、Stack/Tab 导航。
3. **接数据**：用 `@supabase/supabase-js` 拿 access token，之后所有请求 `fetch(API_BASE + "/api/insights", { headers: { Authorization: "Bearer " + token } })`。App 只渲染，不做聚合。
4. **可复用**：`lib/i18n.js`、`lib/smart.js` 是纯 JS，可直接复制进 App；**Chart.js 不能复用**（DOM 库），要换 `react-native-svg` / Victory / `react-native-chart-kit`。
5. **iOS 发布**：Apple Developer Program（年费）→ EAS Build 打包 → TestFlight 内测 → App Store 审核。原型阶段先用 Expo Go + TestFlight，不必急着上架。
