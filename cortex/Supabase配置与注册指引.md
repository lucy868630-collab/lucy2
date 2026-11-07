# Supabase 项目创建与注册指引（Cortex v3.0）

> 这份文档记录「第三层正式网站」的后台配置全过程，同时可作为 NZSE 作品集的技术说明文档。

---

## 当前项目状态（已全部完成 ✅）

| 检查项 | 状态 |
|---|---|
| Supabase 项目（亚太区域） | ✅ 已创建 |
| Project URL | ✅ `https://dqmiqkuuudcdgpsuccxb.supabase.co` |
| Publishable Key | ✅ 已验证有效并写入 `cortex/.env.local` |
| `orders` 数据表 + 行级安全 RLS | ✅ 已创建（API 验证 HTTP 200） |
| 邮箱注册功能 | ✅ 已开启 |
| DeepSeek Key（服务端） | ✅ 已配置 |
| Next.js 网站 | ✅ 运行于 http://localhost:3000 |

---

## 第 1 步：创建项目（回顾）

1. 打开 https://supabase.com → Sign up（用 Google 账号最快）
2. **New project**：项目名 `cortex`，数据库密码自己保存好
3. **Region 选亚太**：Singapore 或 Sydney 均可，离新西兰近、延迟低（你的项目已选亚太 ✅）
4. 等待约 2 分钟，状态变为绿色 Active

## 第 2 步：认识三种 Key（重要安全知识）

Supabase 新版 API Keys 页面会看到这几类，**用途完全不同**：

| Key 前缀 | 名称 | 能不能放前端？ | 用途 |
|---|---|---|---|
| `sb_publishable_...` | Publishable key | ✅ 可以 | 网站前端用来登录、读写数据（受 RLS 限制） |
| `sb_secret_...` | Secret key | ❌ **绝对不行** | 拥有绕过 RLS 的完全权限，只能放服务器后端 |
| `sbp_...` | 旧格式/其他 key | 视情况 | 本项目不用（已验证无效） |

**我们网站用的是 `sb_publishable_...`**，配合 `orders` 表的 RLS 策略，保证每个客户只能看到自己的数据。

> 安全原则：前端代码里出现的任何值都等同于"公开"。Secret key 一旦泄露，别人可以读写你数据库所有客户的数据。

## 第 3 步：创建数据表（回顾）

1. Supabase 左侧 **SQL Editor** → **New query**
2. 把 `cortex/schema.sql` 全部内容粘贴进去 → **Run**
3. 看到 Success 即完成

这段 SQL 做了两件事：
- 建 `orders` 表（订单日期、品类、城市、渠道、营收、利润、user_id 等字段）
- 启用 **Row Level Security**，三条策略限定 `auth.uid() = user_id`——**每个账户只能查/增/删自己的数据**

验证方法：REST 访问 `/rest/v1/orders?select=id&limit=1` 返回 HTTP 200（我们已实测通过 ✅）。

## 第 4 步：注册第一个真实账户（现在就做）

1. 打开 **http://localhost:3000**
2. 点 **「注册」** 标签（Sign up）
3. 填邮箱 + 密码（至少 6 位）→ **创建账户**
4. 两种情况：
   - 提示"注册成功，请查收确认邮件" → 去邮箱点确认链接，再回来登录
   - 想跳过邮箱验证（本地测试更方便）→ Supabase **Authentication → Sign In / Providers → Email** → 关闭 **Confirm email** → Save

> 当前后台设置：注册功能已开启（disable_signup = false），邮箱登录已启用。

## 第 5 步：上传数据验证持久化

1. 登录后进入仪表板（默认展示内置示例数据）
2. 页面底部拖拽区 → 选择 `setup/sales_data.csv`（500 行）
3. 出现绿色提示 "已上传 500 行到你的账户" → 仪表板按真实数据重算
4. 验证数据真的落库：Supabase **Table Editor → orders** → 能看到 500 行，每行 `user_id` 是你的账户 ID
5. **退出登录再重新登录**，数据依然在 —— 这就是和原型最大的区别

## 第 6 步：AI 报告（服务端代理）

- 仪表板点 **「AI 生成报告」**
- 请求发到 `/api/report`，由 Next.js 服务端用 `DEEPSEEK_API_KEY` 调 DeepSeek
- **Key 不会出现在浏览器里**（F12 网络面板也看不到）——正式产品的标准做法

## 第 7 步：部署上线（作品集展示）

1. 把 `cortex/` 推到 GitHub
2. Vercel 免费账户 → Import 项目
3. 环境变量填同样的三个值（URL / publishable key / DeepSeek Key）
4. Supabase **Authentication → URL Configuration** → Site URL 改成 Vercel 域名
5. 完成：得到一个全世界可访问、带真实账户体系的 AI 商业智能网站

---

## 常见问题

| 现象 | 处理 |
|---|---|
| 登录提示 Invalid API key | 检查 `.env.local` 是否用了有效的 `sb_publishable_...`，改完必须**重启** `npm run dev` |
| 注册后收不到确认邮件 | 关闭 Confirm email（第 4 步），或检查垃圾邮件箱 |
| 上传报 "new row violates row-level security" | `schema.sql` 没跑完整，重新执行一遍 |
| 上传后仪表板没变 | 看页面上方红色错误提示，通常是 CSV 缺列（参照 `setup/sales_data.csv` 的表头） |
| 网站打不开 | 确认 `npm run dev` 在运行；端口 3000 被占用则改 `package.json` 里的 `-p` 参数 |

## 三层架构回顾（可用于作品集答辩）

```
第一层  BI 分析      Power BI + sales_data.csv（销售/品类/区域/利润）
第二层  自动化         Apify 采集竞品 → Make 定时 → DeepSeek 分析
第三层  正式产品       Next.js + Supabase（账户/RLS/持久化）+ 服务端 AI
                     ↑ 你现在在这里
```
