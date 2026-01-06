import React, { useRef, useEffect, useState, useCallback } from "react";

interface ZoomPanWrapperProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  disabled?: boolean;
  canvasRatio?: string; // 画布比例，用于监听比例变化
  onTransformChange?: (transform: { scale: number; x: number; y: number }) => void;
  onClick?: () => void; // 点击回调（非拖动）
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

export const ZoomPanWrapper: React.FC<ZoomPanWrapperProps> = ({ children, minScale = 0.1, maxScale = 5, initialScale = 1, disabled = false, canvasRatio, onTransformChange, onClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({
    scale: initialScale,
    x: 0,
    y: 0,
  });
  const [transformStart, setTransformStart] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // 鼠标拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // 更新变换
  const updateTransform = useCallback(
    (newTransform: Transform) => {
      console.log("🔄 updateTransform 被调用!", newTransform);
      console.trace("调用栈"); // 打印调用栈
      setTransform(newTransform);
      onTransformChange?.(newTransform);
    },
    [onTransformChange]
  );

  // 初始化居中
  const centerContent = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) return;

    const containerRect = container.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    const centerX = (containerRect.width - contentRect.width) / 2;
    const centerY = (containerRect.height - contentRect.height) / 2;

    const centeredTransform = {
      scale: initialScale,
      x: centerX,
      y: centerY,
    };

    setTransform(centeredTransform);
    onTransformChange?.(centeredTransform);
    setIsInitialized(true);
  }, [initialScale, onTransformChange]);

  // 获取画布中心点
  const getCanvasCenter = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    return {
      x: rect.width / 2,
      y: rect.height / 2,
    };
  }, []);

  // 处理滚轮缩放（以画布中心为缩放点）
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (disabled) return;

      // 只有在按住Ctrl键时才允许缩放
      // if (!e.ctrlKey) return;

      e.preventDefault();

      // 计算缩放因子
      const zoomIntensity = 0.05;
      const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
      const newScale = Math.min(Math.max(transform.scale * (1 + delta), minScale), maxScale);

      if (newScale === transform.scale) return;

      // 以画布中心为缩放点
      const canvasCenter = getCanvasCenter();
      const scaleRatio = newScale / transform.scale;
      const newX = canvasCenter.x - (canvasCenter.x - transform.x) * scaleRatio;
      const newY = canvasCenter.y - (canvasCenter.y - transform.y) * scaleRatio;

      updateTransform({
        scale: newScale,
        x: newX,
        y: newY,
      });
    },
    [disabled, transform, minScale, maxScale, updateTransform, getCanvasCenter]
  );

  // 处理鼠标按下（进行平移）
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      console.log("🖱️ MouseDown 触发!", {
        ctrlKey: e.ctrlKey,
        button: e.button,
        target: e.target,
      });
      if (disabled) return;

      // 检查是否点击了可拖动的元素或 Moveable 控制框
      const target = e.target as HTMLElement;
      const isElementOrControl =
        target.closest('[id^="element-"]') || // 媒体元素
        target.closest(".moveable-control-box") || // Moveable 控制框
        target.closest(".moveable-direction") || // Moveable 控制点
        target.closest(".moveable-line") || // Moveable 边线
        target.closest(".moveable-rotation"); // Moveable 旋转控制点

      // 如果点击的是元素或控制框，不要开始画布平移
      if (isElementOrControl) {
        console.log("🖱️ 点击了元素或控制框，跳过平移");
        return;
      }

      // 鼠标左键进行平移（取消Ctrl键限制）
      // if (e.ctrlKey && e.button === 0) {
      if (e.button === 0) {
        console.log("🖱️ 开始拖拽平移!");
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setTransformStart({ x: transform.x, y: transform.y });
      } else {
        e.preventDefault();
      }
    },
    [disabled, transform.x, transform.y]
  );

  // 处理双击（可以在这里添加其他功能，目前禁用）
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      // 移除自动居中功能，双击暂时不做任何操作
    },
    [disabled]
  );

  // 初始化居中内容
  useEffect(() => {
    if (isInitialized) return;

    // 延迟一帧确保子组件已渲染
    const handle = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        centerContent();
      });
    });
    return () => cancelAnimationFrame(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, centerContent]);

  // 画布比例变化时重新居中（保持当前缩放级别）
  useEffect(() => {
    if (!isInitialized) return;

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const containerRect = container.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    const centerX = (containerRect.width - contentRect.width) / 2;
    const centerY = (containerRect.height - contentRect.height) / 2;

    // 保持当前的缩放级别，只更新位置
    setTransform((prev) => {
      const newTransform = {
        scale: prev.scale, // 保持当前缩放
        x: centerX,
        y: centerY,
      };
      console.log("📐 画布比例变化，重新居中（保持缩放）", {
        旧缩放: prev.scale,
        新缩放: newTransform.scale,
      });
      return newTransform;
    });
  }, [canvasRatio, isInitialized]);

  // 绑定全局事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // 处理鼠标移动（Ctrl+拖拽平移）
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStart) return;

      console.log("🖱️ 鼠标平移中...");
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      console.log("🖱️ 平移参数:", { deltaX, deltaY, transformStart });

      updateTransform({
        ...transform,
        x: transformStart.x + deltaX,
        y: transformStart.y + deltaY,
      });
    },
    [isDragging, dragStart, transform, transformStart, updateTransform]
  );

  // 处理鼠标松开
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        console.log("🖱️ 鼠标松开，停止平移");

        // 检查是否是点击（移动距离很小）
        if (dragStart && onClick) {
          const deltaX = Math.abs(e.clientX - dragStart.x);
          const deltaY = Math.abs(e.clientY - dragStart.y);
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          // 如果移动距离小于 5px，认为是点击而非拖动
          if (distance < 5) {
            console.log("🖱️ 检测到点击（非拖动）");
            onClick();
          } else {
            console.log("🖱️ 检测到拖动，移动距离:", distance);
          }
        }

        setIsDragging(false);
        setDragStart(null);
      }
    },
    [isDragging, dragStart, onClick]
  );

  // 绑定鼠标事件
  useEffect(() => {
    if (!isDragging) return;

    console.log("🖱️ 绑定鼠标移动事件");
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      console.log("🖱️ 解绑鼠标事件");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden select-none"
      style={{
        cursor: "default",
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        ref={contentRef}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          width: disabled ? "100%" : "fit-content",
          height: disabled ? "100%" : "fit-content",
          opacity: isInitialized ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ZoomPanWrapper;
