# 字体文件使用说明

## 文件结构

将字体文件按以下结构组织：

```
public/fonts/
  ├── Arial/
  │   ├── Arial.ttf
  │   └── Arial-Bold.ttf
  ├── NotoSans/
  │   ├── NotoSans-Light.ttf
  │   ├── NotoSans-Regular.ttf
  │   └── NotoSans-Bold.ttf
  └── README.md (本文件)
```

## 配置文件

字体配置文件位于: `src/mock/fontConfig.json`

### 配置示例

```json
{
  "fonts": [
    {
      "family": "Noto Sans",
      "displayName": "Noto Sans",
      "type": "static",
      "variants": [
        {
          "weight": "300",
          "style": "normal",
          "file": "NotoSans/NotoSans-Light.ttf"
        },
        {
          "weight": "400",
          "style": "normal",
          "file": "NotoSans/NotoSans-Regular.ttf"
        },
        {
          "weight": "700",
          "style": "normal",
          "file": "NotoSans/NotoSans-Bold.ttf"
        }
      ]
    }
  ]
}
```

### 参数说明

- `family`: CSS font-family 名称
- `displayName`: 在界面显示的名称（可以是中文）
- `type`: "static" 或 "variable"
- `variants`: 字重列表
  - `weight`: 字重值 (100-900 或 "100-900" for variable fonts)
  - `style`: "normal" 或 "italic"
  - `file`: 字体文件路径（相对于 /fonts/）
- `preview`: 可选，预览文本

## 字重对照

| 值  | 名称    | 常见后缀          |
| --- | ------- | ----------------- |
| 100 | Thin    | -Thin             |
| 300 | Light   | -Light            |
| 400 | Regular | -Regular 或无后缀 |
| 500 | Medium  | -Medium           |
| 700 | Bold    | -Bold             |
| 900 | Black   | -Black            |

## 免费字体资源

- Google Fonts: https://fonts.google.com/
- 思源黑体: https://github.com/adobe-fonts/source-han-sans
- 思源宋体: https://github.com/adobe-fonts/source-han-serif
