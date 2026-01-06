import React from "react";
import { Skeleton } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";

interface LoadingSkeletonCardProps {
  aspectRatio: number | string;
}

const LoadingSkeletonCard: React.FC<LoadingSkeletonCardProps> = ({ aspectRatio }) => {
  return (
    <div
      className="glow-card w-[282px] h-[159px] "
    >

      <Skeleton.Node
        active={true}
        className="skeleton-no-radius z-10 rounded-[3px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[278px] h-[155px] object-contain select-none bg-white"
        style={{
          aspectRatio: aspectRatio,
          width: "100%",
          height: "100%",
        }}
      >
        <VideoCameraOutlined style={{ fontSize: 40, color: "#bfbfbf" }} />
      </Skeleton.Node>
    </div>
  );
};

export default LoadingSkeletonCard;
