/**
 * 字体管理器 - 函数式实现
 * 功能：根据 fontConfig.json 创建 e 规则并应用@font-fac字体
 */

import FontFaceObserver from 'fontfaceobserver';

// 字体子项接口（字体变体）
export interface FontChild {
  family: string;       // 完整字体家族名，如 "Microsoft YaHei Light"
  displayName: string;  // 显示名称，如 "Light", "Bold"
  url: string;          // 字体文件路径
}

// 字体家族接口
export interface FontFamily {
  family: string;       // 字体家族名，如 "Microsoft YaHei"
  displayName: string;  // 显示名称，如 "微软雅黑" 或 "楷体"
  url?: string;         // 单字体文件路径（无子项时使用）
  children: FontChild[]; // 子项列表（字体变体）
}

// 字体配置接口
export interface FontConfig {
  fonts: FontFamily[];
}

// ========== 状态管理 ==========
let fonts: FontFamily[] = [];
let isInitialized = false;

// ========== 工具函数 ==========

/**
 * 生成单个 @font-face 规则
 */
const generateFontFaceRule = (fontFamily: string, fontUrl: string): string => {
  return [
    '@font-face {',
    `  font-family: '${fontFamily}';`,
    `  src: url('${fontUrl}') format('truetype');`,
    '  font-display: swap;',
    '}'
  ].join('\n');
};

/**
 * 将字体样式注入到页面
 */
const injectStyleElement = (rules: string[]): void => {
  const existingStyle = document.getElementById('dynamic-fonts');
  if (existingStyle) {
    existingStyle.remove();
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'dynamic-fonts';
  styleElement.textContent = rules.join('\n\n');
  document.head.appendChild(styleElement);
};

/**
 * 等待所有字体加载完成 - 使用 fontfaceobserver
 */
const waitForFontsLoad = async (): Promise<void> => {
  const fontObservers: Promise<void>[] = [];

  fonts.forEach(font => {
    if (font.children && font.children.length > 0) {
      // 有子项的字体：监听每个子项
      font.children.forEach(child => {
        const observer = new FontFaceObserver(child.family);

        fontObservers.push(
          observer.load(null, 15000).catch(() => {
            console.warn(`字体加载超时: ${child.family}`);
          })
        );
      });
    } else if (font.url) {
      // 单字体文件：直接监听
      const observer = new FontFaceObserver(font.family);

      fontObservers.push(
        observer.load(null, 15000).catch(() => {
          console.warn(`字体加载超时: ${font.family}`);
        })
      );
    }
  });

  await Promise.all(fontObservers);
};

/**
 * 解析资源 URL - 兼容浏览器环境
 */
const resolveAssetUrl = (relativePath: string): string => {
  // 在浏览器环境中，使用 document.baseURI 作为基准
  if (typeof window !== 'undefined' && document?.baseURI) {
    // 如果是相对路径（以 / 开头），直接使用
    if (relativePath.startsWith('/')) {
      return relativePath;
    }
    // 否则拼接到当前页面的基准 URL
    return new URL(relativePath, document.baseURI).href;
  }
  
  // 兜底：直接返回相对路径
  return relativePath;
};

/**
 * 创建所有字体的 @font-face 规则
 */
const createFontFaceRules = async (): Promise<void> => {
  const rules: string[] = [];

  fonts.forEach(font => {
    if (font.children && font.children.length > 0) {
      // 有子项的字体：每个子项创建一个 @font-face 规则
      font.children.forEach(child => {
        console.log('createFontFaceRules', child.family, child.url);
        const fontUrl = resolveAssetUrl(child.url);
        rules.push(generateFontFaceRule(child.family, fontUrl));
      });
    } else if (font.url) {
      // 单字体文件：直接使用 family 名称
      const fontUrl = resolveAssetUrl(font.url);
      rules.push(generateFontFaceRule(font.family, fontUrl));
    }
  });

  // 插入样式到页面
  injectStyleElement(rules);

  // 等待字体加载完成
  await waitForFontsLoad();
};

// ========== 公开 API ==========

/**
 * 初始化字体管理器
 * @param config 字体配置数据
 */
const initialize = async (config: FontConfig): Promise<void> => {
  // 如果已初始化，直接返回
  if (isInitialized) {
    return;
  }

  try {
    // 使用传入的字体配置
    fonts = config.fonts;

    // 创建所有 @font-face 规则并等待加载完成
    await createFontFaceRules();

    isInitialized = true;
  } catch (error) {
    console.error('字体管理器初始化失败:', error);
    throw error;
  }
};

/**
 * 获取所有字体列表
 */
const getFontList = (): FontFamily[] => {
  return fonts;
};

/**
 * 获取指定字体的子项列表
 * @param family 字体家族名
 * @returns 子项列表，如果没有子项则返回空数组
 */
const getFontChildren = (family: string): FontChild[] => {
  const font = fonts.find(f => f.family === family);
  return font?.children || [];
};

/**
 * 根据字体家族名和子项显示名获取完整的 font-family 名称
 * @param family 字体家族名，如 "Microsoft YaHei"
 * @param childDisplayName 子项显示名，如 "Bold"（可选）
 * @returns 完整的 font-family 名称，如 "Microsoft YaHei Bold" 或 "KaiTi"
 */
const getFontFamilyName = (family: string, childDisplayName?: string): string => {
  const font = fonts.find(f => f.family === family);

  if (!font) {
    console.warn(`⚠️ 未找到字体: ${family}`);
    return family;
  }

  // 如果没有子项，直接返回 family
  if (!font.children || font.children.length === 0) {
    return font.family;
  }

  // 如果指定了子项显示名，返回对应的完整 family
  if (childDisplayName) {
    const child = font.children.find(c => c.displayName === childDisplayName);
    return child ? child.family : font.children[0].family;
  }

  // 默认返回第一个子项（通常是 Regular）
  return font.children[0].family;
};

/**
 * 从完整的 font-family 名称中提取基础字体名
 * @param fontFamily 完整名称，如 "Microsoft YaHei Bold"
 * @returns 基础字体名，如 "Microsoft YaHei"
 */
const getBaseFontFamily = (fontFamily: string): string => {
  // 在所有字体的子项中查找匹配的 family
  for (const font of fonts) {
    if (font.children && font.children.length > 0) {
      const child = font.children.find(c => c.family === fontFamily);
      if (child) {
        // 找到了，返回父级的 family
        return font.family;
      }
    }
  }

  // 如果没找到，可能本身就是基础字体名，或者是系统字体
  return fontFamily;
};

/**
 * 从完整的 font-family 名称中提取子项显示名
 * @param fontFamily 完整名称，如 "Microsoft YaHei Bold"
 * @returns 子项显示名，如 "Bold"，如果未找到则返回 undefined
 */
const getChildDisplayName = (fontFamily: string): string | undefined => {
  // 在所有字体的子项中查找匹配的 family
  for (const font of fonts) {
    if (font.children && font.children.length > 0) {
      const child = font.children.find(c => c.family === fontFamily);
      if (child) {
        return child.displayName;
      }
    }
  }
  return undefined;
};

// 导出字体管理器 API
export const fontManager = {
  initialize,
  getFontList,
  getFontChildren,
  getFontFamilyName,
  getBaseFontFamily,
  getChildDisplayName,
};
