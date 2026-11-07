# 用 DeepSeek 生成《定价竞争力分析报告》：销售数据 + 竞品价格 三层合体
$ErrorActionPreference = "Stop"

# 密钥只从环境变量读取，绝不写进代码或提交到 GitHub
# 用法： $env:DEEPSEEK_API_KEY = "sk-..." ; .\gen_ai_report.ps1
# 也可复用 cortex/.env.local，本脚本会自动读取
if (-not $env:DEEPSEEK_API_KEY) {
    $envFile = Join-Path $PSScriptRoot "..\cortex\.env.local"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile -Encoding UTF8 | Where-Object { $_ -like 'DEEPSEEK_API_KEY=*' } | Select-Object -First 1
        if ($line) { $env:DEEPSEEK_API_KEY = ($line -split '=', 2)[1].Trim() }
    }
}
if (-not $env:DEEPSEEK_API_KEY) {
    throw "未找到 DEEPSEEK_API_KEY。请设置环境变量，或配置 cortex/.env.local。"
}
$apiKey = $env:DEEPSEEK_API_KEY

# 1. 准备销售数据摘要
$sales = Import-Csv (Join-Path $PSScriptRoot "sales_data.csv")
$rev = [math]::Round(($sales | Measure-Object Revenue_NZD -Sum).Sum, 2)
$prof = [math]::Round(($sales | Measure-Object Profit_NZD -Sum).Sum, 2)
$beans = $sales | Where-Object { $_.ProductCategory -eq "Retail Beans" }
$beansPrices = $beans | ForEach-Object { [double]$_.UnitPrice_NZD } | Sort-Object
$beansAvg = [math]::Round(($beansPrices | Measure-Object -Average).Average, 2)
$catSummary = $sales | Group-Object ProductCategory | ForEach-Object {
    $r = [math]::Round(($_.Group | Measure-Object Revenue_NZD -Sum).Sum, 2)
    $p = [math]::Round(($_.Group | Measure-Object Profit_NZD -Sum).Sum, 2)
    "{0}: 营收 NZD $r, 利润 NZD $p, 利润率 {1}%" -f $_.Name, [math]::Round($p/$r*100, 1)
}

# 2. 准备竞品数据摘要（USD→NZD 按 1.7 折算）
$comp = Import-Csv (Join-Path $PSScriptRoot "competitor_prices.csv")
$compLines = $comp | ForEach-Object {
    $nzd = [math]::Round([double]$_.priceNumeric * 1.7, 2)
    "{0} | 商家: {1} | USD {2} ≈ NZD {3} | 评分: {4}" -f $_.title, $_.merchant, $_.priceNumeric, $nzd, $_.rating
}
$compStats = "共 {0} 条全球报价；USD 中位 17.36 ≈ NZD {1}；USD 均价 21.70 ≈ NZD {2}" -f `
    $comp.Count, [math]::Round(17.36*1.7,2), [math]::Round(21.70*1.7,2)

# 3. 构造提示词
$catText = $catSummary -join "`n"
$compText = ($compLines[0..14]) -join "`n"
$prompt = @"
你是一名资深新西兰小企业商业分析师。请基于以下真实数据，撰写一份《咖啡烘焙零售店定价竞争力分析报告》，简体中文，500字以内，结构如下：
一、本店定价在市场中的位置（与全球市场中位对比，给出溢价/折价百分比）
二、品类盈利结构点评（指出利润率最高与最低的品类及建议）
三、定价策略建议（给出3条具体可执行建议，如价格带调整、捆绑销售、会员定价）
四、风险提示（汇率折算的局限性、全球数据与NZ本地市场的差异）

【本店销售数据】过去12个月，共 $($sales.Count) 笔订单：
总营收 NZD $rev，总利润 NZD $prof，整体利润率 $([math]::Round($prof/$rev*100,1))%
零售咖啡豆（250g）定价：均价 NZD $beansAvg，范围 NZD $([math]::Round($beansPrices[0],2)) ~ NZD $([math]::Round($beansPrices[-1],2))，共 $($beans.Count) 笔销售
品类结构：
$catText

【竞品数据】$compStats
明细（部分）：
$compText
"@

$body = @{
    model       = "deepseek-chat"
    messages    = @(
        @{ role = "system"; content = "你是专业商业分析师，输出为纯文本报告，不要使用markdown标题符号。" },
        @{ role = "user"; content = $prompt }
    )
    temperature = 0.5
    max_tokens  = 1500
} | ConvertTo-Json -Depth 5

# 4. 调用并保存（显式按 UTF-8 解码响应，避免中文乱码）
$resp = Invoke-WebRequest -Uri "https://api.deepseek.com/v1/chat/completions" -Method Post `
    -ContentType "application/json" -Headers @{ Authorization = "Bearer $apiKey" } `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 120 -UseBasicParsing
$json = [System.Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray()) | ConvertFrom-Json

$report = $json.choices[0].message.content
$out = Join-Path $PSScriptRoot "AI定价竞争力报告.txt"
$header = "Cortex AI 定价竞争力分析报告`n生成: $(Get-Date -Format 'yyyy-MM-dd HH:mm') | 模型: $($json.model) | tokens: $($json.usage.total_tokens)`n`n"
[System.IO.File]::WriteAllText($out, $header + $report, [System.Text.Encoding]::UTF8)
Write-Host "报告已保存: $out (消耗 $($json.usage.total_tokens) tokens)"
