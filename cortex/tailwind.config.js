/**
 * 存量 globals.css 使用全局裸类名且无 CSS Modules 隔离。
 * 这里关闭 preflight 并加 tw- 前缀，保证 Tailwind 工具类与现有页面零冲突。
 */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: { preflight: false },
  prefix: "tw-",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Segoe UI", "Microsoft YaHei", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
