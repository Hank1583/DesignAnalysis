"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const PRINCIPLES = ["統一", "反覆", "漸層", "對稱", "平衡", "對比", "調和", "比例", "律動", "單純"];
const STREET_STYLES = ["城市風", "科技風", "綠意生態風", "日系街區風", "歐式人文風", "夜景霓虹風"];

const emptyResult = {
  summary: "請先上傳圖片，再執行分析。",
  principles: PRINCIPLES.map((name) => ({ name, score: 0, reason: "尚未分析" })),
  visualFlow: "",
  focusScore: "--",
  rhythmScore: "--",
  streetRedesign: {
    summary: "選擇街景改造後，可產生城市美學改造提案。",
    suggestions: [],
  },
  generatedImage: "",
  markdownReport: "執行分析後，這裡會產生 Markdown 設計報告。",
};

export default function HomePage() {
  const [mode, setMode] = useState("principles");
  const [style, setStyle] = useState(STREET_STYLES[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("請先上傳圖片，再執行分析。");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(emptyResult);
  const [savedItems, setSavedItems] = useState([]);
  const fileInputRef = useRef(null);

  const topPrinciples = useMemo(() => {
    return [...result.principles].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [result.principles]);
  const totalScore = useMemo(() => result.principles.reduce((sum, item) => sum + item.score, 0), [result.principles]);

  useEffect(() => {
    refreshSavedItems();
  }, []);

  async function handleFile(nextFile) {
    if (!nextFile) return;
    setFile(nextFile);
    setPreview(await fileToDataUrl(nextFile));
    setStatus("圖片已上傳，可以開始分析。");
  }

  async function analyzeImage() {
    if (!file) {
      setStatus("請先上傳圖片，再執行分析。");
      setResult({ ...emptyResult, summary: "尚未上傳圖片，無法開始分析。" });
      return;
    }

    setIsAnalyzing(true);
    setStatus("正在呼叫 OpenAI 進行視覺分析...");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("mode", mode);
    formData.append("style", style);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : { ok: false, error: "API 沒有回傳內容" };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "AI 分析失敗");
      }

      setResult(normalizeResult(data.analysis));
      setStatus("已完成 OpenAI 視覺分析。");
    } catch (error) {
      setResult(createFallbackResult({ mode, style, fileName: file.name }));
      setStatus(`OpenAI 尚未連線，已改用本地示範結果。原因：${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function saveCurrentResult() {
    if (!preview) {
      setStatus("請先上傳並分析圖片，再儲存結果。");
      return;
    }

    const item = {
      id: crypto.randomUUID(),
      title: file?.name || "BrandHue 分析結果",
      mode,
      style,
      preview,
      result,
      createdAt: new Date().toISOString(),
    };

    let cloudMessage = "";
    try {
      const response = await fetch("/api/cloud-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "cloud_save_failed");
      }
      cloudMessage = "已同步到 PHP/MySQL 雲端";
      item.cloud = data.data;
    } catch (error) {
      cloudMessage = `雲端存檔失敗，已保留本機存檔：${error.message}`;
    }

    await saveAnalysisRecord(item);
    await refreshSavedItems();
    setStatus(`${cloudMessage}；本機瀏覽器也已存檔。`);
  }

  function loadSavedItem(item) {
    setMode(item.mode || "principles");
    setStyle(item.style || STREET_STYLES[0]);
    setPreview(item.preview || "");
    setFile(null);
    setResult(item.result || emptyResult);
    setStatus(`已載入舊結果：${item.title}`);
  }

  async function deleteSavedItem(id) {
    await deleteAnalysisRecord(id);
    await refreshSavedItems();
    setStatus("已刪除本機紀錄。");
  }

  async function refreshSavedItems() {
    setSavedItems(await listAnalysisRecords());
  }

  async function copyReport() {
    await navigator.clipboard.writeText(result.markdownReport || "");
    setStatus("Markdown 報告已複製。");
  }

  function downloadReport() {
    const blob = new Blob([result.markdownReport || ""], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "brandhue-design-report.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadGeneratedImage() {
    if (!result.generatedImage) {
      setStatus("目前沒有可下載的改造圖。");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = result.generatedImage;
    anchor.download = `brandhue-${style}-redesign.png`;
    anchor.click();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img">
              <path d="M6 20.5V7.8C6 6.8 6.8 6 7.8 6h9.4C22 6 26 10 26 14.8v9.4c0 1-.8 1.8-1.8 1.8H11.5A5.5 5.5 0 0 1 6 20.5Z" />
              <path d="M10 19.2c4.4-6.7 8.5-8.9 12.4-6.6M10.8 21.7c4.7-1.1 8.6-3.7 11.8-7.7" />
              <circle cx="12" cy="12" r="2.1" />
            </svg>
          </span>
          <div>
            <strong>BrandHue</strong>
            <span>AI 視覺設計分析平台</span>
          </div>
        </div>
        <nav>
          <a href="#analyze">開始分析</a>
          <a href="#results">分析結果</a>
          <a href="#report">設計報告</a>
        </nav>
        <div className="status-card">
          <span />
          <div>
            <strong>OpenAI Vision</strong>
            <small>Next.js API route</small>
          </div>
        </div>
      </aside>

      <section className="content">
        <section className="hero" id="analyze">
          <div className="hero-lines" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <p className="eyebrow">AI Design Analysis Platform</p>
          <h1>AI 視覺設計分析平台</h1>
          <p className="hero-copy">上傳圖片，分析 10 項美的原理；或上傳街景，生成城市美學改造提案。</p>
          <div className="hero-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              上傳圖片
            </button>
            <button type="button" className="secondary" onClick={analyzeImage}>
              開始分析
            </button>
          </div>
        </section>

        <section className="workspace">
          <article className="panel upload-panel">
            <header>
              <p className="eyebrow">Upload</p>
              <h2>圖片輸入</h2>
            </header>

            <label
              className="drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <span>+</span>
              <strong>{file ? file.name : "拖曳圖片或點擊選擇"}</strong>
              <small>支援街景、室內、海報、攝影與品牌視覺圖片</small>
            </label>

            <div className="field">
              <span className="field-label">分析模式</span>
              <div className="segments">
                <button className={mode === "principles" ? "active" : ""} onClick={() => setMode("principles")} type="button">
                  美的原理
                </button>
                <button className={mode === "street" ? "active" : ""} onClick={() => setMode("street")} type="button">
                  街景改造
                </button>
              </div>
            </div>

            {mode === "street" ? (
              <div className="field">
                <span className="field-label">街景改造風格</span>
                <select value={style} onChange={(event) => setStyle(event.target.value)}>
                  {STREET_STYLES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <button className="run-button" type="button" disabled={isAnalyzing} onClick={analyzeImage}>
              {isAnalyzing ? "分析中..." : "執行設計分析"}
            </button>
            <p className="analysis-status">{status}</p>
          </article>

          <article className="panel preview-panel">
            <header>
              <p className="eyebrow">Canvas</p>
              <h2>原始圖片</h2>
            </header>
            <div className="image-stage">
              {preview ? <img src={preview} alt="上傳圖片預覽" /> : <div className="empty-preview">等待圖片上傳</div>}
              {preview ? <Overlay mode={mode} /> : null}
            </div>
          </article>
        </section>

        <section className="results" id="results">
          <header className="section-header">
            <p className="eyebrow">AI Output</p>
            <h2>設計理解分析</h2>
          </header>

          <div className={`result-grid ${mode === "principles" ? "single-result" : "street-result"}`}>
            {mode === "principles" ? (
              <article className="panel result-card principles-result">
                <h3>美的原理分析</h3>
                <p>{result.summary}</p>
                <div className="total-score">美感總分 <strong>{totalScore}</strong> / 100</div>
                <div className="tag-row">
                  {topPrinciples.map((item) => (
                    <span key={item.name}>{item.name} {item.score}</span>
                  ))}
                </div>
                <div className="principle-list">
                  {result.principles.map((item) => (
                    <div className="principle-item" key={item.name}>
                      <span>{item.name}</span>
                      <div><i style={{ width: `${item.score * 10}%` }} /></div>
                      <strong>{item.score}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ) : (
              <article className="panel result-card street-redesign-card">
                <h3>街景美學改造</h3>
                <p>{result.streetRedesign.summary}</p>
                {result.generatedImage ? (
                  <figure className="generated-figure">
                    <img src={result.generatedImage} alt="AI 生成的街景改造示意圖" />
                    <figcaption>{style}改造後示意圖</figcaption>
                  </figure>
                ) : null}
                <ul>
                  {result.streetRedesign.suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            )}
          </div>
        </section>

        <section className="report panel" id="report">
          <div>
            <p className="eyebrow">Report</p>
            <h2>設計報告匯出</h2>
            <textarea readOnly value={result.markdownReport} />
          </div>
          <div className="report-actions">
            <button type="button" onClick={copyReport}>複製 Markdown</button>
            <button type="button" onClick={downloadReport}>下載報告</button>
            {result.generatedImage ? <button type="button" onClick={downloadGeneratedImage}>下載改造圖</button> : null}
            <button type="button" onClick={saveCurrentResult}>儲存目前結果</button>
            <button type="button" onClick={() => window.print()}>列印 / PDF</button>
          </div>
        </section>

        <section className="saved panel">
          <div>
            <p className="eyebrow">Saved</p>
            <h2>雲端存檔 / 本機快取</h2>
            <p>按「儲存目前結果」會先同步到 PHP/MySQL 雲端；同時也保留一份在這台瀏覽器，展示時可直接載入舊結果，不會重新消耗 API 額度。</p>
          </div>
          <div className="saved-list">
            {savedItems.length ? savedItems.map((item) => (
              <article className="saved-item" key={item.id}>
                {item.preview ? <img src={item.preview} alt="" /> : null}
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.mode === "street" ? `街景改造 / ${item.style}` : "美的原理"}</span>
                  <small>{new Date(item.createdAt).toLocaleString("zh-TW")}</small>
                </div>
                <button type="button" onClick={() => loadSavedItem(item)}>載入</button>
                <button type="button" className="danger" onClick={() => deleteSavedItem(item.id)}>刪除</button>
              </article>
            )) : <p className="empty-saved">尚無存檔。分析完成後請按「儲存目前結果」。</p>}
          </div>
        </section>
      </section>
    </main>
  );
}

function Overlay({ mode }) {
  return (
    <div className={`overlay ${mode}`}>
      <span className="thirds x1" />
      <span className="thirds x2" />
      <span className="thirds y1" />
      <span className="thirds y2" />
      <span className="focus-circle" />
      <span className="flow-arrow one" />
      <span className="flow-arrow two" />
    </div>
  );
}

function normalizeResult(analysis) {
  const hasPrincipleScores = Array.isArray(analysis?.principles) && analysis.principles.length > 0;
  const principles = hasPrincipleScores
    ? PRINCIPLES.map((name) => {
        const found = analysis?.principles?.find((item) => item.name === name);
        return {
          name,
          score: normalizePrincipleScore(found?.score),
          reason: found?.reason || "",
        };
      })
    : PRINCIPLES.map((name) => ({ name, score: 0, reason: "" }));

  return {
    summary: analysis?.summary || "AI 已完成美的原理分析。",
    principles,
    visualFlow: analysis?.visualFlow || "",
    focusScore: analysis?.focusScore || "--",
    rhythmScore: analysis?.rhythmScore || "--",
    streetRedesign: {
      summary: analysis?.streetRedesign?.summary || "AI 已完成街景美學改造建議。",
      suggestions: analysis?.streetRedesign?.suggestions || [],
    },
    generatedImage: analysis?.generatedImage || "",
    markdownReport: analysis?.markdownReport || buildMarkdownReport({ analysis, principles }),
  };
}

function createFallbackResult({ mode, style, fileName }) {
  const seed = fileName.length + style.length + mode.length;
  const principles = PRINCIPLES.map((name, index) => ({
    name,
    score: 7 + ((seed + index * 7) % 3),
    reason: "本地示範分數",
  }));
  const analysis = {
    summary: `這是本地示範分析。此圖片在「${principles[0].name}、${principles[3].name}、${principles[6].name}」上較明顯，適合作為後續 AI 分析結果的前端呈現範例。`,
    visualFlow: "視線大致由左上進入畫面，停留於中心區域，再往右側或下方資訊密度較高的區塊移動。",
    focusScore: "示範",
    rhythmScore: "中等",
    streetRedesign: {
      summary: `${style}改造方向可先整理招牌、立面、照明、植栽與行人動線，再建立一致的街道色彩與材質系統。`,
      suggestions: ["整合招牌尺寸與色彩", "增加人行道照明", "建立一致導視系統", "補充植栽與停留節點"],
    },
  };
  return normalizeResult({ ...analysis, principles, markdownReport: buildMarkdownReport({ analysis, principles }) });
}

function buildMarkdownReport({ analysis, principles }) {
  const totalScore = principles.reduce((sum, item) => sum + item.score, 0);
  return `# BrandHue AI 設計分析報告

## 美的原理總評
${analysis?.summary || ""}

## 美感總分
${totalScore}/100

## 10 項美的原理
${principles.map((item) => `- ${item.name}：${item.score}/10`).join("\n")}
${analysis?.streetRedesign?.summary ? `
## 街景美學改造
${analysis.streetRedesign.summary}

${(analysis.streetRedesign.suggestions || []).map((item) => `- ${item}`).join("\n")}` : ""}`;
}

function clamp(value) {
  if (Number.isNaN(value)) return 70;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizePrincipleScore(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 8;
  const tenPointScore = number > 10 ? Math.round(number / 10) : Math.round(number);
  return Math.max(6, Math.min(10, tenPointScore + 1));
}

function openBrandHueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("brandhue-vision-db", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("records")) {
        db.createObjectStore("records", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAnalysisRecord(item) {
  const db = await openBrandHueDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").put(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function listAnalysisRecords() {
  const db = await openBrandHueDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("records", "readonly");
    const request = tx.objectStore("records").getAll();
    request.onsuccess = () => {
      const items = request.result || [];
      resolve(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteAnalysisRecord(id) {
  const db = await openBrandHueDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
