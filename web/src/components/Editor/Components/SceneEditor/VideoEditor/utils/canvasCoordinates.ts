/**
 * 画布坐标系统工具模块
 * 
 * 提供统一的虚拟坐标系统定义，确保整个应用（预览、编辑、导出）使用相同的坐标基准
 * 
 * 设计理念：
 * - 所有元素坐标（x, y, width, height）基于虚拟坐标系统存储
 * - 实际渲染/导出时按比例缩放到目标尺寸
 * - 统一短边为 1080（1:1 为 1080x1080，16:9 为 1920x1080）
 * 
 * 使用场景：
 * - PreviewCanvas：预览和编辑时的虚拟画布
 * - ffmpegExporter：视频导出时的基准坐标
 * - etroExporter：图片导出时的基准坐标
 * - projectData：项目保存时的画布尺寸
 */

/**
 * 根据画布比例获取虚拟坐标系统的基准尺寸
 * 
 * 这个函数定义了整个应用的坐标系统标准：
 * - 16:9 横屏：1920 x 1080（长边1920）
 * - 9:16 竖屏：1080 x 1920（长边1920）
 * - 1:1 方屏：1080 x 1080（统一短边1080）
 * 
 * @param canvasRatio - 画布比例（"16:9" | "9:16" | "1:1"）
 * @returns 虚拟画布尺寸 { width, height }
 * 
 * @example
 * ```ts
 * // 16:9 横屏项目
 * const size = getBaseCanvasSize("16:9");
 * // 返回: { width: 1920, height: 1080 }
 * 
 * // 1:1 正方形项目
 * const size = getBaseCanvasSize("1:1");
 * // 返回: { width: 1080, height: 1080 }
 * 
 * // 元素坐标基于此尺寸
 * const element = { x: 500, y: 400, width: 200, height: 150 };
 * // 导出1080P时按比例缩放
 * const scale = 1080 / 1080; // 1:1
 * const exportX = element.x * scale;
 * ```
 */
export const getBaseCanvasSize = (canvasRatio: string): { width: number; height: number } => {
    switch (canvasRatio) {
        case "16:9":
            return { width: 1920, height: 1080 };
        case "9:16":
            return { width: 1080, height: 1920 };
        case "1:1":
            return { width: 1080, height: 1080 };
        default:
            // 默认使用 16:9
            return { width: 1920, height: 1080 };
    }
};

/**
 * 计算从虚拟坐标系到目标尺寸的缩放比例
 * 
 * @param canvasRatio - 画布比例
 * @param targetWidth - 目标宽度
 * @param targetHeight - 目标高度
 * @returns 缩放比例（基于宽度）
 * 
 * @example
 * ```ts
 * // 1:1 项目，导出到 1080x1080
 * const scale = getScaleFactor("1:1", 1080, 1080);
 * // 返回: 1.0
 * 
 * // 1:1 项目，导出到 2160x2160 (2K)
 * const scale = getScaleFactor("1:1", 2160, 2160);
 * // 返回: 2.0
 * ```
 */
export const getScaleFactor = (
    canvasRatio: string,
    targetWidth: number,
    targetHeight: number
): number => {
    const baseSize = getBaseCanvasSize(canvasRatio);
    return targetWidth / baseSize.width;
};

