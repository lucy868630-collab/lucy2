# Power BI Desktop 数据导入操作指引

> 目标：把示例销售数据 `sales_data.csv`（500 条订单，14 个字段，覆盖 12 个月）导入 Power BI，并做出第一张验证图表。
> 预计用时：10–15 分钟。
> 界面按钮同时标注中文和英文（Power BI 默认可能是英文界面）。

---

## 第 0 步：打开 Power BI 并跳过登录干扰

1. 开始菜单搜索 **Power BI Desktop** 并打开。
2. 如果弹出登录窗口：用你现有的微软账户（Outlook/Hotmail）登录即可。
   - 弹出"升级到 Pro"之类的提示，全部选择 **以后再说 / Maybe later**。免费版足够完成全部学习内容。
3. 关闭欢迎页，进入空白报表界面。

## 第 1 步：获取 CSV 数据

1. 顶部功能区点 **主页 / Home** → **获取数据 / Get data** → **文本/CSV / Text/CSV**。
2. 在文件选择框中粘贴以下路径后回车：
   ```
   c:\Users\yinxi\CodeBuddy\20261107092205\setup\sales_data.csv
   ```
3. 选中 `sales_data.csv` → 点 **打开 / Open**。

## 第 2 步：预览窗口检查（重要）

会弹出一个数据预览窗口，花 30 秒确认三件事：

| 检查项 | 应该看到 | 如果不对 |
|---|---|---|
| 中文显示 | 无乱码（Flat White、奥克兰等正常） | 文件名下拉框把编码换成 **65001: Unicode (UTF-8)** |
| 列数 | 14 列：OrderDate, OrderID, CustomerID, ProductCategory, ProductName, Region, Channel, PaymentMethod, Quantity, UnitPrice_NZD, UnitCost_NZD, Revenue_NZD, Cost_NZD, Profit_NZD | 少列说明编码解析错了，同样改编码 |
| 预览行数 | 显示约几百行 | — |

确认无误 → 点 **加载 / Load**（不要点"转换数据"，初学阶段直接加载更快）。

## 第 3 步：检查字段类型

加载后，界面右侧应出现三个面板：

- **数据 / Data**（最右侧）：列出 `sales_data` 表和 14 个字段
- **可视化 / Visualizations**：图表类型
- **字段 / Fields**：把字段拖进图表的区域

点左侧 **表格视图 / Table view**（左侧第二个图标），检查关键列的类型图标：

| 列 | 应显示类型 | 修改方法 |
|---|---|---|
| OrderDate | 日期图标 📅 | 若是"文本"，选中列 → 功能区 **列工具 / Column tools** → **数据类型 / Data type** 改为 **日期 / Date** |
| Revenue_NZD / Profit_NZD 等金额列 | 小数 ⚙ 1.2 | 若是文本，改为 **十进制数 / Decimal number** |
| Quantity | 整数 123 | 同上，改为 **整数 / Whole number** |

## 第 4 步：制作第一张验证图表

1. 点左侧 **报表视图 / Report view**（左侧第一个图标）。
2. 确认画布空白处被选中（没选中任何图表）。
3. 在 **可视化 / Visualizations** 面板点 **簇状柱形图 / Clustered column chart**。
4. 从 **数据** 面板拖字段：
   - `ProductCategory` → 拖到 **X 轴 / X-axis**
   - `Revenue_NZD` → 拖到 **Y 轴 / Y-axis**
5. 图表应显示 5 根柱子，**从高到低大致为**：

| 品类 | 营收 (NZD) |
|---|---|
| Retail Beans | ≈ 2,709 |
| Lunch | ≈ 1,673 |
| Coffee | ≈ 1,483 |
| Tea | ≈ 1,361 |
| Bakery | ≈ 899 |

✅ **看到这 5 根柱子 = 导入 100% 成功**（这组数字同时显示在网站原型的环形图里，两边一致）。

## 第 5 步：保存工作簿

- `Ctrl + S`，保存为 `c:\Users\yinxi\CodeBuddy\20261107092205\sales_analysis.pbix`。

---

## 常见问题排查

| 现象 | 原因 | 解决 |
|---|---|---|
| 提示"找不到文件" | 路径输入错误 | 复制上面第 1 步的完整路径重新粘贴 |
| 所有列挤在一列里 | 分隔符识别错误 | 点 **转换数据 / Transform Data** → **主页** → **拆分列 → 按分隔符** → 选"逗号" |
| 金额列显示错误数字（如 11.9 变 1190） | 区域设置差异 | **文件 → 选项和设置 → 选项 → 区域设置** 改为 **英语(新西兰)** |
| 图表 Y 轴显示"求和"但想看平均值 | 聚合方式 | Y 轴字段旁下拉 → 换成 平均值等 |
| 电脑卡顿 | 内存压力 | 关闭其他大程序；16GB 内存正常足够 |

## 完成后的下一步预告

导入成功后，我们的路线是：

1. **进阶建模**：建立日期表（Date table）+ 计算度量值（如利润率 `DIVIDE(SUM(Profit_NZD), SUM(Revenue_NZD))`）
2. **完整仪表板**：月度趋势线图 + 城市地图 + 品类树状图 + KPI 卡片
3. **AI 模块**：用 ChatGPT 分析这份数据，生成商业建议报告，与网站原型的 AI 报告功能呼应

遇到任何一步卡住，把看到的界面截图或错误提示发给我即可。
