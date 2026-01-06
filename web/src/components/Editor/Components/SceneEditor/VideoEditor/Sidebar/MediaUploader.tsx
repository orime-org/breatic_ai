import React from "react";
import { App, Collapse, message, Upload } from "antd";
import { useTranslation } from "react-i18next";
import type { UploadProps } from "antd";
import { MediaItem } from "../types";
import editorApi from "../../../../../../api/editorApi";
import { NODE_EXECUTE_STATUS_CODE } from "../../../../Types/types";
import useStore from "../../../../Store/store";
import type { RcFile } from "antd/es/upload/interface";

interface MediaUploaderProps {
  onMediaAdd: (item: MediaItem) => void;
  uploadType?: "folder" | "image" | "audio" | "video";
  nodeId: string;
  onUploadStart?: (type?: "video" | "audio" | "image") => void;
  onUploadEnd?: (type?: "video" | "audio" | "image") => void;
}

// 服务器返回的上传结果
interface UploadResult {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  url: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileInfo: {
    name: string;
    type: string;
    size: number;
  };
}

/**
 * 从视频文件中提取第一帧作为缩略图
 * @param file 视频文件
 * @returns 第一帧的 base64 编码字符串
 */
const extractThumbWithVideoElement = async (file: File): Promise<string> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    // 关键：挂到离屏 DOM，确保部分浏览器触发渲染管线
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-9999px";
    holder.style.top = "-9999px";
    holder.style.width = "1px";
    holder.style.height = "1px";
    holder.style.opacity = "0";
    holder.style.pointerEvents = "none";
    holder.appendChild(video);
    document.body.appendChild(holder);

    // 1) 先等元数据，拿到时长与尺寸
    await new Promise<void>((resolve, reject) => {
      const onLoadedMeta = () => resolve();
      const onError = () => reject(new Error("HTMLVideo 元数据加载失败"));
      video.addEventListener("loadedmetadata", onLoadedMeta, { once: true });
      video.addEventListener("error", onError, { once: true });
      // 某些浏览器需要显式 load
      video.load();
    });

    // 2) 跳到一个更稳的时间点（避免 0s 黑帧）
    const targetWidth = 360;
    const ratio = video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 1;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = Math.round(targetWidth * ratio);

    // 采样时间：至少 0.2s；或视频总时长的 2%（取更大者）
    const seekTime = video.duration ? Math.max(0.2, video.duration * 0.02) : 0.2;

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
      };
      const onSeeked = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("HTMLVideo 定位失败"));
      };
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });
      try {
        video.currentTime = seekTime;
      } catch {
        // 退回到最开始位置
        video.currentTime = 0;
      }
    });

    // 3) 强制解码，推动产生可绘制帧
    await video.play().catch(() => {});
    // 等一小段时间让解码管线跑起来，然后暂停
    await new Promise((r) => setTimeout(r, 30));
    video.pause();

    // 4) 等待已绘制帧（带超时兜底，避免永不返回）
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const timeout = setTimeout(finish, 120);
      if (typeof (video as any).requestVideoFrameCallback === "function") {
        (video as any).requestVideoFrameCallback(() => {
          clearTimeout(timeout);
          finish();
        });
      } else if (video.readyState < 2) {
        video.addEventListener(
          "canplay",
          () => {
            clearTimeout(timeout);
            finish();
          },
          { once: true }
        );
      } else {
        finish();
      }
    });

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 不可用");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 用 toBlob + FileReader，避免 toDataURL 的同步大字符串开销
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("生成缩略图失败"))), "image/jpeg", 0.85);
    });

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

/**
 * 从本地 File 解析图片宽高
 * @param file 图片文件
 * @returns 图片的宽度和高度
 */
const getImageMeta = async (file: File): Promise<{ width?: number; height?: number }> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: undefined, height: undefined });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
};

/**
 * 从本地 File 解析视频时长与宽高
 * @param file 视频文件
 * @returns 视频的时长、宽度和高度
 */
const getVideoMeta = async (file: File): Promise<{ duration?: number; width?: number; height?: number }> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({ duration: undefined, width: undefined, height: undefined });
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
};

/**
 * 从本地 File 解析音频时长
 * @param file 音频文件
 * @returns 音频的时长
 */
const getAudioMeta = async (file: File): Promise<{ duration?: number }> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve({ duration: audio.duration });
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve({ duration: undefined });
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
};

/**
 * 媒体上传器组件
 * @param param0 组件属性
 * @returns 组件JSX元素
 */
const MediaUploaderComponent: React.FC<MediaUploaderProps> = ({ onMediaAdd, uploadType = "folder", nodeId, onUploadStart, onUploadEnd }) => {
  const { t } = useTranslation();
   const { message: messageApi } = App.useApp();

  // 为每次批量选择的文件打上批次索引与类型内索引
  const beforeUpload: UploadProps["beforeUpload"] = (file: RcFile, fileList) => {
    const rcFile = file as any;
    const type: "video" | "audio" | "image" = file.type?.startsWith("video/") ? "video" : file.type?.startsWith("audio/") ? "audio" : "image";

    // 文件验证
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      messageApi.error(`File size must not exceed 10 MB`);
      return false; // 阻止上传
    }

    // 批次内索引
    const batchIndex = fileList.findIndex((f) => f.uid === file.uid);
    const batchSize = fileList.length;

    // 同类型的索引与数量
    const sameTypeList = fileList.filter((f) => (f.type?.startsWith("video/") ? type === "video" : f.type?.startsWith("audio/") ? type === "audio" : type === "image"));
    const typeIndexInBatch = sameTypeList.findIndex((f) => f.uid === file.uid);
    const typeCountInBatch = sameTypeList.length;

    // 写入标记
    rcFile.__batchIndex = batchIndex;
    rcFile.__batchSize = batchSize;
    rcFile.__type = type;
    rcFile.__typeIndexInBatch = typeIndexInBatch;
    rcFile.__typeCountInBatch = typeCountInBatch;
    return true; // 允许上传
  };

  // 自定义上传逻辑
  const customRequest: UploadProps["customRequest"] = async (options) => {
    console.log("VideoEditor MediaUploaderComponent customRequest", options, uploadType, nodeId);

    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;
    const type: "video" | "audio" | "image" = uploadFile.type.startsWith("video/") ? "video" : uploadFile.type.startsWith("audio/") ? "audio" : "image";

    // 开始上传回调
    onUploadStart?.(type);

    try {
      // 读取当前项目已有计数
      const currentProjectData = useStore.getState().nodeRuntimeData[nodeId]?.snapshot;
      const currentMediaItems = currentProjectData.mediaItems || [];

      const itemCounter = currentMediaItems.reduce((acc: any, item: any) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      let [mediaImageCounter = 0, mediaVideoCounter = 0, mediaAudioCounter = 0] = [itemCounter["image"], itemCounter["video"], itemCounter["audio"]];

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await editorApi.uploadFile("/api/workflow/node/upload_form", formData);

      if (response?.result?.code === NODE_EXECUTE_STATUS_CODE.SUCCESS) {
        const url = response?.result?.data || "";
        const type: "video" | "audio" | "image" = uploadFile.type.startsWith("video/") ? "video" : uploadFile.type.startsWith("audio/") ? "audio" : "image";

        const rcFile = options.file as any;
        const typeIndexInBatch: number = typeof rcFile.__typeIndexInBatch === "number" ? rcFile.__typeIndexInBatch : 0;

        // 解析本地文件的元数据
        let meta: { duration?: number; width?: number; height?: number } = {};
        if (type === "image") {
          meta = await getImageMeta(uploadFile);
        } else if (type === "audio") {
          meta = await getAudioMeta(uploadFile);
        } else if (type === "video") {
          meta = await getVideoMeta(uploadFile);
        }

        let thumbnail: string | undefined;
        if (type === "image") {
          thumbnail = url;
        } else if (type === "video") {
          thumbnail = await extractThumbWithVideoElement(uploadFile).catch(() => undefined);
        } else {
          thumbnail = undefined;
        }

        console.log("VideoEditor MediaUploaderComponent customRequest meta", meta);

        let newMediaItems: UploadResult;
        switch (type) {
          case "image":
            let currentMediaImageCounter = mediaImageCounter + (typeIndexInBatch + 1);
            newMediaItems = {
              id: `media-image-${currentMediaImageCounter}-${Date.now()}`,
              name: `image-${currentMediaImageCounter}`,
              type: "image",
              url: url,
              thumbnail: thumbnail,
              width: meta.width || 200,
              height: meta.height || 332,
              fileInfo: {
                name: uploadFile.name,
                type: uploadFile.type,
                size: uploadFile.size,
              },
            };
            break;
          case "audio":
            let currentMediaAudioCounter = mediaAudioCounter + (typeIndexInBatch + 1);
            newMediaItems = {
              id: `media-audio-${currentMediaAudioCounter}-${Date.now()}`,
              name: `audio-${currentMediaAudioCounter}`,
              type: "audio",
              url: url,
              duration: meta.duration || 0,
              fileInfo: {
                name: uploadFile.name,
                type: uploadFile.type,
                size: uploadFile.size,
              },
            };
            break;
          case "video":
            let currentMediaVideoCounter = mediaVideoCounter + typeIndexInBatch + 1;
            newMediaItems = {
              id: `media-video-${currentMediaVideoCounter}-${Date.now()}`,
              name: `video-${currentMediaVideoCounter}`,
              type: "video",
              url: url,
              thumbnail: thumbnail,
              duration: meta.duration || 0,
              width: meta.width || 395,
              height: meta.height || 222,
              fileInfo: {
                name: uploadFile.name,
                type: uploadFile.type,
                size: uploadFile.size,
              },
            };
            break;
        }

        console.log("VideoEditor MediaUploaderComponent customRequest newMediaItems", newMediaItems);
        onMediaAdd(newMediaItems);

        message.success(t(type === "video" ? "mediaLibrary.videoAdded" : type === "audio" ? "mediaLibrary.audioAdded" : "mediaLibrary.imageAdded"));

        onSuccess?.(response?.result?.data);
      } else {
        throw new Error(response?.result?.message || "File upload failed");
      }
    } catch (error) {
      console.error("File upload:", error);
      message.error(t("mediaLibrary.uploadFailed") || "File upload failed");
      onError?.(error as Error);
    } finally {
      const type: "video" | "audio" | "image" = uploadFile.type.startsWith("video/") ? "video" : uploadFile.type.startsWith("audio/") ? "audio" : "image";
      // 上传结束回调
      onUploadEnd?.(type);
    }
  };

  const { Dragger } = Upload;

  // 根据类型选择不同文案
  const dragKey = uploadType === "image" ? "mediaLibrary.dragDropImage" : uploadType === "audio" ? "mediaLibrary.dragDropAudio" : uploadType === "video" ? "mediaLibrary.dragDropVideo" : "mediaLibrary.dragDrop";
  const clickKey = uploadType === "image" ? "mediaLibrary.clickToSelectImage" : uploadType === "audio" ? "mediaLibrary.clickToSelectAudio" : uploadType === "video" ? "mediaLibrary.clickToSelectVideo" : "mediaLibrary.clickToSelect";

  // 根据类型选择不同的 accept 字符串
  // const accept = uploadType === "image" ? "image/*" : uploadType === "audio" ? "audio/*" : uploadType === "video" ? "video/*" : "video/*,audio/*,image/*";
  const accept = uploadType === "image" ? ".png,.jpg,.jpeg" : uploadType === "audio" ? ".webm,.wav,.ogg,.mp3" : uploadType === "video" ? ".mp4,.mov" : ".png,.jpg,.jpeg,.webm,.wav,.ogg,.mp3,.mp4,.mov";

  return (
    <Dragger customRequest={customRequest} beforeUpload={beforeUpload} showUploadList={false} accept={accept} multiple={true} style={{ borderRadius: "4px" }}>
      <p className="ant-upload-drag-icon" style={{ display: "flex", justifyContent: "center" }}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "32px", height: "32px", color: "#9CA3AF" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </p>
      <p className="ant-upload-text" style={{ fontSize: "12px" }}>
        {t(dragKey)}
      </p>
      <p className="ant-upload-hint" style={{ fontSize: "12px" }}>
        {t(clickKey)}
      </p>
    </Dragger>
  );
};

export const MediaUploader = React.memo(MediaUploaderComponent);
