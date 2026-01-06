/**
 * 节点内嵌工具栏组件
 * 功能：
 * - 在节点左上角显示复制与删除按钮
 * - 使用 useReactFlow 执行节点复制与删除操作
 * 交互：
 * - 点击按钮阻止事件冒泡，避免触发节点拖拽或选中
 * 布局：
 * - 绝对定位于节点容器内，随画布缩放/平移自然跟随
 * Props：
 * - id：当前节点的唯一标识
 * - type：当前节点的类型
 * 依赖：
 * - antd Button、nanoid、Svg 图标
 * 用法：
 * - 在具体节点组件内渲染：<NodeToolbarManager id={id} type={type} />
 */
import React, { memo, useCallback, useState } from "react";
import { Button, Tooltip } from "antd";
import { useReactFlow } from "@xyflow/react";
import { customAlphabet } from "nanoid";
import { NodeToolBar_CopySvg, NodeToolBar_DeleteSvg } from "../../SvgLoader/staticIcon";
import useStore from "../../Store/store";
import { NodeTemplateType } from "../../Dict/dict";
import { SelectedResultsType } from "../../Types/runtimeData";

const uuid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 5);

/**
 * 组件入参
 * - id: 节点 ID
 */
interface NodeToolbarManagerProps {
  id: string;
  type: NodeTemplateType;
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
  onToolbarMouseEnter?: () => void;
  onToolbarMouseLeave?: () => void;
}

const NodeToolbarManager: React.FC<NodeToolbarManagerProps> = memo(({ id, type, toolbarRef, onToolbarMouseEnter, onToolbarMouseLeave }) => {
  const { getNodes, setNodes, deleteElements } = useReactFlow();
  const [isCopyHovered, setIsCopyHovered] = useState(false);
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const setNodeRuntimeData = useStore((s) => s.setNodeRuntimeData);
  const setNodeSelectedResultData = useStore((s) => s.setNodeSelectedResultData);

  /**
   * 复制节点
   * - 包含当前节点的运行时数据、当前节点的选中结果数据
   */
  const handleCopyNodeInline = useCallback(
    (nodeId: string) => {
      const nodes = getNodes();
      const nodeRuntimeData = useStore.getState().nodeRuntimeData[id]; // 当前节点的运行时数据
      let nodeSelectedResultData = useStore.getState().nodeSelectedResultData[id]; // 当前节点的选中结果数据

      if (nodeSelectedResultData && nodeSelectedResultData.selectedResultsType === SelectedResultsType.ID) {
        // 逻辑节点选中结果数据重置
        nodeSelectedResultData = {
          counter: 0,
          selectedResultsType: SelectedResultsType.ID,
          selectedResults: {},
        };
      }

      const nodeToCopy = nodes.find((n) => n.id === nodeId);
      if (!nodeToCopy) return;

      const newNodeId = `${nodeToCopy.type}-${new Date().getTime()}-${uuid()}`;
      const newNode = {
        ...nodeToCopy,
        id: newNodeId,
        position: {
          x: nodeToCopy.position.x + 50,
          y: nodeToCopy.position.y + 50,
        },
        selected: false,
      } as any;

      // 节点数据
      setNodes([...nodes, newNode]);
      // 节点运行时数据
      setNodeRuntimeData(newNodeId, nodeRuntimeData);
      // 节点的选中结果数据
      nodeSelectedResultData && setNodeSelectedResultData(newNodeId, nodeSelectedResultData);
    },
    [getNodes, setNodes]
  );

  /**
   * 删除节点
   */
  const handleDeleteNodeInline = useCallback(
    (nodeId: string) => {
      deleteElements({ nodes: [{ id: nodeId }] });
    },
    [deleteElements]
  );

  return (
    <div ref={toolbarRef} onMouseEnter={onToolbarMouseEnter} onMouseLeave={onToolbarMouseLeave} className="node-workflow absolute w-[80px] h-[44px] -top-[47px]  left-0 z-[10] bg-white outline outline-1 outline-[#F3F3F3] p-1 rounded-[4px] flex items-center justify-between">
      <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Copy</div>} mouseEnterDelay={0.1} classNames={{ container: "node-workflow-tooltip-container" }}>
        <Button
          type="text"
          size="small"
          icon={<NodeToolBar_CopySvg color={isCopyHovered ? "#262626" : "#989898"} />}
          onClick={(e) => {
            e.stopPropagation();
            handleCopyNodeInline(id);
          }}
          onMouseEnter={() => setIsCopyHovered(true)}
          onMouseLeave={() => setIsCopyHovered(false)}
          className="hover:bg-[var(--op-node-tool-bar-item-hover)] px-2 w-[36px] h-[36px] py-[2px] rounded-[3px] flex items-center gap-1 cursor-pointer"
        />
      </Tooltip>
      <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Delete</div>} mouseEnterDelay={0.1} classNames={{ container: "node-workflow-tooltip-container" }}>
        <Button
          type="text"
          size="small"
          icon={<NodeToolBar_DeleteSvg color={isDeleteHovered ? "#FF3C52" : "#989898"} />}
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteNodeInline(id);
          }}
          onMouseEnter={() => setIsDeleteHovered(true)}
          onMouseLeave={() => setIsDeleteHovered(false)}
          className="hover:bg-[var(--op-node-tool-bar-item-hover)] px-2 w-[36px] h-[36px] py-[2px] rounded-[3px] flex items-center gap-1 cursor-pointer"
        />
      </Tooltip>
    </div>
  );
});

NodeToolbarManager.displayName = "NodeToolbarManager";

export default NodeToolbarManager;
