/**
 * @file PannelLeftConponents.tsx
 * @description 编辑器左侧面板组件，用于展示和管理节点库列表。
 * 包含各类节点（Input, Text, Image, Audio, Video等）的分组展示与点击添加功能。
 * 自定义了 Ant Design Menu 的渲染样式，实现了悬停动效和分组标题。
 */
import { Menu } from "antd";
import React, { useEffect, useState } from "react";
import type { MenuProps } from "antd";
import { NodeTemplateType } from "../Dict/dict";
import { NodeTemplateDetail } from "../Types/types";
import {
  PannelLeftComponent_InputNodes_Svg,
  PannelLeftComponent_TextNodes_Svg,
  PannelLeftComponent_ImageNodes_Svg,
  PannelLeftComponent_AudioNodes_Svg,
  PannelLeftComponent_VideoNodes_Svg,
  PannelLeftComponent_TTSNodes_Svg,
  PannelLeftComponent_VideoEditorNode_Disable_Svg,
  PannelLeftComponent_VideoEditorNode_Enable_Svg,
} from "../SvgLoader/staticIcon";
import { getNodeIcon } from "../SvgLoader/nodeIcon";

// 定义组件Props接口
interface IPannelLeftComponentProps {
  onAddNode?: (id: NodeTemplateType, item?: NodeTemplateDetail) => void;
  nodeTemplateData: NodeTemplateDetail[];
}

// 节点分组
const NODE_GROUP = [
  { key: 1, title: "Input nodes", template_icon: <PannelLeftComponent_InputNodes_Svg className="w-[30px] h-[30px]" />, keys: [NodeTemplateType.TEXT_INPUT, NodeTemplateType.IMAGE_INPUT, NodeTemplateType.AUDIO_INPUT, NodeTemplateType.VIDEO_INPUT] },
  { key: 2, title: "Text nodes", template_icon: <PannelLeftComponent_TextNodes_Svg className="w-[18px] h-[18px]" />, keys: [NodeTemplateType.TEXT_SPLITER] },
  { key: 3, title: "Image nodes", template_icon: <PannelLeftComponent_ImageNodes_Svg className="w-[18px] h-[18px]" />, keys: [NodeTemplateType.TEXT_TO_IMAGE, NodeTemplateType.IMAGE_TO_IMAGE] },
  { key: 4, title: "Audio nodes", template_icon: <PannelLeftComponent_AudioNodes_Svg className="w-[18px] h-[18px]" />, keys: [NodeTemplateType.GENERATE_MUSICS, NodeTemplateType.GENERATE_MELODY] },
  { key: 5, title: "TTS nodes", template_icon: <PannelLeftComponent_TTSNodes_Svg className="w-[18px] h-[18px]" />, keys: [NodeTemplateType.TEXT_TO_SPEECH] },
  { key: 6, title: "Video nodes", template_icon: <PannelLeftComponent_VideoNodes_Svg className="w-[18px] h-[18px]" />, keys: [NodeTemplateType.TEXT_TO_VIDEO, NodeTemplateType.IMAGE_TO_VIDEO, NodeTemplateType.ADD_SOUND_TO_VIDEO, NodeTemplateType.VIDEO_LIP_SYNC] },
  { key: 7, title: "Editor nodes", template_icon: <PannelLeftComponent_VideoEditorNode_Disable_Svg className="w-[30px] h-[30px]" />, keys: [NodeTemplateType.VIDEO_EDITOR] },
];

/**
 * 构建节点面板数据
 * @param nodeTemplateData 节点模板数据
 * @returns 节点面板数据
 */
const buildNodePanelData = (nodeTemplateData: NodeTemplateDetail[]) => {
  const templateMap = new Map(nodeTemplateData.map((item) => [String(item.template_code), item]));

  const result = NODE_GROUP.map((group, index) => {
    const menuItems = group.keys
      .map((key, index) => {
        const item = templateMap.get(key);
        if (!item) return null;

        return {
          key,
          label: (
            <div className={`group flex items-center justify-start rounded-[3px] h-[38px] w-[240px] mx-[6px] px-[5px] hover:bg-[#ECECEC]`}>
              <div className="w-[20px] h-[20px]">{getNodeIcon(item.template_icon ?? null)}</div>
              <div className="flex flex-col ml-1 justify-center h-full w-full relative overflow-hidden">
                <span className="text-[14px] leading-[16px] text-[#0D0D0D] transition-transform duration-300 ease-in-out group-hover:-translate-y-[8px]">
                  {item.template_name || String(key)}
                </span>
                <span className="absolute top-[20px] left-0 w-full text-[10px] leading-[12px] text-[#989898] truncate opacity-0 translate-y-[10px] transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:translate-y-0">
                  {item?.content?.tips?.content ?? ""}
                </span>
              </div>
            </div>
          )
        };
      })
      .filter(Boolean);

    const children = [
      {
        key: `group-${group.key}`,
        type: "group",
        label: <div className="text-[10px] leading-[12px] text-[#666666] font-normal px-[10px] pt-[5px] pb-[10px]">{group.title}</div>,
        children: menuItems,
      },
    ];

    return {
      key: String(group.key),
      label: <span className="hidden" />,
      icon:
        index === 0 ? (
          // Input Nodes
          <div className="absolute left-0 flex items-center justify-center w-[52px] h-[52px] hover:rotate-90 transition-all duration-200">
            <div className="h-[30px] w-[30px] ">{group.template_icon}</div>
          </div>
        ) : index === NODE_GROUP.length - 1 ? (
          // Editor Nodes
          <EditorNodeIcon />
        ) : (
          // Logic Nodes
          <div className="absolute left-0 flex items-center justify-center w-[52px] h-[38px]">
            <div className="flex items-center justify-center rounded-[3px] h-[38px] w-[38px] hover:bg-[#ECECEC]">{group.template_icon}</div>
          </div>
        ),
      children,
    };
  });

  return result;
};

/**
 * @description 编辑器左侧面板组件 - 视频编辑节点图标
 * @returns 视频编辑节点图标
 */
const EditorNodeIcon = () => {
  const [hover, setHover] = useState(false);

  return (
    <div className="absolute left-0 flex w-[52px] h-[52px]" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex items-center justify-center w-full h-full">{hover ? <PannelLeftComponent_VideoEditorNode_Enable_Svg className="w-[30px] h-[30px]" /> : <PannelLeftComponent_VideoEditorNode_Disable_Svg className="w-[30px] h-[30px]" />}</div>
    </div>
  );
};

/**
 * @description 编辑器左侧面板组件 - 节点库列表
 * @param param0 组件属性
 * @returns 节点库列表组件
 */
const PannelLeftComponent: React.FC<IPannelLeftComponentProps> = ({ onAddNode, nodeTemplateData }) => {
  const [items, setItems] = useState<MenuProps["items"]>([]);

  useEffect(() => {
    const items = buildNodePanelData(nodeTemplateData);
    setItems(items);
  }, [nodeTemplateData]);

  const handleMenuOnClickEvent: MenuProps["onClick"] = (e) => {
    const { key } = e;

    const result = nodeTemplateData?.find((item) => item.template_code === Number(key)) || ({} as NodeTemplateDetail);
    if (onAddNode && key) onAddNode(key as NodeTemplateType, result);
  };

  return (
    <div className="bg-transparent z-20 fixed left-3 top-[158px] pointer-events-auto">
      <Menu className="pannelLeftComponentsMenuContianer w-[52px] rounded-t-[5px] rounded-b-[180px] border-0 outline outline-1 outline-solid outline-[#E9E9E9] gap-4" expandIcon={null} onClick={handleMenuOnClickEvent} mode="vertical" items={items} />
    </div>
  );
};

export default PannelLeftComponent;
