import React from "react";
import { Input, Slider } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TimelineClip, MediaItem } from "../types";

interface AudioStylePanelProps {
  selectedClip: TimelineClip;
  mediaItem: MediaItem;
  onClose: () => void;
  onClipUpdate: (id: string, updates: Partial<TimelineClip>) => void;
}

const AudioStylePanelComponent: React.FC<AudioStylePanelProps> = ({
  selectedClip,
  mediaItem,
  onClose,
  onClipUpdate,
}) => {
  const { t } = useTranslation();
  // 默认音量为 100
  const defaultVolume = 100;
  const initializedRef = React.useRef<Set<string>>(new Set());
  
  const [audioVolume, setAudioVolume] = React.useState(
    selectedClip.volume ?? defaultVolume
  );
  const [audioSpeed, setAudioSpeed] = React.useState(selectedClip.speed ?? 1);
  const [volumeInput, setVolumeInput] = React.useState(
    String(selectedClip.volume ?? defaultVolume)
  );
  const [speedInput, setSpeedInput] = React.useState(
    String(selectedClip.speed ?? 1)
  );

  // 当选中素材改变时，更新状态
  React.useEffect(() => {
    const volume = selectedClip.volume ?? defaultVolume;
    const speed = selectedClip.speed ?? 1;
    
    setAudioVolume(volume);
    setAudioSpeed(speed);
    setVolumeInput(String(volume));
    setSpeedInput(String(speed));
    
    // 如果 volume 未设置，自动设置为默认值 100（每个片段只初始化一次）
    if (selectedClip.volume === undefined && !initializedRef.current.has(selectedClip.id)) {
      initializedRef.current.add(selectedClip.id);
      onClipUpdate(selectedClip.id, { volume: defaultVolume });
    }
  }, [selectedClip.id, selectedClip.volume, selectedClip.speed, onClipUpdate]);

  const handleVolumeChange = (value: number) => {
    onClipUpdate(selectedClip.id, { volume: value });
  };

  const handleSpeedChange = (value: number) => {
    const trimStart = selectedClip.trimStart || 0;
    const trimEnd = selectedClip.trimEnd  || 0;
    const oldSpeed = selectedClip.speed || 1;
    
    // 计算音频的实际时长
    let audioDuration;
    if (trimEnd > 0) {
      // 如果音频被裁剪过，使用裁剪后的时长（trimEnd - trimStart）
      audioDuration = trimEnd - trimStart;
    } else {
      // 如果音频未被裁剪，使用时间轴时长乘以旧速度来获取原始音频时长
      audioDuration = (selectedClip.end - selectedClip.start) * oldSpeed;
    }
    
    // 计算新的时间轴时长
    const newTimelineDuration = audioDuration / value;
    
    // 更新 end 时间，保持 start 不变
    const newEnd = selectedClip.start + newTimelineDuration;
    
    onClipUpdate(selectedClip.id, { 
      speed: value,
      end: newEnd
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold" style={{ fontSize: "12px" }}>
          {t("toolbar.audio")}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseOutlined style={{ fontSize: "12px" }} />
        </button>
      </div>
      <div className="space-y-3">
        {/* 音量控制 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("audioStyle.volume")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={volumeInput}
              onChange={(e) => setVolumeInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(volumeInput);
                const finalValue = isNaN(val)
                  ? 100
                  : Math.max(0, Math.min(200, val));
                setVolumeInput(String(finalValue));
                setAudioVolume(finalValue);
                handleVolumeChange(finalValue);
              }}
              onPressEnter={(e) => e.currentTarget.blur()}
              className="text-center"
              style={{
                width: "35px",
                height: "26px",
                fontSize: "12px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div className="w-32" style={{ paddingRight: "10px" }}>
              <Slider
                value={audioVolume}
                onChange={(value) => {
                  setAudioVolume(value);
                  setVolumeInput(String(value));
                  handleVolumeChange(value);
                }}
                min={0}
                max={200}
                trackStyle={{ backgroundColor: "#18181b" }}
                handleStyle={{ borderColor: "#18181b" }}
              />
            </div>
          </div>
        </div>

        {/* 速度控制 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("audioStyle.speed")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={speedInput}
              onChange={(e) => setSpeedInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(speedInput);
                const finalValue = isNaN(val)
                  ? 1
                  : Math.max(0.25, Math.min(4, val));
                setSpeedInput(String(finalValue));
                setAudioSpeed(finalValue);
                handleSpeedChange(finalValue);
              }}
              onPressEnter={(e) => e.currentTarget.blur()}
              className="text-center"
              style={{
                width: "35px",
                height: "26px",
                fontSize: "12px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div className="w-32" style={{ paddingRight: "10px" }}>
              <Slider
                value={audioSpeed}
                onChange={(value) => {
                  setAudioSpeed(value);
                  setSpeedInput(String(value));
                  handleSpeedChange(value);
                }}
                min={0.25}
                max={4}
                step={0.25}
                trackStyle={{ backgroundColor: "#18181b" }}
                handleStyle={{ borderColor: "#18181b" }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const AudioStylePanel = React.memo(AudioStylePanelComponent);
