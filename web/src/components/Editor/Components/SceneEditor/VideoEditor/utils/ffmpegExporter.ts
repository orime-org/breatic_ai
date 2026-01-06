/**
 * FFmpeg视频导出模块
 *
 * 使用FFmpeg.wasm在浏览器中合成视频，支持：
 * - 多轨道视频/图片/文本合成
 * - 音频混合
 * - 片段裁剪和变换（旋转、缩放、透明度）
 * - 导出为MP4格式
 * - 实时进度反馈
 *
 * 技术栈：
 * - @ffmpeg/ffmpeg：WebAssembly版本的FFmpeg
 * - Canvas API：预渲染视频帧
 * - Web Audio API：处理音频
 *
 * 导出流程：
 * 1. 初始化FFmpeg实例
 * 2. 预渲染所有视频帧到Canvas
 * 3. 将帧序列保存为图片
 * 4. 使用FFmpeg合成图片序列为视频
 * 5. 添加音频轨道并混合
 * 6. 输出最终的MP4文件
 *
 * 性能优化：
 * - 单例模式复用FFmpeg实例
 * - 帧率自适应（默认30fps）
 * - 异步加载媒体资源
 */

import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg, runInFFmpegQueue } from "./ffmpegShared";
import { MediaItem, TimelineClip } from "../types";
import { getBaseCanvasSize } from "./canvasCoordinates";

/**
 * 异步加载图片
 *
 * @param url - 图片URL
 * @returns Promise，resolve时返回已加载的HTMLImageElement
 *
 * @example
 * ```ts
 * const img = await loadImage(imageUrl);
 * ctx.drawImage(img, 0, 0);
 * ```
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * 异步加载视频
 *
 * 只加载视频元数据，不加载完整视频内容
 *
 * @param url - 视频URL
 * @returns Promise，resolve时返回已加载元数据的HTMLVideoElement
 *
 * @example
 * ```ts
 * const video = await loadVideo(videoUrl);
 * video.currentTime = 5.0; // 跳转到5秒
 * ```
 */
const loadVideo = (url: string): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = reject;
  });
};

const renderSingleClip = async (ctx: CanvasRenderingContext2D, clip: TimelineClip, media: MediaItem, currentTime: number, canvasSize: { width: number; height: number }): Promise<void> => {
  ctx.save();

  const rotation = ((clip.rotation ?? 0) * Math.PI) / 180;
  const scale = clip.scale ?? 1;
  const opacity = (clip.opacity ?? 100) / 100;

  try {
    if (media.type === "image" && media.url) {
      const img = await loadImage(media.url);
      const width = clip.width ?? img.width;
      const height = clip.height ?? img.height;

      // 计算元素左上角坐标和中心点坐标
      const x = clip.x ?? (canvasSize.width - width) / 2;
      const y = clip.y ?? (canvasSize.height - height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // 应用变换（平移到中心点、旋转、缩放）- 对应外层容器的 transform
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      const mediaStyle = clip.mediaStyle || {};

      // === 步骤1: 绘制阴影 ===
      // 阴影需要通过绘制一个形状来产生，不能只设置属性
      if (mediaStyle.shadowColor && mediaStyle.shadowBlur) {
        ctx.shadowColor = mediaStyle.shadowColor;
        ctx.shadowBlur = mediaStyle.shadowBlur || 0;
        ctx.shadowOffsetX = mediaStyle.shadowOffsetX || 0;
        ctx.shadowOffsetY = mediaStyle.shadowOffsetY || 0;

        // 绘制一个形状来产生阴影
        if (mediaStyle.borderRadius) {
          // 有圆角：绘制圆角矩形
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.fillStyle = "black"; // 临时填充色，用于产生阴影
          ctx.fill();
        } else {
          // 无圆角：绘制矩形
          ctx.fillStyle = "black"; // 临时填充色，用于产生阴影
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }

        // 清除阴影设置
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // === 步骤2: 创建圆角裁剪路径 ===
      if (mediaStyle.borderRadius) {
        const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(-width / 2 + radius, -height / 2);
        ctx.lineTo(width / 2 - radius, -height / 2);
        ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
        ctx.lineTo(width / 2, height / 2 - radius);
        ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
        ctx.lineTo(-width / 2 + radius, height / 2);
        ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
        ctx.lineTo(-width / 2, -height / 2 + radius);
        ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
        ctx.closePath();
        ctx.clip();
      }

      // === 步骤3: 应用透明度和滤镜 ===
      ctx.globalAlpha = opacity;

      const filters = [];
      if (mediaStyle.blur && mediaStyle.blur > 0) {
        filters.push(`blur(${mediaStyle.blur}px)`);
      }
      if (mediaStyle.brightness && mediaStyle.brightness !== 100) {
        filters.push(`brightness(${mediaStyle.brightness}%)`);
      }
      if (filters.length > 0) {
        ctx.filter = filters.join(" ");
      }

      // === 步骤4: 绘制图片内容 ===
      if (clip.cropArea && media.width && media.height) {
        // 处理裁剪：绘制裁剪后的图片
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = clip.cropArea;

        // 检查图片实际尺寸是否与 media 尺寸一致
        const actualImageWidth = img.naturalWidth || media.width;
        const actualImageHeight = img.naturalHeight || media.height;

        console.log("🖼️ 导出-图片裁剪:", {
          媒体尺寸: { width: media.width, height: media.height },
          图片实际尺寸: { width: actualImageWidth, height: actualImageHeight },
          裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
        });

        // 如果尺寸不一致，需要调整裁剪坐标
        const scaleX = actualImageWidth / media.width;
        const scaleY = actualImageHeight / media.height;

        const adjustedCropX = cropX * scaleX;
        const adjustedCropY = cropY * scaleY;
        const adjustedCropWidth = cropWidth * scaleX;
        const adjustedCropHeight = cropHeight * scaleY;

        ctx.drawImage(
          img,
          adjustedCropX,
          adjustedCropY,
          adjustedCropWidth,
          adjustedCropHeight, // 源裁剪区域
          -width / 2,
          -height / 2,
          width,
          height // 目标区域
        );
      } else {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      }

      // 清除阴影和滤镜，准备绘制轮廓
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.filter = "none";
      ctx.globalAlpha = 1;

      // 4. 绘制轮廓（在外层，不受滤镜影响）
      if (mediaStyle.outlineColor && mediaStyle.outlineWidth) {
        ctx.strokeStyle = mediaStyle.outlineColor;
        ctx.lineWidth = mediaStyle.outlineWidth;
        if (mediaStyle.borderRadius) {
          // 如果有圆角，沿着圆角路径绘制轮廓
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.strokeRect(-width / 2, -height / 2, width, height);
        }
      }
    } else if (media.type === "video" && media.url) {
      const video = await loadVideo(media.url);
      const width = clip.width ?? (media.width || video.videoWidth);
      const height = clip.height ?? (media.height || video.videoHeight);

      // 计算元素左上角坐标和中心点坐标
      const x = clip.x ?? (canvasSize.width - width) / 2;
      const y = clip.y ?? (canvasSize.height - height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // 应用变换（平移到中心点、旋转、缩放）- 对应外层容器的 transform
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      const trimStart = clip.trimStart || 0;
      const videoTime = trimStart + (currentTime - clip.start);
      video.currentTime = Math.max(0, Math.min(videoTime, video.duration));

      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (video.readyState >= 2) resolve();
          else setTimeout(checkReady, 50);
        };
        checkReady();
      });

      const mediaStyle = clip.mediaStyle || {};

      // === 步骤1: 绘制阴影 ===
      // 阴影需要通过绘制一个形状来产生，不能只设置属性
      if (mediaStyle.shadowColor && mediaStyle.shadowBlur) {
        ctx.shadowColor = mediaStyle.shadowColor;
        ctx.shadowBlur = mediaStyle.shadowBlur || 0;
        ctx.shadowOffsetX = mediaStyle.shadowOffsetX || 0;
        ctx.shadowOffsetY = mediaStyle.shadowOffsetY || 0;

        // 绘制一个形状来产生阴影
        if (mediaStyle.borderRadius) {
          // 有圆角：绘制圆角矩形
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.fillStyle = "black"; // 临时填充色，用于产生阴影
          ctx.fill();
        } else {
          // 无圆角：绘制矩形
          ctx.fillStyle = "black"; // 临时填充色，用于产生阴影
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }

        // 清除阴影设置
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // === 步骤2: 创建圆角裁剪路径 ===
      if (mediaStyle.borderRadius) {
        const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(-width / 2 + radius, -height / 2);
        ctx.lineTo(width / 2 - radius, -height / 2);
        ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
        ctx.lineTo(width / 2, height / 2 - radius);
        ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
        ctx.lineTo(-width / 2 + radius, height / 2);
        ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
        ctx.lineTo(-width / 2, -height / 2 + radius);
        ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
        ctx.closePath();
        ctx.clip();
      }

      // === 步骤3: 应用透明度和滤镜 ===
      ctx.globalAlpha = opacity;

      const filters = [];
      if (mediaStyle.blur && mediaStyle.blur > 0) {
        filters.push(`blur(${mediaStyle.blur}px)`);
      }
      if (mediaStyle.brightness && mediaStyle.brightness !== 100) {
        filters.push(`brightness(${mediaStyle.brightness}%)`);
      }
      if (filters.length > 0) {
        ctx.filter = filters.join(" ");
      }

      // === 步骤4: 绘制视频内容 ===
      if (clip.cropArea && media.width && media.height) {
        // 处理裁剪：绘制裁剪后的视频
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = clip.cropArea;

        // 检查视频实际尺寸是否与 media 尺寸一致
        const actualVideoWidth = video.videoWidth || media.width;
        const actualVideoHeight = video.videoHeight || media.height;

        console.log("🎬 导出-视频裁剪:", {
          媒体尺寸: { width: media.width, height: media.height },
          视频实际尺寸: { width: actualVideoWidth, height: actualVideoHeight },
          裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
        });

        // 如果尺寸不一致，需要调整裁剪坐标
        const scaleX = actualVideoWidth / media.width;
        const scaleY = actualVideoHeight / media.height;

        const adjustedCropX = cropX * scaleX;
        const adjustedCropY = cropY * scaleY;
        const adjustedCropWidth = cropWidth * scaleX;
        const adjustedCropHeight = cropHeight * scaleY;

        ctx.drawImage(
          video,
          adjustedCropX,
          adjustedCropY,
          adjustedCropWidth,
          adjustedCropHeight, // 源裁剪区域
          -width / 2,
          -height / 2,
          width,
          height // 目标区域
        );
      } else {
        ctx.drawImage(video, -width / 2, -height / 2, width, height);
      }

      // 清除阴影和滤镜，准备绘制轮廓
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.filter = "none";
      ctx.globalAlpha = 1;

      // 4. 绘制轮廓（在外层，不受滤镜影响）
      if (mediaStyle.outlineColor && mediaStyle.outlineWidth) {
        ctx.strokeStyle = mediaStyle.outlineColor;
        ctx.lineWidth = mediaStyle.outlineWidth;
        if (mediaStyle.borderRadius) {
          // 如果有圆角，沿着圆角路径绘制轮廓
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.strokeRect(-width / 2, -height / 2, width, height);
        }
      }
    } else if (media.type === "text") {
      const textStyle = clip.textStyle || {};
      let text = clip.text || "Text";

      if (textStyle.textTransform === "uppercase") text = text.toUpperCase();
      else if (textStyle.textTransform === "lowercase") text = text.toLowerCase();
      else if (textStyle.textTransform === "capitalize") {
        text = text.replace(/\b\w/g, (l: string) => l.toUpperCase());
      }

      const width = clip.width ?? 120;
      const height = clip.height ?? 40;

      // 计算元素中心点坐标（从左上角坐标转换）
      const x = clip.x ?? (canvasSize.width - width) / 2;
      const y = clip.y ?? (canvasSize.height - height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // 应用变换（平移到中心点、旋转、缩放）
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      // 应用透明度
      ctx.globalAlpha = opacity;

      // 设置字体样式
      const fontSize = textStyle.fontSize ?? 48; // 默认字号48
      const fontFamily = textStyle.fontFamily || "Arial";

      // 确保字体已加载（fontFamily 已包含字重信息，如 "Consolas-Bold"）
      try {
        await document.fonts.load(`${fontSize}px "${fontFamily}"`);
      } catch (e) {
        console.warn("字体加载失败，使用默认字体:", e);
      }

      ctx.font = `${fontSize}px "${fontFamily}"`;
      ctx.fillStyle = textStyle.color || "#ffffff";
      ctx.textBaseline = "top"; // 改为 top 以便更好地控制多行文字

      // 根据对齐方式计算文字绘制位置（在容器内对齐）
      const textAlign = textStyle.textAlign || "center";
      let textX = 0;

      if (textAlign === "left") {
        ctx.textAlign = "left";
        textX = -width / 2; // 容器左边界
      } else if (textAlign === "right") {
        ctx.textAlign = "right";
        textX = width / 2; // 容器右边界
      } else {
        ctx.textAlign = "center";
        textX = 0; // 容器中心
      }

      // 文字阴影
      if (textStyle.shadowColor) {
        ctx.shadowColor = textStyle.shadowColor;
        ctx.shadowOffsetX = textStyle.shadowOffsetX || 0;
        ctx.shadowOffsetY = textStyle.shadowOffsetY || 0;
        ctx.shadowBlur = textStyle.shadowBlur || 0;
      }

      // 处理多行文本：按 \n 分割，并处理自动换行
      const rawLines = text.split("\n");
      const lines: string[] = [];

      // 处理每一行的自动换行
      rawLines.forEach((rawLine) => {
        if (rawLine === "") {
          // 空行也要保留
          lines.push("");
          return;
        }

        // 测量文本宽度，如果超过容器宽度则自动换行
        const words = rawLine.split("");
        let currentLine = "";

        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine + words[i];
          const metrics = ctx.measureText(testLine);

          if (metrics.width > width && currentLine !== "") {
            // 超过宽度，当前行结束
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }

        // 添加最后一行
        if (currentLine !== "") {
          lines.push(currentLine);
        }
      });

      console.log("📝 [导出] 文本换行处理:", {
        原始文本: text,
        换行符数量: (text.match(/\n/g) || []).length,
        分割后行数: lines.length,
        各行内容: lines,
      });

      const lineHeight = fontSize * 1.6; // 行高为字号的1.6倍
      const totalTextHeight = lines.length * lineHeight;
      const startY = -totalTextHeight / 2; // 垂直居中

      // 绘制每一行文字
      lines.forEach((line, index) => {
        const currentY = startY + index * lineHeight;

        // 文字描边（必须在填充之前绘制，并且描边宽度要加倍）
        if (textStyle.strokeColor && textStyle.strokeWidth) {
          ctx.strokeStyle = textStyle.strokeColor;
          ctx.lineWidth = textStyle.strokeWidth * 2; // Canvas 描边是居中的，所以要乘以2
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(line, textX, currentY);
        }

        // 绘制文字填充
        ctx.fillText(line, textX, currentY);

        // 文字装饰线（下划线、删除线、上划线）
        if (textStyle.textDecoration && textStyle.textDecoration !== "none") {
          ctx.save();
          ctx.shadowColor = "transparent"; // 清除阴影
          ctx.shadowBlur = 0;

          const metrics = ctx.measureText(line);
          const textWidth = metrics.width;

          // 计算文字起始X坐标（基于 textX 和对齐方式）
          let textStartX = textX;
          if (ctx.textAlign === "center") {
            textStartX = textX - textWidth / 2;
          } else if (ctx.textAlign === "right") {
            textStartX = textX - textWidth;
          }
          // left 对齐时 textStartX = textX

          const decorationLineWidth = Math.max(1.5, fontSize * 0.06);

          // 解析装饰类型（支持多个装饰同时存在）
          const decorations = textStyle.textDecoration.split(" ").filter((d: string) => d.trim());

          // 绘制装饰线的函数
          const drawDecorationLine = (y: number) => {
            ctx.beginPath();
            ctx.moveTo(textStartX, y);
            ctx.lineTo(textStartX + textWidth, y);
            ctx.lineWidth = decorationLineWidth;
            // 如果有轮廓，使用轮廓颜色；否则使用文字颜色
            ctx.strokeStyle = textStyle.strokeColor && textStyle.strokeWidth ? textStyle.strokeColor : textStyle.color || "#ffffff";
            ctx.stroke();
          };

          decorations.forEach((decoration: string) => {
            if (decoration === "underline") {
              // 下划线：CSS标准位置约为 baseline + 0.15em（baseline是top时约为fontSize * 0.85）
              const underlineY = currentY + fontSize * 0.85;
              drawDecorationLine(underlineY);
            } else if (decoration === "line-through") {
              // 删除线：CSS标准位置约为 baseline - 0.25em（baseline是top时约为fontSize * 0.5）
              const middleY = currentY + fontSize * 0.5;
              drawDecorationLine(middleY);
            } else if (decoration === "overline") {
              // 上划线：在文字顶部上方一些距离
              const topY = currentY - fontSize * 0.15;
              drawDecorationLine(topY);
            }
          });
          ctx.restore();
        }
      });
    }
  } catch (error) {
    console.error("渲染片段失败:", error);
  }

  ctx.restore();
};

const renderFrame = async (ctx: CanvasRenderingContext2D, clips: TimelineClip[], mediaItems: MediaItem[], currentTime: number, canvasSize: { width: number; height: number }, canvasRatio: string): Promise<void> => {
  // 根据画布比例获取虚拟坐标系统尺寸
  // 所有clip坐标都基于此虚拟坐标系统存储
  const baseSize = getBaseCanvasSize(canvasRatio);
  const baseWidth = baseSize.width;
  const baseHeight = baseSize.height;

  // 清空画布背景
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  ctx.save();

  // 使用等比例缩放，保持元素不变形（与PreviewCanvas一致）
  // 计算缩放比例：以宽度为基准
  const scale = canvasSize.width / baseWidth;
  ctx.scale(scale, scale);

  // 获取可见的素材片段
  const visibleClips = clips.filter((clip) => currentTime >= clip.start && currentTime < clip.end).sort((a, b) => b.trackIndex - a.trackIndex);

  // 使用虚拟坐标系统渲染
  for (const clip of visibleClips) {
    let media = mediaItems.find((item) => item.id === clip.mediaId);
    if (!media) media = {id: clip.mediaId, name: clip.mediaId, text: clip.text || "Text", type: "text", url: ""};
    if (media?.type === "audio") continue;

    await renderSingleClip(ctx, clip, media, currentTime, { width: baseWidth, height: baseHeight });
  }

  ctx.restore();
};

/**
 * 视频导出选项接口
 */
export interface ExportOptions {
  /** 输出分辨率（如"1920x1080"），默认根据画布比例自动计算 */
  resolution?: string;
  /** 帧率（fps），默认30 */
  frameRate?: number;
  /** 视频比特率（如"2M"、"5M"），默认"2M" */
  bitrate?: string;
  /** 比特率模式（"cbr"固定或"vbr"可变），默认"cbr" */
  bitrateMode?: string;
  /** 视频编码器（如"libx264"），默认"libx264" */
  codec?: string;
  /** 音频采样率（Hz），默认44100 */
  audioSampleRate?: number;
  /** 音频质量（如"128k"），默认"128k" */
  audioQuality?: string;
  /** 输出格式，默认"mp4" */
  format?: string;
}

/**
 * 导出视频为MP4格式
 *
 * 使用FFmpeg.wasm在浏览器中合成完整视频，支持多轨道合成
 *
 * 导出流程：
 * 1. 初始化FFmpeg和Canvas
 * 2. 计算总帧数和时长
 * 3. 逐帧渲染所有视频帧（包含所有可见片段）
 * 4. 将帧保存为图片序列
 * 5. 使用FFmpeg将图片序列合成视频
 * 6. 处理音频轨道（裁剪、混合）
 * 7. 合并视频和音频
 * 8. 输出最终MP4文件
 *
 * 支持的功能：
 * - 多轨道视频/图片/文本合成
 * - 片段裁剪（trimStart/trimEnd）
 * - 变换效果（旋转、缩放、透明度）
 * - 文本样式（字体、颜色、大小、对齐等）
 * - 多音频轨道混合
 * - 自定义导出参数（分辨率、帧率、比特率等）
 *
 * 性能考虑：
 * - 默认30fps帧率，平衡质量和性能
 * - 实时进度反馈（0-100%）
 * - 大型项目可能需要几分钟处理时间
 *
 * @param clips - 所有时间轴片段
 * @param mediaItems - 所有媒体素材
 * @param canvasRatio - 画布比例
 * @param onProgress - 进度回调函数（接收0-100的数值）
 * @param options - 导出选项（可选）
 * @returns Promise，resolve时返回视频Blob对象
 *
 * @throws 如果FFmpeg加载失败或渲染出错
 *
 * @example
 * ```ts
 * const videoBlob = await exportAsMP4(
 *   clips,
 *   mediaItems,
 *   '16:9',
 *   (progress) => {
 *     console.log(`导出进度: ${progress}%`);
 *   },
 *   {
 *     resolution: '1920x1080',
 *     frameRate: 30,
 *     bitrate: '5M'
 *   }
 * );
 *
 * // 下载视频
 * const url = URL.createObjectURL(videoBlob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'video.mp4';
 * a.click();
 * ```
 */
export const exportAsMP4 = async (clips: TimelineClip[], mediaItems: MediaItem[], canvasRatio: string, onProgress: (progress: number) => void, options?: ExportOptions, abortSignal?: AbortSignal): Promise<Blob> => {
  console.log("🎬 开始导出视频...", clips);
  console.log("🎬 开始导出视频...", mediaItems);
  console.log("🎬 开始导出视频...", canvasRatio);
  console.log("🎬 开始导出视频...", options);

  // 检查是否已被中止
  if (abortSignal?.aborted) {
    throw new DOMException("Export was cancelled", "AbortError");
  }
  // 直接使用用户选择的分辨率
  const resolution = options?.resolution ?? "1920x1080";
  const [width, height] = resolution.split("x").map(Number);

  if (!width || !height) {
    throw new Error(`Invalid resolution format: ${resolution}`);
  }

  const canvasSize = { width, height };

  const fps = options?.frameRate ?? 30;
  const audioSampleRate = options?.audioSampleRate ?? 44100;

  // 使用 BPP（Bits Per Pixel）算法精确计算码率
  // 公式：码率 = 像素数 × 帧率 × BPP系数
  const totalPixels = width * height;
  let bitrate = "5M";
  const bitrateOption = options?.bitrate ?? "recommended";

  /**
   * 计算码率的工具函数
   * @param bpp - 每像素比特数（Bits Per Pixel）
   * @param codecEfficiency - 编码器效率系数（H.265比H.264效率高）
   * @returns 码率字符串（如 "5M"）
   */
  const calculateBitrate = (bpp: number, codecEfficiency: number = 1.0): string => {
    // 基础码率 = 像素数 × 帧率 × BPP
    let bitrateKbps = (totalPixels * fps * bpp) / 1000; // 转换为 Kbps

    // 根据编码器效率调整
    bitrateKbps = bitrateKbps * codecEfficiency;

    // 设置最小和最大码率
    const minBitrate = 500; // 最小 500 Kbps
    const maxBitrate = 100000; // 最大 100 Mbps
    bitrateKbps = Math.max(minBitrate, Math.min(maxBitrate, bitrateKbps));

    // 转换为 Mbps（保留小数点后1位）
    const bitrateMbps = Math.round(bitrateKbps / 100) / 10;

    return `${bitrateMbps}M`;
  };

  // 根据编码器确定效率系数
  const getCodecEfficiency = (): number => {
    const codecType = options?.codec ?? "libx264";
    if (codecType === "libx265" || codecType === "libx265_alpha" || codecType === "libx265_422") {
      return 0.6; // H.265 效率高约 40%，所以需要更低码率
    } else if (codecType === "libaom-av1") {
      return 0.5; // AV1 效率更高约 50%
    }
    return 1.0; // H.264 基准
  };

  const codecEfficiency = getCodecEfficiency();

  if (bitrateOption === "lower") {
    // 低质量: 0.07 BPP（适合快速预览、社交媒体）
    bitrate = calculateBitrate(0.07, codecEfficiency);
  } else if (bitrateOption === "recommended") {
    // 推荐质量: 0.12 BPP（YouTube/Bilibili 标准）
    bitrate = calculateBitrate(0.12, codecEfficiency);
  } else if (bitrateOption === "higher") {
    // 高质量: 0.20 BPP（高品质归档、专业用途）
    bitrate = calculateBitrate(0.2, codecEfficiency);
  } else {
    // 使用自定义码率
    bitrate = bitrateOption;
  }

  // 处理编码器
  let codec = options?.codec ?? "libx264";
  let pixelFormat = "yuv420p";

  if (codec === "libx265_alpha") {
    codec = "libx265";
    pixelFormat = "yuva420p";
  } else if (codec === "libx265_422") {
    codec = "libx265";
    pixelFormat = "yuv422p";
  }

  // 处理音频质量
  const audioQuality = options?.audioQuality ?? "aac_192";
  let audioCodec = "aac";
  let audioBitrate = "192k";

  if (audioQuality === "aac_192") {
    audioCodec = "aac";
    audioBitrate = "192k";
  } else if (audioQuality === "aac_256") {
    audioCodec = "aac";
    audioBitrate = "256k";
  } else if (audioQuality === "aac_320") {
    audioCodec = "aac";
    audioBitrate = "320k";
  } else if (audioQuality === "pcm") {
    audioCodec = "pcm_s16le";
    audioBitrate = ""; // PCM 不需要码率参数
  }

  const duration = clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 10;
  const outputFormat = options?.format ?? "MP4";
  const outputFile = outputFormat === "MOV" ? "output.mov" : "output.mp4";

  // 跟踪当前进度，确保整个导出过程进度只增不减
  let currentProgress = 0;
  const updateProgress = (progress: number) => {
    if (progress > currentProgress) {
      currentProgress = progress;
      onProgress(progress);
    }
  };

  // 确保从0%开始
  updateProgress(0);
  console.log("🎬 开始导出，时长:", duration, "秒, 格式:", outputFormat);

  return await runInFFmpegQueue(async () => {
    try {
      // 加载FFmpeg和初始化
      const ffmpeg = await getFFmpeg();

      const canvas = document.createElement("canvas");
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;

      const ctx = canvas.getContext("2d", {
        willReadFrequently: false,
        alpha: true,
      });

      if (!ctx) throw new Error("无法创建 canvas 上下文");

      // 启用图像抗锯齿和高质量平滑
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const totalFrames = Math.ceil(duration * fps);
      console.log(`📹 总帧数: ${totalFrames}, 帧率: ${fps}, 分辨率: ${canvasSize.width}x${canvasSize.height}`);

      // 渲染帧: 0% -> 55%
      for (let i = 0; i < totalFrames; i++) {
        // 检查是否被中止
        if (abortSignal?.aborted) {
          console.log("🛑 导出已在渲染帧时被取消");
          throw new DOMException("Export was cancelled", "AbortError");
        }

        const time = i / fps;
        await renderFrame(ctx, clips, mediaItems, time, canvasSize, canvasRatio);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("帧导出失败"))), "image/png", 0.9);
        });

        await ffmpeg.writeFile(`frame${i.toString().padStart(5, "0")}.png`, await fetchFile(blob));
        // 平滑更新进度: 0% -> 55%
        const frameProgress = Math.floor(((i + 1) / totalFrames) * 55);
        updateProgress(Math.min(frameProgress, 55));

        // 每处理一定数量的帧添加小延迟，让进度可见
        if (i % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      console.log("✅ 帧渲染完成");
      updateProgress(55);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 检查是否被中止
      if (abortSignal?.aborted) {
        console.log("🛑 导出已在帧渲染完成后被取消");
        throw new DOMException("Export was cancelled", "AbortError");
      }

      // 处理音频: 55% -> 60%
      const audioClips = clips.filter((clip) => {
        const m = mediaItems.find((item) => item.id === clip.mediaId);
        return m && (m.type === "audio" || m.type === "video");
      });

      let hasAudio = false;
      let audioFilterComplexParts: string[] = [];

      if (audioClips.length > 0) {
        console.log("🎵 处理音频轨道，数量:", audioClips.length);

        // 处理每个音频片段
        for (let i = 0; i < audioClips.length; i++) {
          const clip = audioClips[i];
          const audioMedia = mediaItems.find((item) => item.id === clip.mediaId);

          if (!audioMedia) continue;

          try {
            updateProgress(56 + Math.floor((i / audioClips.length) * 3));

            const audioData = await fetchFile(audioMedia.url);
            const ext = audioMedia.type === "audio" ? "mp3" : "mp4";
            const fileName = `audio_${i}.${ext}`;
            await ffmpeg.writeFile(fileName, audioData);

            // 构建音频滤镜
            const trimStart = clip.trimStart || 0;
            const trimEnd = clip.trimEnd || audioMedia.duration || duration;
            const volume = (clip.volume ?? 100) / 100;
            const speed = clip.speed ?? 1;

            // 音频滤镜：裁剪、调速、音量、延迟、淡入淡出
            let audioFilter = `[${i + 1}:a]`;

            // 1. 裁剪音频
            audioFilter += `atrim=${trimStart}:${trimEnd},asetpts=PTS-STARTPTS`;

            // 2. 调速
            if (speed !== 1) {
              audioFilter += `,atempo=${speed}`;
            }

            // 3. 调整音量
            if (volume !== 1) {
              audioFilter += `,volume=${volume}`;
            }

            // 4. 延迟到正确的时间点（添加静音填充）
            if (clip.start > 0) {
              audioFilter += `,adelay=${clip.start * 1000}|${clip.start * 1000}`;
            }

            audioFilter += `[a${i}]`;
            audioFilterComplexParts.push(audioFilter);

            hasAudio = true;
            console.log(`✅ 音频 ${i + 1}/${audioClips.length} 已加载:`, fileName);
          } catch (error) {
            console.warn(`音频 ${i} 加载失败:`, error);
          }
        }
      }

      updateProgress(60);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 检查是否被中止
      if (abortSignal?.aborted) {
        console.log("🛑 导出已在FFmpeg执行前被取消");
        throw new DOMException("Export was cancelled", "AbortError");
      }

      // 合成视频: 60% -> 92%
      console.log("🎬 合成视频...");

      // FFmpeg progress事件监听
      const progressHandler = ({ progress: prog }: { progress: number }) => {
        // FFmpeg进度从0到1，映射到60%到92%
        const encodingProgress = 60 + Math.floor(prog * 32);
        const newProgress = Math.min(encodingProgress, 92);

        // 使用updateProgress确保进度不回退
        updateProgress(newProgress);
      };

      ffmpeg.on("progress", progressHandler);

      try {
        if (hasAudio && audioFilterComplexParts.length > 0) {
          // 构建FFmpeg参数
          const ffmpegArgs = ["-framerate", fps.toString(), "-i", "frame%05d.png"];

          // 添加所有音频输入文件
          for (let i = 0; i < audioFilterComplexParts.length; i++) {
            const clip = audioClips[i];
            const audioMedia = mediaItems.find((item) => item.id === clip.mediaId);
            if (audioMedia) {
              const ext = audioMedia.type === "audio" ? "mp3" : "mp4";
              ffmpegArgs.push("-i", `audio_${i}.${ext}`);
            }
          }

          // 如果有多个音频，需要混音
          if (audioFilterComplexParts.length > 1) {
            // 混合所有音频轨道
            const mixInputs = audioFilterComplexParts.map((_, i) => `[a${i}]`).join("");
            const filterComplex = audioFilterComplexParts.join(";") + `;${mixInputs}amix=inputs=${audioFilterComplexParts.length}:duration=longest[aout]`;

            ffmpegArgs.push("-filter_complex", filterComplex, "-map", "0:v", "-map", "[aout]", "-c:v", codec, "-preset", "fast", "-b:v", bitrate, "-pix_fmt", pixelFormat, "-c:a", audioCodec);
          } else {
            // 只有一个音频
            const filterComplex = audioFilterComplexParts[0];
            ffmpegArgs.push("-filter_complex", filterComplex, "-map", "0:v", "-map", "[a0]", "-c:v", codec, "-preset", "fast", "-b:v", bitrate, "-pix_fmt", pixelFormat, "-c:a", audioCodec);
          }

          // 添加音频采样率
          ffmpegArgs.push("-ar", audioSampleRate.toString());

          // 如果不是 PCM，添加音频码率
          if (audioBitrate) {
            ffmpegArgs.push("-b:a", audioBitrate);
          }

          ffmpegArgs.push("-t", duration.toString(), outputFile);

          console.log("🎵 FFmpeg 音频参数:", ffmpegArgs);
          await ffmpeg.exec(ffmpegArgs);
        } else {
          // 无音频，只导出视频
          await ffmpeg.exec(["-framerate", fps.toString(), "-i", "frame%05d.png", "-c:v", codec, "-preset", "fast", "-b:v", bitrate, "-pix_fmt", pixelFormat, "-t", duration.toString(), outputFile]);
        }
      } finally {
        // 移除进度监听器
        ffmpeg.off("progress", progressHandler);
      }

      // 等待FFmpeg完成并读取文件: 92% -> 95%
      // 确保进度至少达到92%
      updateProgress(92);
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("✅ 合成完成");
      updateProgress(93);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const data = (await ffmpeg.readFile(outputFile)) as Uint8Array;
      updateProgress(95);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const arrayBuffer = new ArrayBuffer(data.length);
      new Uint8Array(arrayBuffer).set(data);
      const mimeType = outputFormat === "MOV" ? "video/quicktime" : "video/mp4";
      const videoBlob = new Blob([arrayBuffer], { type: mimeType });

      console.log("✅ 导出完成:", videoBlob.size, "字节");
      updateProgress(96);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 清理临时文件: 96% -> 99%
      try {
        for (let i = 0; i < totalFrames; i++) {
          await ffmpeg.deleteFile(`frame${i.toString().padStart(5, "0")}.png`);
          // 每删除一定数量的文件更新一次进度
          if (i % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
            const cleanProgress = 96 + Math.floor((i / totalFrames) * 3);
            const newProgress = Math.min(cleanProgress, 99);
            // 使用updateProgress确保进度不回退
            updateProgress(newProgress);
          }
        }
        if (hasAudio) {
          // 删除所有音频文件
          for (let i = 0; i < audioClips.length; i++) {
            const clip = audioClips[i];
            const audioMedia = mediaItems.find((item) => item.id === clip.mediaId);
            if (audioMedia) {
              const ext = audioMedia.type === "audio" ? "mp3" : "mp4";
              try {
                await ffmpeg.deleteFile(`audio_${i}.${ext}`);
              } catch (e) {
                // 忽略删除失败
              }
            }
          }
        }
        await ffmpeg.deleteFile(outputFile);
      } catch (e) {
        console.warn("清理临时文件失败:", e);
      }

      // 确保至少达到99%
      updateProgress(99);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 确保到达100%并显示足够时间
      updateProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      return videoBlob;
    } catch (error) {
      // 如果是取消操作，直接重新抛出，不包装
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("🛑 视频导出已取消");
        throw error;
      }

      console.error("❌ 导出失败:", error);
      throw new Error(`视频导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  });
};
