import { useState, useEffect } from "react";
import { MediaItem, TimelineClip } from "../types";
import { historyManager } from "../utils/HistoryManager";

/**
 * 历史记录操作Hook的参数接口
 */
interface UseHistoryOperationsProps {
  /** 所有时间轴片段 */
  clips: TimelineClip[];
  /** 媒体素材库 */
  mediaItems: MediaItem[];
  /** 当前选中的片段ID */
  selectedClipId: string | null;
  /** 设置片段列表 */
  setClips: (clips: TimelineClip[]) => void;
  /** 设置媒体素材列表 */
  setMediaItems: (items: MediaItem[]) => void;
  /** 设置选中片段ID */
  setSelectedClipId: (id: string | null) => void;
  /** 撤销/重做进行中的标志 */
  isUndoRedoInProgress: { current: boolean };
  /** 强制更新文本片段的引用 */
  forceUpdateTextRef: { current: (() => void) | null };
}

/**
 * 历史记录操作自定义Hook
 * 
 * 管理编辑器的撤销/重做功能，包括：
 * - 保存操作到历史记录栈
 * - 撤销操作（Undo）
 * - 重做操作（Redo）
 * - 历史记录状态管理（canUndo/canRedo）
 * 
 * 特性：
 * - 自动保存初始状态
 * - 延迟更新机制，确保UI正确刷新
 * - 支持文本片段的强制更新
 * - 防止撤销/重做时触发自动保存
 * 
 * 撤销/重做流程：
 * 1. 先取消选中，销毁控制框
 * 2. 延迟10ms更新clips和mediaItems
 * 3. 再延迟50ms恢复选中状态
 * 
 * @param props - 历史记录操作所需的参数
 * @returns 包含历史记录操作相关函数和状态的对象
 * 
 * @example
 * ```tsx
 * const {
 *   canUndo,
 *   canRedo,
 *   saveToHistory,
 *   handleUndo,
 *   handleRedo
 * } = useHistoryOperations({
 *   clips,
 *   mediaItems,
 *   selectedClipId,
 *   setClips,
 *   setMediaItems,
 *   setSelectedClipId,
 *   isUndoRedoInProgress,
 *   forceUpdateTextRef
 * });
 * 
 * // 保存操作到历史
 * saveToHistory('添加片段', newClips, newMediaItems);
 * 
 * // 撤销/重做
 * <button disabled={!canUndo} onClick={handleUndo}>撤销</button>
 * <button disabled={!canRedo} onClick={handleRedo}>重做</button>
 * ```
 */
export const useHistoryOperations = ({
  clips,
  mediaItems,
  selectedClipId,
  setClips,
  setMediaItems,
  setSelectedClipId,
  isUndoRedoInProgress,
  forceUpdateTextRef,
}: UseHistoryOperationsProps) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryButtons = () => {
    const info = historyManager.getInfo();
    setCanUndo(info.canUndo);
    setCanRedo(info.canRedo);
  };

  const saveToHistory = (
    description: string,
    newClips?: TimelineClip[],
    newMediaItems?: MediaItem[],
    newSelectedClipId?: string | null
  ) => {
    const clipsToSave = newClips ?? clips;
    const mediaItemsToSave = newMediaItems ?? mediaItems;

    console.log("💾 [保存历史]", description, {
      clips数量: clipsToSave.length,
      clipIds: clipsToSave.map((c) => c.id),
      mediaItems数量: mediaItemsToSave.length,
      mediaIds: mediaItemsToSave.map((m) => m.id),
    });

    historyManager.push(
      clipsToSave,
      mediaItemsToSave,
      newSelectedClipId ?? selectedClipId,
      description
    );
    updateHistoryButtons();
  };

  const handleUndo = () => {
    const state = historyManager.undo();
    if (state) {
      console.log("🔙 [撤销] 开始撤销操作:", state.description);

      isUndoRedoInProgress.current = true;

      // 先取消选中，销毁控制框
      setSelectedClipId(null);

      // 延迟更新 clips 和 mediaItems，确保控制框已销毁
      setTimeout(() => {
        setClips(state.clips);
        setMediaItems(state.mediaItems);

        // 再延迟恢复选中状态，确保控制框在新位置重新创建
        setTimeout(() => {
          setSelectedClipId(state.selectedClipId);
          updateHistoryButtons();
          forceUpdateTextRef.current?.();
          isUndoRedoInProgress.current = false;
        }, 50);
      }, 10);
    }
  };

  const handleRedo = () => {
    const state = historyManager.redo();
    if (state) {
      console.log("🔜 [重做] 开始重做操作:", state.description);

      isUndoRedoInProgress.current = true;

      // 先取消选中，销毁控制框
      setSelectedClipId(null);

      // 延迟更新 clips 和 mediaItems，确保控制框已销毁
      setTimeout(() => {
        setClips(state.clips);
        setMediaItems(state.mediaItems);

        // 再延迟恢复选中状态，确保控制框在新位置重新创建
        setTimeout(() => {
          setSelectedClipId(state.selectedClipId);
          updateHistoryButtons();
          forceUpdateTextRef.current?.();
          isUndoRedoInProgress.current = false;
        }, 50);
      }, 10);
    }
  };

  // 初始化：保存初始空状态（仅一次）
  useEffect(() => {
    const info = historyManager.getInfo();
    if (info.size === 0) {
      historyManager.push(clips, mediaItems, selectedClipId, "初始状态");
      updateHistoryButtons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    canUndo,
    canRedo,
    saveToHistory,
    handleUndo,
    handleRedo,
    updateHistoryButtons,
  };
};

