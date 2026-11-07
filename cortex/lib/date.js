// 把任意单元格值规范化成 Postgres date 能接受的 YYYY-MM-DD。
// 无法可靠解析时返回 ""，由调用方回退到今天；绝不把畸形字符串写进数据库。
const cleanStr = (s) => String(s ?? "").replace(/^\uFEFF/, "").trim();
const pad2 = (n) => String(n).padStart(2, "0");
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

function validYMD(y, m, d) {
  if (![y, m, d].every(Number.isInteger)) return "";
  if (y < MIN_YEAR || y > MAX_YEAR || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function normDate(v) {
  const s = cleanStr(v);
  if (!s) return "";

  // 纯年份
  if (/^\d{4}$/.test(s)) return validYMD(Number(s), 1, 1);
  // 非 4 位的纯数字（订单号、金额、Excel 序列号等）一律不猜，避免误判成日期
  if (/^\d+$/.test(s)) return "";

  // YYYY-M-D / YYYY/M/D / YYYY.M.D
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return validYMD(+m[1], +m[2], +m[3]);

  // D/M/YYYY 或 M/D/YYYY（优先按日/月/年，失败再试月/日/年）
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return validYMD(+m[3], +m[2], +m[1]) || validYMD(+m[3], +m[1], +m[2]);

  // ISO 日期，可带时间与时区
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (m) return validYMD(+m[1], +m[2], +m[3]);

  // 其它格式交给 JS 解析，但仍严格限制年份并重新拼装，
  // 杜绝 toISOString() 对超大年份产生的 +YYYYYY-MM 扩展格式
  const d = new Date(s);
  if (!isNaN(d)) {
    const y = d.getUTCFullYear();
    if (y >= MIN_YEAR && y <= MAX_YEAR) return validYMD(y, d.getUTCMonth() + 1, d.getUTCDate());
  }
  return "";
}
