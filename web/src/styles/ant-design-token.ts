import { ANTD_COLOR_PRIMARY } from "../libs/global-config";

/** Antd 主题变量 */
export const ANT_DESIGN_TOKEN = {
  /** 全局token */
  token: {
    fontFamily: `'PingFang SC', -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', sans-serif`,
    colorPrimary: ANTD_COLOR_PRIMARY,
    colorLink: ANTD_COLOR_PRIMARY,
    colorLinkHover: ANTD_COLOR_PRIMARY,
    colorLinkActive: ANTD_COLOR_PRIMARY,
    colorPrimaryHover: ANTD_COLOR_PRIMARY,
    colorTextHover: ANTD_COLOR_PRIMARY,
    colorBorderHover: ANTD_COLOR_PRIMARY,
    colorTextPlaceholder: "#989898",
  },
  components: {
    Layout: {},
    Menu: {},
    Input: {
      colorPrimary: ANTD_COLOR_PRIMARY,
      borderColor: ANTD_COLOR_PRIMARY,
      activeShadow: "0 0 0 0px rgba(0, 0, 0, 0)",
    },
    Modal: {
      contentBg: "#ffffff",
      titleColor: "#0D0D0D",
      colorPrimary: ANTD_COLOR_PRIMARY,
      colorPrimaryHover: ANTD_COLOR_PRIMARY,
      colorTextHover: ANTD_COLOR_PRIMARY,
      colorBorderHover: ANTD_COLOR_PRIMARY,
      titleFontSize: 20,
      titleLineHeight: 24,
      padding: 20,
      margin: 0,
      borderRadiusLG: 5,
      borderRadiusSM: 5,
      Button: {
        colorPrimary: ANTD_COLOR_PRIMARY,
        colorPrimaryHover: "#6941c6",
        colorPrimaryActive: "#5925dc",
        colorBorder: "#d0d5dd",
        colorText: "#344054",
        colorBgContainer: "#ffffff",
        colorBorderHover: ANTD_COLOR_PRIMARY,
        colorTextHover: ANTD_COLOR_PRIMARY,
      },
    },
    Select: {
      colorBorder: "#E9E9E9", // 边框色
      activeBorderColor: "#F3F3F3", // 激活态边框色
      hoverBorderColor: "#F3F3F3", // 悬浮态边框色
      optionSelectedBg: "#F3F3F3", // 选项选中时背景色
      optionSelectedColor: "#262626", // 选项选中时文本颜色
      activeOutlineColor: "rgba(243, 243, 243, 0)", // 激活态 outline 颜色
      selectorBg: "#FFFFFF", // 选框背景色
      fontSize: 13,
      optionSelectedFontWeight: 400, // 选项选中时文本字重
      borderRadius: 4, // 圆角大小
      borderRadiusLG: 4,
      borderRadiusXS: 4,
    },
    Checkbox: {
      controlInteractiveSize: 15,
      fontSize: 13,
      colorPrimary: "#FFFFFF",
      colorBorder: "#E9E9E9",
      colorPrimaryHover: "#F3F3F3",
      colorWhite: "#000000",
      colorBgContainer: "#FFFFFF",
      colorBgContainerDisabled: "#F3F3F3",
      colorPrimaryBorder: "#989898",
      lineWidth: 1,
      lineWidthBold: 1,
      lineWidthFocus: 1,
      borderRadiusSM: 3,
      marginXS: 1,
    },
    Slider: {
      handleActiveColor: "#000000", // 滑块激活态边框色
      handleActiveOutlineColor: "transparent", // 滑块激活态外框色
      handleColor: "#000000", // 滑块颜色
      colorPrimaryBorderHover: "#000000",
    },
    Skeleton: {
      blockRadius: 0, // 骨架屏圆角
    },
  },
};
