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

### 当前线上状态（2026-11-07）

- **生产地址：https://lucy2-jo6a.vercel.app** —— 已可公开访问，`/` 与 `/dashboard` 返回 200，无凭证调用 AI 接口返回 401。
- Vercel 项目 `lucy2-jo6a`（team `lucy-6fe2`），从 GitHub 仓库 `lucy868630-collab/lucy2` 的 `main` 分支自动部署，Root Directory `cortex`。
- 成功页里那个带 hash 的 `lucy2-jo6a-nr1jzvl22-...vercel.app` 是**预览部署**，受 Vercel Authentication 保护（打开会看到 `Login – Vercel`），不要当成交付地址。
- **待办**：环境变量尚未在 Vercel 配置，线上目前是演示模式——登录/注册不可用，AI 接口报 `DEEPSEEK_API_KEY 未配置`。到项目 **Settings → Environment Variables** 补齐 4 个变量，再 **Deployments → Redeploy**（`NEXT_PUBLIC_*` 在构建时内联，不重新部署不生效）；随后把 Supabase 的 Site URL 改为本域名。

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

### 交付验收清单

- [x] `npm run build` 通过，无报错
- [x] 本地 `/`、`/dashboard` 返回 200
- [x] 无凭证调用 AI 接口被拒绝
- [x] `.env.local` 未被 Git 跟踪，暂存区无明文密钥
- [x] 代码已推送 GitHub（`main`，公开仓库）
- [x] Actions 在云端全绿：密钥扫描 / 忽略规则 / `npm ci` / `npm run build`
- [x] 公网 URL 可打开：`https://lucy2-jo6a.vercel.app`（页面与接口鉴权已验证）
- [ ] Vercel 补齐 4 个环境变量并 Redeploy
- [ ] Supabase Site URL / Redirect URLs 指向该域名
- [ ] 线上注册 / 上传 / AI 报告三项可用

## React Native / Expo → iOS（了解路径，尚未实施）

**现在不要开始写 App**：Backend 还没有业务 JSON API，业务逻辑仍在前端，详见 `四层架构评估与App扩展路线.md` 的 Phase 1–4。

建议的学习与接入顺序：

1. **前置**：先完成 Phase 1（`/api/insights` 等 JSON 接口 + Bearer token 认证）。`lib/guard.js` 已经支持 `Bearer <access_token>`，App 可直接沿用。
2. **Expo 起步**：`npx create-expo-app` → Expo Go 在真机预览 → 熟悉 `app/` 文件路由、Stack/Tab 导航。
3. **接数据**：用 `@supabase/supabase-js` 拿 access token，之后所有请求 `fetch(API_BASE + "/api/insights", { headers: { Authorization: "Bearer " + token } })`。App 只渲染，不做聚合。
4. **可复用**：`lib/i18n.js`、`lib/smart.js` 是纯 JS，可直接复制进 App；**Chart.js 不能复用**（DOM 库），要换 `react-native-svg` / Victory / `react-native-chart-kit`。
5. **iOS 发布**：Apple Developer Program（年费）→ EAS Build 打包 → TestFlight 内测 → App Store 审核。原型阶段先用 Expo Go + TestFlight，不必急着上架。
