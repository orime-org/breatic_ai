/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./home/**/*.{html,js}", // 新首页文件
  ],
  important: true, // 让 Tailwind 样式具有更高优先级
  theme: {
    extend: {
      screens: {
        custom: "1050px",
        "3xl": "1920px",
        "4xl": "2560px",
        "5xl": "3440px",
        "6xl": "3840px",
      },
      colors: {
        primary: "#7E2FFF",
        background: "var(--background)",
        foreground: "var(--foreground)",
        "custom-purple": "#7E2FFF",
        //这些事首页需要的配色
        "primary-darker": "#6a48b8",
        secondary: "#50E3C2",
        accent: "#FFC107",
        "brand-dark": "#2c3e50",
        "brand-light": "#f8f9fa",
        "brand-text": "#34495e",
        // 添加自定义文本颜色
        "op-text-48": "var(--op-text-48)",
        "op-text-1": "var(--op-text-1)",
        "op-text-primary": "var(--op-text-primary)",
      },
      textColor: {
        "op-text-48": "var(--op-text-48)",
        "op-text-1": "var(--op-text-1)",
        "op-text-primary": "var(--op-text-primary)",
      },
      borderColor: {
        primary: "#7E2FFF",
        "op-border-card": "var(--op-border-card)",
      },
      animation: {
        marquee: "marquee 25s linear infinite",
        marquee2: "marquee2 25s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        marquee2: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0%)" },
        },
      },
      backgroundColor: {
        "op-background-card": "var(--op-background-card)",
        "op-background-card-2": "var(--op-background-card-2)",
        "op-line-1": "var(--op-line-1)",
        "op-border-card": "var(--op-border-card)",
      },
    },
  },
  plugins: [],
  // 添加 corePlugins 配置，确保重要的 Tailwind 功能不被禁用
  corePlugins: {
    preflight: true, // 保持 Tailwind 的基础样式重置
  },
};
