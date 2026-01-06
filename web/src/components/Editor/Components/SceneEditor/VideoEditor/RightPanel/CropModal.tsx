import React, { useState, useRef, useEffect } from "react";
import { Modal, Button } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface CropModalProps {
  visible: boolean;
  mediaUrl: string;
  mediaType: "image" | "video";
  mediaThumbnail?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  existingCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: "px";
  };
  onClose: () => void;
  onApply: (
    croppedUrl: string | null,
    cropData: {
      x: number;
      y: number;
      width: number;
      height: number;
      unit: "px";
    }
  ) => void;
}

const CropModalComponent: React.FC<CropModalProps> = ({ visible, mediaUrl, mediaType, mediaThumbnail, mediaWidth, mediaHeight, existingCrop, onClose, onApply }) => {
  const { t } = useTranslation();
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 当弹窗打开/关闭时重置状态
  useEffect(() => {
    if (!visible) {
      // 关闭时重置所有状态
      setImageLoaded(false);
      setCrop({
        unit: "%",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      setCompletedCrop(undefined);
    }
  }, [visible]);

  // 当弹窗打开且图片已缓存时，手动触发初始化
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0 && !imageLoaded) {
        console.log("🔄 检测到图片已缓存，延迟初始化");
        initializeCrop();
      }
    }, 150);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageLoaded]);

  // 初始化裁剪框（在图片加载后计算）
  const initializeCrop = () => {
    const img = imgRef.current;
    if (!img || !img.complete) {
      console.log("⚠️ 图片未加载完成:", {
        img: !!img,
        complete: img?.complete,
      });
      return;
    }

    console.log("🖼️ 初始化裁剪框:", {
      媒体类型: mediaType,
      图片显示尺寸: { width: img.width, height: img.height },
      图片原始尺寸: { width: img.naturalWidth, height: img.naturalHeight },
      传入媒体尺寸: { width: mediaWidth, height: mediaHeight },
      已存在的裁剪: existingCrop,
    });

    if (existingCrop) {
      // 对于视频，existingCrop 是基于视频实际尺寸的
      // 需要转换到显示尺寸（缩略图尺寸）
      const sourceWidth = mediaType === "video" && mediaWidth ? mediaWidth : img.naturalWidth;
      const sourceHeight = mediaType === "video" && mediaHeight ? mediaHeight : img.naturalHeight;

      const scaleX = img.width / sourceWidth;
      const scaleY = img.height / sourceHeight;

      const displayCrop = {
        unit: "px" as const,
        x: existingCrop.x * scaleX,
        y: existingCrop.y * scaleY,
        width: existingCrop.width * scaleX,
        height: existingCrop.height * scaleY,
      };

      console.log("✅ 显示裁剪框:", displayCrop);

      setCrop(displayCrop);
      setCompletedCrop(displayCrop);
    } else {
      setCrop({
        unit: "%",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      setCompletedCrop(undefined);
    }
    setImageLoaded(true);
  };

  // 裁剪完成
  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop);
  };

  // 重置裁剪
  const handleReset = () => {
    const img = imgRef.current;
    if (img) {
      // 重置为整个图片区域
      const fullCrop: PixelCrop = {
        unit: "px",
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      };

      setCrop({
        unit: "%",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      setCompletedCrop(fullCrop);

      console.log("🔄 重置裁剪框:", fullCrop);
    }
  };

  // 应用裁剪
  const handleApply = () => {
    if (!completedCrop || !imgRef.current) return;

    const img = imgRef.current;

    // 对于视频，使用传入的 mediaWidth/mediaHeight（视频实际尺寸）
    // 对于图片，使用图片的 naturalWidth/naturalHeight
    const targetWidth = mediaType === "video" && mediaWidth ? mediaWidth : img.naturalWidth;
    const targetHeight = mediaType === "video" && mediaHeight ? mediaHeight : img.naturalHeight;

    const scaleX = targetWidth / img.width;
    const scaleY = targetHeight / img.height;

    console.log("✂️ CropModal handleApply:", {
      媒体类型: mediaType,
      显示尺寸: { width: img.width, height: img.height },
      目标尺寸: { width: targetWidth, height: targetHeight },
      naturalSize: { width: img.naturalWidth, height: img.naturalHeight },
      缩放比例: { scaleX, scaleY },
      裁剪区域显示: completedCrop,
    });

    // 转换到原始尺寸坐标（基于视频实际尺寸或图片原始尺寸）
    const originalCrop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
      unit: "px" as const,
    };

    console.log("✂️ 原始尺寸裁剪区域:", originalCrop);

    onApply(null, originalCrop);
    onClose();
  };

  const displayUrl = mediaType === "video" ? mediaThumbnail || mediaUrl : mediaUrl;

  console.log("🎬 CropModal render:", {
    visible,
    mediaType,
    displayUrl: displayUrl?.substring(0, 50),
    mediaWidth,
    mediaHeight,
    imageLoaded,
  });

  return (
    <Modal open={visible} onCancel={onClose} footer={null} width={900} centered zIndex={10000} styles={{ body: { padding: 0 } }}>
      <div className="flex flex-col" style={{ height: "600px", marginTop: "30px" }}>
        {/* 裁剪区域 */}
        <div className="relative flex items-center justify-center flex-1 p-8 overflow-auto bg-black">
          {/* Loading 动画 */}
          {displayUrl && !imageLoaded && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundColor: "#1a1a1a",
                zIndex: 10,
              }}
            >
              <LoadingOutlined style={{ fontSize: 48, color: "#999" }} />
            </div>
          )}
          {displayUrl && (
            <div
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: "opacity 0.15s",
              }}
            >
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={handleCropComplete} minWidth={50} minHeight={50}>
                <img
                  ref={(el) => {
                    imgRef.current = el;
                    // 如果图片已经加载（从缓存），立即初始化
                    if (el && el.complete && el.naturalWidth > 0 && !imageLoaded) {
                      console.log("🔄 图片已缓存，立即初始化");
                      setTimeout(() => {
                        initializeCrop();
                      }, 50);
                    }
                  }}
                  src={displayUrl}
                  alt="Crop"
                  onLoad={() => {
                    console.log("📸 图片加载完成");
                    initializeCrop();
                  }}
                  onError={(e) => {
                    console.error("❌ 图片加载失败:", e);
                    setImageLoaded(true); // 失败也要隐藏加载动画
                  }}
                  style={{
                    height: "450px",
                    width: "auto",
                    display: "block",
                  }}
                />
              </ReactCrop>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 bg-white border-t border-gray-200">
          <Button onClick={handleReset}>{t("cropModal.reset")}</Button>
          <Button type="primary" onClick={handleApply} className="bg-black border-black hover:bg-gray-800">
            {t("cropModal.confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const CropModal = React.memo(CropModalComponent);
