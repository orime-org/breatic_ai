// src/components/SafeImage.tsx
import React from "react";

/**
 * SafeImage 组件
 *
 * 一个安全的图片包装组件，旨在解决以下问题：
 * 1. 兼容性处理：自动处理 Webpack `file-loader` 或 `url-loader` 导入图片时可能返回的 CommonJS 模块对象（即 `{ default: "url" }` 格式），
 *    确保图片路径始终能正确解析为字符串。
 * 2. 防止编译干扰：使用 `React.createElement('img', ...)` 而非 JSX `<img />` 语法，
 *    以绕过可能存在的 Babel 插件或自定义编译规则对原生 `<img>` 标签的潜在劫持或修改。
 * 3. 空值保护：当 `src` 不存在时直接返回 null，避免渲染无效的 DOM 节点。
 *
 * @param props 原生 img 标签的所有属性
 */
const SafeImage: React.FC<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>> = ({ src, alt, ...props }) => {
  if (!src) return null;

  // 处理 webpack file-loader / require() 返回的模块对象
  // 在某些构建配置下（特别是混合使用 CommonJS 和 ES Modules 时），
  // 图片资源可能被包装在一个对象中，实际的 URL 位于 default 属性。
  let actualSrc = src;
  if (typeof src === "object" && src !== null && "default" in src) {
    actualSrc = (src as any).default;
  }

  // 使用 React.createElement 显式创建 img 元素
  // 这样做是为了避免 JSX 编译阶段 `<img>` 标签被其他 Babel 插件（如自动替换 img 为 Image 组件的插件）意外转换或覆盖。
  // 保证这里渲染的一定是原生的 HTML img 标签。
  return React.createElement("img", { src: actualSrc, alt, ...props });
};

export default SafeImage;
