# 第二层：Apify 竞品数据采集指引

> 目标：用 Apify 抓取公开的竞品商品价格（新西兰市场），导出 CSV，让 AI 结合你的销售数据一起分析。
> 原则：只采集**公开可访问**的商品价格信息，不采集私人账号或受限制数据。

---

## 第 1 步：注册 Apify 免费账户（5 分钟）

1. 打开 https://apify.com → 点 **Get started / Sign up**
2. 用 Google 账号或邮箱注册（免费）
3. 免费计划自带 **每月 $5 使用额度**——对于每月抓几百条商品价格绰绰有余
4. 登录后进入 **Console（控制台）**

## 第 2 步：选一个采集 Actor（现成工具，不用写代码）

Apify 的 "Actor" 就是别人写好的采集器，直接配置运行。推荐两个：

| Actor | 用途 | 怎么找 |
|---|---|---|
| **Google Shopping Scraper**（推荐首选） | 按关键词搜索 Google Shopping 的商品+价格，可指定国家 NZ | 控制台顶部搜索框输入 `google shopping` |
| **Website Content Crawler** | 抓取竞品官网页面内容（价格页、产品页） | 搜索 `website content crawler` |

**为什么先用 Google Shopping**：新西兰超市官网（Woolworths/Countdown、PAK'nSAVE、New World）有较强的反爬机制，新手容易碰壁；Google Shopping 已聚合了这些商家的公开报价，一次搜索拿到多家价格，是合规又省力的切入点。

## 第 3 步：运行第一次采集（以咖啡豆竞品为例）

1. 打开 Google Shopping Scraper 的页面 → 点 **Try for free / Run**
2. 填写输入（Input）：
   ```
   Keywords / 搜索词:
     - "coffee beans 250g"
     - "house blend coffee"
     - "single origin coffee nz"
   Country: New Zealand
   Max results per keyword: 20~50
   ```
3. 点 **Start / Save & Start**
4. 等待 1–3 分钟，任务完成
5. **Export** 处选 **CSV** 或 **JSON** 下载（或复制 Dataset 的 URL）

导出的数据一般包含：商品名、商家名（countdown.co.nz、newworld.co.nz 等）、价格、链接。

## 第 4 步：把竞品数据交给 Cortex 分析

两种用法（我们后续都会实现）：

- **用法 A（现在就能做）**：把导出的 CSV 放进工作区（建议 `setup/competitor_prices.csv`），我帮你清洗成标准格式，再和 sales_data.csv 一起生成"我的价格 vs 市场价格"对比分析
- **用法 B（自动化，第三阶段）**：注册 Make.com 免费账户，把 "Apify 运行完成 → 自动把结果发到你的邮箱/文档 → 调用 AI 生成周报" 连成自动流水线（免费版每月 1,000 credits 足够）

## 第 5 步（可选）：获取 API Token，实现一键采集

如果你想让我直接帮你跑采集和自动化：

1. Apify Console → 左下角 **Settings** → **API & Integrations**
2. 复制你的 **API Token**
3. 把 Token 发给我，我就可以写脚本用 Apify API 帮你自动运行采集任务、自动下载结果（Token 等同账户权限，只在你信任的本地环境使用；用完可随时在 Apify 后台重新生成更换）

---

## 常见问题

| 问题 | 处理 |
|---|---|
| Actor 运行收费提示 | 免费额度内可运行；确认右上角显示 pricing 在 $5/月免费额度内即可 |
| 搜索结果里没有 NZ 商家 | 把关键词加上 "nz"，或把 Country/Geo location 明确设为 New Zealand |
| 想抓特定竞品官网价格 | 用 Website Content Crawler，Start URL 填竞品的价格/产品页 URL |
| 数据列乱七八糟 | 直接把导出文件给我，我来清洗成统一格式 |

## 完成标志

- [ ] Apify 账户注册成功
- [ ] 成功运行一次 Google Shopping 采集（NZ + coffee beans）
- [ ] 导出一份 CSV 到工作区（建议放 `setup/competitor_prices.csv`）
- [ ] （可选）把 API Token 交给我配置自动化
