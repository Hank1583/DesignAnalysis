import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request) {
  try {
    const env = getRequestContext().env;
    const baseUrl = env.BRANDHUE_SAVE_VISUAL_URL || "";
    const token = env.BRANDHUE_API_TOKEN || "";

    // 從 BRANDHUE_SAVE_VISUAL_URL 推算 visuals.php 的位置
    const getUrl = baseUrl.replace(/save_visual\.php$/i, "visuals.php");
    if (!getUrl || !getUrl.startsWith("http")) {
      return NextResponse.json({ ok: false, error: "未設定 BRANDHUE_SAVE_VISUAL_URL" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const productType = searchParams.get("product_type") || "";

    const params = new URLSearchParams({ page, limit });
    if (productType) params.set("product_type", productType);

    const response = await fetch(`${getUrl}?${params}`, {
      headers: token ? { "X-BrandHue-Token": token } : {},
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok || data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error || "讀取雲端紀錄失敗" }, { status: response.status });
    }

    return NextResponse.json({ ok: true, data: data.data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "history_fetch_failed" }, { status: 500 });
  }
}
