import React from "react";
import { HandleType } from "../Types/runtimeData";

// 节点模版类型枚举 - 该部分跟后端对应
// ReactFlow 的 Node 类型中， type 字段期望的是字符串类型，用于在 nodeTypes 对象中查找对应的组件
export enum NodeTemplateType {
  // input
  TEXT_INPUT = "1001",
  IMAGE_INPUT = "1002",
  VIDEO_INPUT = "1003",
  AUDIO_INPUT = "1004",

  // block
  // - Text based blocks
  TEXT_TO_TEXT = "2001",
  TEXT_SPLITER = "2002",
  // - Image based blocks
  TEXT_TO_IMAGE = "3001",
  IMAGE_TO_IMAGE = "3002",
  STYLE_IMAGE_GEN = "3003",
  IMAGE_DESCRIBER = "3004",
  IMAGES_UPSCALER = "3005",
  CHANGE_IMAGES_BG = "3006",
  REMOVE_IMAGES_BG = "3007",
  // - Video based blocks
  TEXT_TO_VIDEO = "4001",
  IMAGE_TO_VIDEO = "4002",
  ADD_SOUND_TO_VIDEO = "4003",
  VIDEO_LIP_SYNC = "4004",
  VIDEOS_UPSCALER = "4005",
  // - Audio based blocks
  TEXT_TO_SPEECH = "5001",
  GENERATE_MUSICS = "5002",
  GENERATE_MELODY = "5003",

  // Handy tools
  VIDEO_EDITOR = "6001",
}

export const BlockMeta: Record<HandleType, { key: HandleType; color: string }> = {
  [HandleType.TEXT]: { key: HandleType.TEXT, color: "#95CBEB" },
  [HandleType.IMAGE]: { key: HandleType.IMAGE, color: "#DBB3E5" },
  [HandleType.VIDEO]: { key: HandleType.VIDEO, color: "#ACDB83" },
  [HandleType.AUDIO]: { key: HandleType.AUDIO, color: "#EBE195" },
};

// 链接桩是否支持多连接
export enum HandleIsMulti {
  ONE = 1, // 仅支持一个连接
  MULTI = 0, // 支持多个连接
}

interface HandleModel {
  key: HandleType;
  isMulti: HandleIsMulti;
}

// 节点接口定义
export interface NodeModel {
  type: string | number; // 跟后端约定的字节码
  outputHandleType?: string;  // 输出桩类型，掌管输出桩的填充色信息、minimap 上的颜色
  handle: {
    source?: HandleModel[]; // 输入桩，包含类型、是否多连接
    target?: HandleModel[]; // 输出桩，包含类型、是否多连接
  };
}

// 节点字典数据
export const NODE_MODELS_DICTIONARY: Record<NodeTemplateType, NodeModel> = {
  [NodeTemplateType.TEXT_INPUT]: {
    type: NodeTemplateType.TEXT_INPUT,
    outputHandleType: HandleType.TEXT,
    handle: {
      target: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },
  [NodeTemplateType.IMAGE_INPUT]: {
    type: NodeTemplateType.IMAGE_INPUT,
    outputHandleType: HandleType.IMAGE,
    handle: {
      target: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },
  [NodeTemplateType.VIDEO_INPUT]: {
    type: NodeTemplateType.VIDEO_INPUT,
    outputHandleType: HandleType.VIDEO,
    handle: {
      target: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },
  [NodeTemplateType.AUDIO_INPUT]: {
    type: NodeTemplateType.AUDIO_INPUT,
    outputHandleType: HandleType.AUDIO,
    handle: {
      target: [
        {
          key: HandleType.AUDIO,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },

  [NodeTemplateType.TEXT_TO_TEXT]: {
    type: NodeTemplateType.TEXT_TO_TEXT,
    outputHandleType: HandleType.TEXT,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },

  [NodeTemplateType.TEXT_SPLITER]: {
    type: NodeTemplateType.TEXT_SPLITER,
    outputHandleType: HandleType.TEXT,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },

  [NodeTemplateType.TEXT_TO_IMAGE]: {
    type: NodeTemplateType.TEXT_TO_IMAGE,
    outputHandleType: HandleType.IMAGE,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
      target: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.IMAGE_TO_IMAGE]: {
    type: NodeTemplateType.IMAGE_TO_IMAGE,
    outputHandleType: HandleType.IMAGE,
    handle: {
      source: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.MULTI,
        },
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.STYLE_IMAGE_GEN]: {
    type: NodeTemplateType.STYLE_IMAGE_GEN,
    outputHandleType: HandleType.IMAGE,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
      target: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.IMAGE_DESCRIBER]: {
    type: NodeTemplateType.IMAGE_DESCRIBER,
    outputHandleType: HandleType.IMAGE,
    handle: {
      source: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.TEXT_TO_VIDEO]: {
    type: NodeTemplateType.TEXT_TO_VIDEO,
    outputHandleType: HandleType.VIDEO,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
      target: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.IMAGE_TO_VIDEO]: {
    type: NodeTemplateType.IMAGE_TO_VIDEO,
    outputHandleType: HandleType.VIDEO,
    handle: {
      source: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.MULTI,
        },
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.ADD_SOUND_TO_VIDEO]: {
    type: NodeTemplateType.ADD_SOUND_TO_VIDEO,
    outputHandleType: HandleType.VIDEO,
    handle: {
      source: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.MULTI,
        },
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.VIDEO_LIP_SYNC]: {
    type: NodeTemplateType.VIDEO_LIP_SYNC,
    outputHandleType: HandleType.VIDEO,
    handle: {
      source: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.MULTI,
        },
        {
          key: HandleType.AUDIO,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.TEXT_TO_SPEECH]: {
    type: NodeTemplateType.TEXT_TO_SPEECH,
    outputHandleType: HandleType.AUDIO,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
      target: [
        {
          key: HandleType.AUDIO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.IMAGES_UPSCALER]: {
    type: NodeTemplateType.IMAGES_UPSCALER,
    outputHandleType: HandleType.IMAGE,
    handle: {
      source: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },
  [NodeTemplateType.CHANGE_IMAGES_BG]: {
    type: NodeTemplateType.CHANGE_IMAGES_BG,
    outputHandleType: HandleType.IMAGE,
    handle: {
      source: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },
  [NodeTemplateType.REMOVE_IMAGES_BG]: {
    type: NodeTemplateType.REMOVE_IMAGES_BG,
    outputHandleType: HandleType.IMAGE,
    handle: {
      source: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },
  [NodeTemplateType.VIDEOS_UPSCALER]: {
    type: NodeTemplateType.VIDEOS_UPSCALER,
    outputHandleType: HandleType.VIDEO,
    handle: {
      source: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.ONE,
        },
      ],
      target: [
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.ONE,
        },
      ],
    },
  },
  [NodeTemplateType.GENERATE_MUSICS]: {
    type: NodeTemplateType.GENERATE_MUSICS,
    outputHandleType: HandleType.AUDIO,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
      target: [
        {
          key: HandleType.AUDIO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.GENERATE_MELODY]: {
    type: NodeTemplateType.GENERATE_MELODY,
    outputHandleType: HandleType.AUDIO,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
      target: [
        {
          key: HandleType.AUDIO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
    },
  },
  [NodeTemplateType.VIDEO_EDITOR]: {
    type: NodeTemplateType.VIDEO_EDITOR,
    outputHandleType: HandleType.VIDEO,
    handle: {
      source: [
        {
          key: HandleType.TEXT,
          isMulti: HandleIsMulti.MULTI,
        },
        {
          key: HandleType.IMAGE,
          isMulti: HandleIsMulti.MULTI,
        },
        {
          key: HandleType.AUDIO,
          isMulti: HandleIsMulti.MULTI,
        },
        {
          key: HandleType.VIDEO,
          isMulti: HandleIsMulti.MULTI,
        },
      ],
      target: [],
    }
  },
};

/**
 * 根据模版类型获取节点模版对象 NodeModel
 * @param type 节点模版类型
 * @returns 节点模版对象 NodeModel
 */
export const getNodeModelsByType = (type: NodeTemplateType): NodeModel => {
  return NODE_MODELS_DICTIONARY[type] || {};
};

/**
 * 根据模版类型获取输出桩颜色
 * @param type 节点模版类型
 * @returns 输出桩颜色
 */
export const getOutputHandleColorByTemplateType = (type: NodeTemplateType) => {
  const model = NODE_MODELS_DICTIONARY[type],
    defaultColor = "#000";
  if (!model || !model.outputHandleType) return defaultColor;
  return BlockMeta[model.outputHandleType as HandleType]?.color;
};