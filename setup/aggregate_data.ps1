# 汇总 sales_data.csv 的统计数据，输出 JSON 供网站原型使用
$ErrorActionPreference = "Stop"
$csv = Import-Csv (Join-Path $PSScriptRoot "sales_data.csv")

function Group-Sum($rows, $keyProp, $valProps) {
    $rows | Group-Object $keyProp | ForEach-Object {
        $o = [ordered]@{ key = $_.Name }
        foreach ($vp in $valProps) { $o[$vp] = [math]::Round(($_.Group | Measure-Object $vp -Sum).Sum, 2) }
        [pscustomobject]$o
    }
}

$kpi = @{
    revenue   = [math]::Round(($csv | Measure-Object Revenue_NZD -Sum).Sum, 2)
    profit    = [math]::Round(($csv | Measure-Object Profit_NZD -Sum).Sum, 2)
    cost      = [math]::Round(($csv | Measure-Object Cost_NZD -Sum).Sum, 2)
    orders    = $csv.Count
    units     = [math]::Round(($csv | Measure-Object Quantity -Sum).Sum, 0)
    customers = ($csv | Select-Object -ExpandProperty CustomerID -Unique).Count
}

$monthly = $csv | Group-Object { ([datetime]$_.OrderDate).ToString("yyyy-MM") } | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{
        month  = $_.Name
        revenue = [math]::Round(($_.Group | Measure-Object Revenue_NZD -Sum).Sum, 2)
        profit  = [math]::Round(($_.Group | Measure-Object Profit_NZD -Sum).Sum, 2)
    }
}

$category = Group-Sum $csv "ProductCategory" @("Revenue_NZD","Profit_NZD")
$region   = Group-Sum $csv "Region" @("Revenue_NZD","Profit_NZD")
$channel  = Group-Sum $csv "Channel" @("Revenue_NZD","Profit_NZD")
$topProducts = Group-Sum $csv "ProductName" @("Revenue_NZD","Profit_NZD") | Sort-Object Revenue_NZD -Descending | Select-Object -First 5

$result = [pscustomobject]@{ kpi = $kpi; monthly = $monthly; category = $category; region = $region; channel = $channel; topProducts = $topProducts }
$jsonPath = Join-Path $PSScriptRoot "aggregates.json"
$result | ConvertTo-Json -Depth 4 | Set-Content $jsonPath -Encoding UTF8
Write-Host "已输出: $jsonPath"
Get-Content $jsonPath
