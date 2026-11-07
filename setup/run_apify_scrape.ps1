# 通过 Apify API 运行 Google Shopping 采集（新西兰咖啡豆竞品价格）
$ErrorActionPreference = "Stop"

# 密钥只从环境变量读取，绝不写进代码或提交到 GitHub
# 用法： $env:APIFY_TOKEN = "<你的 Apify Token>" ; .\run_apify_scrape.ps1
if (-not $env:APIFY_TOKEN) {
    throw "未找到 APIFY_TOKEN。请先设置环境变量再运行本脚本。"
}
$token = $env:APIFY_TOKEN
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$actor = "automation-lab~google-shopping-scraper"

# 1. 启动采集任务
$input = @{
    queries      = @("coffee beans 250g", "house blend coffee nz", "single origin coffee nz")
    maxResults   = 15
    countryCode  = "NZ"
    languageCode = "en"
} | ConvertTo-Json

$run = Invoke-RestMethod -Uri "https://api.apify.com/v2/acts/$actor/runs" -Method Post -Headers $h -Body $input -TimeoutSec 60
$runId = $run.data.id
Write-Host "任务已启动: $runId"

# 2. 轮询等待完成（最多 6 分钟）
$status = $run.data.status
$r = $run
for ($i = 0; $i -lt 36 -and $status -notin @("SUCCEEDED","FAILED"); $i++) {
    Start-Sleep -Seconds 10
    $r = Invoke-RestMethod -Uri "https://api.apify.com/v2/acts/$actor/runs/$runId" -Headers $h -TimeoutSec 30
    $status = $r.data.status
    Write-Host ("[{0}s] 状态: {1}" -f (($i+1)*10), $status)
}
Write-Host "最终状态: $status"
if ($status -ne "SUCCEEDED") { exit 1 }

# 3. 下载数据集并保存 CSV
$dsId = $r.data.defaultDatasetId
$items = Invoke-RestMethod -Uri "https://api.apify.com/v2/datasets/$dsId/items?clean=true" -Headers $h -TimeoutSec 60
Write-Host "共获取 $($items.Count) 条竞品数据"

$out = Join-Path $PSScriptRoot "competitor_prices.csv"
$items | ConvertTo-Csv -NoTypeInformation | Set-Content $out -Encoding UTF8
Write-Host "已保存: $out"

# 4. 打印前 5 条预览
$items | Select-Object -First 5 | ForEach-Object { $_ | ConvertTo-Json -Depth 2 -Compress }
