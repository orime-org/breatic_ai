from app.locales.node_template.voice.minmax_voice import minmax_voice_records
from app.locales.node_template.voice.kling_voice import kling_voice_records
from app.locales.node_template.voice.elevenlabs_voice import elevenlabs_voice_records

records = { "version":"1.0",
            "data":
            [ 
                    {
                        "template_name": "Text",
                        "template_code": 1001,
                        "template_icon": "text",
                        "content": {
                            "tips":{
                                "content": "Loads or creates text content", 
                                "items": [
                                    "Input: One optional file input (.txt, .md) or manual text entry.",
                                    "Output: One text output containing plain text."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": "",
                    },
                    {
                        "template_name": "Image",
                        "template_icon": "image",
                        "template_code": 1002,
                        "content": {
                            "tips":{
                                "content": "Loads or generates an image", 
                                "items": [
                                    "Input: One optional file input (.png, .jpg) or image URL.",
                                    "Output: One image output containing the image data."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": "",

                    },
                    {
                        "template_name": "Video",
                        "template_icon": "video",
                        "template_code": 1003,
                        "content": {
                            "tips":{
                                "content": "Loads or generates a video clip", 
                                "items": [
                                    "Input: One optional file input (.png, .jpg) or image URL.",
                                    "Output: One image output containing the image data."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": "",

                    },
                    {
                        "template_name": "Audio",
                        "template_icon": "audio",
                        "template_code": 1004,
                        "content": {
                            "tips":{
                                "content": "Loads or generates audio content", 
                                "items": [
                                    "Input: One optional file input (.mp3, .wav) or audio URL.",
                                    "Output: One audio output containing the audio data."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Text-to-Text",
                        "template_icon": "batch_text_to_text",
                        "template_code": 2001,
                        "content": {                  
                            "models": [
                                {                                  
                                    "label": "DeepSeek V3.1",
                                    "value": "deepseek/deepseek-chat-v3.1",
                                    "icon_name": "deepseek_v3_1",
                                    "genrate_time": 10,
                                    "credits": 2,
                                    "description": "",
                                },
                                {                                  
                                    "label": "Claude Sonnet 4.5",
                                    "value": "anthropic/claude-sonnet-4.5",
                                    "icon_name": "claude_sonnet_4_5",
                                    "genrate_time": 10,
                                    "credits": 15,
                                    "description": "",
                                },
                                {                                  
                                    "label": "Gemini 2.5 Flash",
                                    "value": "google/gemini-2.5-flash",
                                    "icon_name": "gemini_2_5_flash",
                                    "genrate_time": 10,
                                    "credits": 2,
                                    "description": "",
                                }
                            ],
                            "tips":{
                                "content": "Processes multiple text inputs in batch", 
                                "items": [
                                    "Input: One list input containing multiple text items.",
                                    "Output: One list output containing the transformed texts."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Split Texts",
                        "template_icon": "split_texts",
                        "template_code": 2002,
                        "content": {
                            "models": [
                                {                                  
                                    "label": "DeepSeek V3.1",
                                    "value": "deepseek/deepseek-chat-v3.1",
                                    "icon_name": "deepseek_v3_1",
                                    "genrate_time": 10,
                                    "credits": 1,
                                    "description": "",
                                },
                                {                                  
                                    "label": "Claude Sonnet 4.5",
                                    "value": "anthropic/claude-sonnet-4.5",
                                    "icon_name": "claude_sonnet_4_5",
                                    "genrate_time": 10,
                                    "credits": 15,
                                    "description": "",
                                },
                                {                                  
                                    "label": "Gemini 2.5 Flash",
                                    "value": "google/gemini-2.5-flash",
                                    "icon_name": "gemini_2_5_flash",
                                    "genrate_time": 10,
                                    "credits": 2,
                                    "description": "",
                                }
                            ],
                            "tips":{
                                "content": "Splits a long text into smaller chunks", 
                                "items": [
                                    "Input: One text input containing the source text.",
                                    "Output: One list output containing the split text segments."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Text-to-Image",
                        "template_code": 3001,
                        "template_icon": "batch_text_to_image",
                        "content": {
                            "models": [
                                {                                  
                                    "label": "Nano Banana",
                                    "value": "wavespeed-text-to-image-nano-banana",
                                    "icon_name": "nano_banana",
                                    "genrate_time": 4,
                                    "credits": 3,
                                    "description": "Goole's new state-of-the-art model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1:1",
                                        },
                                        {
                                            "label": "2:3",
                                            "value": "2:3",
                                        },
                                        {
                                            "label": "3:2",
                                            "value": "3:2",
                                        },
                                        {
                                            "label": "3:4",
                                            "value": "3:4",
                                        },
                                        {
                                            "label": "4:3",
                                            "value": "4:3",
                                        },
                                        {
                                            "label": "4:5",
                                            "value": "4:5",
                                        },
                                        {
                                            "label": "5:4",
                                            "value": "5:4",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "9:16",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "16:9",
                                        },
                                        {
                                            "label": "21:9",
                                            "value": "21:9",
                                        }
                                    ]
  
                                },
                                {                                  
                                    "label": "Nano Banana Pro",
                                    "value": "wavespeed-text-to-image-nano-banana-pro",
                                    "icon_name": "nano_banana_pro",
                                    "genrate_time": 4,
                                    "credits": 14,
                                    "description": "Goole's new state-of-the-art model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1(1k)",
                                            "value": "1:1_1k",
                                        },
                                        {   
                                            "label": "1:1(2k)",
                                            "value": "1:1_2k",
                                        },
                                        {   
                                            "label": "1:1(4k)",
                                            "value": "1:1_4k",
                                        },
                                        {   
                                            "label": "2:3(1k)",
                                            "value": "2:3_1k",
                                        },
                                        {   
                                            "label": "2:3(2k)",
                                            "value": "2:3_2k",
                                        },
                                        {   
                                            "label": "2:3(4k)",
                                            "value": "2:3_4k",
                                        },
                                        {   
                                            "label": "3:2(1k)",
                                            "value": "3:2_1k",
                                        },
                                        {   
                                            "label": "3:2(2k)",
                                            "value": "3:2_2k",
                                        },
                                        {   
                                            "label": "3:2(4k)",
                                            "value": "3:2_4k",
                                        },

                                        {   
                                            "label": "3:4(1k)",
                                            "value": "3:4_1k",
                                        },
                                        {   
                                            "label": "3:4(2k)",
                                            "value": "3:4_2k",
                                        },
                                        {   
                                            "label": "3:4(4k)",
                                            "value": "3:4_4k",
                                        },
                                        {   
                                            "label": "4:3(1k)",
                                            "value": "4:3_1k",
                                        },
                                        {   
                                            "label": "4:3(2k)",
                                            "value": "4:3_2k",
                                        },
                                        {   
                                            "label": "4:3(4k)",
                                            "value": "4:3_4k",
                                        },
                                        {   
                                            "label": "4:5(1k)",
                                            "value": "4:5_1k",
                                        },
                                        {   
                                            "label": "4:5(2k)",
                                            "value": "4:5_2k",
                                        },
                                        {   
                                            "label": "4:5(4k)",
                                            "value": "4:5_4k",
                                        },
                                        {   
                                            "label": "5:4(1k)",
                                            "value": "5:4_1k",
                                        }, 
                                        {   
                                            "label": "5:4(2k)",
                                            "value": "5:4_2k",
                                        }, 
                                        {   
                                            "label": "5:4(4k)",
                                            "value": "5:4_4k",
                                        }, 
                                        {   
                                            "label": "9:16(1k)",
                                            "value": "9:16_1k",
                                        },
                                        {   
                                            "label": "9:16(2k)",
                                            "value": "9:16_2k",
                                        },
                                        {   
                                            "label": "9:16(4k)",
                                            "value": "9:16_4k",
                                        },
                                        {   
                                            "label": "16:9(1k)",
                                            "value": "16:9_1k",
                                        },
                                        {   
                                            "label": "16:9(2k)",
                                            "value": "16:9_2k",
                                        },
                                        {   
                                            "label": "16:9(4k)",
                                            "value": "16:9_4k",
                                        },
                                        {   
                                            "label": "21:9(1k)",
                                            "value": "21:9_1k",
                                        },
                                        {   
                                            "label": "21:9(2k)",
                                            "value": "21:9_2k",
                                        }, 
                                        {   
                                            "label": "21:9(4k)",
                                            "value": "21:9_4k",
                                        },
                                    ]
                                },
                                {
                                    "label": "GPT Image 1",
                                    "value": "wavespeed-text-to-image-gpt-image-1",
                                    "icon_name": "gpt_image_1",
                                    "genrate_time": 4,
                                    "credits": 4,
                                    "description": "OpenAI’s advanced image model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1024*1024",
                                        },
                                        {
                                            "label": "2:3",
                                            "value": "1024*1536",
                                        },
                                        {
                                            "label": "3:2",
                                            "value": "1536*1024",
                                        }
                                    ]
                                },
                                {
                                    "label": "Seedream 4",
                                    "value": "wavespeed-text-to-image-bytedance-seedream-v4",
                                    "icon_name": "seedream_4",
                                    "genrate_time": 4,
                                    "credits": 3,                                   
                                    "description": "Stylized diffusion model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "2048*2048",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "1440*2560",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "2560*1440",
                                        },

                                    ]
                                },
                                {
                                    "label": "Ideogram 3.0",
                                    "value": "wavespeed-ideogram-v3-quality",
                                    "icon_name": "ideogram_3_0",
                                    "genrate_time": 4,
                                    "credits": 9,                                   
                                    "description": "Typography-focused generative model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1:1",
                                        },
                                        {
                                            "label": "3:4",
                                            "value": "3:4",
                                        },
                                        {
                                            "label": "4:3",
                                            "value": "4:3",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "9:16",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "16:9",
                                        },

                                      
                                    ]
                                },
                                {
                                    "label": "Seedream 4.5",
                                    "value": "wavespeed-text-to-image-bytedance-seedream-v4-5",
                                    "icon_name": "seedream_4_5",
                                    "genrate_time": 4,
                                    "credits": 4,                                   
                                    "description": "Next-gen model optimized for typography",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "2048*2048",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "1440*2560",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "2560*1440",
                                        },
                                    ]
                                },
                            ],
                            "tips":{
                                "content": "Generate images from text prompts", 
                                "items": [
                                    "Input: One list input containing text prompts.",
                                    "Output: One list output containing the generated images."
                                ]
                            },
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Image-to-Image",
                        "template_code": 3002,
                        "template_icon": "batch_image_to_image",
                        "content": {
                           "models": [
                                {                                  
                                    "label": "Nano Banana",
                                    "value": "wavespeed-image-to-image-nano-banana",
                                    "icon_name": "nano_banana",
                                    "genrate_time": 4,
                                    "credits": 3,
                                    "description": "Goole's new state-of-the-art model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1:1",
                                        },
                                        {   
                                            "label": "2:3",
                                            "value": "2:3",
                                        },
                                        {   
                                            "label": "3:2",
                                            "value": "3:2",
                                        },
                                        {   
                                            "label": "3:4",
                                            "value": "3:4",
                                        },
                                        {   
                                            "label": "4:3",
                                            "value": "4:3",
                                        },
                                        {   
                                            "label": "4:5",
                                            "value": "4:5",
                                        },
                                        {   
                                            "label": "5:4",
                                            "value": "5:4",
                                        }, 
                                        {   
                                            "label": "9:16",
                                            "value": "9:16",
                                        },
                                        {   
                                            "label": "16:9",
                                            "value": "16:9",
                                        },
                                        {   
                                            "label": "21:9",
                                            "value": "21:9",
                                        },
                                    ]
                                }, 
                                {                                  
                                    "label": "Nano Banana Pro",
                                    "value": "wavespeed-image-to-image-nano-banana-pro",
                                    "icon_name": "nano_banana_pro",
                                    "genrate_time": 4,
                                    "credits": 14,
                                    "description": "Goole's new state-of-the-art model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1(1k)",
                                            "value": "1:1_1k",
                                        },
                                        {   
                                            "label": "1:1(2k)",
                                            "value": "1:1_2k",
                                        },
                                        {   
                                            "label": "1:1(4k)",
                                            "value": "1:1_4k",
                                        },
                                        {   
                                            "label": "2:3(1k)",
                                            "value": "2:3_1k",
                                        },
                                        {   
                                            "label": "2:3(2k)",
                                            "value": "2:3_2k",
                                        },
                                        {   
                                            "label": "2:3(4k)",
                                            "value": "2:3_4k",
                                        },
                                        {   
                                            "label": "3:2(1k)",
                                            "value": "3:2_1k",
                                        },
                                        {   
                                            "label": "3:2(2k)",
                                            "value": "3:2_2k",
                                        },
                                        {   
                                            "label": "3:2(4k)",
                                            "value": "3:2_4k",
                                        },
                                        {   
                                            "label": "3:4(1k)",
                                            "value": "3:4_1k",
                                        },
                                        {   
                                            "label": "3:4(2k)",
                                            "value": "3:4_2k",
                                        },
                                        {   
                                            "label": "3:4(4k)",
                                            "value": "3:4_4k",
                                        },
                                        {   
                                            "label": "4:3(1k)",
                                            "value": "4:3_1k",
                                        },
                                        {   
                                            "label": "4:3(2k)",
                                            "value": "4:3_2k",
                                        },
                                        {   
                                            "label": "4:3(4k)",
                                            "value": "4:3_4k",
                                        },
                                        {   
                                            "label": "4:5(1k)",
                                            "value": "4:5_1k",
                                        },
                                        {   
                                            "label": "4:5(2k)",
                                            "value": "4:5_2k",
                                        },
                                        {   
                                            "label": "4:5(4k)",
                                            "value": "4:5_4k",
                                        },
                                        {   
                                            "label": "5:4(1k)",
                                            "value": "5:4_1k",
                                        }, 
                                        {   
                                            "label": "5:4(2k)",
                                            "value": "5:4_2k",
                                        }, 
                                        {   
                                            "label": "5:4(4k)",
                                            "value": "5:4_4k",
                                        }, 
                                        {   
                                            "label": "9:16(1k)",
                                            "value": "9:16_1k",
                                        },
                                        {   
                                            "label": "9:16(2k)",
                                            "value": "9:16_2k",
                                        },
                                        {   
                                            "label": "9:16(4k)",
                                            "value": "9:16_4k",
                                        },
                                        {   
                                            "label": "16:9(1k)",
                                            "value": "16:9_1k",
                                        },
                                        {   
                                            "label": "16:9(2k)",
                                            "value": "16:9_2k",
                                        },
                                        {   
                                            "label": "16:9(4k)",
                                            "value": "16:9_4k",
                                        },
                                        {   
                                            "label": "21:9(1k)",
                                            "value": "21:9_1k",
                                        },
                                        {   
                                            "label": "21:9(2k)",
                                            "value": "21:9_2k",
                                        }, 
                                        {   
                                            "label": "21:9(4k)",
                                            "value": "21:9_4k",
                                        },
                                    ]
                                },
                                {
                                    "label": "GPT Image 1",
                                    "value": "wavespeed-image-to-image-gpt-image-1",
                                    "icon_name": "gpt_image_1",
                                    "genrate_time": 4,
                                    "credits": 4,
                                    "description": "OpenAI’s advanced image model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "auto",
                                            "value": "auto",
                                        },
                                        {   
                                            "label": "1:1",
                                            "value": "1024*1024",
                                        },
                                        {
                                            "label": "2:3",
                                            "value": "1024*1536",
                                        },
                                        {
                                            "label": "3:2",
                                            "value": "1536*1024",
                                        }
                                    ]
                                },
                                {
                                    "label": "Flux Kontext Pro",
                                    "value": "wavespeed-image-to-image-flux-kontext-pro",
                                    "icon_name": "flux_kontext_pro",
                                    "genrate_time": 4,
                                    "credits": 4,
                                    "description": "Context-driven generative engine",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1:1",
                                        },
                                        {   
                                            "label": "2:3",
                                            "value": "2:3",
                                        },
                                        {   
                                            "label": "3:2",
                                            "value": "3:2",
                                        },
                                        {   
                                            "label": "3:4",
                                            "value": "3:4",
                                        },
                                        {   
                                            "label": "4:3",
                                            "value": "4:3",
                                        },
                                        {   
                                            "label": "9:16",
                                            "value": "9:16",
                                        },
                                        {   
                                            "label": "16:9",
                                            "value": "16:9",
                                        },
                                        {   
                                            "label": "9:21",
                                            "value": "9:21",
                                        },
                                        {   
                                            "label": "21:9",
                                            "value": "21:9",
                                        },

                                    ]
                                },
                                {
                                    "label": "Seedream 4",
                                    "value": "wavespeed-image-to-image-bytedance-seedream-v4",
                                    "icon_name": "seedream_4",
                                    "genrate_time": 4,
                                    "credits": 2,
                                    "description": "High-precision image editor",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "2048*2048",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "1440*2560",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "2560*1440",
                                        },

                                    ]
                                }, {
                                    "label": "Qwen Image Edit",
                                    "value": "wavespeed-image-to-image-qwen-image",
                                    "icon_name": "qwen_image_edit",
                                    "genrate_time": 4,
                                    "credits": 2,
                                    "description": "Advanced image editing model",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1024*1024",
                                        },
                                        {
                                            "label": "2:3",
                                            "value": "1024*1536",
                                        },
                                        {
                                            "label": "3:2",
                                            "value": "1536*1024",
                                        },

                                    ]
                                },{
                                    "label": "Seedream 4.5",
                                    "value": "wavespeed-image-to-image-bytedance-seedream-v4-5",
                                    "icon_name": "seedream_4_5",
                                    "genrate_time": 4,
                                    "credits": 4,
                                    "description": "Next-gen model optimized for typography",
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "2048*2048",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "1440*2560",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "2560*1440",
                                        },

                                    ]
                                },
                            ],
                            "tips":{
                                "content": "Transform images based on text input", 
                                "items": [
                                    "Input: Multiple image inputs and one text input.",
                                    "Output: One list output containing the generated images."
                                ]
                            },
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Style image gen",
                        "template_code": 3003,
                        "template_icon": "style_image_gen",
                        "content": {
                            "models": [
                                {                                  
                                    "label": "doubao-seedream-4-0-250828",
                                    "value": "doubao-seedream-4-0-250828",
                                    "icon_name": "doubao_seedream_4_0_250828",
                                    "genrate_time": 10,
                                    "credits": 10,
                                    "description": "professional mode, motion dynamics",
                                },
                                {
                                    "value": "doubao-seedream-4-0-250828",
                                    "icon_name": "doubao_seedream_4_0_250828",
                                    "genrate_time": 10,
                                    "credits": 10,
                                    "label": "doubao-seedream-4-0-250828:test",
                                    "description": "professional mode, motion dynamics",
                                }
                            ],
                            "tips":{
                                "content": "Tips", 
                                "items": [
                                    "根据文本的内容重新生成图片.",
                                    "可以批量生成图片"
                                ]
                            },
                            "image_styles": [

                            ]
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Image describer",
                        "template_code": 3004,
                        "template_icon": "image_describer",
                        "content": {
                          
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Image Upscriber (Pro)",
                        "template_code": 3005,
                        "template_icon": "image_upscriber_pro",
                        "content": {
                          
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Background Edit  (Pro)",
                        "template_code": 3006,
                        "template_icon": "background_edit_pro",
                        "content": {
                          
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Text-to-Video",
                        "template_code": 4001,
                        "template_icon": "batch_text_to_video",
                        "content": {
                            "models": [
                                {                                  
                                    "label": "Sora 2 Pro",
                                    "value": "wavespeed-text-to-video-sora-2-pro",
                                    "icon_name": "sora_2_pro",
                                    "genrate_time": 120,
                                    "credits": 120,
                                    "description": "Next-gen video generation model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                        {
                                            "label": "12s",
                                            "value": 12,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {
                                            "label": "9:16(720p)",
                                            "value": "720*1280",
                                        },
                                        {
                                            "label": "16:9(720p)",
                                            "value": "1280*720",
                                        },
                                        {
                                            "label": "9:16(1080p)",
                                            "value": "1024*1792",
                                        },
                                        {
                                            "label": "16:9(1080p)",
                                            "value": "1792*1024",
                                        },
                                    ]
                                },
                                {                                  
                                    "label": "Sora 2",
                                    "value": "wavespeed-text-to-video-sora-2",
                                    "icon_name": "sora_2",
                                    "genrate_time": 120,
                                    "credits": 40,
                                    "description": "Generative video foundation model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                        {
                                            "label": "12s",
                                            "value": 12,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {
                                            "label": "9:16(720p)",
                                            "value": "720*1280",
                                        },
                                        {
                                            "label": "16:9(720p)",
                                            "value": "1280*720",
                                        },
                                    ]
                                },
                                {                                  
                                    "label": "Veo 3.1",
                                    "value": "wavespeed-text-to-video-veo-3.1",
                                    "icon_name": "veo_3_1",
                                    "genrate_time": 120,
                                    "credits": 320,
                                    "description": "High-fidelity video model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "6s",
                                            "value": 6,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {
                                            "label": "9:16(720p)",
                                            "value": "9:16_720p",
                                        },
                                        {
                                            "label": "16:9(720p)",
                                            "value": "16:9_720p",
                                        },
                                        {
                                            "label": "9:16(1080p)",
                                            "value": "9:16_1080p",
                                        },
                                        {
                                            "label": "16:9(1080p)",
                                            "value": "16:9_1080p",
                                        },
                                    ]
                                }, {                                  
                                    "label": "Veo 3.1 Fast",
                                    "value": "wavespeed-text-to-video-veo-3-1-fast",
                                    "icon_name": "veo_3_1_fast",
                                    "genrate_time": 120,
                                    "credits": 120,
                                    "description": "Fast video generation model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "6s",
                                            "value": 6,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {
                                            "label": "9:16(720p)",
                                            "value": "9:16_720p",
                                        },
                                        {
                                            "label": "16:9(720p)",
                                            "value": "16:9_720p",
                                        },
                                        {
                                            "label": "9:16(1080p)",
                                            "value": "9:16_1080p",
                                        },
                                        {
                                            "label": "16:9(1080p)",
                                            "value": "16:9_1080p",
                                        },
                                    ]
                                }, {                                  
                                    "label": "Wan 2.5",
                                    "value": "wavespeed-text-to-video-wan-2.5",
                                    "icon_name": "wan_2_5",
                                    "genrate_time": 120,
                                    "credits": 50,
                                    "description": "Fast iterative video model",
                                    "duration": [
                                        {
                                            "label": "5s",
                                            "value": 5,
                                        },
                                        {
                                            "label": "10s",
                                            "value": 10,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {
                                            "label": "9:16(480p)",
                                            "value": "480*832",
                                        },
                                        {
                                            "label": "16:9(480p)",
                                            "value": "832*480",
                                        },
                                        {
                                            "label": "9:16(720p)",
                                            "value": "720*1280",
                                        },   
                                        {
                                            "label": "16:9(720p)",
                                            "value": "1280*720",
                                        },
                                        {
                                            "label": "9:16(1080p)",
                                            "value": "1080*1920",
                                        },
                                        {
                                            "label": "16:9(1080p)",
                                            "value": "1920*1080",
                                        },                                        
                                    ]
                                },{
                                    "label": "Kling Video O1",
                                    "value": "wavespeed-text-to-video-kling-video-o1",
                                    "icon_name": "kling_video_o1",
                                    "genrate_time": 120,
                                    "credits": 56,
                                    "description": "Video model with advanced MVL",
                                    "duration": [
                                        {
                                            "label": "5s",
                                            "value": 5,
                                        },
                                        {
                                            "label": "10s",
                                            "value": 10,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1:1",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "9:16",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "16:9",
                                        },
                                    ]
                                },
                            ],
                            "tips":{
                                "content": "Generate videos from text prompts", 
                                "items": [
                                    "Input: One list input containing text prompts.",
                                    "Output: One list output containing the generated videos."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Image-to-Video",
                        "template_code": 4002,
                        "template_icon": "batch_image_to_video",
                        "content": {
                            "models": [
                                {
                                    "label": "Sora 2 Pro",
                                    "value": "wavespeed-image-to-video-sora-2-pro",
                                    "icon_name": "sora_2_pro",
                                    "genrate_time": 120,
                                    "credits": 120,
                                    "description": "Next-gen video generation model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                        {
                                            "label": "12s",
                                            "value": 12,
                                        },
                                    ],
                                    "resolution": [
                                        {
                                            "label": "720p",
                                            "value": "720p",
                                        },
                                        {
                                            "label": "1080p",
                                            "value": "1080p",
                                        },
                                    ]
                                },
                                {
                                    "label": "Sora 2",
                                    "value": "wavespeed-image-to-video-sora-2",
                                    "icon_name": "sora_2",
                                    "genrate_time": 120,
                                    "credits": 40,
                                    "description": "Generative video foundation model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                        {
                                            "label": "12s",
                                            "value": 12,
                                        },
                                    ],
                                },
                                {
                                    "label": "Veo 3.1",
                                    "value": "wavespeed-image-to-video-veo-3-1",
                                    "icon_name": "veo_3_1",
                                    "genrate_time": 120,
                                    "credits": 320,
                                    "description": "High-fidelity video model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "6s",
                                            "value": 6,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {
                                            "label": "9:16(720p)",
                                            "value": "9:16_720p",
                                        },
                                        {
                                            "label": "16:9(720p)",
                                            "value": "16:9_720p",
                                        },
                                        {
                                            "label": "9:16(1080p)",
                                            "value": "9:16_1080p",
                                        },
                                        {
                                            "label": "16:9(1080p)",
                                            "value": "16:9_1080p",
                                        },

                                    ]
                                },{
                                    "label": "Veo 3.1 Fast",
                                    "value": "wavespeed-image-to-video-veo-3-1-fast",
                                    "icon_name": "veo_3_1_fast",
                                    "genrate_time": 120,
                                    "credits": 120,
                                    "description": "Fast video generation model",
                                    "duration": [
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "6s",
                                            "value": 6,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {
                                            "label": "9:16(720p)",
                                            "value": "9:16_720p",
                                        },
                                        {
                                            "label": "16:9(720p)",
                                            "value": "16:9_720p",
                                        },
                                        {
                                            "label": "9:16(1080p)",
                                            "value": "9:16_1080p",
                                        },
                                        {
                                            "label": "16:9(1080p)",
                                            "value": "16:9_1080p",
                                        },

                                    ] 
                                },{
                                    "label": "Wan 2.5",
                                    "value": "wavespeed-image-to-video-wan-2.5",
                                    "icon_name": "wan_2_5",
                                    "genrate_time": 120,
                                    "credits": 50,
                                    "description": "Fast iterative video model",
                                    "duration": [
                                        {
                                            "label": "3s",
                                            "value": 3,
                                        },
                                        {
                                            "label": "4s",
                                            "value": 4,
                                        },
                                        {
                                            "label": "5s",
                                            "value": 5,
                                        },
                                        {
                                            "label": "6s",
                                            "value": 6,
                                        },
                                        {
                                            "label": "7s",
                                            "value": 7,
                                        },
                                        {
                                            "label": "8s",
                                            "value": 8,
                                        },          
                                        {
                                            "label": "9s",
                                            "value": 9,
                                        },
                                        {
                                            "label": "10s",
                                            "value": 10,
                                        },
                                    ],
                                    "resolution": [
                                        {
                                            "label": "480p",
                                            "value": "480p",
                                        },
                                        {
                                            "label": "720p",
                                            "value": "720p",
                                        },
                                        {
                                            "label": "1080p",
                                            "value": "1080p",
                                        },
                                    ] 
                                },{
                                    "label": "Dreamina 3.0 pro",
                                    "value": "wavespeed-image-to-video-dreamina-3-pro",
                                    "icon_name": "dreamina_3_pro",
                                    "genrate_time": 120,
                                    "credits": 60,
                                    "description": "High-fidelity creative model",
                                    "aspect_ratio": [
                                        {
                                            "label": "1:1",
                                            "value": "1:1",
                                        },
                                        {
                                            "label": "3:4",
                                            "value": "3:4",
                                        },
                                        {
                                            "label": "4:3",
                                            "value": "4:3",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "9:16",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "16:9",
                                        },
                                        {
                                            "label": "9:21",
                                            "value": "9:21",
                                        },
                                        {
                                            "label": "21:9",
                                            "value": "21:9",
                                        },

                                    ]
                                },{
                                    "label": "Kling 2.5 Pro",
                                    "value": "wavespeed-image-to-video-kling-2.5-turbo-pro",
                                    "icon_name": "kling_2_5_pro",
                                    "genrate_time": 120,
                                    "credits": 35,
                                    "description": "Creative multi-scene video model",
                                    "duration":[
                                        {
                                            "label": "5s",
                                            "value": 5,
                                        }, 
                                        {
                                            "label": "10s",
                                            "value": 10,
                                        },
                                    ]
                                },{
                                    "label": "Kling Video O1",
                                    "value": "wavespeed-image-to-video-kling-video-o1",
                                    "icon_name": "kling_video_o1",
                                    "genrate_time": 120,
                                    "credits": 56,
                                    "description": "Video model with advanced MVL",
                                    "duration": [
                                        {
                                            "label": "5s",
                                            "value": 5,
                                        },
                                        {
                                            "label": "10s",
                                            "value": 10,
                                        },
                                    ],
                                    "aspect_ratio": [
                                        {   
                                            "label": "1:1",
                                            "value": "1:1",
                                        },
                                        {
                                            "label": "9:16",
                                            "value": "9:16",
                                        },
                                        {
                                            "label": "16:9",
                                            "value": "16:9",
                                        },
                                    ]
                                },

                            ],
                            "tips":{
                                "content": "Create videos from images and text", 
                                "items": [
                                    "Input: Multiple image inputs and one text input.",
                                    "Output: One list output containing the generated videos."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Add Ambient to Videos",
                        "template_code": 4003,
                        "template_icon": "batch_add_ambient_to_videos",
                        "content": {
                            "models": [
                                {                                  
                                    "label": "Kling",
                                    "value": "wavespeed-kling-effect-1.0",
                                    "icon_name": "kling",
                                    "genrate_time": 60,
                                    "credits": 3,
                                    "description": "Video-to-audio environment AI",
  
                                },
                            ],
                            "tips":{
                                "content": "Add ambient sound to videos", 
                                "items": [
                                    "Input: Multiple video inputs and one text input describing the ambient sound.",
                                    "Output: One list output containing the videos with added ambient audio."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Audio Lip Sync to Videos",
                        "template_code": 4004,
                        "template_icon": "batch_audio_lip_sync_to_videos",
                        "content": {
                            "fill_model": [
                                {   
                                    "label": "cut-off",
                                    "value": "cut_off",
                                },
                                {
                                    "label": "loop",
                                    "value": "loop",
                                },
                                {
                                    "label": "bounce",
                                    "value": "bounce",
                                },
                            ],
                            "models": [
                                {                         
                                    "label": "Sync Lipsync 2.0",
                                    "value": "wavespeed-lip-sync-2.0",
                                    "icon_name": "sync_lipsync_2_0",
                                    "genrate_time": 30,
                                    "credits": 27,
                                    "description": "Fast, high-quality lip-sync model",
                                },
                            ],
                            "tips":{
                                "content": "Sync audio to videos", 
                                "items": [
                                    "Input: Multiple video inputs and one audio input.",
                                    "Output: One list output containing the lip-synced videos."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Video Upscaler (Pro)",
                        "template_code": 4005,
                        "template_icon": "video_upscaler_pro",
                        "content": {
                       
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Text-to-Speech",
                        "template_code": 5001,
                        "template_icon": "batch_text_to_speech",
                        "content": {

                            "models": [
                                {
                                    "label": "Minimax Speech 02 hd",
                                    "value": "wavespeed-tts-minimax-speech-2-hd",
                                    "icon_name": "minimax_speech_2_hd",
                                    "genrate_time": 10,
                                    "credits": 1,
                                    "description": "High-definition Speech model",
                                    "voice" : minmax_voice_records
                                },
                                {
                                    "label": "Elevenlabs Turbo 2.5",
                                    "value": "wavespeed-tts-elevenlabs-turbo-2.5",
                                    "icon_name": "elevenlabs_turbo_2_5",
                                    "genrate_time": 10,
                                    "credits": 2,
                                    "description": "High-quality conversation model",
                                    "voice" : elevenlabs_voice_records
                                },
                                {
                                    "label": "Kling v1 TTS",
                                    "value": "wavespeed-tts-kling-v1",
                                    "icon_name": "kling_v1_tts",
                                    "genrate_time": 10,
                                    "credits": 10,
                                    "description": "Hight-expressive model",
                                    "voice" : kling_voice_records 
                                }
                            ],
                            "tips":{
                                "content": "Convert text to speech", 
                                "items": [
                                    "Input: One list input containing text items.",
                                    "Output: One list output containing the generated audio clips."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Generate Music",
                        "template_code": 5002,
                        "template_icon": "batch_generate_music",
                        "content": {
                           "models": [
                                {
                                    "label": "Minimax Music 02",
                                    "value": "wavespeed-minimax-music-2",
                                    "icon_name": "minimax_music_2",
                                    "genrate_time": 10,
                                    "credits": 3,
                                    "description": "Cinematic,professional-quality"
                                }
                            ],
                            "tips":{
                                "content": "Generate music from prompts", 
                                "items": [
                                    "Input: One list input containing text or music prompts.",
                                    "Output: One list output containing the generated music tracks."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Batch Generate Melody",
                        "template_code": 5003,
                        "template_icon": "batch_generate_melody",
                        "content": {
                           "models": [
                                {
                                    "label": "Kling Sound",
                                    "value": "wavespeed-audio-kling-text-to-audio",
                                    "icon_name": "kling_sound",
                                    "genrate_time": 10,
                                    "credits": 3,
                                    "description": "Chinese-optimized,culturally nuanced",
                                    "duration":[
                                        {
                                            "label": "3s",
                                            "value": 3,
                                        }, 
                                        {
                                            "label": "6s",
                                            "value": 6,
                                        },
                                        {
                                            "label": "9s",
                                            "value": 9,
                                        },
                                    ]
                                }
                            ],
                            "tips":{
                                "content": "Generate melodies from prompts", 
                                "items": [
                                    "Input: One list input containing text or melody prompts.",
                                    "Output: One list output containing the generated melodies."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    },
                    {
                        "template_name": "Video editor",
                        "template_code": 6001,
                        "template_icon": "video_editor",
                        "content": {
                            "tips":{
                                "content": "Edit video using multi-media inputs", 
                                "items": [
                                    "Input: One or multiple inputs: video, image, audio, or text.",
                                    "Output: One or multiple outputs: video, image, or audio."
                                ]
                            }
                        },
                        "membership_level":1,
                        "remark": ""
                    }
                
        ]
}   