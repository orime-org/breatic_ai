import React from "react";

/**
 * 加载动画组件 - 显示三个点的循环动画
 *
 * 动画效果：
 * - 第一个点先出现
 * - 第二个点延迟 0.2 秒出现
 * - 第三个点延迟 0.4 秒出现
 * - 然后全部消失，循环播放
 */
export const LoadingDots: React.FC = () => {
  return (
    <span className="inline-flex ml-1">
      <span className="loading-dot">.</span>
      <span className="loading-dot animation-delay-200">.</span>
      <span className="loading-dot animation-delay-400">.</span>
      <style>{`
        @keyframes dotFade {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .loading-dot {
          animation: dotFade 1.4s infinite;
          opacity: 0;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </span>
  );
};
