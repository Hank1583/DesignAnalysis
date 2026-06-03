import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request) {
  try {
    const env = getRequestContext().env;
    const uploadUrl = env.BRANDHUE_UPLOAD_IMAGE_URL || "http://www.highlight.url.tw/brandhue/upload_visual_image.php";
    const saveUrl = env.BRANDHUE_SAVE_VISUAL_URL || "http://www.highlight.url.tw/brandhue/save_visual.php";
    const token = env.BRANDHUE_API_TOKEN || "";
    const payload = await request.json();

    const originalImageUrl = payload.preview
      ? await uploadImage({ uploadUrl, token, imageData: payload.preview, fileName: payload.title || "original.png", kind: "original" })
      : "";
    const generatedImageUrl = payload.result?.generatedImage
      ? await uploadImage({ uploadUrl, token, imageData: payload.result.generatedImage, fileName: payload.title || "generated.png", kind: "generated" })
      : "";

    const visualPayload = {
      name: payload.title || "BrandHue Vision Record",
      provider: "openai",
      status: "saved",
      imageUrl: generatedImageUrl || originalImageUrl,
      prompt: payload.mode === "street" ? payload.result?.streetRedesign?.summary || "" : payload.result?.summary || "",
      controls: {
        productType: payload.mode || "principles",
        brandStyle: payload.style || "",
      },
      brandSystem: {
        mode: payload.mode,
        style: payload.style,
        summary: payload.result?.summary || "",
        principles: payload.result?.principles || [],
        streetRedesign: payload.result?.streetRedesign || null,
        originalImageUrl,
        generatedImageUrl,
        markdownReport: payload.result?.markdownReport || "",
      },
    };

    const saveResponse = await fetch(saveUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-BrandHue-Token": token } : {}),
      },
      body: JSON.stringify(visualPayload),
    });
    const saveText = await saveResponse.text();
    const saveJson = saveText ? JSON.parse(saveText) : {};

    if (!saveResponse.ok || saveJson.ok === false) {
      throw new Error(saveJson.message || saveJson.error || saveText || "save_visual_failed");
    }

    return NextResponse.json({
      ok: true,
      data: {
        record: saveJson.data,
        originalImageUrl,
        generatedImageUrl,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "cloud_save_failed" }, { status: 500 });
  }
}

async function uploadImage({ uploadUrl, token, imageData, fileName, kind }) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-BrandHue-Token": token } : {}),
    },
    body: JSON.stringify({ imageData, fileName, kind }),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok || json.ok === false) {
    throw new Error(json.message || json.error || text || "image_upload_failed");
  }

  return json.data?.imageUrl || "";
}
