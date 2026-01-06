import React from "react";

/**
 * 节点图标加载器使用说明
 *
 * 作用
 * - 根据后端返回的图标名 `name` 返回对应的 SVG 组件 JSX；未匹配时回退到默认图标。
 *
 * 快速使用
 * - 在 JSX 中：`{getNodeIcon('11f', 'w-4 h-4')}`
 * - 搭配后端字段：`{getNodeIcon(opt.icon, 'w-4 h-4')}` 或 `{getNodeIcon(data.icon, 'w-4 h-4')}`
 *
 * 样式
 * - 通过 `className` 控制尺寸与颜色，例如：`w-4 h-4`、`text-gray-700`
 * - 使用了 `currentColor` 的图标可用 `text-*` 颜色类生效
 *
 * 扩展映射
 * - 在下方 `map` 中为新图标名添加键，例如：
 *   `import { AiModelHailuoImageSvg } from './staticIcon'`
 *   `map['1ff'] = AiModelHailuoImageSvg as any`
 *
 * 注意
 * - 使用 `map[name] ?? map['default']` 在未匹配时使用默认图标
 * - 确保后端字段与 `map` 键一致（如后端返回的 `item.icon_name`）
 *
 * API
 * - `getNodeIcon(name: string, className?: string): JSX.Element`
 */
export const getNodeIcon = (name: string, className?: string) => {
  const map: Record<string, React.FC<{ className?: string }>> = {
    // Input
    text: EditorNodes_TextInput_Svg as any,
    image: EditorNodes_ImageInput_Svg as any,
    video: EditorNodes_VideoInput_Svg as any,
    audio: EditorNodes_AudioInput_Svg as any,
    doc: EditorNodes_DocInput_Svg as any,

    // Text
    batch_text_to_text: EditorNodes_BatchTextToText_Svg as any,
    split_texts: EditorNodes_SplitTexts_Svg as any,

    // Image
    batch_text_to_image: EditorNodes_BatchTextToImage_Svg as any,
    batch_image_to_image: EditorNodes_BatchImageToImage_Svg as any,

    // Video
    batch_text_to_video: EditorNodes_BatchTextToVideo_Svg as any,
    batch_image_to_video: EditorNodes_BatchImageToVideo_Svg as any,
    batch_add_ambient_to_videos: EditorNodes_BatchAddAmbientToVideos_Svg as any,
    batch_audio_lip_sync_to_videos: EditorNodes_BatchAudioLipSyncToVideos_Svg as any,

    // TTS
    batch_text_to_speech: EditorNodes_BatchTextToSpeech_Svg as any,

    // Audio
    batch_generate_music: EditorNodes_BatchGenerateMusic_Svg as any,
    batch_generate_melody: EditorNodes_BatchGenerateMelody_Svg as any,

    // Editor
    video_editor: EditorNodes_VideoEditor_Svg as any,

    style_image_gen: EditorNodes_StyleImageGen_Svg as any, // [TODO: 图标未完成]
    image_describer: EditorNodes_ImageDescriber_Svg as any, // [TODO: 图标未完成]
    image_upscriber_pro: EditorNodes_ImageUpscriberPro_Svg as any, // [TODO: 图标未完成]
    background_edit_pro: EditorNodes_BackgroundEditPro_Svg as any, // [TODO: 图标未完成]
    video_upscaler_pro: EditorNodes_VideoUpscalerPro_Svg as any, // [TODO: 图标未完成]

    default: EditorNodes_Default_Svg as any,
  };

  const Comp = map[name] ?? map["default"];
  return <Comp className={className || ""} />;
};

/**
 * 默认节点图标 18x18
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_Default_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 8.5L1 2C1 1.44771 1.44772 0.999995 2 0.999995L16 0.999996C16.5523 0.999996 17 1.44771 17 2L17 16C17 16.5523 16.5523 17 16 17L9.5 17" stroke="#989898" strokeWidth={2} strokeLinecap="round" />
    <path
      d="M5.74902 9.56543C5.84438 9.58628 5.93894 9.61247 6.0332 9.6416C6.03842 9.64321 6.04362 9.64486 6.04883 9.64648C6.05433 9.64821 6.05993 9.64961 6.06543 9.65137L6.5459 8.82031L7.84473 9.57031L7.36426 10.4014C7.42281 10.4546 7.47887 10.5098 7.5332 10.5664C7.57573 10.6086 7.61763 10.6517 7.6582 10.6963L8.48926 10.2168L9.23926 11.5156L8.4082 11.9951C8.43468 12.0779 8.45749 12.1614 8.47754 12.2451H9.39453V13.7451H8.50586C8.48208 13.8648 8.45202 13.9831 8.41602 14.0996L9.18359 14.543L8.43359 15.8428L7.67773 15.4053C7.59968 15.4924 7.51727 15.5764 7.42969 15.6562L7.91211 16.4922L6.61328 17.2422L6.13086 16.4072C6.00463 16.4477 5.8772 16.4802 5.74902 16.5059V17.3916H4.24902V16.4785C4.1349 16.4514 4.02204 16.4192 3.91113 16.3809L3.45312 17.1768L2.1543 16.4268L2.62988 15.5986C2.58995 15.5603 2.55098 15.5209 2.5127 15.4805C2.49526 15.463 2.47796 15.4455 2.46094 15.4277L1.63281 15.9072L0.882812 14.6084L1.67871 14.1484C1.63336 14.0174 1.59616 13.8827 1.56641 13.7451H0.607422V12.2451H1.56836C1.57515 12.2142 1.58121 12.1831 1.58887 12.1523C1.59478 12.1285 1.60102 12.1047 1.60742 12.0811C1.61558 12.051 1.6248 12.0212 1.63379 11.9912C1.64021 11.9698 1.64553 11.948 1.65234 11.9268L0.823242 11.4482L1.57324 10.1494L2.4043 10.6299C2.48361 10.5428 2.56676 10.4605 2.65332 10.3828L2.21973 9.63184L3.51855 8.88184L3.95703 9.64258C3.97247 9.63779 3.98837 9.63446 4.00391 9.62988C4.0386 9.61964 4.0734 9.60976 4.1084 9.60059C4.12755 9.59558 4.14674 9.59062 4.16602 9.58594C4.19363 9.57919 4.22125 9.57248 4.24902 9.56641V8.6084H5.74902V9.56543ZM6.42578 11.5811C5.79541 10.9997 4.83652 10.8672 4.05469 11.3184C3.09203 11.8742 2.76179 13.1056 3.31738 14.0684C3.38666 14.1883 3.46624 14.2986 3.55469 14.3984C3.7321 14.5816 3.94282 14.7314 4.17871 14.8369C4.29482 14.8889 4.41386 14.9285 4.53418 14.957C4.66922 14.989 4.8091 15.0066 4.95312 15.0098C5.00504 15.0109 5.05674 15.0097 5.1084 15.0068C6.16392 14.9498 7.00281 14.0825 7.01074 13.0146C7.01087 12.9961 7.01015 12.9775 7.00977 12.959C6.99906 12.4215 6.77882 11.936 6.42578 11.5811Z"
      fill="#989898"
    />
    <path d="M7 8L8.71571 4.56858C8.82909 4.34181 9.15521 4.34922 9.25818 4.58091L10.7259 7.88318C10.8314 8.12072 11.1686 8.12072 11.2741 7.88318L12.7418 4.58091C12.8448 4.34922 13.1709 4.34181 13.2843 4.56858L15 8" stroke="#989898" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * 文本输入节点图标 18x18
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_TextInput_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6.86667 0.999999L16 0.999999C16.5523 0.999999 17 1.44771 17 2L17 16C17 16.5523 16.5523 17 16 17L2 17C1.44772 17 1 16.5523 1 16L1 9.55172" stroke="black" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M4.80509 1.48365C5.25689 1.87383 5.36916 2.57088 5.04677 3.09714L3.0665 6.32972C2.92366 6.56289 2.73081 6.75714 2.50478 6.89721L2.13373 7.12756C1.57925 7.47102 0.88072 7.03175 0.892528 6.34688L0.90061 5.89177C0.906434 5.55466 1.00117 5.22653 1.17363 4.94501L3.12714 1.75613C3.47109 1.19466 4.17978 1.03962 4.70981 1.40989L4.80509 1.48365Z"
      stroke="black"
      strokeWidth="1.5"
    />
    <path d="M5.5 6.5H13.9863" stroke="black" strokeWidth="2" strokeLinecap="round" />
    <path d="M4.5 11.5H13.9863" stroke="black" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 图片输入节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_ImageInput_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4.03449 1L16 0.999999C16.5523 0.999999 17 1.44771 17 2L17 16C17 16.5523 16.5523 17 16 17L2 17C1.44772 17 1 16.5523 1 16L1 10" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path
      d="M0.105573 9.55277C-0.141416 10.0467 0.0588071 10.6474 0.552785 10.8944C1.04676 11.1414 1.64744 10.9412 1.89443 10.4472L1 9.99998L0.105573 9.55277ZM5.35577 4.95603L4.43961 5.35685L5.35577 4.95603ZM9.0298 10.0732L9.69877 10.8165L9.0298 10.0732ZM13.6153 7.57682L14.4836 7.08069L13.6153 7.57682ZM12.0781 7.32967L12.7471 8.07296L12.0781 7.32967ZM17 13.5L17.8682 13.0039L14.4836 7.08069L13.6153 7.57682L12.7471 8.07296L16.1318 13.9961L17 13.5ZM12.0781 7.32967L11.4092 6.58638L8.36084 9.32987L9.0298 10.0732L9.69877 10.8165L12.7471 8.07296L12.0781 7.32967ZM7.44468 9.73069L8.36084 9.32987L6.27192 4.55521L5.35577 4.95603L4.43961 5.35685L6.52852 10.1315L7.44468 9.73069ZM3.54518 4.90963L2.65076 4.46242L0.105573 9.55277L1 9.99998L1.89443 10.4472L4.43961 5.35685L3.54518 4.90963ZM5.35577 4.95603L6.27192 4.55521C5.59226 3.0017 3.40909 2.94577 2.65076 4.46242L3.54518 4.90963L4.43961 5.35685L4.43961 5.35685L5.35577 4.95603ZM9.0298 10.0732L8.36084 9.32987L8.36084 9.32987L7.44468 9.73069L6.52852 10.1315C7.07524 11.3811 8.68493 11.7289 9.69877 10.8165L9.0298 10.0732ZM13.6153 7.57682L14.4836 7.08069C13.8508 5.97333 12.3572 5.73318 11.4092 6.58638L12.0781 7.32967L12.7471 8.07296L12.7471 8.07296L13.6153 7.57682Z"
      fill="black"
    />
  </svg>
);

/**
 * 视频输入节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_VideoInput_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M7 0.999999L16 0.999999C16.5523 0.999999 17 1.44771 17 2L17 16C17 16.5523 16.5523 17 16 17L2 17C1.44772 17 1 16.5523 1 16L1 7.06897" stroke="black" strokeWidth="2" strokeLinecap="round" />
    <path d="M3.5 1.75C4.48603 1.75 5.25 2.52275 5.25 3.43262C5.24984 4.34236 4.48593 5.11426 3.5 5.11426C2.51407 5.11426 1.75016 4.34236 1.75 3.43262C1.75 2.52275 2.51397 1.75 3.5 1.75Z" stroke="black" strokeWidth="1.5" />
    <path d="M12.4697 9.50464L6.75 12.7195V6.28979L12.4697 9.50464Z" fill="black" stroke="black" strokeWidth="1.5" />
  </svg>
);

/**
 * 音频输入节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_AudioInput_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5.68965 1L16 1C16.5523 1 17 1.44771 17 2L17 16C17 16.5523 16.5523 17 16 17L2 17C1.44772 17 1 16.5523 1 16L1 6.24138" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M4.31055 3.20685C4.31055 3.81627 3.81652 4.3103 3.2071 4.3103" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7 3.5C7 5.02354 5.02354 7 3.5 7" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9.5 4C9.5 6.43767 6.43767 9.5 4 9.5" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * 文档输入节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_DocInput_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 7V16C1 16.5523 1.44772 17 2 17H16C16.5523 17 17 16.5523 17 16V2C17 1.44772 16.5523 1 16 1H6.36667" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path
      d="M11.9036 9.79132L3.81941 1.70711C3.42889 1.31658 2.79572 1.31658 2.4052 1.70711L1.37451 2.73779C0.98399 3.12831 0.983991 3.76148 1.37451 4.152L9.50127 12.2788C9.64473 12.4222 9.82844 12.5187 10.028 12.5552L11.7464 12.8704C12.0684 12.9294 12.3593 12.6682 12.3352 12.3418L12.1938 10.4249C12.1762 10.1857 12.0732 9.96088 11.9036 9.79132Z"
      stroke="black"
      strokeWidth={2}
    />
  </svg>
);

/**
 * 批量文本到文本节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchTextToText_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 7.5L1 2C1 1.44771 1.44772 1 2 1L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L9 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M9 10.8213H13.8165" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M4 5.47571H14" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <rect x={1} y={10} width={5} height={7} rx={1} stroke="black" strokeWidth={2} />
  </svg>
);

/**
 * 文本分割节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_SplitTexts_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9.55172 1L16 0.999999C16.5523 0.999999 17 1.44771 17 2L17 16C17 16.5523 16.5523 17 16 17L2 17C1.44772 17 1 16.5523 1 16L1 10.931" stroke="black" strokeWidth="2" strokeLinecap="round" />
    <rect x="-1.3092" y="0.184166" width="5.25984" height="8.58192" rx="1.1" transform="matrix(-0.632801 0.774314 -0.821863 -0.569685 11.0137 7.21724)" stroke="black" strokeWidth="1.8" />
    <path d="M1.82549 6.78821C1.38421 7.34082 1.49722 8.10998 2.07895 8.51322L7.16403 12.038C8.07184 12.6673 9.37439 12.484 10.0734 11.6288L11.855 9.4487C12.3226 8.87649 12.1828 8.06795 11.5493 7.68093" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * 批量文本到图像节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchTextToImage_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 9.82759L1 2C1 1.44772 1.44772 0.999999 2 0.999999L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L7.31034 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path
      d="M0.433776 9.17572C-0.0214454 9.48843 -0.136968 10.111 0.175749 10.5662C0.488465 11.0214 1.111 11.1369 1.56622 10.8242L1 9.99997L0.433776 9.17572ZM9.11853 9.08203L8.27557 8.54406L9.11853 9.08203ZM7.58747 9.26969L6.89938 9.99531L7.58747 9.26969ZM12.2517 4.17248L11.4088 3.63451L12.2517 4.17248ZM17 7.96019L17.7784 7.33245L14.6515 3.45497L13.8731 4.08271L13.0947 4.71045L16.2216 8.58793L17 7.96019ZM12.2517 4.17248L11.4088 3.63451L8.27557 8.54406L9.11853 9.08203L9.96149 9.62L13.0947 4.71045L12.2517 4.17248ZM7.58747 9.26969L8.27556 8.54406L6.54203 6.90019L5.85394 7.62582L5.16585 8.35144L6.89938 9.99531L7.58747 9.26969ZM4.59962 7.52719L4.0334 6.70294L0.433776 9.17572L1 9.99997L1.56622 10.8242L5.16585 8.35144L4.59962 7.52719ZM5.85394 7.62582L6.54203 6.90019C5.85713 6.25072 4.81139 6.16849 4.0334 6.70294L4.59962 7.52719L5.16585 8.35144L5.16585 8.35144L5.85394 7.62582ZM9.11853 9.08203L8.27557 8.54406L8.27556 8.54406L7.58747 9.26969L6.89938 9.99531C7.8113 10.8601 9.28541 10.6794 9.96149 9.62L9.11853 9.08203ZM13.8731 4.08271L14.6515 3.45497C13.7934 2.39078 12.1442 2.48209 11.4088 3.63451L12.2517 4.17248L13.0947 4.71045L13.0947 4.71045L13.8731 4.08271Z"
      fill="black"
    />
    <path d="M1 13.0344H4.2" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M2.56641 13.5344L2.56641 16.9999" stroke="black" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

/**
 * 批量图像到图像节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchImageToImage_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M0.9999 5L0.9999 2.00003C0.9999 1.44774 1.44761 1.00003 1.9999 1.00003L16 1C16.5523 1 17 1.44772 17 2V16C17 16.5523 16.5523 17 16 17L14 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M10.5229 12.955L9.71227 11.0433C9.38858 10.28 8.32993 10.2195 7.92142 10.941L6.56199 13.3421C6.24033 13.9102 5.4694 14.0227 4.99875 13.5703L4.27087 12.8706C3.8348 12.4514 3.12929 12.5123 2.77151 13L1.47754 14.764" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M1 9C1 8.44772 1.44772 8 2 8H10C10.5523 8 11 8.44772 11 9V16C11 16.5523 10.5523 17 10 17H2C1.44772 17 1 16.5523 1 16V9Z" stroke="black" strokeWidth={2} />
  </svg>
);

/**
 * 图像样式生成节点图标 17x17 [TODO: 图标未完成]
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_StyleImageGen_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6.5 0.499999L15.5 0.499999C16.0523 0.499999 16.5 0.947714 16.5 1.5L16.5 15.5C16.5 16.0523 16.0523 16.5 15.5 16.5L1.5 16.5C0.947715 16.5 0.5 16.0523 0.5 15.5L0.5 6.56897" stroke="black" strokeLinecap="round" />
    <path d="M3 1C4.11759 1 5 1.87826 5 2.93262C4.99985 3.98685 4.11749 4.86426 3 4.86426C1.88251 4.86426 1.00015 3.98685 1 2.93262C1 1.87826 1.88241 1 3 1Z" stroke="black" />
    <path d="M12.4795 9.00563L6 12.6472V5.36305L12.4795 9.00563Z" fill="black" stroke="black" />
  </svg>
);

/**
 * 图像描述节点图标 17x17 [TODO: 图标未完成]
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_ImageDescriber_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6.5 0.499999L15.5 0.499999C16.0523 0.499999 16.5 0.947714 16.5 1.5L16.5 15.5C16.5 16.0523 16.0523 16.5 15.5 16.5L1.5 16.5C0.947715 16.5 0.5 16.0523 0.5 15.5L0.5 6.56897" stroke="black" strokeLinecap="round" />
    <path d="M3 1C4.11759 1 5 1.87826 5 2.93262C4.99985 3.98685 4.11749 4.86426 3 4.86426C1.88251 4.86426 1.00015 3.98685 1 2.93262C1 1.87826 1.88241 1 3 1Z" stroke="black" />
    <path d="M12.4795 9.00563L6 12.6472V5.36305L12.4795 9.00563Z" fill="black" stroke="black" />
  </svg>
);

/**
 * 图像上采样器Pro 节点图标 17x17 [TODO: 图标未完成]
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_ImageUpscriberPro_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6.5 0.499999L15.5 0.499999C16.0523 0.499999 16.5 0.947714 16.5 1.5L16.5 15.5C16.5 16.0523 16.0523 16.5 15.5 16.5L1.5 16.5C0.947715 16.5 0.5 16.0523 0.5 15.5L0.5 6.56897" stroke="black" strokeLinecap="round" />
    <path d="M3 1C4.11759 1 5 1.87826 5 2.93262C4.99985 3.98685 4.11749 4.86426 3 4.86426C1.88251 4.86426 1.00015 3.98685 1 2.93262C1 1.87826 1.88241 1 3 1Z" stroke="black" />
    <path d="M12.4795 9.00563L6 12.6472V5.36305L12.4795 9.00563Z" fill="black" stroke="black" />
  </svg>
);

/**
 * 背景编辑Pro 节点图标 17x17 [TODO: 图标未完成]
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BackgroundEditPro_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6.5 0.499999L15.5 0.499999C16.0523 0.499999 16.5 0.947714 16.5 1.5L16.5 15.5C16.5 16.0523 16.0523 16.5 15.5 16.5L1.5 16.5C0.947715 16.5 0.5 16.0523 0.5 15.5L0.5 6.56897" stroke="black" strokeLinecap="round" />
    <path d="M3 1C4.11759 1 5 1.87826 5 2.93262C4.99985 3.98685 4.11749 4.86426 3 4.86426C1.88251 4.86426 1.00015 3.98685 1 2.93262C1 1.87826 1.88241 1 3 1Z" stroke="black" />
    <path d="M12.4795 9.00563L6 12.6472V5.36305L12.4795 9.00563Z" fill="black" stroke="black" />
  </svg>
);

/**
 * 批量文本到视频 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchTextToVideo_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 9.73485L1 2C1 1.44771 1.44772 0.999997 2 0.999997L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L6.56897 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M1.40918 13.0605H4.40918" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M2.90918 13.5454L2.90918 16.9393" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M12.7041 8.76514L6.98438 11.9819V5.54736L12.7041 8.76514Z" fill="black" stroke="black" strokeWidth="1.5" />
  </svg>
);

/**
 * 批量图像到视频 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchImageToVideo_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M0.999999 10.3103L0.999999 2.00002C0.999999 1.44773 1.44771 1.00002 2 1.00002L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L6 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path
      d="M0.394444 9.72146C-0.0450658 10.0559 -0.130242 10.6833 0.204197 11.1228C0.538637 11.5623 1.16605 11.6475 1.60556 11.3131L1 10.5173L0.394444 9.72146ZM9.617 9.58522L8.78159 9.03559L9.617 9.58522ZM14.4705 4.73207L13.6403 5.28944L14.4705 4.73207ZM12.8049 4.73981L13.6403 5.28944L12.8049 4.73981ZM17 8.49998L17.8303 7.94262L15.3008 4.1747L14.4705 4.73207L13.6403 5.28944L16.1697 9.05735L17 8.49998ZM12.8049 4.73981L11.9695 4.19018L8.78159 9.03559L9.617 9.58522L10.4524 10.1349L13.6403 5.28944L12.8049 4.73981ZM8.14415 9.8061L8.78159 9.03559L6.41797 7.0802L5.78054 7.85071L5.14311 8.62121L7.50672 10.5766L8.14415 9.8061ZM4.53755 7.82541L3.93199 7.02961L0.394444 9.72146L1 10.5173L1.60556 11.3131L5.14311 8.62121L4.53755 7.82541ZM5.78054 7.85071L6.41797 7.0802C5.70175 6.48768 4.67172 6.46672 3.93199 7.02961L4.53755 7.82541L5.14311 8.62121L5.14311 8.62121L5.78054 7.85071ZM9.617 9.58522L8.78159 9.03559L8.78159 9.03559L8.14415 9.8061L7.50672 10.5766C8.42431 11.3357 9.79786 11.1297 10.4524 10.1349L9.617 9.58522ZM14.4705 4.73207L15.3008 4.1747C14.504 2.98773 12.7552 2.99586 11.9695 4.19018L12.8049 4.73981L13.6403 5.28944L13.6403 5.28944L14.4705 4.73207Z"
      fill="black"
    />
    <path d="M11.5162 6.79308L10.2223 5.44345C9.79303 4.99565 9.06382 5.04271 8.69564 5.54197L6.75586 8.17239" stroke="black" strokeWidth={2} />
    <path d="M4.54199 14.0032C4.90508 14.2218 4.92809 14.7289 4.61035 14.9836L4.54199 15.0315L2.05957 16.5266C1.65977 16.7674 1.14968 16.4795 1.14941 16.0129L1.14941 13.0217C1.1495 12.555 1.65971 12.2672 2.05957 12.5081L4.54199 14.0032Z" fill="black" stroke="black" />
  </svg>
);

/**
 * 批量添加环境音效到视频 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchAddAmbientToVideos_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 10L1 2C1 1.44771 1.44772 0.999995 2 0.999995L16 0.999996C16.5523 0.999996 17 1.44771 17 2L17 16C17 16.5523 16.5523 17 16 17L8 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M11.1015 4.34679C12.6095 4.56354 13.6563 5.96177 13.4396 7.46982" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M11.3372 2.70847C13.75 3.05528 15.4249 5.29245 15.0781 7.70532" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M9.64746 8.5L8.75 9.09766V7.90137L9.64746 8.5Z" fill="black" stroke="black" strokeWidth="1.5" />
    <path d="M7.33212 13.015C5.81922 12.8352 4.73853 11.463 4.91833 9.95011" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M7.13685 14.6586C4.71622 14.3709 2.98712 12.1754 3.2748 9.75475" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * 批量音频唇同步到视频 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchAudioLipSyncToVideos_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1.2071 15.6897C1.81652 15.6897 2.31055 16.1837 2.31055 16.7931" stroke="black" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M1.2072 14.0344C2.73074 14.0344 3.96582 15.2695 3.96582 16.793" stroke="black" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M1.2073 12.3793C3.64497 12.3793 5.62109 14.3554 5.62109 16.7931" stroke="black" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M1 10L0.999999 2C0.999999 1.44772 1.44771 1 2 1L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L8 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M14.0713 8.23218C12.6587 6.93061 10.4838 6.93061 9.07129 8.23218" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.07129 8.23218L4.80812 8.79795C7.32238 10.7285 10.8202 10.7285 13.3345 8.79796L14.0713 8.23218" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9.07129 8.23218C7.65873 6.93061 5.48385 6.93061 4.07129 8.23218" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * 视频上采样器Pro 节点图标 17x17 [TODO: 图标未完成]
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_VideoUpscalerPro_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6.5 0.499999L15.5 0.499999C16.0523 0.499999 16.5 0.947714 16.5 1.5L16.5 15.5C16.5 16.0523 16.0523 16.5 15.5 16.5L1.5 16.5C0.947715 16.5 0.5 16.0523 0.5 15.5L0.5 6.56897" stroke="black" strokeLinecap="round" />
    <path d="M3 1C4.11759 1 5 1.87826 5 2.93262C4.99985 3.98685 4.11749 4.86426 3 4.86426C1.88251 4.86426 1.00015 3.98685 1 2.93262C1 1.87826 1.88241 1 3 1Z" stroke="black" />
    <path d="M12.4795 9.00563L6 12.6472V5.36305L12.4795 9.00563Z" fill="black" stroke="black" />
  </svg>
);

/**
 * 批量文本转语音 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchTextToSpeech_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 10.5L1 2C0.999999 1.44771 1.44771 1 2 1L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L6.5 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M14 8.30359C12.5874 7.00203 10.4126 7.00203 9 8.30359" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 8.30359L4.73683 8.86937C7.25109 10.8 10.7489 10.8 13.2632 8.86937L14 8.30359" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 8.30359C7.58744 7.00203 5.41256 7.00203 4 8.30359" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M1.40918 13.0605H4.40918" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M2.90918 13.5454L2.90918 16.9393" stroke="black" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

/**
 * 批量生成音乐 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchGenerateMusic_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 7L1 2C1 1.44771 1.44772 0.999999 2 0.999999L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L11.5 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <circle cx="6.5" cy="11.5" r="4.9" stroke="black" strokeWidth="1.2" />
    <path d="M9.88477 11.077C9.88477 13.1799 8.18 14.8846 6.07707 14.8846" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M3.07715 11.8077C3.07715 9.70476 4.78191 8 6.88484 8" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="6.50015" cy="11.5" r="1.51538" stroke="black" strokeWidth="1.2" />
  </svg>
);

/**
 * 批量生成旋律 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_BatchGenerateMelody_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 8.50012L1 2C1 1.44772 1.44772 1 2 1L16 1C16.5523 1 17 1.44772 17 2L17 16C17 16.5523 16.5523 17 16 17L10 17" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M2.5 16.0001L2.63599 11.3299C2.63871 11.2367 2.70534 11.1578 2.79669 11.1396L7.39417 10.2201C7.52027 10.1948 7.63705 10.2935 7.63331 10.422L7.5 15.0001" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8.25008 15.1311C8.28738 15.7615 7.77275 16.2678 6.93019 16.4419C6.08762 16.616 5.31249 16.3114 5.19888 15.7615C5.08527 15.2117 5.6762 14.6249 6.51877 14.4508C7.36133 14.2767 8.25008 14.5001 8.25008 15.1311Z" fill="black" />
    <path d="M3.25691 16.1311C3.29421 16.7615 2.77959 17.2678 1.93702 17.4419C1.09446 17.616 0.319324 17.3114 0.205713 16.7615C0.0921015 16.2117 0.683036 15.6249 1.5256 15.4508C2.36817 15.2767 3.25691 15.5001 3.25691 16.1311Z" fill="black" />
  </svg>
);

/**
 * 视频编辑器 节点图标 17x17
 * @param className 可选的 CSS 类名，用于自定义图标样式
 */
export const EditorNodes_VideoEditor_Svg: React.FC<{ className?: string }> = ({ className }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8.87598 17L16 17C16.5523 17 17 16.5523 17 16L17 2C17 1.44772 16.5523 1 16 1L2 1C1.44772 1 1 1.44772 1 2L1 9.30424" stroke="black" strokeWidth={2} strokeLinecap="round" />
    <path d="M7.32324 5.96472C7.32324 5.5595 7.78013 5.32224 8.11133 5.55554L11.7061 8.09167C11.988 8.29086 11.9879 8.70884 11.7061 8.90808L8.11133 11.4442C7.78012 11.6776 7.32324 11.4403 7.32324 11.035V5.96472Z" fill="black" />
    <path
      d="M4.02078 10.0232C3.7537 10.0922 3.59176 10.3651 3.65945 10.6326L4.2073 12.7869L4.06765 12.822C3.02184 11.716 1.0661 12.3368 0.917261 13.9421C0.915923 13.9502 0.916267 13.9585 0.915308 13.9666C0.914772 13.9731 0.912845 13.9795 0.912378 13.9861C0.912082 13.9906 0.913552 13.9953 0.913355 13.9998C0.912029 14.026 0.91238 14.0522 0.915308 14.0789C0.916015 14.0851 0.917305 14.0912 0.918238 14.0974C0.920713 14.1142 0.920827 14.1314 0.925074 14.1482C0.961236 14.2908 1.05658 14.4011 1.17703 14.4646C1.18495 14.4689 1.19326 14.4725 1.20144 14.4763C1.21992 14.4848 1.23863 14.4926 1.25808 14.4988C1.27399 14.5039 1.29031 14.5079 1.30691 14.5115C1.32139 14.5145 1.33606 14.5166 1.35085 14.5183C1.35834 14.5192 1.36573 14.5226 1.37332 14.5232C1.38769 14.5243 1.40213 14.5224 1.41628 14.5222C1.42469 14.5221 1.43323 14.5218 1.44168 14.5212C1.46873 14.5196 1.49497 14.5154 1.52078 14.5095C1.5244 14.5087 1.52885 14.5094 1.5325 14.5085L4.45242 13.7566L4.54714 14.1316C4.55203 14.1803 4.56441 14.2264 4.5823 14.2703L5.17898 16.6218C5.18692 16.6978 5.20911 16.7739 5.2532 16.8425C5.27781 16.8807 5.30897 16.9121 5.34109 16.9412C5.35053 16.95 5.36032 16.9585 5.37039 16.9666C5.38168 16.9753 5.39267 16.9843 5.40457 16.9919C5.51836 17.0684 5.66252 17.0991 5.80593 17.0623C5.90185 17.0375 5.9832 16.9854 6.04617 16.9177C7.28586 15.9969 6.88385 14.0445 5.45632 13.6482L5.42117 13.5066L7.55593 12.9578C7.82282 12.8886 7.98488 12.6157 7.91726 12.3484C7.84945 12.0809 7.57709 11.9195 7.30984 11.988L5.17507 12.5369L4.6282 10.3835C4.56034 10.1159 4.2882 9.95435 4.02078 10.0232Z"
      fill="black"
    />
  </svg>
);
