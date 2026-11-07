"""
Cortex 第二层自动化流水线（Python 版，零第三方依赖）

用法：
  python pipeline.py --report     # 汇总销售+竞品数据 → DeepSeek 生成商业报告
  python pipeline.py --scrape     # 调用 Apify 采集竞品价格（需环境变量 APIFY_TOKEN）
  python pipeline.py --summary    # 只输出数据摘要 JSON，不调用 AI

密钥来源：
  DEEPSEEK_API_KEY  → 自动从 cortex/.env.local 读取（不重复保存密钥）
  APIFY_TOKEN       → 从系统环境变量读取（避免把 token 写入文件）
"""

import argparse
import csv
import json
import os
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
SETUP = HERE.parent
ROOT = SETUP.parent

SALES_CSV = SETUP / "sales_data.csv"
COMPETITOR_CSV = SETUP / "competitor_prices.csv"
ENV_FILE = ROOT / "cortex" / ".env.local"
REPORT_OUT = HERE / "AI报告_Python版.txt"


def load_dotenv(path):
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def read_csv(path):
    if not path.exists():
        raise FileNotFoundError(f"找不到数据文件: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def build_summary():
    """把两份 CSV 汇总成 AI 可读的结构化摘要"""
    sales = read_csv(SALES_CSV)
    competitors = read_csv(COMPETITOR_CSV)

    revenue = round(sum(float(r["Revenue_NZD"]) for r in sales), 2)
    profit = round(sum(float(r["Profit_NZD"]) for r in sales), 2)

    by_cat = defaultdict(lambda: [0.0, 0.0])
    by_region = defaultdict(float)
    by_channel = defaultdict(float)
    by_month = defaultdict(lambda: [0.0, 0.0])
    for r in sales:
        rev = float(r["Revenue_NZD"])
        prf = float(r["Profit_NZD"])
        by_cat[r["ProductCategory"]][0] += rev
        by_cat[r["ProductCategory"]][1] += prf
        by_region[r["Region"]] += rev
        by_channel[r["Channel"]] += rev
        m = r["OrderDate"][:7]
        by_month[m][0] += rev
        by_month[m][1] += prf

    prices = sorted(float(c["priceNumeric"]) for c in competitors if c.get("priceNumeric"))
    median = prices[len(prices) // 2] if prices else 0

    return {
        "currency": "NZD",
        "sales": {
            "orders": len(sales),
            "revenue": revenue,
            "profit": profit,
            "margin_pct": round(profit / revenue * 100, 1) if revenue else 0,
            "customers": len({r["CustomerID"] for r in sales}),
            "category": [
                {"name": k, "revenue": round(v[0], 2), "profit": round(v[1], 2),
                 "margin_pct": round(v[1] / v[0] * 100, 1) if v[0] else 0}
                for k, v in sorted(by_cat.items(), key=lambda x: -x[1][0])
            ],
            "region": [{"name": k, "revenue": round(v, 2)} for k, v in sorted(by_region.items(), key=lambda x: -x[1])],
            "channel": [{"name": k, "revenue": round(v, 2)} for k, v in sorted(by_channel.items(), key=lambda x: -x[1])],
            "monthly": [{"month": k, "revenue": round(v[0], 2), "profit": round(v[1], 2)} for k, v in sorted(by_month.items())],
        },
        "competitors": {
            "count": len(competitors),
            "currency": "USD",
            "median_price_usd": median,
            "median_price_nzd_est": round(median * 1.7, 2),
            "note": "全球报价按 1.7 汇率折算 NZD，非 NZ 本地数据",
        },
    }


def post_json(url, payload, headers):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def generate_report():
    env = load_dotenv(ENV_FILE)
    key = os.environ.get("DEEPSEEK_API_KEY") or env.get("DEEPSEEK_API_KEY")
    if not key:
        raise RuntimeError("未找到 DEEPSEEK_API_KEY（检查 cortex/.env.local）")

    summary = build_summary()
    prompt = (
        "你是新西兰小企业的资深商业分析师。仅基于以下 JSON 数据，撰写《定价竞争力分析报告》，"
        "简体中文，450字以内，纯文本，分四段：一、定价市场位置；二、品类盈利结构；"
        "三、三条可执行的定价/营销策略（带具体数字）；四、数据局限性风险提示。\n\n"
        + json.dumps(summary, ensure_ascii=False, indent=2)
    )
    result = post_json(
        "https://api.deepseek.com/v1/chat/completions",
        {"model": "deepseek-chat", "temperature": 0.5, "max_tokens": 1200,
         "messages": [
             {"role": "system", "content": "你是专业商业分析师，输出纯文本报告，不使用 markdown 符号。"},
             {"role": "user", "content": prompt},
         ]},
        {"Authorization": "Bearer " + key},
    )
    report = result["choices"][0]["message"]["content"]
    tokens = result.get("usage", {}).get("total_tokens", "?")
    header = f"Cortex Python 流水线 · AI 定价竞争力报告\n生成: {datetime.now():%Y-%m-%d %H:%M} | tokens: {tokens}\n\n"
    REPORT_OUT.write_text(header + report, encoding="utf-8")
    print(f"✅ 报告已保存: {REPORT_OUT} (消耗 {tokens} tokens)\n")
    print(report)


def scrape():
    token = os.environ.get("APIFY_TOKEN")
    if not token:
        print("请先设置环境变量 APIFY_TOKEN，例如 PowerShell：")
        print('  $env:APIFY_TOKEN = "apify_api_..."')
        print("  python pipeline.py --scrape")
        return

    actor = "automation-lab~google-shopping-scraper"
    headers = {"Authorization": "Bearer " + token}
    run = post_json(
        f"https://api.apify.com/v2/acts/{actor}/runs",
        {"queries": ["coffee beans 250g", "single origin coffee nz"],
         "maxResults": 15, "countryCode": "NZ", "languageCode": "en"},
        headers,
    )
    run_id = run["data"]["id"]
    print(f"任务已启动: {run_id}，等待完成…")

    import time
    status = "RUNNING"
    for _ in range(36):
        time.sleep(10)
        req = urllib.request.Request(
            f"https://api.apify.com/v2/acts/{actor}/runs/{run_id}", headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            run = json.loads(resp.read().decode("utf-8"))["data"]
        status = run["status"]
        print(f"  状态: {status}")
        if status in ("SUCCEEDED", "FAILED"):
            break
    if status != "SUCCEEDED":
        raise RuntimeError(f"采集失败: {status}")

    ds = run["defaultDatasetId"]
    req = urllib.request.Request(
        f"https://api.apify.com/v2/datasets/{ds}/items?clean=true", headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        items = json.loads(resp.read().decode("utf-8"))

    out = HERE / "competitor_prices_new.csv"
    with out.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(items[0].keys()))
        writer.writeheader()
        writer.writerows(items)
    print(f"✅ 采集 {len(items)} 条，已保存: {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cortex 第二层自动化流水线")
    parser.add_argument("--report", action="store_true", help="生成 AI 商业报告")
    parser.add_argument("--scrape", action="store_true", help="运行 Apify 竞品采集")
    parser.add_argument("--summary", action="store_true", help="只输出数据摘要 JSON")
    args = parser.parse_args()

    try:
        if args.scrape:
            scrape()
        elif args.summary:
            print(json.dumps(build_summary(), ensure_ascii=False, indent=2))
        elif args.report:
            generate_report()
        else:
            parser.print_help()
    except Exception as e:
        print(f"❌ 失败: {e}", file=sys.stderr)
        sys.exit(1)
