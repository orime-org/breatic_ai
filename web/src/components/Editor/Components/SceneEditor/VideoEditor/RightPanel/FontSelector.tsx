import React, { useState, useEffect, useRef } from "react";
import { CloseOutlined, LoadingOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { fontManager, FontFamily } from "../utils/fontDetector";
import { DarkScrollbar } from "../utils/Scrollbar";
import fontConfigData from "../config/fontConfig.json";

interface FontSelectorProps {
  visible: boolean;
  position: { x: number; y: number };
  currentFont: string;
  onFontSelect: (font: string) => void;
  onClose: () => void;
  onFontWeightsDetected?: (font: string, weights: string[]) => void;
}

const FontSelectorComponent: React.FC<FontSelectorProps> = ({ visible, position, currentFont, onFontSelect, onClose, onFontWeightsDetected }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [fontFamilies, setFontFamilies] = useState<FontFamily[]>([]);
  const [filteredFonts, setFilteredFonts] = useState<FontFamily[]>([]);
  const [isApplyingFont, setIsApplyingFont] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 初始化字体列表
  useEffect(() => {
    if (visible) {
      // 确保字体管理器已初始化，然后获取字体列表
      fontManager
        .initialize(fontConfigData)
        .then(() => {
          const fonts = fontManager.getFontList();
          setFontFamilies(fonts);
        })
        .catch((error) => {
          console.error("❌ 字体管理器初始化失败:", error);
        });
    }
  }, [visible]);

  // 过滤字体
  useEffect(() => {
    if (!searchTerm) {
      setFilteredFonts(fontFamilies);
    } else {
      const filtered = fontFamilies.filter((font) => font.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || font.family.toLowerCase().includes(searchTerm.toLowerCase()));
      setFilteredFonts(filtered);
    }
  }, [searchTerm, fontFamilies]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (!visible) return;

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 border border-gray-600 shadow-lg"
      style={{
        right: "250px",
        top: "56px",
        width: "220px",
        height: "490px",
        overflow: "hidden",
        backgroundColor: "#333333",
        borderRadius: "6px",
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h3 className="font-semibold text-white" style={{ fontSize: "12px" }}>
          {t("fontSelector.title")}
        </h3>
        <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
          <CloseOutlined style={{ fontSize: "12px" }} />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-1">
        <div className="relative">
          <SearchOutlined className="absolute left-0 transform -translate-y-1/2 top-1/2" style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)" }} />
          <input type="text" placeholder={t("fontSelector.searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full py-2 pl-6 text-white placeholder-gray-400 bg-transparent focus:outline-none" style={{ fontSize: "12px" }} />
        </div>
      </div>

      {/* 应用字体加载提示 */}
      {isApplyingFont && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="flex items-center px-4 py-2 bg-gray-800 rounded">
            <LoadingOutlined className="mr-2 text-blue-400" />
            <span className="text-white" style={{ fontSize: "12px" }}>
              正在应用字体...
            </span>
          </div>
        </div>
      )}

      {/* 字体列表 */}
      <DarkScrollbar
        style={{
          height: "370px",
        }}
      >
        {filteredFonts.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-400" style={{ fontSize: "12px" }}>
            {t("fontSelector.noFontsFound")}
          </div>
        ) : (
          filteredFonts.map((fontFamily, index) => {
            const isSelected = currentFont === fontFamily.family;

            return (
              <div
                key={index}
                className="px-3 py-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: isSelected ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                onClick={() => {
                  if (isApplyingFont) return;

                  try {
                    setIsApplyingFont(true);

                    // 传递基础字体名（如 "Microsoft YaHei"）
                    // handleFontSelect 会负责选择默认的字重
                    onFontSelect(fontFamily.family);

                    // 通知子项信息
                    if (onFontWeightsDetected) {
                      const children = fontManager.getFontChildren(fontFamily.family);
                      const childNames = children.map((c) => c.displayName);
                      onFontWeightsDetected(fontFamily.family, childNames);
                    }

                    onClose();
                  } catch (error) {
                    console.error("应用字体失败:", error);
                  } finally {
                    setIsApplyingFont(false);
                  }
                }}
              >
                <div
                  style={{
                    fontFamily: fontManager.getFontFamilyName(fontFamily.family),
                    fontSize: "12px",
                  }}
                  className="truncate"
                >
                  {fontFamily.displayName}
                </div>
              </div>
            );
          })
        )}
      </DarkScrollbar>
    </div>
  );
};

export const FontSelector = React.memo(FontSelectorComponent);
