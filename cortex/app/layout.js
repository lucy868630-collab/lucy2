import "./globals.css";

export const metadata = {
  title: "商业工作台 — BI 分析 · 数据 · AI 报告",
  description: "新西兰小企业商业工作台：销售数据、商业仪表板与 AI 分析报告",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
