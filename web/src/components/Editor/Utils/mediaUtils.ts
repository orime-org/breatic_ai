/**
 * 获取图片元数据 (Promise版)
 *
 * 异步加载图片并获取其宽高。适用于在非 React 组件环境（如循环、事件处理函数）中使用。
 *
 * @param fileOrUrl - 图片文件(File) 或 图片地址(string)
 * @returns Promise，包含图片的 width 和 height
 *
 * @example
 * ```ts
 * const { width, height } = await getImageMeta(file);
 * console.log(`Image size: ${width}x${height}`);
 * ```
 */
export const getImageMeta = (fileOrUrl: File | string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    let url: string;
    let revoke = false;

    if (fileOrUrl instanceof File) {
      url = URL.createObjectURL(fileOrUrl);
      revoke = true;
    } else {
      url = fileOrUrl;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      if (revoke) URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      reject(new Error("Image load failed"));
      if (revoke) URL.revokeObjectURL(url);
    };

    img.src = url;
  });
};

/**
 * 获取音频元数据 (Promise版)
 *
 * 异步加载音频并获取其时长。适用于在非 React 组件环境中使用。
 *
 * @param fileOrUrl - 音频文件(File) 或 音频地址(string)
 * @returns Promise，包含音频的 duration (秒)
 *
 * @example
 * ```ts
 * const { duration } = await getAudioMeta(file);
 * console.log(`Audio duration: ${duration}s`);
 * ```
 */
export const getAudioMeta = (fileOrUrl: File | string): Promise<{ duration: number }> => {
  return new Promise((resolve, reject) => {
    let url: string;
    let revoke = false;

    if (fileOrUrl instanceof File) {
      url = URL.createObjectURL(fileOrUrl);
      revoke = true;
    } else {
      url = fileOrUrl;
    }

    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";

    audio.onloadedmetadata = () => {
      resolve({ duration: audio.duration });
      if (revoke) URL.revokeObjectURL(url);
    };

    audio.onerror = () => {
      reject(new Error("Audio load failed"));
      if (revoke) URL.revokeObjectURL(url);
    };

    audio.src = url;
  });
};

/**
 * 获取视频元数据 (Promise版)
 *
 * 异步加载视频并获取其时长和宽高。适用于在非 React 组件环境中使用。
 *
 * @param fileOrUrl - 视频文件(File) 或 视频地址(string)
 * @returns Promise，包含视频的 duration (秒), width (px), height (px)
 *
 * @example
 * ```ts
 * const { duration, width, height } = await getVideoMeta(videoUrl);
 * console.log(`Video info: ${width}x${height}, ${duration}s`);
 * ```
 */
export const getVideoMeta = (fileOrUrl: File | string): Promise<{ duration: number; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    let url: string;
    let revoke = false;

    if (fileOrUrl instanceof File) {
      url = URL.createObjectURL(fileOrUrl);
      revoke = true;
    } else {
      url = fileOrUrl;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.crossOrigin = "anonymous";

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      if (revoke) URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      reject(new Error("Video load failed"));
      if (revoke) URL.revokeObjectURL(url);
    };

    video.src = url;
  });
};

/**
 * 获取视频缩略图 (Promise版)
 *
 * 异步生成视频的缩略图（Base64 格式）。
 * 包含创建隐藏 video 元素、seek 到指定时间点、截图等复杂流程。
 *
 * @param fileOrUrl - 视频文件(File) 或 视频地址(string)
 * @returns Promise，成功返回 Base64 字符串，失败返回 undefined
 *
 * @example
 * ```ts
 * const thumbnail = await getVideoThumbnail(file);
 * if (thumbnail) {
 *   console.log('Thumbnail generated:', thumbnail);
 * }
 * ```
 */
export const getVideoThumbnail = async (fileOrUrl: File | string): Promise<string | undefined> => {
  let url: string;
  let revoke = false;

  if (fileOrUrl instanceof File) {
    url = URL.createObjectURL(fileOrUrl);
    revoke = true;
  } else {
    url = fileOrUrl;
  }

  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const holder = document.createElement("div");
    Object.assign(holder.style, {
      position: "fixed",
      left: "-9999px",
      top: "-9999px",
      width: "1px",
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
    });
    holder.appendChild(video);
    document.body.appendChild(holder);

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("metadata load failed"));
      video.load();
    });

    const ratio = video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 1;
    const targetWidth = 360;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = Math.round(targetWidth * ratio);

    const seekTime = video.duration ? Math.max(0.2, video.duration * 0.02) : 0.2;
    video.currentTime = seekTime;

    await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        setTimeout(resolve, 1000);
    });
    
    await new Promise((r) => setTimeout(r, 100));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context missing");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    
    if (!blob) throw new Error("Blob creation failed");

    const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });

    document.body.removeChild(holder);
    return dataUrl;

  } catch (e) {
    console.error("Thumbnail generation failed:", e);
    return undefined;
  } finally {
    if (revoke) URL.revokeObjectURL(url);
  }
};