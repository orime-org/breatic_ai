// src/types/global.d.ts
import { FC, DetailedHTMLProps, ImgHTMLAttributes } from 'react';

// 解决 minimatch 类型定义问题
// minimatch 库现在自带类型定义，不需要 @types/minimatch
declare module 'minimatch' {
  function minimatch(target: string, pattern: string, options?: any): boolean;
  namespace minimatch {
    function filter(pattern: string, options?: any): (target: string) => boolean;
    function match(list: string[], pattern: string, options?: any): string[];
    function makeRe(pattern: string, options?: any): RegExp | false;
    const Minimatch: any;
  }
  export = minimatch;
}

declare global {
  // 扩展 window 对象
  interface Window {
    SafeImage: FC<DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>>;
  }

  // 扩展 JSX 内在元素
  namespace JSX {
    interface IntrinsicElements {
      SafeImage: DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
    }
  }
}