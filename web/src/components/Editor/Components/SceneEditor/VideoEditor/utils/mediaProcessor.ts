/**
 * 媒体处理工具模块
 * 
 * 提供视频、音频、图片等媒体资源的处理功能：
 * - 视频封面生成（提取第一帧）
 * - 音频时长获取
 * - 图片尺寸获取
 * 
 * 所有函数都返回Promise，支持异步操作
 */

/**
 * 生成视频缩略图并获取视频元数据
 * 
 * 通过Canvas提取视频的指定帧作为缩略图，同时获取视频的基本信息
 * 
 * 工作流程：
 * 1. 创建video元素并加载视频
 * 2. 跳转到指定时间点（默认0.1秒）
 * 3. 将视频帧绘制到Canvas
 * 4. 转换为JPEG格式的base64图片（质量90%）
 * 5. 返回缩略图和视频元数据
 * 
 * @param videoUrl - 视频文件URL（支持本地URL和服务器URL）
 * @param seekTime - 提取帧的时间点（秒），默认0.1秒
 * @returns Promise，resolve时包含缩略图base64字符串、时长、宽度和高度
 * 
 * @throws 如果视频加载失败或Canvas上下文获取失败
 * 
 * @example
 * ```ts
 * const { thumbnail, duration, width, height } = 
 *   await generateVideoThumbnail(videoUrl);
 * console.log(`视频时长: ${duration}s, 分辨率: ${width}x${height}`);
 * ```
 */
export function generateVideoThumbnail(
  videoUrl: string,
  seekTime: number = 0.1
): Promise<{
  thumbnail: string;
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.currentTime = seekTime;

    video.addEventListener("loadeddata", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("无法获取Canvas上下文"));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameUrl = canvas.toDataURL("image/jpeg", 0.9);

      if (!frameUrl || frameUrl.length < 100) {
        reject(new Error("封面生成失败：数据为空或过小"));
        return;
      }

      resolve({
        thumbnail: frameUrl,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    });

    video.addEventListener("error", (e) => {
      reject(new Error(`Failed to load video: ${videoUrl}`));
    });
  });
}

/**
 * 获取音频文件的时长
 * 
 * 通过创建audio元素并加载元数据来获取音频时长，
 * 不会完整加载音频文件，只加载元数据，效率较高
 * 
 * @param audioUrl - 音频文件URL（支持本地URL和服务器URL）
 * @returns Promise，resolve时返回音频时长（秒）
 * 
 * @throws 如果音频加载失败
 * 
 * @example
 * ```ts
 * try {
 *   const duration = await getAudioDuration(audioUrl);
 *   console.log(`音频时长: ${duration}秒`);
 * } catch (error) {
 *   console.error('获取音频时长失败:', error);
 * }
 * ```
 */
export function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    
    audio.onerror = (error) => {
      console.error("❌ 音频加载失败:", error);
      reject(error);
    };
    
    audio.src = audioUrl;
  });
}



/**
 * 获取图片的原始尺寸
 * 
 * 通过创建Image元素加载图片，获取其naturalWidth和naturalHeight
 * 
 * @param imageUrl - 图片文件URL（支持本地URL和服务器URL）
 * @returns Promise，resolve时返回包含宽度和高度的对象
 * 
 * @throws 如果图片加载失败
 * 
 * @example
 * ```ts
 * const { width, height } = await getImageDimensions(imageUrl);
 * console.log(`图片尺寸: ${width}x${height}`);
 * ```
 */
export function getImageDimensions(imageUrl: string): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 设置crossOrigin以避免canvas污染问题
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = (error) => {
      console.error("❌ 图片加载失败:", error);
      reject(error);
    };
    
    img.src = imageUrl;
  });
}