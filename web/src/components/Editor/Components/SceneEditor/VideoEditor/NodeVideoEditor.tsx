/**
 * 视频输入（video input）数据节点组件
 */
import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import { Handle, Position, NodeResizer as _NodeResizer } from "@xyflow/react";
import { App } from "antd";
import useStore from "../../../Store/store";
import { useStore as useReactFlowStore } from "@xyflow/react";
import { getNodeModelsByType, NodeTemplateType, BlockMeta, HandleIsMulti } from "../../../Dict/dict";
import { getResultsForRunning, HandleType, NodeVideoEditorRuntimeData, useUpstreamInputs } from "../../../Types/runtimeData";
import VideoEditor from "./index";
import { ProjectData } from "./utils/projectData";
import NodeToolbarManager from "../../Common/NodeToolbarManager";
import { Node_HandleSvg } from "../../../SvgLoader/staticIcon";
import "./i18n";
import { getImageMeta, getAudioMeta, getVideoMeta, getVideoThumbnail } from "../../../Utils/mediaUtils";

function NodeVideoEditor({ id, type, selected }: { id: string; type: NodeTemplateType; selected: boolean }) {
  /**
   * Store数据
   */
  const setNodeRuntimeData = useStore((s) => s.setNodeRuntimeData);
  const setEditorSnapshotRuntimeData = useStore((s) => s.setEditorSnapshotRuntimeData);
  
  const { message: messageApi } = App.useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // 同步状态, 默认不是在同步

  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const hideToolbarTimerRef = useRef<number | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // 初始项目数据
  const [initialData, setInitialData] = useState<ProjectData>({} as ProjectData);

  const InputNodeModel = getNodeModelsByType(type);

  // 上游数据
  const { counter, handleCounters } = useUpstreamInputs(id);

  // 仅订阅 zoom（transform[2]），避免无关重渲染
  const storeZoom = useReactFlowStore((s) => s.transform[2]);

  // 初始化节点运行时数据
  useEffect(() => {
    const nodeRuntimeData = useStore.getState().nodeRuntimeData?.[id];
    if (!nodeRuntimeData) {
      // 空 初始化
      const currentProjectData: NodeVideoEditorRuntimeData = {
        snapshot: initialData,
      };

      setNodeRuntimeData(id, currentProjectData);
    } else {
      // 项目数据
      setInitialData(nodeRuntimeData.snapshot);
    }
  }, [id]);

  // ResizeObserver 错误处理
  useEffect(() => {
    const handleResizeObserverError = (event: ErrorEvent) => {
      if (event.message && event.message.includes("ResizeObserver loop completed with undelivered notifications")) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    // 添加错误监听器
    window.addEventListener("error", handleResizeObserverError);

    return () => {
      window.removeEventListener("error", handleResizeObserverError);
    };
  }, []);

  /**
   * 同步数据
   * */
  const handleSyncData = useCallback(async () => {
    try {
      // 获取上游数据
      const edges = useStore.getState().edges;

      // 解析上游数据
      let sourceText: string[] = [],
        sourceImage: string[] = [],
        sourceVideo: string[] = [],
        sourceAudio: string[] = [];

      InputNodeModel?.handle?.source?.map((item, index) => {
        const inputHandleType = item.key as HandleType; // Handle 的类型：Text、Image、Video、Audio
        // 精准命中当前桩的上游边
        const upstreamEdge = edges.filter((e) => e.target === id && e.targetHandle === `${inputHandleType}_${index}_${item.isMulti}`);

        // 获取边对应的上游节点ID
        const sourceNodeId = upstreamEdge.map((item) => item.source);

        // 获取上游节点的ResultData
        const resultsList = getResultsForRunning(sourceNodeId);

        resultsList.forEach((group) => {
          group.forEach((item: any | string) => {
            const value = typeof item === "string" ? (item?.length > 0 && item) : (item.result?.length > 0 && item.result);
            if (inputHandleType === HandleType.TEXT) sourceText.push(value);
            if (inputHandleType === HandleType.IMAGE) sourceImage.push(value);
            if (inputHandleType === HandleType.VIDEO) sourceVideo.push(value);
            if (inputHandleType === HandleType.AUDIO) sourceAudio.push(value);
          });
        });
      });

      if (sourceText.length === 0 && sourceImage.length === 0 && sourceVideo.length === 0 && sourceAudio.length === 0) {
        messageApi.info("No upstream data was detected");
        return;
      }

      setIsSyncing(true);

      const nodeRuntimeData = useStore.getState().nodeRuntimeData?.[id];
      // 获取当前项目数据中的媒体资源
      const currentProjectData = nodeRuntimeData?.snapshot || initialData;
      const currentMediaItems = currentProjectData.mediaItems || [];
      const newMediaItems: any[] = [];


      const itemCounter = currentMediaItems.reduce((acc: any, item: any) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 初始化计数器，对应当前已有资源的数量
      let [mediaTextCounter = 0, mediaImageCounter = 0, mediaVideoCounter = 0, mediaAudioCounter = 0] = [itemCounter["text"], itemCounter["image"], itemCounter["video"], itemCounter["audio"]];

      /**
       * mediaItems id、name 的生成规则
       * id: media-{type}-{number}-{time}， type 为资源类型 text|image|video|audio，number 为资源的数量, time 为13位时间戳
       * name: {type}-{number}，type 为资源类型 text|image|video|audio，number 为资源的数量
       *  @example
       *  文本的id: media-text-1-1762000439581
       *  文本的名称：text-1
       *
       *  视频的id: media-video-1-1762000439582
       *  视频的名称：video-1
       *
       *  音频的id: media-audio-1-1762000439583
       *  音频的名称：audio-1
       *
       *  图片的id: media-image-1-1762000439584
       *  图片的名称：image-1
       *
       * clips 中的 id 规则: VideoEditor 自己的拼接规则，不干预
       */
      for (const str of sourceText) {
        if (!str) continue;
        // 检查是否存在相同的项
        const existingItem = currentMediaItems.find((item: any) => item?.text === str && item.type === HandleType.TEXT.toLowerCase());

        if (!existingItem) {
          newMediaItems.push({
            id: `media-${HandleType.TEXT.toLowerCase()}-${++mediaTextCounter}-${Date.now()}`,
            text: str,
            type: HandleType.TEXT.toLowerCase(),
          });
        } 
      }
      for (const url of sourceImage) {
        // 检查是否存在相同的项
        const existingItem = currentMediaItems.find((item: any) => item?.url === url && item.type === HandleType.IMAGE.toLowerCase());
        const { width, height } = await getImageMeta(url);

        if (!existingItem) {
          let currentMediaItemsCounter = ++mediaImageCounter;
          newMediaItems.push({
            id: `media-${HandleType.IMAGE.toLowerCase()}-${currentMediaItemsCounter}-${Date.now()}`,
            name: `${HandleType.IMAGE.toLowerCase()}-${currentMediaItemsCounter}`,
            type: HandleType.IMAGE.toLowerCase(),
            url: url,
            width: width,
            height: height,
            fileInfo: {
              name: "placeholder.txt",
              type: "",
              size: "",
            },
          });
        } 
      }

      for (const url of sourceAudio) {
        // 检查是否存在相同的项
        const existingItem = currentMediaItems.find((item: any) => item?.url === url && item.type === HandleType.AUDIO.toLowerCase());
        const { duration } = await getAudioMeta(url);

        if (!existingItem) {
          let currentMediaItemsCounter = ++mediaAudioCounter;
          newMediaItems.push({
            id: `media-${HandleType.AUDIO.toLowerCase()}-${currentMediaItemsCounter}-${Date.now()}`,
            name: `${HandleType.AUDIO.toLowerCase()}-${currentMediaItemsCounter}`,
            type: HandleType.AUDIO.toLowerCase(),
            url: url,
            duration: duration,
            fileInfo: {
              name: "placeholder.txt",
              type: "",
              size: "",
            },
          });
        } 
      }

      for (const url of sourceVideo) {
        // 检查是否存在相同的项
        const existingItem = currentMediaItems.find((item: any) => item?.url === url && item.type === HandleType.VIDEO.toLowerCase());
        const { width, height, duration } = await getVideoMeta(url);
        const thumbnail = await getVideoThumbnail(url);

        if (!existingItem) {
          let currentMediaItemsCounter = ++mediaVideoCounter;
          newMediaItems.push({
            id: `media-${HandleType.VIDEO.toLowerCase()}-${currentMediaItemsCounter}-${Date.now()}`,
            name: `${HandleType.VIDEO.toLowerCase()}-${currentMediaItemsCounter}`,
            type: HandleType.VIDEO.toLowerCase(),
            url: url,
            thumbnail: thumbnail,
            duration: duration,
            width: width,
            height: height,
            fileInfo: {
              name: "placeholder.txt",
              type: "",
              size: "",
            },
          });
        } 
      }

      if (newMediaItems.length > 0) {
        const updatedMediaItems = [...newMediaItems, ...currentMediaItems];
        const updatedProjectData = {
          ...currentProjectData,
          updatedAt: new Date().toISOString(),
          mediaItems: updatedMediaItems,
        };
        // 同步上游数据
        setInitialData(updatedProjectData);

        // 同步节点运行时数据
        setEditorSnapshotRuntimeData(id, "mediaItems", updatedMediaItems);
        setEditorSnapshotRuntimeData(id, "updatedAt", new Date().toISOString());

        messageApi.success(`Synchronized ${newMediaItems.length} new items`);
      } else {
        messageApi.info("No new items to sync");
      }
    } catch (error) {
      messageApi.error("Data sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return (
    <div ref={anchorRef} className="w-[1300px] h-[800px] z-index-100 flex flex-col rounded-[14px] cursor-default bg-transparent">
      {/* 节点工具栏 */}
      {(isHovered || isToolbarHovered || !!selected) && (
        <NodeToolbarManager
          id={id}
          type={type}
          toolbarRef={toolbarRef}
          onToolbarMouseEnter={() => {
            if (hideToolbarTimerRef.current) {
              clearTimeout(hideToolbarTimerRef.current);
              hideToolbarTimerRef.current = null;
            }
            setIsToolbarHovered(true);
          }}
          onToolbarMouseLeave={() => {
            if (hideToolbarTimerRef.current) {
              clearTimeout(hideToolbarTimerRef.current);
            }
            hideToolbarTimerRef.current = window.setTimeout(() => {
              setIsToolbarHovered(false);
            }, 150);
          }}
        />
      )}
      <div
        className="relative flex flex-col items-stretch"
        onMouseEnter={() => {
          if (hideToolbarTimerRef.current) {
            clearTimeout(hideToolbarTimerRef.current);
            hideToolbarTimerRef.current = null;
          }
          setIsHovered(true);
        }}
        onMouseLeave={(e) => {
          const target = e.relatedTarget as EventTarget | null;
          const enteringToolbar = !!(toolbarRef.current && target && target instanceof Node && toolbarRef.current.contains(target));

          if (enteringToolbar) {
            setIsToolbarHovered(true);
            setIsHovered(false);
            return;
          }
          if (hideToolbarTimerRef.current) {
            clearTimeout(hideToolbarTimerRef.current);
          }
          hideToolbarTimerRef.current = window.setTimeout(() => {
            setIsHovered(false);
            setIsToolbarHovered(false);
          }, 150);
        }}
      >
        {/* Handle连接点 - 左侧输入 */}
        <div className="absolute -left-[54px] w-[52px] h-auto">
          {InputNodeModel?.handle?.source?.map((item, index) => {
            const inputHandleType = item.key;
            const handleColor = inputHandleType ? BlockMeta[inputHandleType]?.color ?? "#000" : "#000";

            return (
              <div key={`${id}-handleSource-${index}`} className={"absolute w-[52px] h-[36px] flex flex-col justify-center"} style={{ top: `${index * (20 + 36) + 45}px` }}>
                <div className="relative flex flex-col items-center w-[52px]">
                  <div className="flex flex-col items-center relative">
                    <Handle type="target" position={Position.Left} id={`${inputHandleType}_${index}_${item.isMulti}`} className="!absolute !w-[36px] !h-[36px] !-translate-y-1/2 !border-none !rounded-full !z-[99] !opacity-0 !pointer-events-auto !transition-colors !duration-200" />
                    <div className="flex flex-col items-center justify-center min-h-[36px]">
                      <div className="relative">
                        <Node_HandleSvg color={handleColor} isEmpty={(handleCounters?.[index] || 0) <= 0} isLeft={true} />
                        <div className="absolute inset-0 flex items-center justify-start z-[2] pointer-events-none">
                          <div className={`flex items-center justify-center w-[36px] font-normal text-white ${(handleCounters?.[index] || 0) > 0 ? "text-xs" : "text-[10px]"}`}>
                            <span>{(handleCounters?.[index] || 0) > 0 ? handleCounters?.[index] : item.isMulti !== HandleIsMulti.MULTI ? item.key : `${item.key}s`}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 子内容 */}
        <div className="flex-1">
          <div
            id={`video-editor-root-${id}`}
            className={`relative w-full overflow-hidden space-y-4 rounded-[5px] border-0 outline-2 ${selected ? " outline-solid" : isHovered ? " outline-dotted" : " outline-solid"} ${selected || isHovered ? " outline-[#0D99FF]" : " outline-[#E9E9E9]"} nopan nowheel outline`}
            data-nopan="true"
            data-nowheel="true"
            style={{ pointerEvents: "auto" }}
          >
            <VideoEditor
              nodeId={id}
              nodeType={type}
              anchorRef={anchorRef}
              initialData={initialData}
              onSyncData={handleSyncData} // 同步数据回调（可选）
              reactflowScale={storeZoom} // 传递缩放系数给组件
              isSyncing={isSyncing} // 是否正在同步
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(NodeVideoEditor);
