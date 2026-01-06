from app.editor.model.llm.llm_openrouter import llm_openrouter_instance
from app.editor.model.video.video_kling_effect import video_kling_effect_instance
from app.editor.model.image.image_topaz_upscalar import image_topaz_upscalar_instance
from app.editor.model.video.video_topaz_upscalar import video_topaz_upscalar_instance
from app.editor.model.video.video_wavespeed_lip_sync import video_wavespeed_lip_sync_instance
from app.editor.model.image.image_wavespeed_text_to_image_nanobanana import image_wavespeed_text_to_image_nanobanana_instance
from app.editor.model.image.image_wavespeed_text_to_image_gpt_image_1 import image_wavespeed_text_to_image_gpt_image_1_instance
from app.editor.model.image.image_wavespeed_flux_1_1_pro import image_wavespeed_flux_1_pro_instance
from app.editor.model.image.image_wavespeed_text_to_image_bytedance_seedream_v4 import image_wavespeed_text_to_image_bytedance_seedream_v4_instance
from app.editor.model.image.image_wavespeed_ideogram_v3_quality import image_wavespeed_ideogram_v3_quality_instance
from app.editor.model.image.image_wavespeed_image_to_image_nanobanana import image_wavespeed_image_to_image_nanobanana_instance
from app.editor.model.image.image_wavespeed_image_to_image_gpt_image_1 import image_wavespeed_image_to_image_gpt_image_1_instance
from app.editor.model.image.image_wavespeed_image_to_image_flux_kontext_pro import image_wavespeed_image_to_image_flux_kontext_pro_instance
from app.editor.model.image.image_wavespeed_image_to_image_bytedance_seedream_v4 import image_wavespeed_image_to_image_bytedance_seedream_v4_instance
from app.editor.model.image.image_wavespeed_image_to_image_qwen_image import image_wavespeed_image_to_image_qwen_image_instance
from app.editor.model.video.video_wavespeed_text_to_video_sora_2_pro import video_wavespeed_text_to_video_sora_2_pro_instance
from app.editor.model.video.video_wavespeed_text_to_video_sora_2 import video_wavespeed_text_to_video_sora_2_instance
from app.editor.model.video.video_wavespeed_text_to_video_veo_3_1 import video_wavespeed_text_to_video_veo_3_1_instance
from app.editor.model.video.video_wavespeed_text_to_video_veo_3_1_fast import video_wavespeed_text_to_video_veo_3_1_fast_instance
from app.editor.model.video.video_wavespeed_text_to_video_wan_2_5 import video_wavespeed_text_to_video_wan_2_5_instance
from app.editor.model.video.video_wavespeed_text_to_video_dreamina_3_pro import video_wavespeed_text_to_video_dreamina_3_pro_instance
from app.editor.model.video.video_wavespeed_text_to_video_kling_2_5_turbo_pro import video_wavespeed_text_to_video_kling_2_5_turbo_pro_instance
from app.editor.model.video.video_wavespeed_image_to_video_sora_2_pro import video_wavespeed_image_to_video_sora_2_pro_instance
from app.editor.model.video.video_wavespeed_image_to_video_sora_2 import video_wavespeed_image_to_video_sora_2_instance
from app.editor.model.video.video_wavespeed_image_to_video_veo_3_1 import video_wavespeed_image_to_video_veo_3_1_instance
from app.editor.model.video.video_wavespeed_image_to_video_veo_3_1_fast import video_wavespeed_image_to_video_veo_3_1_fast_instance
from app.editor.model.video.video_wavespeed_image_to_video_wan_2_5 import video_wavespeed_image_to_video_wan_2_5_instance
from app.editor.model.video.video_wavespeed_image_to_video_bytedance_dreamina_3_pro import video_wavespeed_image_to_video_bytedance_dreamina_3_pro_instance
from app.editor.model.video.video_wavespeed_image_to_video_kling_2_5_turbo_pro import video_wavespeed_image_to_video_kling_2_5_turbo_pro_instance
from app.editor.model.video.video_wavespeed_kling_effect import video_wavespeed_kling_effect_instance
from app.editor.model.tts.tts_wavespeed_minimax_speech_2_hd import tts_wavespeed_minimax_speech_2_hd_instance
from app.editor.model.tts.tts_wavespeed_elevenlabs_turbo_2_5 import tts_wavespeed_elevenlabs_turbo_2_5_instance
from app.editor.model.tts.tts_wavespeed_kling_v1 import tts_wavespeed_kling_v1_instance
from app.editor.model.audio.audio_wavespeed_minimax_music_2 import audio_wavespeed_minimax_music_2_instance
from app.editor.model.audio.audio_wavespeed_kling_text_to_audio import audio_wavespeed_kling_text_to_audio_instance
from app.editor.model.image.image_wavespeed_text_to_image_nanobanana_pro import image_wavespeed_text_to_image_nanobanana_pro_instance
from app.editor.model.image.image_wavespeed_image_to_image_nanobanana_pro import image_wavespeed_image_to_image_nanobanana_pro_instance
from app.editor.model.image.image_wavespeed_text_to_image_bytedance_seedream_v4_5 import image_wavespeed_text_to_image_bytedance_seedream_v4_5_instance
from app.editor.model.image.image_wavespeed_image_to_image_bytedance_seedream_v4_5 import image_wavespeed_image_to_image_bytedance_seedream_v4_5_instance
from app.editor.model.video.video_wavespeed_text_to_video_kling_video_o1 import video_wavespeed_text_to_video_kling_video_o1_instance
from app.editor.model.video.video_wavespeed_image_to_video_kling_video_o1 import video_wavespeed_image_to_video_kling_video_o1_instance


def get_model(model_id: str):
    if model_id == "deepseek/deepseek-chat-v3.1":
        return llm_openrouter_instance
    elif model_id == "anthropic/claude-sonnet-4.5":
        return llm_openrouter_instance
    elif model_id == "google/gemini-2.5-flash":
        return llm_openrouter_instance
    elif model_id == "kling-video-effect-1.0":
        return video_kling_effect_instance
    elif model_id == "topaz-Standard-V2":
        return image_topaz_upscalar_instance
    elif model_id == "wavespeed-text-to-image-nano-banana":
        return image_wavespeed_text_to_image_nanobanana_instance
    elif model_id == "wavespeed-text-to-image-gpt-image-1":
        return image_wavespeed_text_to_image_gpt_image_1_instance
    elif model_id == "wavespeed-text-to-image-bytedance-seedream-v4":
        return image_wavespeed_text_to_image_bytedance_seedream_v4_instance
    elif model_id == "wavespeed-text-to-image-bytedance-seedream-v4-5":
        return image_wavespeed_text_to_image_bytedance_seedream_v4_5_instance
    elif model_id == "wavespeed-ideogram-v3-quality":
        return image_wavespeed_ideogram_v3_quality_instance
    elif model_id == "wavespeed-flux-1.1-pro":
        return image_wavespeed_flux_1_pro_instance
    elif model_id == "prob-4":
        return video_topaz_upscalar_instance
    elif model_id == "wavespeed-lip-sync-2.0":
        return video_wavespeed_lip_sync_instance
    elif model_id == "wavespeed-image-to-image-nano-banana":
        return image_wavespeed_image_to_image_nanobanana_instance
    elif model_id == "wavespeed-image-to-image-gpt-image-1":
        return image_wavespeed_image_to_image_gpt_image_1_instance
    elif model_id == "wavespeed-image-to-image-flux-kontext-pro":
        return image_wavespeed_image_to_image_flux_kontext_pro_instance
    elif model_id == "wavespeed-image-to-image-bytedance-seedream-v4":
        return image_wavespeed_image_to_image_bytedance_seedream_v4_instance
    elif model_id == "wavespeed-image-to-image-bytedance-seedream-v4-5":
        return image_wavespeed_image_to_image_bytedance_seedream_v4_5_instance
    elif model_id == "wavespeed-image-to-image-qwen-image":
        return image_wavespeed_image_to_image_qwen_image_instance
    elif model_id == "wavespeed-text-to-video-sora-2-pro":
        return video_wavespeed_text_to_video_sora_2_pro_instance
    elif model_id == "wavespeed-text-to-video-sora-2":
        return video_wavespeed_text_to_video_sora_2_instance
    elif model_id == "wavespeed-text-to-video-veo-3-1":
        return video_wavespeed_text_to_video_veo_3_1_instance
    elif model_id == "wavespeed-text-to-video-veo-3-1-fast":
        return video_wavespeed_text_to_video_veo_3_1_fast_instance
    elif model_id == "wavespeed-text-to-video-wan-2.5":
        return video_wavespeed_text_to_video_wan_2_5_instance
    elif model_id == "wavespeed-text-to-video-dreamina-3-pro":
        return video_wavespeed_text_to_video_dreamina_3_pro_instance
    elif model_id == "wavespeed-text-to-video-kling-2.5-turbo-pro":
        return video_wavespeed_text_to_video_kling_2_5_turbo_pro_instance
    elif model_id == "wavespeed-text-to-video-kling-video-o1":
        return video_wavespeed_text_to_video_kling_video_o1_instance
    elif model_id == "wavespeed-image-to-video-sora-2-pro":
        return video_wavespeed_image_to_video_sora_2_pro_instance
    elif model_id == "wavespeed-image-to-video-sora-2":
        return video_wavespeed_image_to_video_sora_2_instance
    elif model_id == "wavespeed-image-to-video-veo-3-1":
        return video_wavespeed_image_to_video_veo_3_1_instance
    elif model_id == "wavespeed-image-to-video-veo-3-1-fast":
        return video_wavespeed_image_to_video_veo_3_1_fast_instance
    elif model_id == "wavespeed-image-to-video-wan-2.5":
        return video_wavespeed_image_to_video_wan_2_5_instance
    elif model_id == "wavespeed-image-to-video-dreamina-3-pro":
        return video_wavespeed_image_to_video_bytedance_dreamina_3_pro_instance
    elif model_id == "wavespeed-image-to-video-kling-2.5-turbo-pro":
        return video_wavespeed_image_to_video_kling_2_5_turbo_pro_instance
    elif model_id == "wavespeed-image-to-video-kling-video-o1":
        return video_wavespeed_image_to_video_kling_video_o1_instance
    elif model_id == "wavespeed-kling-effect-1.0":
        return video_wavespeed_kling_effect_instance
    elif model_id == "wavespeed-tts-minimax-speech-2-hd":
        return tts_wavespeed_minimax_speech_2_hd_instance
    elif model_id == "wavespeed-tts-elevenlabs-turbo-2.5":
        return tts_wavespeed_elevenlabs_turbo_2_5_instance
    elif model_id == "wavespeed-tts-kling-v1":
        return tts_wavespeed_kling_v1_instance
    elif model_id == "wavespeed-minimax-music-2":
        return audio_wavespeed_minimax_music_2_instance
    elif model_id == "wavespeed-audio-kling-text-to-audio":
        return audio_wavespeed_kling_text_to_audio_instance
    elif model_id == "wavespeed-text-to-image-nano-banana-pro":
        return image_wavespeed_text_to_image_nanobanana_pro_instance
    elif model_id == "wavespeed-image-to-image-nano-banana-pro":
        return image_wavespeed_image_to_image_nanobanana_pro_instance
    else:
        raise ValueError(f"Model {model_id} not found")

