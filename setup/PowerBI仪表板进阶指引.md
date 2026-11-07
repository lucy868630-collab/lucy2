# 第一层完整闭环：Power BI 从导入到商业仪表板

> 前置：已完成 `setup/PowerBI数据导入指引.md` 的第 1–5 步（数据已加载、柱形图验证通过）。
> 目标：做出一个能回答业务问题的仪表板，并保存为 `.pbix` 成果文件。
> 预计用时：30–45 分钟。

---

## 第 1 步：建立日期表（时间智能的基础）

Power BI 的同比、环比、累计都需要一张独立的连续日期表。

**建模 → 新建表（New table）**，粘贴：

```dax
DateTable =
VAR MinDate = MIN ( sales_data[OrderDate] )
VAR MaxDate = MAX ( sales_data[OrderDate] )
RETURN
ADDCOLUMNS (
    CALENDAR ( DATE ( YEAR ( MinDate ), 1, 1 ), DATE ( YEAR ( MaxDate ), 12, 31 ) ),
    "Year", YEAR ( [Date] ),
    "Quarter", "Q" & QUARTER ( [Date] ),
    "Month", FORMAT ( [Date], "MMM" ),
    "MonthNo", MONTH ( [Date] ),
    "YearMonth", FORMAT ( [Date], "YYYY-MM" )
)
```

然后两步关键操作：

1. 选中 `DateTable` → **表工具 / Table tools** → **标记为日期表 / Mark as date table** → 日期列选 `Date`
2. 左侧 **模型视图 / Model view** → 把 `DateTable[Date]` 拖到 `sales_data[OrderDate]` 上建立 **1 → * 关系**

## 第 2 步：建立度量值（商业指标定义）

**建模 → 新建度量值**，逐个粘贴（每建一个点一次）：

```dax
Total Revenue = SUM ( sales_data[Revenue_NZD] )

Total Profit  = SUM ( sales_data[Profit_NZD] )

Profit Margin % = DIVIDE ( [Total Profit], [Total Revenue] )

Orders = DISTINCTCOUNT ( sales_data[OrderID] )

Units Sold = SUM ( sales_data[Quantity] )

Avg Order Value = DIVIDE ( [Total Revenue], [Orders] )

Revenue PM = CALCULATE ( [Total Revenue], PREVIOUSMONTH ( DateTable[Date] ) )

MoM Growth % = DIVIDE ( [Total Revenue] - [Revenue PM], [Revenue PM] )

Revenue YTD = TOTALYTD ( [Total Revenue], DateTable[Date] )
```

选中 `Profit Margin %`、`MoM Growth %` → 功能区格式设为 **百分比**；金额类度量值设为 **货币 / $ en-NZ**。

> 💡 这些度量值就是网站 AI 报告的分析框架——第一层定义指标，第三层复用指标，这是答辩时最值得讲的一句话。

## 第 3 步：搭建仪表板布局

回到 **报表视图**，按下面摆放 6 个视觉对象：

| 位置 | 视觉对象 | 字段 |
|---|---|---|
| 顶部 4 个 | **卡片 / Card** | `Total Revenue`、`Total Profit`、`Profit Margin %`、`Orders` |
| 左中（大） | **折线图 / Line chart** | X轴 `DateTable[YearMonth]`，Y轴 `Total Revenue` + `Total Profit` |
| 右中 | **条形图 / Bar chart** | Y轴 `ProductCategory`，X轴 `Total Revenue` |
| 左下 | **条形图 / Bar chart** | Y轴 `Region`，X轴 `Total Revenue` |
| 中下 | **矩阵 / Matrix** | 行 `ProductCategory`，列 `Channel`，值 `Total Revenue`、`Profit Margin %` |
| 右下 | **环形图 / Donut** | 图例 `Channel`，值 `Total Revenue` |

最后加 **切片器 / Slicer**：`DateTable[Year]` 和 `ProductCategory`，放在顶部。点切片器时所有图表联动——这才是"能回答业务问题"的仪表板。

## 第 4 步：与网站/AI 报告对账（三层一致性）

仪表板数字应和 Cortex 网站、AI 报告完全一致：

| 指标 | 应有值 |
|---|---|
| Total Revenue | **NZ$ 8,125.38** |
| Total Profit | **NZ$ 4,737.85** |
| Profit Margin % | **58.3%** |
| Orders | **500** |
| Units Sold | **968** |
| 营收最高品类 | Retail Beans ≈ NZ$ 2,708.83 |
| 营收最高城市 | Auckland ≈ NZ$ 2,791.63 |

数字对不上时，优先检查第 1 步的日期表关系和 `OrderDate` 是否为 Date 类型。

## 第 5 步：保存成果文件（作品集素材）

1. `Ctrl + S` → 保存为 `c:\Users\yinxi\CodeBuddy\20261107092205\sales_analysis.pbix`
2. **文件 → 导出 → PDF**（或截图仪表板全页）放进作品集
3. 可选：把切片器切到"Auckland + Coffee"，再截一张，展示交互筛选能力

## 第一层闭环的三个业务问题（答辩用）

做完仪表板后，试着用图表回答：

1. **哪个品类最赚钱？** → 看矩阵里的 `Profit Margin %`：Tea 约 75%、Coffee 约 70% 最高；Retail Beans 营收最大但只有 45%
2. **哪个市场值得加投？** → Auckland 营收占约 34%，是核心市场
3. **线上值不值得推？** → 渠道环形图：门店 67% / 线上 33%，线上复购型商品（咖啡豆）有增长空间

这三个答案，正好就是第二层 AI 报告里自动生成的内容——**先人工跑通，再让 AI 自动化**，这就是三层路线的逻辑。

---

## 常见报错

| 现象 | 处理 |
|---|---|
| `CALENDAR` 报表头报错 | `OrderDate` 还是文本，去表格视图改成 Date |
| `PREVIOUSMONTH` 返回空 | 日期表没标记，或没建关系 |
| 度量值显示"无法确定关系" | 模型视图检查 `DateTable[Date] → sales_data[OrderDate]` 的 1→* 箭头 |
| 金额小数位/货币符号不对 | 选中度量值 → 度量工具 → 格式 → 货币，选英语(新西兰) |
