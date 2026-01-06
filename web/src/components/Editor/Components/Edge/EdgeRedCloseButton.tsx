/**
 * 自定义边 - 红色关闭按钮
 */
import React, { useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from "@xyflow/react";
import { Button } from "antd";
import type { EdgeProps } from "@xyflow/react";
import { CloseOutlined } from "@ant-design/icons";

export default function EdgeRedCloseButton({ id, sourceX, sourceY, targetX, targetY, selected, sourcePosition, targetPosition, style = {}, markerEnd }: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const [isEdgeHovered, setIsEdgeHovered] = useState(false);

  /**
   * 点击删除边 - 阻止事件冒泡
   */
  const onEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发其他点击事件
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      {/* 可见线（视觉效果） */}
      <path className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} strokeWidth={1.5} onMouseEnter={() => setIsEdgeHovered(true)} onMouseLeave={() => setIsEdgeHovered(false)} />

      {/* 隐形粗线（负责捕获 hover） */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={20} // ⬅⬅⬅ 调这里！大可到 20 都行
        fill="none"
        pointerEvents="stroke" // 必须
        onMouseEnter={() => setIsEdgeHovered(true)}
        onMouseLeave={() => setIsEdgeHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 8,
            pointerEvents: "all",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsEdgeHovered(true)}
          onMouseLeave={() => setIsEdgeHovered(false)}
        >
          {(isEdgeHovered || selected) && <Button color="danger" variant="solid" size="small" shape="circle" icon={<CloseOutlined />} onClick={onEdgeClick} />}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
