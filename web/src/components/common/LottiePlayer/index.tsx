/**
 * LottiePlayer
 *
 * 基于 lottie-web 的 React 动画播放器组件。
 * 负责在组件挂载时初始化 Lottie 动画，在卸载或依赖变化时自动销毁动画实例，
 * 以避免内存泄漏和重复渲染问题。
 *
 * 组件本身不控制最终展示尺寸，默认 width / height 为 100%，
 * 实际渲染大小由父容器决定。
 *
 * @param animationData - Lottie 动画的 JSON 数据（必传）
 * @param loop - 是否循环播放，默认 true
 * @param autoplay - 是否自动播放，默认 true
 * @param className - 传入自定义 className，用于样式或尺寸控制
 * @param style - 传入自定义行内样式，优先级高于组件默认样式
 *
 * @example
 * ```tsx
 * import LottiePlayer from "@/components/LottiePlayer";
 * import animationData from "@/assets/lottie/loading.json";
 *
 * export default function Page() {
 *   return (
 *     <div style={{ width: 300, height: 300 }}>
 *       <LottiePlayer
 *         animationData={animationData}
 *         loop
 *         autoplay
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * @remarks
 * - 父容器必须有明确的宽高，否则动画不会显示
 * - animationData 变化时会重新创建动画实例
 * - 组件卸载时会自动调用 animation.destroy()
 */

import React, { useEffect, useRef } from "react";
import lottie, { AnimationItem } from "lottie-web";

interface LottiePlayerProps {
  animationData: any;          // lottie json
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  className,
  style,
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    animationRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop,
      autoplay,
      animationData,
    });

    return () => {
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [animationData, loop, autoplay]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "transparent",
        ...style,
      }}
    />
  );
}
