import { ReactNode } from "react";

// 纵横比类型
export interface aspectRatioType {
  value: string;
  label: ReactNode;
}

// 时长类型
export interface durationType {
  value: string;
  label: ReactNode;
}

// 分辨率类型
export interface resolutionType {
  value: string;
  label: ReactNode;
}

// 图片模型类型
export interface imageModelType {
  value: string;
  label: ReactNode;
  description: string;
  credits: number;
  icon: string;
}

// 节点提示类型
export interface tipsType {
  content: string;
  items: string[];
}

// 视频模型类型
export interface videoModelType {
  value: string;
  label: ReactNode;
  description: string;
  credits: number;
  icon: string;
}

/**
 * 音频模型类型
 */
export interface audioModelType {
  value: string;
  label: ReactNode;
  children?: audioModelType[];
  description: string;
  credits: number;
  icon: string;
}

/**
 * 语言类型
 */
export interface languageType {
  value: string;
  label: string;
}

/**
 * 声音类型
 */
export interface voiceType {
  value: string;
  label: ReactNode;
  sample: string; // 声音样本 URL-link 用于播放
}

/**
 * 视频填充类型
 * 当视频长度短于音频长度时，视频填充类型
 */
export interface videoFillModelType {
  value: string;
  label: ReactNode;
}

/**
 * 文本模型类型
 */
export interface textModelType {
  value: string;
  label: ReactNode;
  children?: audioModelType[];
  description: string;
  credits: number;
  icon: string;
}
