import React, { useState, useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { PlayCircleOutlined } from "@ant-design/icons";
import "./player.css";

type VideoPlayerProps = {
  src: string;
  height?: number;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLVideoElement>;
};

const videoBgColor = "transparent";
const videoContainerBg = "#E9E9E9";

const getVideoMime = (url: string) => {
  const clean = url.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  if (ext == "mp3") return "audio/mp3";
  return "";
};

// 兼容MP3，MP4的播放器组件
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, height = 200, className, onClick }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;

    if (!src) {
      if (playerRef.current) {
        const el = playerRef.current.el();
        if (el && el.parentNode) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
      }
      return;
    }

    const source = { src, type: getVideoMime(src) };
    if (!playerRef.current) {
      playerRef.current = videojs(node, {
        controls: true,
        preload: "auto",
        sources: [source],
        inactivityTimeout: 4000,
        bigPlayButton: false,
        audioOnlyMode: source.type == "audio/mp3" ? true : false,
        enableSmoothSeeking: true,
      });
      playerRef.current.on("play", () => {
        setIsPlaying(true);
      });
      playerRef.current.on("pause", () => {
        setIsPlaying(false);
      });
      playerRef.current.on("ended", () => {
        setIsPlaying(false);
      });
      playerRef.current.on("error", () => {
        console.error("VideoPlayer: error event", playerRef.current.error());
      });
    } else {
      playerRef.current.src(source);
    }
    const player = playerRef.current;
    const controlBar = player.controlBar.el();
    player.el().style.backgroundColor = videoBgColor;
    controlBar.style.backgroundColor = videoBgColor;
    const barItemColor = "#000";

    player.controlBar.playToggle.el().style.color = barItemColor;
    player.controlBar.currentTimeDisplay.el().style.color = barItemColor;

    return () => {
      if (playerRef.current) {
        const el = playerRef.current.el();
        if (el && el.parentNode) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
      }
    };
  }, [src, height]);

  const classes = `video-js vjs-default-skin block w-full object-contain`;
  const sourceType = getVideoMime(src);
  const isAudio = sourceType === "audio/mp3";
  return (
    <div className={`rounded-[5px] relative w-[100%] bg-[${videoContainerBg}] flex items-center ${isAudio ? "h-[40px]" : ""} ${className || ""} `}>
      <div data-vjs-player className={`relative bg-[${videoBgColor}] flex items-center`}>
        {!isAudio && !isPlaying && (
          <div
            onClick={() => {
              console.log("VideoPlayer: Custom play button clicked");
              if (playerRef.current) {
                playerRef.current.play();
              } else {
                console.error("VideoPlayer: playerRef.current is null");
              }
            }}
            className={`absolute top-[50%] left-[50%] transform: translate-x-[-50%] translate-y-[-50%] z-10 text-${isAudio ? "lg" : "5xl"} cursor-pointer `}
            style={{ fontSize: 60 }}
          >
            <PlayCircleOutlined id="icon" />
          </div>
        )}
        <video ref={videoRef} className={classes} style={{ borderRadius: "0px !important", ...(isAudio? {height:"3em"} : {}), backgroundColor: videoBgColor }} onClick={onClick} />
      </div>
    </div>
  );
};

export default VideoPlayer;
