import React from "react";
import { Scrollbars } from "react-custom-scrollbars-2";

interface ScrollbarProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  autoHide?: boolean;
  onScroll?: (values: any) => void;
}

// 自定义滚动条样式
const thumbStyle = {
  backgroundColor: "#666666",
  borderRadius: "4px",
  width: "8px",
};

const trackStyle = {
  backgroundColor: "transparent",
  width: "8px",
  right: "0px",
  bottom: "0px",
  top: "0px",
  borderRadius: "4px",
};

const viewStyle = {
  paddingRight: "0px",
};

// 渲染垂直滚动条滑块
const renderThumbVertical = ({ style, ...props }: any) => (
  <div style={{ ...style, ...thumbStyle }} {...props} />
);

// 渲染垂直滚动条轨道
const renderTrackVertical = ({ style, ...props }: any) => (
  <div style={{ ...style, ...trackStyle }} {...props} />
);

// 渲染内容区域
const renderView = ({ style, ...props }: any) => (
  <div style={{ ...style, ...viewStyle }} {...props} />
);

export const Scrollbar: React.FC<ScrollbarProps> = ({
  children,
  className = "",
  style = {},
  autoHide = true,
}) => {
  return (
    <Scrollbars
      className={className}
      style={style}
      autoHide={autoHide}
      autoHideTimeout={1000}
      autoHideDuration={200}
      thumbMinSize={30}
      universal={true}
      renderThumbVertical={renderThumbVertical}
      renderTrackVertical={renderTrackVertical}
      renderView={renderView}
    >
      {children}
    </Scrollbars>
  );
};

// 深色主题滚动条
export const DarkScrollbar: React.FC<ScrollbarProps> = ({
  children,
  className = "",
  style = {},
  autoHide = true,
}) => {
  const darkThumbStyle = {
    backgroundColor: "#4A4A4A",
    borderRadius: "4px",
    width: "8px",
  };

  const renderThumbVerticalDark = ({ style, ...props }: any) => (
    <div style={{ ...style, ...darkThumbStyle }} {...props} />
  );

  return (
    <Scrollbars
      className={className}
      style={style}
      autoHide={autoHide}
      autoHideTimeout={1000}
      autoHideDuration={200}
      thumbMinSize={30}
      universal={true}
      renderThumbVertical={renderThumbVerticalDark}
      renderTrackVertical={renderTrackVertical}
      renderView={renderView}
    >
      {children}
    </Scrollbars>
  );
};

// 细滚动条
const ThinScrollbarComponent = React.forwardRef<any, ScrollbarProps>(
  (
    { children, className = "", style = {}, autoHide = true, onScroll },
    ref
  ) => {
    const thinThumbStyle = {
      backgroundColor: "#888888",
      borderRadius: "2px",
      width: "4px",
    };

    const thinTrackStyle = {
      backgroundColor: "transparent",
      width: "4px",
      right: "0px",
      bottom: "0px",
      top: "0px",
      borderRadius: "2px",
    };

    const renderThumbVerticalThin = ({ style, ...props }: any) => (
      <div style={{ ...style, ...thinThumbStyle }} {...props} />
    );

    const renderTrackVerticalThin = ({ style, ...props }: any) => (
      <div style={{ ...style, ...thinTrackStyle }} {...props} />
    );

    return (
      <Scrollbars
        ref={ref}
        className={className}
        style={style}
        autoHide={autoHide}
        autoHideTimeout={1000}
        autoHideDuration={200}
        thumbMinSize={20}
        universal={true}
        renderThumbVertical={renderThumbVerticalThin}
        renderTrackVertical={renderTrackVerticalThin}
        renderView={renderView}
        onScroll={onScroll}
      >
        {children}
      </Scrollbars>
    );
  }
);

ThinScrollbarComponent.displayName = "ThinScrollbar";

export const ThinScrollbar = ThinScrollbarComponent;

export default React.memo(Scrollbar);
