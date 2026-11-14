import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "public/ml-studio.html"), "utf8");
const dict = html.split("I18N_DICT_START")[1].split("I18N_DICT_END")[0];
const script = html.split("<script>")[1].split("</script>")[0];

function loadApi() {
  const el = {
    textContent: "", innerHTML: "", value: "", checked: false,
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, getAttribute() { return null; },
    appendChild() {}, removeChild() {}, click() {}
  };
  const sandbox = {
    console,
    document: {
      documentElement: {}, body: el,
      addEventListener() {},
      getElementById() { return el; },
      querySelectorAll() { return []; },
      createElement() { return el; }
    },
    window: { devicePixelRatio: 1 },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout() {},
    Set, Map, Number, String, Array, Object, Math, JSON, Date, RegExp, Infinity, isFinite
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(
    script + "\n;globalThis.__api = { S, sampleRetail, sampleIris, initSelection, buildMatrix, cleanRows, kmeans, elbow, linreg, decisionTree, parseFileText, parseCsv, parseArff };",
    ctx
  );
  return ctx.__api;
}

test("机器学习工作流页面是自包含单文件，零外部资源与零外发", () => {
  assert.ok(html.includes('name="robots" content="noindex, nofollow"'), "内部工具不应被索引");
  assert.ok(!html.includes("http://") && !html.includes("https://"), "不应加载 CDN 或外部资源");
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon/.test(html), "不得把数据发到服务器");
  assert.ok(html.includes("FileReader") && html.includes("localStorage"), "文件应在本机读取，偏好可本地保存");
  assert.ok(html.includes("c.privacyBody"), "必须写清隐私边界");
});

test("中英文字典键完全一致，覆盖三步流程与三个任务", () => {
  const counts = {};
  for (const m of dict.matchAll(/'([^']+)'\s*:/g)) {
    counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  assert.deepEqual(Object.entries(counts).filter(([, n]) => n !== 2).map(([k]) => k), []);
  assert.ok(Object.keys(counts).length >= 100, "字典键数量异常");
  for (const k of [
    "load.title", "load.hint", "load.quick", "load.formats",
    "pre.title", "attr.title", "vis.title", "ins.title",
    "task.cluster", "task.regression", "task.tree",
    "step.loader", "step.preprocess", "step.task"
  ]) {
    assert.ok(dict.includes(`'${k}'`), `缺少字典键 ${k}`);
  }
});

test("5MB 上限，CSV 与 ARFF 两条解析链路都可用", () => {
  assert.ok(html.includes("5 * 1024 * 1024"));
  assert.ok(html.includes("load.tooBig") && html.includes("load.badType"));
  assert.ok(html.includes("parseCsv") && html.includes("parseArff") && html.includes("detectSep"));
  assert.ok(html.includes("@attribute") && html.includes("@data"));
  const api = loadApi();
  const csv = api.parseFileText("demo.csv", "A,B,C\n1,2,x\n3,4,y\n");
  assert.equal(csv.rows.length, 2);
  assert.equal(csv.cols[0].numeric, true);
  assert.equal(csv.cols[2].numeric, false);
  const arff = "@relation demo\n@attribute a numeric\n@attribute b {red,blue}\n@data\n1,red\n2,blue\n?,red\n";
  const d = api.parseFileText("demo.arff", arff);
  assert.equal(d.rows.length, 3);
  assert.equal(d.cols[1].numeric, false);
  assert.equal(d.rows[2][0], "", "ARFF 的 ? 应转成缺失值");
});

test("三个模型都是浏览器内纯计算，不依赖外部模型接口", () => {
  for (const fn of ["kmeans", "elbow", "linreg", "decisionTree", "buildMatrix", "pearson"]) {
    assert.ok(html.includes(`function ${fn}(`), `缺少 ${fn}`);
  }
  assert.ok(html.includes("predicted: predicted"), "决策树结果必须带逐行预测列供导出");
  assert.ok(html.includes("task.trainNote"), "必须说明准确率只是训练集准确率");
});

test("内置示例数据明确标注为合成，不冒充真实客户", () => {
  assert.ok(html.includes("sampleRetail") && html.includes("sampleIris"));
  assert.ok(html.includes("合成示例数据") && html.includes("Synthetic sample data"));
  assert.ok(html.includes("不是真实客户数据") && html.includes("not real customer data"));
  assert.ok(html.includes("load.demoNote"));
});

test("三步引导、模块导航与结果导出齐全", () => {
  for (const n of [1, 2, 3]) assert.ok(html.includes(`id="step-${n}"`));
  assert.ok(html.includes("exportResult") && html.includes("csvCell"));
  for (const v of ["loader", "preprocess", "task", "attributes", "visual", "insights"]) {
    assert.ok(html.includes(`data-v="${v}"`), `缺少模块入口 ${v}`);
  }
});

test("沙箱内真实跑通：示例数据 → 预处理矩阵 → 聚类 / 回归 / 决策树", () => {
  const api = loadApi();
  const ds = api.sampleRetail();
  assert.equal(ds.rows.length, 120);
  assert.equal(ds.cols.length, 8);
  api.S.dataset = ds;
  api.S.task = "cluster";
  api.initSelection(ds);
  assert.ok(api.S.features.length >= 4, "应自动挑出数值特征");

  const M = api.buildMatrix();
  assert.equal(M.X.length, 120);
  assert.ok(M.X[0].length >= 4);
  assert.ok(M.X.every((r) => r.every((v) => Number.isFinite(v))), "矩阵不得含 NaN");

  const km = api.kmeans(M.X, 3);
  assert.equal(km.assign.length, 120);
  assert.ok(km.wcss >= 0);
  assert.equal(km.assign.reduce((a, b) => a + b, 0) >= 0, true);
  assert.ok(api.elbow(M.X).length >= 2);

  api.S.features = [1, 3, 4, 5, 6, 7];
  api.S.target = 2;
  const M2 = api.buildMatrix();
  const y = M2.rows.map((r) => Number(r[2]));
  const lr = api.linreg(M2.X, y);
  assert.ok(Number.isFinite(lr.r2) && lr.r2 > 0.2, "回归应能解释一部分方差");
  assert.ok(Number.isFinite(lr.rmse) && lr.rmse >= 0);
  assert.equal(lr.beta.length, M2.X[0].length + 1);

  api.S.task = "tree";
  api.S.target = 7;
  const labels = M2.rows.map((r) => r[7]);
  const tr = api.decisionTree(M2.X, labels, M2.enc);
  assert.equal(tr.predicted.length, M2.X.length, "导出的预测列必须逐行对应");
  assert.ok(tr.accuracy >= 0 && tr.accuracy <= 1);
  assert.ok(tr.rules.length > 0 && tr.importance.length === M2.enc.length);
  assert.deepEqual([...new Set(tr.predicted)].sort(), ["No", "Yes"]);
});

test("花卉示例同样可跑，且两个示例是确定性生成的", () => {
  const api = loadApi();
  const a = api.sampleIris(), b = api.sampleIris();
  assert.equal(a.rows.length, 150);
  assert.deepEqual(a.rows, b.rows, "同一示例每次生成必须完全一致");
  assert.equal(a.cols.length, 5, "表头与数据列数必须一致，防止整行错位");
  assert.equal(a.cols[4].name, "Species");
  assert.equal(a.cols[4].numeric, false);
  assert.equal(a.rows[0][4], "setosa");
  api.S.dataset = a;
  api.initSelection(a);
  const M = api.buildMatrix();
  assert.equal(M.X.length, 150);
  const km = api.kmeans(M.X, 3);
  assert.equal(km.assign.length, 150);
});
