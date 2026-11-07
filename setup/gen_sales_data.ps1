# 生成新西兰小企业示例销售数据（咖啡+烘焙店风格）
# 输出: sales_data.csv，共 500 行，覆盖过去 12 个月

$ErrorActionPreference = "Stop"
$out = Join-Path $PSScriptRoot "sales_data.csv"

$categories = @(
    @{ Cat="Coffee";      Products=@("Flat White","Latte","Cappuccino","Long Black","Mocha");        PriceMin=4.5;  PriceMax=6.5;  CostRatio=0.30 },
    @{ Cat="Tea";         Products=@("English Breakfast","Green Tea","Chai Latte","Matcha Latte");   PriceMin=4.0;  PriceMax=6.0;  CostRatio=0.25 },
    @{ Cat="Bakery";      Products=@("Croissant","Banana Bread","Muffin","Scone","Cinnamon Roll");   PriceMin=4.5;  PriceMax=7.5;  CostRatio=0.40 },
    @{ Cat="Lunch";       Products=@("Pie","Sandwich","Salad Bowl","Bagel","Quiche");                PriceMin=8.0;  PriceMax=15.0; CostRatio=0.45 },
    @{ Cat="Retail Beans";Products=@("House Blend 250g","Single Origin 250g","Decaf 250g");          PriceMin=18.0; PriceMax=28.0; CostRatio=0.55 }
)

$regions = @(
    @{ Name="Auckland";    Weight=35 },
    @{ Name="Wellington";  Weight=20 },
    @{ Name="Christchurch";Weight=18 },
    @{ Name="Hamilton";    Weight=12 },
    @{ Name="Dunedin";     Weight=8 },
    @{ Name="Tauranga";    Weight=7 }
)
$channels = @("In-store","Online")   # 门店 70% / 线上 30%
$payments = @("Card","Cash","Mobile Pay")  # 卡 60 / 现金 15 / 手机支付 25

$startDate = (Get-Date).AddMonths(-12)
$endDate   = Get-Date
$days      = ($endDate - $startDate).Days
$lines     = New-Object System.Collections.Generic.List[string]
$lines.Add("OrderDate,OrderID,CustomerID,ProductCategory,ProductName,Region,Channel,PaymentMethod,Quantity,UnitPrice_NZD,UnitCost_NZD,Revenue_NZD,Cost_NZD,Profit_NZD")

$orderNum = 10000
for ($i = 1; $i -le 500; $i++) {
    $date = $startDate.AddDays((Get-Random -Maximum $days))
    # 周末销量偏高：周末权重更大
    if ($date.DayOfWeek -in @("Saturday","Sunday") -and (Get-Random -Maximum 100) -lt 50) {
        $date = $date.AddDays(1)
    }
    $cat = $categories[(Get-Random -Maximum $categories.Count)]
    $prod = $cat.Products[(Get-Random -Maximum $cat.Products.Count)]

    # 区域加权随机
    $r = Get-Random -Maximum 100
    $region = if ($r -lt 35) { $regions[0] } elseif ($r -lt 55) { $regions[1] } elseif ($r -lt 73) { $regions[2] } elseif ($r -lt 85) { $regions[3] } elseif ($r -lt 93) { $regions[4] } else { $regions[5] }

    $channel = if ((Get-Random -Maximum 100) -lt 70) { $channels[0] } else { $channels[1] }
    $p = Get-Random -Maximum 100
    $payment = if ($p -lt 60) { $payments[0] } elseif ($p -lt 75) { $payments[1] } else { $payments[2] }

    $qty  = if ($cat.Cat -in @("Coffee","Tea")) { Get-Random -Minimum 1 -Maximum 5 } else { Get-Random -Minimum 1 -Maximum 3 }
    $price = [math]::Round((Get-Random -Minimum ([int]($cat.PriceMin*100)) -Maximum ([int]($cat.PriceMax*100))) / 100, 2)
    $cost  = [math]::Round($price * $cat.CostRatio, 2)

    $revenue = [math]::Round($qty * $price, 2)
    $costTotal = [math]::Round($qty * $cost, 2)
    $profit = [math]::Round($revenue - $costTotal, 2)
    $orderNum++
    $custId = "CUST" + (Get-Random -Minimum 1000 -Maximum 9999)

    $dateStr = $date.ToString("yyyy-MM-dd")
    $lines.Add("$dateStr,ORD$orderNum,$custId,$($cat.Cat),$prod,$($region.Name),$channel,$payment,$qty,$price,$cost,$revenue,$costTotal,$profit")
}

Set-Content -Path $out -Value $lines -Encoding UTF8
Write-Host "已生成: $out (共 $($lines.Count - 1) 条记录)"
Get-Content $out -TotalCount 6
