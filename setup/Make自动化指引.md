# Make.com 自动化指引：让采集与分析每周自动运行

> 目标：把「Apify 采集竞品 → 数据落盘 → AI 生成报告 → 发到邮箱」连成无人值守的自动流水线。
> 费用：Make.com 免费版每月 1,000 credits，本场景每周运行一次，绰绰有余。

---

## 第 1 步：注册 Make.com

1. 打开 https://www.make.com → Get started free → 注册（可用 Google 账号）
2. 进入 Dashboard，界面语言可切中文

## 第 2 步：创建 Scenario（自动化场景）

点 Create a new scenario，按顺序拖入模块（Module）：

### 模块 1：Schedule（定时触发器）
- Type: Every week，选一个时间（如周一早上 7:00）——流水线的"闹钟"

### 模块 2：Apify — Run an Actor
1. 添加模块，搜索 Apify
2. 首次使用要求连接：粘贴你的 Apify API Token
3. Action 选 Run an Actor（异步运行）
4. Actor 选 automation-lab/google-shopping-scraper
5. Input JSON：
   {"queries": ["coffee beans 250g", "single origin coffee nz"], "maxResults": 15}

### 模块 3：Apify — Get Dataset Items
- Dataset ID 来源：模块 2 输出的 defaultDatasetId，Limit 填 50

### 模块 4（二选一，先从简单的开始）：

方案 A — 邮件周报（推荐第一步）
- 添加 Email 或 Gmail 模块 → Send an email
- 收件人：你自己
- 正文：用 Make 的函数把竞品条目拼成列表（title | merchant | price）

方案 B — 存入 Google Sheets（方便以后喂给网站/AI）
- 添加 Google Sheets 模块 → Add a Row
- 建一个表格《竞品价格追踪》，列：日期 / 商品 / 商家 / 价格 / 查询词
- 每周自动追加，积累几个月就是一份"价格趋势数据库"

## 第 3 步：测试与激活

1. 点左下角 Run once 手动跑一遍，看每个模块的输出气泡是否正常
2. 常见问题：Apify 模块报 402 → 免费额度用尽；Sheets 报权限 → 重新授权 Google 账号
3. 没问题后把开关拨到 ON（Scheduling: ON）——从此每周自动运行

## 第 4 步：进阶玩法（第二层毕业设计）

跑通基础流水线后，加一个 AI 模块形成完整闭环：

定时触发 → Apify 采集 → Sheets 记录
        ↓
HTTP 模块调用 DeepSeek API（和本地脚本一模一样的 POST）
        ↓
自动生成《本周竞品价格动态 + 定价建议》→ 发邮件

这一步做完，你就拥有了一个每周自动盯市场、写报告的数字员工。

---

## 安全提醒

- Apify Token / DeepSeek Key 只在 Make 的连接设置里填写，不要写在场景描述或分享的 blueprints 里
- Make 免费版建议只保留每周一次运行，防止额度意外耗尽

## 完成标志

- [ ] Make.com 注册成功
- [ ] Scenario 跑通：定时 → Apify 采集 → Sheets/邮件
- [ ] （进阶）接入 DeepSeek 自动生成周报
