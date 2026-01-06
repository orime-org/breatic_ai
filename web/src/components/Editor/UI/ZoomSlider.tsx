/**
 * 缩放滑块组件
 * 用于调整编辑器的缩放比例
 */
import React, { forwardRef } from "react";
import { Slider } from "antd";
import { useViewport, useStore, useReactFlow, type PanelProps } from "@xyflow/react";
import { EditorZoomSlider_Undo_Svg, EditorZoomSlider_Redo_Svg, EditorZoomSlider_ExpandOutlined_Svg } from "../SvgLoader/staticIcon";

import { useUndoRedo } from "../Store/store";

const ZoomSlider = forwardRef<HTMLDivElement, Omit<PanelProps, "children">>(({ className, ...props }, ref) => {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();
  const minZoom = useStore((state) => state.minZoom);
  const maxZoom = useStore((state) => state.maxZoom);
  const { undo, pastStates = [], futureStates = [], redo } = useUndoRedo();

  // 基于历史栈实时计算可用性
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  // 处理撤销按钮点击事件 - 执行撤销功能
  const handleUndoClickEvent = () => {
    if (!canUndo) return;
    undo();
  };

  // 处理重做按钮点击事件 - 执行重做功能
  const handleRedoClickEvent = () => {
    if (!canRedo) return;
    redo();
  };

  return (
    <div className="flex items-center justify-center w-[200px] h-[32px] gap-1 absolute border border-[#E9E9E9] bg-[#FFFFFF] rounded-[90px] box-sizing bottom-3 right-3 pointer-events-auto cursor-pointer z-20" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className={`w-[18px] h-[18px] flex items-center justify-center ${canUndo ? "text-[#000000]" : "text-[#989898]"}`} onClick={handleUndoClickEvent}>
        <EditorZoomSlider_Undo_Svg />
      </div>
      <div className={`w-[18px] h-[18px] flex items-center justify-center ${canRedo ? "text-[#000000]" : "text-[#989898]"}`} onClick={handleRedoClickEvent}>
        <EditorZoomSlider_Redo_Svg />
      </div>
      <Slider className="w-[100px]" range value={[zoom]} min={minZoom} max={maxZoom} step={0.01} tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }} onChange={(values) => zoomTo(values[0])} />
      <div className="w-[18px] h-[18px] flex items-center justify-center text-[#989898] hover:text-[#000000]" onClick={() => fitView({ duration: 100 })}>
        <EditorZoomSlider_ExpandOutlined_Svg />
      </div>
    </div>
  );
});

ZoomSlider.displayName = "ZoomSlider";

export default ZoomSlider;
