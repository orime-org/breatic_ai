import React, { useState, useEffect, useRef } from "react";
import { Input, Select, Slider, ColorPicker } from "antd";
import { CloseOutlined, DownOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TimelineClip } from "../types";
import { FontSelector } from "./FontSelector";
import { fontManager } from "../utils/fontDetector";

interface TextStylePanelProps {
  selectedClip: TimelineClip;
  onClose: () => void;
  onClipUpdate: (id: string, updates: Partial<TimelineClip>) => void;
}

const TextStylePanelComponent: React.FC<TextStylePanelProps> = ({
  selectedClip,
  onClose,
  onClipUpdate,
}) => {
  const { t } = useTranslation();
  const [textStyle, setTextStyle] = useState(selectedClip.textStyle || {});
  const [opacity, setOpacity] = useState(selectedClip.opacity ?? 100);
  const [fontSize, setFontSize] = useState(
    selectedClip.textStyle?.fontSize ?? 48
  );
  const [opacityInput, setOpacityInput] = useState(
    String(selectedClip.opacity ?? 100)
  );
  const [fontSizeInput, setFontSizeInput] = useState(
    String(selectedClip.textStyle?.fontSize ?? 48)
  );
  const [strokeWidthInput, setStrokeWidthInput] = useState(
    String(selectedClip.textStyle?.strokeWidth ?? 0)
  );
  const [shadowXInput, setShadowXInput] = useState(
    String(selectedClip.textStyle?.shadowOffsetX ?? 0)
  );
  const [shadowYInput, setShadowYInput] = useState(
    String(selectedClip.textStyle?.shadowOffsetY ?? 0)
  );
  const [shadowBlurInput, setShadowBlurInput] = useState(
    String(selectedClip.textStyle?.shadowBlur ?? 0)
  );
  const [fontSelectorVisible, setFontSelectorVisible] = useState(false);
  const [availableFontWeights, setAvailableFontWeights] = useState<
    { value: string; label: string }[]
  >([
    { value: "Regular", label: "Regular" },
    { value: "Bold", label: "Bold" },
    { value: "Light", label: "Light" },
  ]);

  // 保存字号调整开始时的初始状态（用于实时计算缩放比例）
  const fontSizeAdjustStartRef = useRef<{
    initialFontSize: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  // 检查文本内容是否包含中文字符
  const isChineseText = (text: string): boolean => {
    if (!text) return false;

    // 中文字符的Unicode范围（简化版本，兼容性更好）
    const chineseRegex =
      /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f]/;

    return chineseRegex.test(text);
  };
  const [fontSelectorPosition, setFontSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const fontButtonRef = useRef<HTMLButtonElement>(null);

  // 当选中素材改变时，更新状态
  useEffect(() => {
    setTextStyle(selectedClip.textStyle || {});
    setOpacity(selectedClip.opacity ?? 100);
    setFontSize(selectedClip.textStyle?.fontSize ?? 48);
    setOpacityInput(String(selectedClip.opacity ?? 100));
    setFontSizeInput(String(selectedClip.textStyle?.fontSize ?? 48));
    setStrokeWidthInput(String(selectedClip.textStyle?.strokeWidth ?? 0));
    setShadowXInput(String(selectedClip.textStyle?.shadowOffsetX ?? 0));
    setShadowYInput(String(selectedClip.textStyle?.shadowOffsetY ?? 0));
    setShadowBlurInput(String(selectedClip.textStyle?.shadowBlur ?? 0));

    // 重置字号调整的初始状态
    fontSizeAdjustStartRef.current = null;
  }, [selectedClip.id, selectedClip.textStyle, selectedClip.opacity]);

  // 初始化字重选项 - 根据当前字体动态设置
  useEffect(() => {
    const fontFamily = selectedClip.textStyle?.fontFamily || "Arial";
    const baseFamily = fontManager.getBaseFontFamily(fontFamily);
    const children = fontManager.getFontChildren(baseFamily);

    if (children.length > 0) {
      // 有子项的字体 - value 使用完整的 family，label 使用 displayName
      const weightOptions = children.map((child) => ({
        value: child.family, // 使用完整的 family，如 "Microsoft YaHei Bold"
        label: child.displayName, // 显示名称，如 "Bold"
      }));
      setAvailableFontWeights(weightOptions);
    } else {
      // 系统字体（如 Arial）显示禁用的"默认"选项
      setAvailableFontWeights([{ value: "default", label: "默认" }]);
    }
  }, [selectedClip.id, selectedClip.textStyle?.fontFamily]);

  // 获取字体的显示名称
  const getFontDisplayName = (fontFamily: string): string => {
    if (!fontFamily) return "Arial";

    // 提取基础字体名称（去掉 variant 后缀）
    const baseFamily = fontManager.getBaseFontFamily(fontFamily);

    // 从字体列表中获取 displayName
    const fontList = fontManager.getFontList();
    const font = fontList.find((f) => f.family === baseFamily);
    if (font) {
      return font.displayName;
    }

    // 否则返回基础字体名称
    return baseFamily;
  };

  // 更新文字样式
  const updateTextStyle = (updates: Partial<typeof textStyle>) => {
    const newTextStyle = { ...textStyle, ...updates };
    setTextStyle(newTextStyle);
    onClipUpdate(selectedClip.id, { textStyle: newTextStyle });
  };

  // 更新不透明度
  const updateOpacity = (value: number) => {
    setOpacity(value);
    onClipUpdate(selectedClip.id, { opacity: value });
  };

  // 装饰按钮状态
  const [textDecoration, setTextDecoration] = useState({
    underline: false,
    lineThrough: false,
    overline: false,
  });

  // 初始化装饰状态
  useEffect(() => {
    const decoration = selectedClip.textStyle?.textDecoration || "none";
    setTextDecoration({
      underline: decoration.includes("underline"),
      lineThrough: decoration.includes("line-through"),
      overline: decoration.includes("overline"),
    });
  }, [selectedClip.id, selectedClip.textStyle?.textDecoration]);

  // 处理装饰按钮点击
  const handleDecorationClick = (
    type: "underline" | "lineThrough" | "overline"
  ) => {
    const newDecoration = { ...textDecoration, [type]: !textDecoration[type] };
    setTextDecoration(newDecoration);

    // 构建装饰样式字符串
    const decorationArray = [];
    if (newDecoration.underline) decorationArray.push("underline");
    if (newDecoration.lineThrough) decorationArray.push("line-through");
    if (newDecoration.overline) decorationArray.push("overline");

    updateTextStyle({ textDecoration: decorationArray.join(" ") || "none" });
  };

  // 处理字体选择器显示
  const handleFontButtonClick = () => {
    if (fontButtonRef.current) {
      const rect = fontButtonRef.current.getBoundingClientRect();
      // 计算位置：距离右侧面板上右都是10px
      // 右侧面板宽度270px，字体面板宽度250px
      const x = rect.left - 370; // 右侧面板宽度270px + 间距10px
      const y = rect.top - 45; // 与按钮顶部对齐

      // 确保面板不超出屏幕边界
      const adjustedX = Math.max(10, x);
      const adjustedY = Math.max(10, y);

      setFontSelectorPosition({ x: adjustedX, y: adjustedY });
      setFontSelectorVisible(true);
    }
  };

  // 处理字体选择
  const handleFontSelect = (font: string) => {
    console.log("🎨 选择字体:", font);

    // 获取字体的所有子项
    const children = fontManager.getFontChildren(font);

    if (children.length > 0) {
      // 有子项 - 使用完整的 family 名称
      const defaultChild =
        children.find((c) => c.displayName === "Regular") || children[0];
      const familyName = defaultChild.family; // 直接使用 child.family

      console.log("  ✅ 应用字体:", familyName);
      updateTextStyle({ fontFamily: familyName });

      // 更新字重选项 - value 使用完整的 family，label 使用 displayName
      const weightOptions = children.map((child) => ({
        value: child.family, // 使用完整的 family，如 "Microsoft YaHei Bold"
        label: child.displayName, // 显示名称，如 "Bold"
      }));
      setAvailableFontWeights(weightOptions);
    } else {
      // 没有子项 - 直接使用字体名称
      console.log("  ✅ 应用单一字体:", font);
      updateTextStyle({ fontFamily: font });

      // 字重选项为空或显示一个默认项
      setAvailableFontWeights([{ value: "default", label: "默认" }]);
    }
  };

  // 处理字重检测结果（现在基于子项）
  const handleFontWeightsDetected = (font: string, weights: string[]) => {
    // 获取字体的所有子项
    const children = fontManager.getFontChildren(font);

    if (children.length === 0) {
      console.log(`字体 ${font} 没有子项（单一字体）`);
      setAvailableFontWeights([{ value: "default", label: "默认" }]);
      return;
    }

    console.log(`字体 ${font} 的子项:`, children);

    // 将子项转换为选项 - value 使用完整的 family，label 使用 displayName
    const weightOptions = children.map((child) => ({
      value: child.family, // 使用完整的 family，如 "Microsoft YaHei Bold"
      label: child.displayName, // 显示名称，如 "Bold"
    }));

    // 更新字重选项
    setAvailableFontWeights(weightOptions);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ fontSize: "12px" }}>
          {t("textStyle.title")}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseOutlined style={{ fontSize: "12px" }} />
        </button>
      </div>
      <div className="space-y-4">
        {/* 字体 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.font")}
          </label>
          <div className="w-36">
            <button
              ref={fontButtonRef}
              onClick={handleFontButtonClick}
              className="flex items-center justify-between w-full text-left transition-colors border border-gray-300 rounded hover:border-blue-400 hover:bg-blue-50"
              style={{
                fontFamily: "Arial", // 固定字体，不跟随选中字体改变
                height: "26px",
                fontSize: "12px",
                paddingLeft: "7px",
                paddingRight: "7px",
              }}
            >
              <span className="truncate">
                {getFontDisplayName(textStyle.fontFamily || "Arial")}
              </span>
              <DownOutlined
                className="ml-2"
                style={{ color: "#BFBFBF", fontSize: "12px" }}
              />
            </button>
          </div>
        </div>

        {/* 字重 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.fontWeight")}
          </label>
          <Select
            value={(() => {
              // 直接返回当前的 fontFamily（完整的 family，如 "Microsoft YaHei Bold"）
              const fontFamily = textStyle.fontFamily || "Arial";

              // 检查当前字体是否在可用选项中
              const isAvailable = availableFontWeights.some(
                (option) => option.value === fontFamily
              );

              return isAvailable ? fontFamily : "default";
            })()}
            onChange={(selectedFamily) => {
              // selectedFamily 是完整的 family（如 "Microsoft YaHei Bold"）
              if (selectedFamily === "default") {
                return;
              }

              // 直接应用字体（不需要再拼接或转换）
              updateTextStyle({ fontFamily: selectedFamily });
            }}
            className="w-36"
            size="small"
            style={{ height: "26px", fontSize: "12px" }}
            options={availableFontWeights}
            disabled={
              availableFontWeights.length === 1 &&
              availableFontWeights[0].value === "default"
            }
          />
        </div>

        {/* 字号 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.fontSize")}
          </label>
          <div className="flex items-center gap-2 w-36">
            <Input
              value={fontSizeInput}
              onChange={(e) => setFontSizeInput(e.target.value)}
              onFocus={() => {
                // 聚焦时保存初始状态
                if (!fontSizeAdjustStartRef.current) {
                  fontSizeAdjustStartRef.current = {
                    initialFontSize: selectedClip.textStyle?.fontSize || 48,
                    initialWidth: selectedClip.width || 300,
                    initialHeight: selectedClip.height || 80,
                  };
                }
              }}
              onBlur={() => {
                const val = parseFloat(fontSizeInput);
                const finalValue = isNaN(val)
                  ? 48
                  : Math.max(5, Math.min(300, Math.round(val)));
                setFontSizeInput(String(finalValue));
                setFontSize(finalValue);

                // 使用初始状态计算字号缩放比例
                const initialState = fontSizeAdjustStartRef.current || {
                  initialFontSize: selectedClip.textStyle?.fontSize || 48,
                  initialWidth: selectedClip.width || 300,
                  initialHeight: selectedClip.height || 80,
                };
                const { initialFontSize, initialWidth, initialHeight } =
                  initialState;
                const fontScaleRatio = finalValue / initialFontSize;

                // 根据字号缩放比例同步调整控制框大小
                const newWidth = Math.round(initialWidth * fontScaleRatio);
                const newHeight = Math.round(initialHeight * fontScaleRatio);

                // 同时更新字号和控制框尺寸
                onClipUpdate(selectedClip.id, {
                  textStyle: { ...textStyle, fontSize: finalValue },
                  width: newWidth,
                  height: newHeight,
                });

                // 重置初始状态
                fontSizeAdjustStartRef.current = null;
              }}
              onPressEnter={(e) => {
                e.currentTarget.blur();
              }}
              className="text-center"
              style={{
                width: "35px",
                height: "26px",
                fontSize: "12px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div style={{ flex: 1, paddingRight: "10px" }}>
              <Slider
                value={fontSize}
                onChange={(value) => {
                  // 第一次拖动滑块时，保存初始状态
                  if (!fontSizeAdjustStartRef.current) {
                    fontSizeAdjustStartRef.current = {
                      initialFontSize: selectedClip.textStyle?.fontSize || 48,
                      initialWidth: selectedClip.width || 300,
                      initialHeight: selectedClip.height || 80,
                    };
                  }

                  setFontSize(value);
                  setFontSizeInput(String(value));

                  // 使用初始状态计算字号缩放比例
                  const { initialFontSize, initialWidth, initialHeight } =
                    fontSizeAdjustStartRef.current;
                  const fontScaleRatio = value / initialFontSize;

                  // 根据字号缩放比例同步调整控制框大小
                  const newWidth = Math.round(initialWidth * fontScaleRatio);
                  const newHeight = Math.round(initialHeight * fontScaleRatio);

                  // 同时更新字号和控制框尺寸
                  onClipUpdate(selectedClip.id, {
                    textStyle: { ...textStyle, fontSize: value },
                    width: newWidth,
                    height: newHeight,
                  });
                }}
                onAfterChange={() => {
                  // 滑块释放后，重置初始状态
                  fontSizeAdjustStartRef.current = null;
                }}
                min={5}
                max={300}
                trackStyle={{ backgroundColor: "#18181b" }}
              />
            </div>
          </div>
        </div>

        {/* 颜色 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.color")}
          </label>
          <div className="w-36">
            <ColorPicker
              value={textStyle.color || "#ffffff"}
              onChange={(color) =>
                updateTextStyle({ color: color.toHexString() })
              }
              size="small"
              showText
              style={{
                width: "100%",
                justifyContent: "left",
                padding: "4px 7px",
              }}
            />
          </div>
        </div>

        {/* 对齐 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.align")}
          </label>
          <Select
            value={textStyle.textAlign || "center"}
            onChange={(value) => updateTextStyle({ textAlign: value })}
            className="w-36"
            size="small"
            style={{ borderRadius: "4px" }}
            options={[
              { value: "left", label: t("textStyle.alignLeft") },
              { value: "center", label: t("textStyle.alignCenter") },
              { value: "right", label: t("textStyle.alignRight") },
            ]}
          />
        </div>

        {/* 装饰 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.decoration")}
          </label>
          <div className="flex gap-2 w-36">
            <button
              className={`flex-1 border rounded hover:bg-gray-100 flex items-center justify-center ${
                textDecoration.underline ? "bg-blue-100 border-blue-300" : ""
              }`}
              style={{ height: "26px", fontSize: "12px" }}
              onClick={() => handleDecorationClick("underline")}
            >
              <u>U</u>
            </button>
            <button
              className={`flex-1 border rounded hover:bg-gray-100 flex items-center justify-center ${
                textDecoration.lineThrough ? "bg-blue-100 border-blue-300" : ""
              }`}
              style={{ height: "26px", fontSize: "12px" }}
              onClick={() => handleDecorationClick("lineThrough")}
            >
              <s>S</s>
            </button>
            <button
              className={`flex-1 border rounded hover:bg-gray-100 flex items-center justify-center ${
                textDecoration.overline ? "bg-blue-100 border-blue-300" : ""
              }`}
              style={{ height: "26px", fontSize: "12px" }}
              onClick={() => handleDecorationClick("overline")}
            >
              <span
                style={{
                  textDecoration: "overline",
                  fontSize: "12px",
                  position: "relative",
                  top: "4px",
                }}
              >
                U
              </span>
            </button>
          </div>
        </div>

        {/* Case */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.case")}
          </label>
          <Select
            value={textStyle.textTransform || "none"}
            onChange={(value) => updateTextStyle({ textTransform: value })}
            className="w-36"
            size="small"
            style={{ height: "26px", fontSize: "12px" }}
            disabled={isChineseText(selectedClip.text || "")}
            options={[
              { value: "none", label: t("textStyle.caseNone") },
              { value: "uppercase", label: t("textStyle.caseUppercase") },
              { value: "lowercase", label: t("textStyle.caseLowercase") },
              { value: "capitalize", label: t("textStyle.caseCapitalize") },
            ]}
          />
        </div>

        {/* 不透明度 */}
        <div className="flex items-center justify-between">
          <label className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("textStyle.opacity")}
          </label>
          <div className="flex items-center gap-2 w-36">
            <Input
              value={opacityInput}
              onChange={(e) => setOpacityInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(opacityInput);
                const finalValue = isNaN(val)
                  ? 100
                  : Math.max(0, Math.min(100, val));
                setOpacityInput(String(finalValue));
                setOpacity(finalValue);
                updateOpacity(finalValue);
              }}
              onPressEnter={(e) => {
                e.currentTarget.blur();
              }}
              className="text-center"
              style={{
                width: "35px",
                height: "26px",
                fontSize: "12px",
                padding: "4px",
                borderRadius: "4px",
              }}
            />
            <div style={{ flex: 1, paddingRight: "10px" }}>
              <Slider
                value={opacity}
                onChange={(value) => {
                  setOpacity(value);
                  setOpacityInput(String(value));
                  updateOpacity(value);
                }}
                min={0}
                max={100}
                trackStyle={{ backgroundColor: "#18181b" }}
              />
            </div>
          </div>
        </div>

        {/* 字体描边 */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4
            className="mb-3 font-semibold text-gray-900"
            style={{ fontSize: "12px" }}
          >
            {t("textStyle.stroke")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("textStyle.strokeColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={textStyle.strokeColor || "#000000"}
                  onChange={(color) =>
                    updateTextStyle({ strokeColor: color.toHexString() })
                  }
                  size="small"
                  showText
                  style={{
                    width: "100%",
                    justifyContent: "left",
                    padding: "4px 7px",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("textStyle.strokeWidth")}
              </label>
              <Input
                type="number"
                value={strokeWidthInput}
                onChange={(e) => setStrokeWidthInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(strokeWidthInput);
                  const finalValue = isNaN(val) ? 0 : Math.max(0, val);
                  setStrokeWidthInput(String(finalValue));
                  updateTextStyle({ strokeWidth: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>

        {/* 字体阴影 */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4
            className="mb-3 font-semibold text-gray-900"
            style={{ fontSize: "12px" }}
          >
            {t("textStyle.shadow")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("textStyle.shadowColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={textStyle.shadowColor || "#ffffff"}
                  onChange={(color) =>
                    updateTextStyle({ shadowColor: color.toHexString() })
                  }
                  size="small"
                  showText
                  style={{
                    width: "100%",
                    justifyContent: "left",
                    padding: "4px 7px",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("textStyle.shadowX")}
              </label>
              <Input
                type="number"
                value={shadowXInput}
                onChange={(e) => setShadowXInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(shadowXInput);
                  const finalValue = isNaN(val) ? 0 : val;
                  setShadowXInput(String(finalValue));
                  updateTextStyle({ shadowOffsetX: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("textStyle.shadowY")}
              </label>
              <Input
                type="number"
                value={shadowYInput}
                onChange={(e) => setShadowYInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(shadowYInput);
                  const finalValue = isNaN(val) ? 0 : val;
                  setShadowYInput(String(finalValue));
                  updateTextStyle({ shadowOffsetY: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("textStyle.shadowBlur")}
              </label>
              <Input
                type="number"
                value={shadowBlurInput}
                onChange={(e) => setShadowBlurInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(shadowBlurInput);
                  const finalValue = isNaN(val) ? 0 : Math.max(0, val);
                  setShadowBlurInput(String(finalValue));
                  updateTextStyle({ shadowBlur: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 字体选择器 */}
      <FontSelector
        visible={fontSelectorVisible}
        position={fontSelectorPosition}
        currentFont={textStyle.fontFamily || "Arial"}
        onFontSelect={handleFontSelect}
        onClose={() => setFontSelectorVisible(false)}
        onFontWeightsDetected={handleFontWeightsDetected}
      />
    </>
  );
};

export const TextStylePanel = React.memo(TextStylePanelComponent);
