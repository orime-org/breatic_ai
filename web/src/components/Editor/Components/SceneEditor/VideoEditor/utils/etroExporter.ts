/**
 * Etro导出模块（基于Canvas的帧导出）
 * 
 * 提供将当前帧导出为PNG图片的功能
 * 
 * 主要功能：
 * - 渲染当前时间点的所有可见片段
 * - 支持图片、视频、文本片段
 * - 应用所有变换效果（旋转、缩放、透明度）
 * - 应用所有样式（边框、阴影、圆角、滤镜等）
 * - 导出为PNG格式
 * 
 * 渲染特性：
 * - 基于Canvas 2D API渲染
 * - 支持复杂的CSS样式转换
 * - 多轨道合成（按trackIndex排序）
 * - 文本高级排版（对齐、行高、字重等）
 * 
 * 使用场景：
 * - 导出视频封面
 * - 导出当前帧为图片
 * - 预览效果验证
 */

import { MediaItem, TimelineClip } from "../types";
import { getBaseCanvasSize } from "./canvasCoordinates";


/**
 * 异步加载图片
 * 
 * @param url - 图片URL
 * @returns Promise，resolve时返回已加载的HTMLImageElement
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
 * 加载视频
 */
const loadVideo = (url: string): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = reject;
  });
};

/**
 * 渲染单个片段到 canvas
 */
const renderClipToCanvas = async (
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  media: MediaItem,
  currentTime: number,
  canvasSize: { width: number; height: number }
): Promise<void> => {
  ctx.save();

  const rotation = (clip.rotation ?? 0) * Math.PI / 180;
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
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fill();
        } else {
          // 无圆角：绘制矩形
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }

        // 清除阴影设置
        ctx.shadowColor = 'transparent';
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
        ctx.filter = filters.join(' ');
      }

      // === 步骤4: 绘制图片内容 ===
      if (clip.cropArea && media.width && media.height) {
        // 处理裁剪：绘制裁剪后的图片
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = clip.cropArea;

        // 检查图片实际尺寸是否与 media 尺寸一致
        const actualImageWidth = img.naturalWidth || media.width;
        const actualImageHeight = img.naturalHeight || media.height;

        console.log('🖼️ 导出-图片裁剪:', {
          媒体尺寸: { width: media.width, height: media.height },
          图片实际尺寸: { width: actualImageWidth, height: actualImageHeight },
          裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
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
          adjustedCropX, adjustedCropY, adjustedCropWidth, adjustedCropHeight,  // 源裁剪区域
          -width / 2, -height / 2, width, height  // 目标区域
        );
      } else {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      }

      // 清除阴影和滤镜，准备绘制轮廓
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.filter = 'none';
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

      await new Promise<void>(resolve => {
        const checkReady = () => {
          if (video.readyState >= 2) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });

      const mediaStyle = clip.mediaStyle || {};

      // === 步骤1: 绘制阴影  ===
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
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fill();
        } else {
          // 无圆角：绘制矩形
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }

        // 清除阴影设置
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // === 步骤2: 创建圆角裁剪路径  ===
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
        ctx.filter = filters.join(' ');
      }

      // === 步骤4: 绘制视频内容 ===
      if (clip.cropArea && media.width && media.height) {
        // 处理裁剪：绘制裁剪后的视频
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = clip.cropArea;

        // 检查视频实际尺寸是否与 media 尺寸一致
        const actualVideoWidth = video.videoWidth || media.width;
        const actualVideoHeight = video.videoHeight || media.height;

        console.log('🎬 导出-视频裁剪:', {
          媒体尺寸: { width: media.width, height: media.height },
          视频实际尺寸: { width: actualVideoWidth, height: actualVideoHeight },
          裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
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
          adjustedCropX, adjustedCropY, adjustedCropWidth, adjustedCropHeight,  // 源裁剪区域
          -width / 2, -height / 2, width, height  // 目标区域
        );
      } else {
        ctx.drawImage(video, -width / 2, -height / 2, width, height);
      }

      // 清除阴影和滤镜，准备绘制轮廓
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.filter = 'none';
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

      if (textStyle.textTransform === 'uppercase') text = text.toUpperCase();
      else if (textStyle.textTransform === 'lowercase') text = text.toLowerCase();
      else if (textStyle.textTransform === 'capitalize') {
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
        console.warn('字体加载失败，使用默认字体:', e);
      }

      ctx.font = `${fontSize}px "${fontFamily}"`;
      ctx.fillStyle = textStyle.color || "#ffffff";
      ctx.textBaseline = "top"; // 改为 top 以便更好地控制多行文字

      // 根据对齐方式计算文字绘制位置（在容器内对齐）
      const textAlign = textStyle.textAlign || "center";
      let textX = 0;

      if (textAlign === "left") {
        ctx.textAlign = "left";
        textX = -width / 2;  // 容器左边界
      } else if (textAlign === "right") {
        ctx.textAlign = "right";
        textX = width / 2;   // 容器右边界
      } else {
        ctx.textAlign = "center";
        textX = 0;           // 容器中心
      }

      // 文字阴影
      if (textStyle.shadowColor) {
        ctx.shadowColor = textStyle.shadowColor;
        ctx.shadowOffsetX = textStyle.shadowOffsetX || 0;
        ctx.shadowOffsetY = textStyle.shadowOffsetY || 0;
        ctx.shadowBlur = textStyle.shadowBlur || 0;
      }

      // 处理多行文本：按 \n 分割，并处理自动换行
      const rawLines = text.split('\n');
      const lines: string[] = [];

      // 处理每一行的自动换行
      rawLines.forEach((rawLine) => {
        if (rawLine === '') {
          // 空行也要保留
          lines.push('');
          return;
        }

        // 测量文本宽度，如果超过容器宽度则自动换行
        const words = rawLine.split('');
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine + words[i];
          const metrics = ctx.measureText(testLine);

          if (metrics.width > width && currentLine !== '') {
            // 超过宽度，当前行结束
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }

        // 添加最后一行
        if (currentLine !== '') {
          lines.push(currentLine);
        }
      });

      console.log('📝 [导出] 文本换行处理:', {
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
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(line, textX, currentY);
        }

        // 绘制文字填充
        ctx.fillText(line, textX, currentY);

        // 文字装饰线（下划线、删除线、上划线）
        if (textStyle.textDecoration && textStyle.textDecoration !== 'none') {
          ctx.save();
          ctx.shadowColor = 'transparent'; // 清除阴影
          ctx.shadowBlur = 0;

          const metrics = ctx.measureText(line);
          const textWidth = metrics.width;

          // 计算文字起始X坐标（基于 textX 和对齐方式）
          let textStartX = textX;
          if (ctx.textAlign === 'center') {
            textStartX = textX - textWidth / 2;
          } else if (ctx.textAlign === 'right') {
            textStartX = textX - textWidth;
          }
          // left 对齐时 textStartX = textX

          const decorationLineWidth = Math.max(1.5, fontSize * 0.06);

          // 解析装饰类型（支持多个装饰同时存在）
          const decorations = textStyle.textDecoration.split(' ').filter((d: string) => d.trim());

          // 绘制装饰线的函数
          const drawDecorationLine = (y: number) => {
            ctx.beginPath();
            ctx.moveTo(textStartX, y);
            ctx.lineTo(textStartX + textWidth, y);
            ctx.lineWidth = decorationLineWidth;
            // 如果有轮廓，使用轮廓颜色；否则使用文字颜色
            ctx.strokeStyle = (textStyle.strokeColor && textStyle.strokeWidth)
              ? textStyle.strokeColor
              : (textStyle.color || '#ffffff');
            ctx.stroke();
          };

          decorations.forEach((decoration: string) => {
            if (decoration === 'underline') {
              // 下划线：CSS标准位置约为 baseline + 0.15em（baseline是top时约为fontSize * 0.85）
              const underlineY = currentY + fontSize * 0.85;
              drawDecorationLine(underlineY);
            } else if (decoration === 'line-through') {
              // 删除线：CSS标准位置约为 baseline - 0.25em（baseline是top时约为fontSize * 0.5）
              const middleY = currentY + fontSize * 0.5;
              drawDecorationLine(middleY);
            } else if (decoration === 'overline') {
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

/**
 * 导出当前帧为PNG图片
 * 
 * 渲染指定时间点的所有可见片段到Canvas，然后导出为PNG图片
 * 
 * 导出流程：
 * 1. 创建Canvas并设置尺寸（0-5%）
 * 2. 初始化Canvas上下文（5-10%）
 * 3. 绘制黑色背景（10-15%）
 * 4. 设置坐标系缩放（15-20%）
 * 5. 渲染所有可见片段（20-85%）
 * 6. 转换Canvas为Blob（85-100%）
 * 
 * 支持的功能：
 * - 多轨道片段合成（按轨道顺序渲染）
 * - 图片/视频/文本片段
 * - 变换效果（旋转、缩放、透明度）
 * - 样式效果（边框、阴影、圆角、滤镜）
 * - 文本样式（字体、颜色、对齐等）
 * - 裁剪效果（cropArea）
 * 
 * 进度反馈：
 * - 每个关键步骤都会更新进度
 * - 进度范围：0-100
 * - 进度只增不减
 * 
 * @param clips - 所有时间轴片段
 * @param mediaItems - 所有媒体素材
 * @param currentTime - 要导出的时间点（秒）
 * @param resolution - 导出分辨率（如 "1920x1080"）
 * @param onProgress - 进度回调函数（接收0-100的数值）
 * @returns Promise，resolve时返回PNG图片的Blob对象
 * 
 * @throws 如果Canvas创建失败或渲染出错
 * 
 * @example
 * ```ts
 * const imageBlob = await exportFrameAsPNG(
 *   clips,
 *   mediaItems,
 *   10.5,
 *   '1920x1080',
 *   (progress) => {
 *     console.log(`导出进度: ${progress}%`);
 *   }
 * );
 * 
 * // 下载图片
 * const url = URL.createObjectURL(imageBlob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'frame.png';
 * a.click();
 * ```
 */
export const exportFrameAsPNG = async (
  clips: TimelineClip[],
  mediaItems: MediaItem[],
  currentTime: number,
  resolution: string,
  onProgress: (progress: number) => void,
  format: string = "PNG",
  canvasRatio: string = "16:9"
): Promise<Blob> => {
  // 直接使用用户选择的分辨率
  const [width, height] = resolution.split('x').map(Number);

  if (!width || !height) {
    throw new Error(`Invalid resolution format: ${resolution}`);
  }

  const canvasSize = { width, height };

  // 跟踪当前进度，确保进度只增不减
  let currentProgress = 0;
  const updateProgress = (progress: number) => {
    if (progress > currentProgress) {
      currentProgress = progress;
      onProgress(progress);
    }
  };

  // 确保从0%开始
  updateProgress(0);
  await new Promise(resolve => setTimeout(resolve, 50)); // 让进度显示

  const canvas = document.createElement("canvas");
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;

  updateProgress(5);
  await new Promise(resolve => setTimeout(resolve, 50));

  const ctx = canvas.getContext("2d", {
    willReadFrequently: false,
    alpha: true,
  });

  if (!ctx) {
    throw new Error("无法创建 canvas 上下文");
  }

  // 启用图像抗锯齿和高质量平滑
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  updateProgress(10);
  await new Promise(resolve => setTimeout(resolve, 50));

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updateProgress(15);
  await new Promise(resolve => setTimeout(resolve, 50));

  // 根据画布比例获取虚拟坐标系统尺寸
  // 所有clip坐标都基于此虚拟坐标系统存储
  const baseSize = getBaseCanvasSize(canvasRatio);
  const baseWidth = baseSize.width;
  const baseHeight = baseSize.height;

  ctx.save();
  // 使用等比例缩放，保持元素不变形（与PreviewCanvas一致）
  // 计算缩放比例：以宽度为基准
  const scale = canvasSize.width / baseWidth;
  ctx.scale(scale, scale);

  const visibleClips = clips
    .filter(clip => currentTime >= clip.start && currentTime < clip.end)
    .sort((a, b) => (b.trackIndex - a.trackIndex));

  updateProgress(20);
  await new Promise(resolve => setTimeout(resolve, 50));

  // 渲染clips: 20% -> 85%
  const totalClips = visibleClips.length;
  if (totalClips === 0) {
    updateProgress(85);
  }

  for (let i = 0; i < visibleClips.length; i++) {
    const clip = visibleClips[i];
    let media = mediaItems.find(item => item.id === clip.mediaId);
    // if (!media) continue;
    if (!media || !media.type) media = {id: clip.mediaId, name: clip.mediaId, text: clip.text || "Text", type: "text", url: ""};

    try {
      await renderClipToCanvas(ctx, clip, media, currentTime, { width: baseWidth, height: baseHeight });
      // 平滑进度：20% -> 85%
      const progress = 20 + Math.floor(((i + 1) / totalClips) * 65);
      updateProgress(Math.min(progress, 85));
      // 添加小延迟让进度可见
      if (i % Math.max(1, Math.floor(totalClips / 5)) === 0) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    } catch (error) {
      console.error("渲染片段失败:", clip, error);
    }
  }

  ctx.restore();

  updateProgress(85);
  await new Promise(resolve => setTimeout(resolve, 50));

  return new Promise((resolve, reject) => {
    updateProgress(90);
    const mimeType = format === "JPG" ? "image/jpeg" : "image/png";
    const quality = format === "JPG" ? 0.95 : undefined;

    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error(`${format} 生成失败`));
        return;
      }

      updateProgress(95);
      await new Promise(res => setTimeout(res, 100));

      // 确保到达100%并显示一段时间
      updateProgress(100);
      await new Promise(res => setTimeout(res, 500));

      resolve(blob);
    }, mimeType, quality);
  });
};
