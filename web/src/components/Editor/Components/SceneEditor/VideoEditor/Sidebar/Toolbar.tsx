import React, { useMemo } from "react";
import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  FolderOutlined,
  FontSizeOutlined,
  VideoCameraOutlined,
  PictureOutlined,
} from "@ant-design/icons";

interface ToolbarProps {
  activePanel: string | null;
  onPanelChange: (panel: string) => void;
}

const ToolbarComponent: React.FC<ToolbarProps> = ({
  activePanel,
  onPanelChange,
}) => {
  const { t } = useTranslation();

  const tools = useMemo(
    () => [
      { id: "folder", icon: FolderOutlined, label: t("toolbar.media") },
      { id: "text", icon: FontSizeOutlined, label: t("toolbar.text") },
      { id: "images", icon: PictureOutlined, label: t("toolbar.image") },
      { id: "audio", icon: null, label: t("toolbar.audio") },
      { id: "videos", icon: VideoCameraOutlined, label: t("toolbar.video") },
    ],
    [t]
  );
  return (
    <div
      className="flex flex-col items-center gap-2 py-2 bg-white border-r border-gray-300"
      style={{ width: "45px" }}
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Tooltip key={tool.id} title={tool.label} placement="right">
            <button
              onClick={() =>
                onPanelChange(activePanel === tool.id ? "" : tool.id)
              }
              className="flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "4px",
                backgroundColor:
                  activePanel === tool.id ? "#F4F4F5" : "transparent",
                color: activePanel === tool.id ? "#1F2125" : "#71717a",
              }}
            >
              {tool.id === "audio" ? (
                <img
                  src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/music.png")}
                  alt="music"
                  className="w-3.5 h-3.5"
                  style={{
                    filter:
                      activePanel === tool.id
                        ? "none"
                        : "brightness(0) saturate(100%) invert(47%) sepia(8%) saturate(484%) hue-rotate(202deg) brightness(95%) contrast(87%)",
                  }}
                />
              ) : (
                Icon && <Icon style={{ fontSize: 14 }} />
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export const Toolbar = React.memo(ToolbarComponent);
