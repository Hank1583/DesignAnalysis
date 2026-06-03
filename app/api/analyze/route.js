import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PRINCIPLES = ["統一", "反覆", "漸層", "對稱", "平衡", "對比", "調和", "比例", "律動", "單純"];

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const textModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "尚未設定 OPENAI_API_KEY" }, { status: 500 });
    }

    const formData = await request.formData();
    const image = formData.get("image");
    const mode = formData.get("mode") || "principles";
    const style = formData.get("style") || "城市風";

    if (!image || typeof image === "string") {
      return NextResponse.json({ ok: false, error: "請上傳圖片檔案" }, { status: 400 });
    }

    if (mode === "street") {
      const generatedImage = await createStreetRedesignImage({ apiKey, imageModel, image, style });
      return NextResponse.json({
        ok: true,
        analysis: {
          summary: "",
          principles: [],
          visualFlow: "",
          focusScore: "",
          rhythmScore: "",
          streetRedesign: getStreetRedesignCopy(style),
          generatedImage,
          markdownReport: buildStreetMarkdown({ style }),
        },
      });
    }

    const dataUrl = await fileToDataUrl(image);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: textModel,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: buildPrinciplesPrompt() },
              { type: "input_image", image_url: dataUrl, detail: "low" },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ ok: false, error: errorText }, { status: response.status });
    }

    const payload = await response.json();
    const outputText = payload.output_text || collectOutputText(payload);
    const analysis = parseJsonOutput(outputText);

    return NextResponse.json({ ok: true, analysis: { ...analysis, generatedImage: "" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "OpenAI API 錯誤" }, { status: 500 });
  }
}

function buildPrinciplesPrompt() {
  return `你是 BrandHue Vision Platform 的 AI 視覺設計分析師。

請根據使用者上傳圖片，只進行「美的原理」分析，不要做街景改造，不要分析觀看動線。

分析主軸必須包含 10 項美的原理：
${PRINCIPLES.join("、")}

分數規則：
- 每一項使用 1-10 分。
- 一般可用作品請落在 6-9 分。
- 只有非常明顯缺失才低於 6 分。
- 不要使用 0-100 分。

請只回傳 JSON，不要使用 Markdown code fence。
JSON schema:
{
  "summary": "整體美學分析總評，繁體中文 80-140 字",
  "principles": [
    ${PRINCIPLES.map((name) => `{ "name": "${name}", "score": 8, "reason": "繁體中文短句" }`).join(",\n    ")}
  ],
  "markdownReport": "完整 Markdown 報告，需包含美感總分與 10 項美的原理，繁體中文"
}`;
}

async function createStreetRedesignImage({ apiKey, imageModel, image, style }) {
  const formData = new FormData();
  formData.append("model", imageModel);
  formData.append("image", image, image.name || "street-scene.png");
  formData.append("size", "1024x1024");
  formData.append("prompt", buildImagePrompt(style));

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const payload = await response.json();
  const base64 = payload.data?.[0]?.b64_json;
  return base64 ? `data:image/png;base64,${base64}` : "";
}

function buildImagePrompt(style) {
  const styleDirections = {
    城市風: "clean modern urban streetscape, organized signage, coherent facade lines, pedestrian-friendly paving, soft daylight, realistic city planning proposal",
    科技風: "futuristic smart city streetscape, subtle LED guidance, smart bus stops, metallic low-glare surfaces, blue-white lighting, realistic but forward-looking",
    綠意生態風: "green ecological streetscape, more street trees, planting beds, permeable pavement, warm human-scale lighting, sustainable city design",
    日系街區風: "Japanese neighborhood street style, restrained signage, warm wood details, soft storefront lighting, clean paving, human-scale atmosphere",
    歐式人文風: "European humanistic boulevard, refined facade details, stone and iron accents, warm street lamps, walkable social street space",
    夜景霓虹風: "tasteful night neon streetscape, controlled sign brightness, cinematic lighting, safer pedestrian edges, vibrant but organized city night scene",
  };

  return `Edit the uploaded street scene directly as the base image. This must feel like an aesthetic redesign of the same photo, not a newly invented street.
Preserve the original composition as much as possible: camera angle, perspective lines, street width, road layout, sidewalk position, main building locations, storefront positions, skyline direction, and overall spatial depth.
Keep recognizable large objects and the original visual structure. Do not change the scene into a different city or a different viewpoint.
Apply this redesign style: ${style}.
Improve only the design layer: facade cleanup, signage organization, lighting design, pedestrian comfort, materials, planting, street furniture, paving, and visual hierarchy.
Style direction: ${styleDirections[style] || styleDirections.城市風}.
Do not add unrealistic fantasy architecture. Do not over-crop. Do not replace the whole composition. The result should look like a plausible before/after urban design proposal based on the original image.`;
}

function getStreetRedesignCopy(style) {
  const copy = {
    城市風: {
      summary: "以城市風重整街景秩序，優先統一招牌尺度、立面線條、行人鋪面與公共家具，讓街道更乾淨、易讀並具備現代城市識別。",
      suggestions: ["整合招牌尺寸與色彩", "建立連續的街道路燈與導視", "整理店面立面線條", "提升行人步行舒適度"],
    },
    科技風: {
      summary: "以科技風建立智慧城市感，保留原街道結構，加入低眩光線性照明、智慧站牌、金屬與玻璃材質，使街景更俐落且具未來感。",
      suggestions: ["加入線性燈帶與智慧導視", "提升夜間辨識度", "使用低反射科技材質", "降低招牌雜訊"],
    },
    綠意生態風: {
      summary: "以綠意生態風改善街道壓迫感，增加行道樹、植栽槽、透水鋪面與自然材質，讓街景更柔和、可停留且具永續意象。",
      suggestions: ["增加行道樹與植栽槽", "導入透水鋪面", "降低硬質立面比例", "補足休憩節點"],
    },
    日系街區風: {
      summary: "以日系街區風降低視覺噪音，控制招牌尺度，加入木質、暖光、小尺度店面與乾淨鋪面，營造細緻、安靜且親切的街道氛圍。",
      suggestions: ["降低招牌尺寸", "加入溫潤木質與暖光", "整理店面入口", "維持低飽和色彩"],
    },
    歐式人文風: {
      summary: "以歐式人文風強化街角與立面細節，導入石材、鐵件、溫暖街燈與步行停留空間，讓街道更具文化感與生活感。",
      suggestions: ["強化窗框與欄杆細節", "加入石材與鐵件元素", "建立街角停留區", "使用溫暖街燈"],
    },
    夜景霓虹風: {
      summary: "以夜景霓虹風提升夜間記憶點，整合招牌亮度與霓虹色彩，保留城市活力但降低光害與資訊混亂，讓夜間街景更有層次。",
      suggestions: ["整合招牌亮度", "建立霓虹重點色", "加強人行道安全照明", "降低光害與視覺混亂"],
    },
  };
  return copy[style] || copy.城市風;
}

function buildStreetMarkdown({ style }) {
  const redesign = getStreetRedesignCopy(style);
  return `# BrandHue 街景美學改造報告

## 改造風格
${style}

## 改造方向
${redesign.summary}

## 建議
${redesign.suggestions.map((item) => `- ${item}`).join("\n")}`;
}

async function fileToDataUrl(file) {
  const buffer = await file.arrayBuffer();
  return `data:${file.type || "image/jpeg"};base64,${Buffer.from(buffer).toString("base64")}`;
}

function collectOutputText(payload) {
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n");
}

function parseJsonOutput(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("OpenAI 回傳不是有效 JSON");
    return JSON.parse(match[0]);
  }
}
