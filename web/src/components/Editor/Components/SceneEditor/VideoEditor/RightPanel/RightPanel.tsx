import React from "react";
import { useTranslation } from "react-i18next";
import { TimelineClip, MediaItem } from "../types";
import { TextStylePanel } from "./TextStylePanel";
import { VideoStylePanel } from "./VideoStylePanel";
import { ImageStylePanel } from "./ImageStylePanel";
import { AudioStylePanel } from "./AudioStylePanel";

interface RightPanelProps {
  selectedClip: TimelineClip | null;
  mediaItems: MediaItem[];
  onClipUpdate: (id: string, updates: Partial<TimelineClip>) => void;
  onClipDeselect: () => void;
}

const RightPanelComponent: React.FC<RightPanelProps> = ({
  selectedClip,
  mediaItems,
  onClipUpdate,
  onClipDeselect,
}) => {
  const { t } = useTranslation();
  // 获取当前选中素材的媒体信息
  let media = mediaItems.find((item) => item.id === selectedClip?.mediaId);
  if (!media || !media.type) media = {id: selectedClip?.mediaId || "", name: selectedClip?.mediaId || "", text: selectedClip?.text || "Text", type: "text", url: ""};
  
  const selectedMedia = selectedClip
    ? media
    : null;

  // 根据素材类型渲染不同的内容
  const renderContent = () => {
    if (!selectedClip || !selectedMedia) {
      return (
        <div className="py-8 text-center text-gray-400">
          <p style={{ fontSize: "12px" }}>{t("rightPanel.selectElement")}</p>
          <p className="mt-2" style={{ fontSize: "12px" }}>
            {t("rightPanel.selectToEdit")}
          </p>
        </div>
      );
    }

    const mediaType = selectedMedia.type;

    // 根据素材类型渲染对应的面板
    switch (mediaType) {
      case "text":
        return (
          <TextStylePanel
            selectedClip={selectedClip}
            onClose={onClipDeselect}
            onClipUpdate={onClipUpdate}
          />
        );
      case "video":
        return (
          <VideoStylePanel
            selectedClip={selectedClip}
            mediaItem={selectedMedia}
            onClose={onClipDeselect}
            onClipUpdate={onClipUpdate}
          />
        );
      case "image":
        return (
          <ImageStylePanel
            selectedClip={selectedClip}
            mediaItem={selectedMedia}
            onClose={onClipDeselect}
            onClipUpdate={onClipUpdate}
          />
        );
      case "audio":
        return (
          <AudioStylePanel
            selectedClip={selectedClip}
            mediaItem={selectedMedia}
            onClose={onClipDeselect}
            onClipUpdate={onClipUpdate}
          />
        );
      default:
        return (
          <div className="py-8 text-center text-gray-400">
            <p style={{ fontSize: "12px" }}>
              {t("rightPanel.unknownMediaType")}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className="overflow-y-auto bg-white border-l border-gray-200 nopan nodrag nowheel"
      data-nopan="true"
      data-nodrag="true"
      data-nowheel="true"
      style={{ width: "240px", pointerEvents: "auto" }}
    >
      <div style={{ padding: "10px" }}>{renderContent()}</div>
    </div>
  );
};

export const RightPanel = React.memo(RightPanelComponent);
