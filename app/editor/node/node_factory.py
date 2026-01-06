from editor.node.base_node import BaseNode
from editor.node.text_based_block_node.text_splitter_node import text_splitter_node_instance
from editor.node.text_based_block_node.text_to_text_node import text_to_text_node_instance
from editor.node.image_based_block_node.text_to_image_node import text_to_image_node_instance
from editor.node.image_based_block_node.image_to_image_node import image_to_image_node_instance
from editor.node.image_based_block_node.image_describer_node import image_describer_node_instance
from editor.node.image_based_block_node.style_image_gen_node import style_image_gen_node_instance
from editor.node.video_based_block_node.text_to_video_node import text_to_video_node_instance
from editor.node.video_based_block_node.image_to_video_node import image_to_video_node_instance
from editor.node.audio_based_block_node.text_to_audio_node import text_to_audio_node_instance
from editor.node.video_based_block_node.add_sound_to_video_node import add_sound_to_video_node_instance
from editor.node.audio_based_block_node.music_generator_with_lyrics_node import music_generator_with_lyrics_node_instance
from editor.node.audio_based_block_node.music_generator_with_instrumental_node import music_generator_with_instrumental_node_instance
from editor.node.image_based_block_node.image_upscalar_node import image_upscalar_node_instance
from editor.node.video_based_block_node.video_upscalar_node import video_upscalar_node_instance
from editor.node.video_based_block_node.lip_sysnc_video_node import lip_sync_video_node_instance

def get_node(node_template_code: int) -> BaseNode:
    # 文本类节点 文本to文本节点
    if node_template_code == 2001:
        return text_to_text_node_instance
    # 文本类节点 文本分割节点
    elif node_template_code == 2002:
        return text_splitter_node_instance
    # 文本类节点 文本to图片节点
    elif node_template_code == 3001:
        return text_to_image_node_instance
    # 图片类节点 图片to图片节点
    elif node_template_code == 3002:
        return image_to_image_node_instance
    # 图片类节点 风格化图片生成节点
    elif node_template_code == 3003:
        return style_image_gen_node_instance
    # 图片类节点 图片描述节点
    elif node_template_code == 3004:
        return image_describer_node_instance
    # 图片类节点 图片upscalar节点
    elif node_template_code == 3005:
        return image_upscalar_node_instance 
    # 视频类节点 文本to视频节点
    elif node_template_code == 4001:
        return text_to_video_node_instance
    # 视频类节点 图片to视频节点
    elif node_template_code == 4002:
        return image_to_video_node_instance
    # 视频类节点 视频添加音效节点
    elif node_template_code == 4003:
        return add_sound_to_video_node_instance
    # 视频类节点 视频唇同步节点
    elif node_template_code == 4004:
        return lip_sync_video_node_instance
    # 视频类节点 视频upscalar节点
    elif node_template_code == 4005:
        return video_upscalar_node_instance
    # 音频类节点 文本to音频节点
    elif node_template_code == 5001:
        return text_to_audio_node_instance
    # 音频类节点 歌词with音乐生成节点
    elif node_template_code == 5002:
        return music_generator_with_lyrics_node_instance
    # 音频类节点 乐器with音乐生成节点
    elif node_template_code == 5003:
        return music_generator_with_instrumental_node_instance
    else:
        raise ValueError(f"Node {node_template_code} not found")