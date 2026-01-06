/**
 * 全局 FFmpeg 单例工厂
 * 确保在所有组件中共享同一个 FFmpeg 实例，避免重复加载
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;

/**
 * 获取全局 FFmpeg 单例；只在首次调用时加载核心文件
 */
export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();
  ffmpegInstance.on("log", ({ message }) => console.log("[FFmpeg]:", message));

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = ffmpegInstance.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    }).then(() => {
      console.log("✅ FFmpeg 加载完成");
    });
  }
  await ffmpegLoadPromise;
  return ffmpegInstance;
};

/**
 * 串行执行 FFmpeg 任务，避免并发导致内存越界
 */
let ffmpegQueue: Promise<any> = Promise.resolve();
export const runInFFmpegQueue = <T>(fn: () => Promise<T>): Promise<T> => {
  const p = ffmpegQueue.then(() => fn());
  ffmpegQueue = p.catch(() => {}); // 保持队列不中断
  return p;
};