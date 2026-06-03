# BrandHue AI 視覺設計分析平台

Next.js 版本原型，核心功能：

1. 上傳圖片，使用 AI 分析 10 項美的原理：統一、反覆、漸層、對稱、平衡、對比、調和、比例、律動、單純。
2. 上傳街景，選擇城市風、科技風等方向，產生街景美學改造建議。

## 本地測試

建立 `.env.local`：

```env
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
BRANDHUE_API_TOKEN=你的 PHP API token
BRANDHUE_UPLOAD_IMAGE_URL=https://www.highlight.url.tw/brandhue/upload_visual_image.php
BRANDHUE_SAVE_VISUAL_URL=https://www.highlight.url.tw/brandhue/save_visual.php
```

啟動：

```powershell
npm run dev
```

打開：

```text
http://127.0.0.1:3000
```

## Cloudflare 部署

此專案使用 Cloudflare Workers + OpenNext adapter。

常用指令：

```powershell
npm run preview
npm run deploy
```

正式環境請在 Cloudflare Workers 的變數/Secrets 設定：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_IMAGE_MODEL`
- `BRANDHUE_API_TOKEN`
- `BRANDHUE_UPLOAD_IMAGE_URL`
- `BRANDHUE_SAVE_VISUAL_URL`

不要把 OpenAI API Key 寫在前端檔案或 Git 裡。
