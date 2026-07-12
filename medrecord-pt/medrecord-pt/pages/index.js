import Head from "next/head";
import { useState, useRef, useCallback } from "react";

// ── Canvas compression ─────────────────────────────────────────────────────
const compressImage = (base64, mimeType, maxDim = 1200, quality = 0.82) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const s = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * s);
        height = Math.round(height * s);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
    };
    img.src = `data:${mimeType};base64,${base64}`;
  });

// ── Inline parser ──────────────────────────────────────────────────────────
function parseInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]*\])/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
      return <strong key={i} style={{ color: "#1E3A5F" }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("[") && p.endsWith("]"))
      return <span key={i} style={{ color: "#0891B2", fontStyle: "italic" }}>{p}</span>;
    return p;
  });
}

// ── Markdown renderer ──────────────────────────────────────────────────────
function ContentRenderer({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let bullets = [];
  let tableRows = [];
  let tk = 0;

  const flushBullets = () => {
    if (!bullets.length) return;
    elements.push(
      <ul key={`ul${elements.length}`} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.5rem", listStyleType: "disc" }}>
        {bullets.map((c, i) => <li key={i} style={{ color: "#334155", lineHeight: "1.75", fontSize: "0.9rem", marginBottom: "0.15rem" }}>{c}</li>)}
      </ul>
    );
    bullets = [];
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.filter(r => !/^[\|\s\-:]+$/.test(r));
    if (rows.length) {
      elements.push(
        <div key={`tb${tk++}`} style={{ overflowX: "auto", margin: "0.5rem 0", borderRadius: "8px", border: "1px solid #E2E8F0", WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8rem", minWidth: "320px" }}>
            <tbody>
              {rows.map((row, ri) => {
                const cells = row.split("|").slice(1, -1).map(c => c.trim());
                const Tag = ri === 0 ? "th" : "td";
                return (
                  <tr key={ri} style={{ background: ri === 0 ? "#EFF6FF" : ri % 2 ? "#F8FAFB" : "white" }}>
                    {cells.map((cell, ci) => (
                      <Tag key={ci} style={{ padding: "0.4rem 0.6rem", textAlign: "left", verticalAlign: "top", lineHeight: "1.5", borderBottom: ri < rows.length - 1 ? "1px solid #E2E8F0" : "none", borderRight: ci < cells.length - 1 ? "1px solid #E2E8F0" : "none", fontWeight: ri === 0 ? 600 : 400, color: ri === 0 ? "#1E40AF" : "#334155" }}>
                        {parseInline(cell)}
                      </Tag>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    tableRows = [];
  };

  lines.forEach((line, i) => {
    const key = `l${i}`;
    if (line.startsWith("|")) { flushBullets(); tableRows.push(line); return; }
    flushTable();
    if (line.startsWith("### ")) {
      flushBullets();
      elements.push(<h3 key={key} style={{ fontWeight: 700, color: "#0C4A6E", fontSize: "0.95rem", marginTop: "1.1rem", marginBottom: "0.3rem", paddingBottom: "0.25rem", borderBottom: "2px solid #BAE6FD" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      flushBullets();
      elements.push(<h2 key={key} style={{ fontWeight: 700, color: "#0C4A6E", fontSize: "1.05rem", marginTop: "1rem", marginBottom: "0.2rem" }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("=== ")) {
      flushBullets();
      elements.push(<div key={key} style={{ background: "#F1F5F9", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "#64748B", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>{line.slice(4)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      bullets.push(parseInline(line.slice(2)));
    } else if (line === "" || line === "---") {
      flushBullets();
      elements.push(<div key={key} style={{ height: "0.4rem" }} />);
    } else if (/^\*\*[^*]+\*\*$/.test(line)) {
      flushBullets();
      elements.push(<p key={key} style={{ fontWeight: 600, color: "#1E3A5F", margin: "0.4rem 0 0.1rem", fontSize: "0.9rem" }}>{line.slice(2, -2)}</p>);
    } else if (line.trim()) {
      flushBullets();
      elements.push(<p key={key} style={{ color: "#334155", lineHeight: "1.75", fontSize: "0.9rem", margin: "0.1rem 0" }}>{parseInline(line)}</p>);
    }
  });
  flushBullets(); flushTable();
  return <>{elements}</>;
}

// ── Progress steps ─────────────────────────────────────────────────────────
function ProgressSteps({ phase, batchProgress }) {
  const order = ["compressing", "extracting", "analyzing", "done"];
  const cur = order.indexOf(phase);
  const steps = [
    { key: "compressing", label: "บีบอัดรูปภาพ" },
    { key: "extracting",  label: "อ่านเวชระเบียน" },
    { key: "analyzing",   label: "วิเคราะห์คลินิก" },
    { key: "done",        label: "เสร็จสิ้น" },
  ];
  return (
    <div style={{ background: "#F0F9FF", borderRadius: "8px", padding: "0.65rem 0.75rem" }}>
      {steps.map((step, i) => {
        const idx = order.indexOf(step.key);
        const done = idx < cur || phase === "done";
        const active = phase === step.key;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: i < steps.length - 1 ? "0.5rem" : 0 }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, marginTop: "1px", background: done ? "#059669" : active ? "#0891B2" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "white", transition: "all 0.3s" }}>
              {done ? "✓" : active ? "·" : ""}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "0.75rem", color: done ? "#059669" : active ? "#0C4A6E" : "#94A3B8", fontWeight: active ? 600 : 400 }}>
                {step.label}
              </span>
              {step.key === "extracting" && active && batchProgress.total > 0 && (
                <div style={{ marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ flex: 1, height: "5px", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: "linear-gradient(90deg, #0C4A6E, #0891B2)", transition: "width 0.5s ease", borderRadius: "3px" }} />
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#64748B", flexShrink: 0 }}>
                    {batchProgress.current}/{batchProgress.total}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_IMAGES = 20;
const BATCH_SIZE = 5;

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [images, setImages]               = useState([]);
  const [extractedText, setExtractedText] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [phase, setPhase]                 = useState("idle");
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [error, setError]                 = useState("");
  const [dragOver, setDragOver]           = useState(false);
  const [activeTab, setActiveTab]         = useState("extract");
  const [copied, setCopied]               = useState(false);
  const fileInputRef = useRef(null);

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const processFiles = useCallback(async (files) => {
    const imgFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    const processed = await Promise.all(imgFiles.map(async f => ({
      name: f.name, preview: URL.createObjectURL(f),
      base64: await toBase64(f), type: f.type,
    })));
    setImages(prev => [...prev, ...processed].slice(0, MAX_IMAGES));
  }, []);

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  // ── API call via Next.js proxy (API key stays server-side) ──────────────
  const callClaude = async (messages) => {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-7", max_tokens: 1000, messages }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    const data = await res.json();
    return data.content.filter(c => c.type === "text").map(c => c.text).join("\n");
  };

  const handleProcess = async () => {
    if (!images.length || ["compressing", "extracting", "analyzing"].includes(phase)) return;
    try {
      setError(""); setExtractedText(""); setTreatmentPlan("");

      // Step 1: Compress
      setPhase("compressing");
      const compressed = await Promise.all(images.map(img => compressImage(img.base64, img.type)));

      // Step 2: Batch extract
      setPhase("extracting");
      const totalBatches = Math.ceil(images.length / BATCH_SIZE);
      setBatchProgress({ current: 0, total: totalBatches });
      const allExtracted = [];

      for (let b = 0; b < totalBatches; b++) {
        const start = b * BATCH_SIZE;
        const batchComp = compressed.slice(start, start + BATCH_SIZE);
        const batchImgs = images.slice(start, start + BATCH_SIZE);
        setBatchProgress({ current: b + 1, total: totalBatches });

        const imgContent = batchComp.map((data) => ({
          type: "image", source: { type: "base64", media_type: "image/jpeg", data }
        }));

        const batchText = await callClaude([{
          role: "user",
          content: [
            ...imgContent,
            {
              type: "text",
              text: `คุณเป็น AI ผู้ช่วยนักกายภาพบำบัด
นี่คือรูปถ่ายเวชระเบียน กลุ่มที่ ${b + 1}/${totalBatches} (${batchImgs.length} รูป)
กรุณาอ่านและสกัดข้อมูลทั้งหมดที่มองเห็นได้จากรูปกลุ่มนี้

**ข้อมูลพื้นฐาน**
- ชื่อ/รหัสผู้ป่วย:
- อายุ/เพศ:
- วันที่บันทึก:
- แพทย์ผู้รักษา:
- Ward/แผนก:

**การวินิจฉัย (Diagnosis)**

**โรคร่วม (Comorbidities)**

**ยาที่ใช้ปัจจุบัน (Medications)**

**ผลการตรวจ / Lab / Imaging**

**ประวัติการรักษา**

**คำสั่ง PT Referral / Doctor's Orders**

**ข้อมูลอื่นๆ**

กฎ: อ่านไม่ชัด → [ไม่ชัดเจน] | ไม่มีข้อมูล → [ไม่พบ] | ห้ามเดา`,
            },
          ],
        }]);
        allExtracted.push(`=== กลุ่มที่ ${b + 1}/${totalBatches} (รูปที่ ${start + 1}–${start + batchImgs.length}) ===\n${batchText}`);
      }

      const merged = allExtracted.join("\n\n");
      setExtractedText(merged);
      setActiveTab("extract");

      // Step 3: Generate plan
      setPhase("analyzing");
      const plan = await callClaude([{
        role: "user",
        content: `คุณเป็น AI assistant ที่ทำงานร่วมกับนักกายภาพบำบัด (PT) ชื่อนัน
ทำงานในกรุงเทพฯ ทั้งใน Aquatic Therapy และ Land-based Rehabilitation

ต่อไปนี้คือข้อมูลที่สกัดจากเวชระเบียนทั้งหมด ${images.length} หน้า:

${merged}

กรุณารวมข้อมูลทั้งหมดและเขียนแผนการรักษา PT เป็นภาษาไทย (คำศัพท์คลินิกใช้ภาษาอังกฤษวงเล็บไทย):

### 1. สรุปประวัติผู้ป่วย (Patient Summary)
ข้อมูลพื้นฐาน | Primary Diagnosis | Comorbidities | Medications สำคัญ | Red Flags

### 2. การวิเคราะห์ปัญหา (Problem Analysis)
| ลำดับ | ปัญหา | สาเหตุที่เป็นไปได้ | ผลกระทบต่อ Function |
|-------|--------|-------------------|---------------------|

### 3. เป้าหมายการรักษา (Treatment Goals)
**Short-term Goals (2–4 สัปดาห์):** (Measurable)
**Long-term Goals (1–3 เดือน):** (Measurable)

### 4. แผนการรักษา (Treatment Plan)
| Phase | ระยะเวลา | เป้าหมาย | เทคนิค / Exercise | Precautions | Clinical Rationale |
|-------|----------|---------|-----------------|------------|-------------------|

### 5. ข้อควรระวัง (Precautions & Contraindications)
**Absolute Contraindications:**
**Relative Precautions:**

### 6. แผนติดตามผล (Follow-up & Outcome Measures)

---
แยกให้ชัดเจน [ข้อเท็จจริง] / [การอนุมาน] / [ความเห็น]
ถ้าข้อมูลไม่เพียงพอ → ระบุชัดเจน ห้ามเดา`,
      }]);

      setTreatmentPlan(plan);
      setActiveTab("plan");
      setPhase("done");

    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setPhase("error");
    }
  };

  const handleCopy = () => {
    const text = activeTab === "extract" ? extractedText : treatmentPlan;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const reset = () => {
    setImages([]); setExtractedText(""); setTreatmentPlan("");
    setPhase("idle"); setError(""); setActiveTab("extract");
    setBatchProgress({ current: 0, total: 0 });
  };

  const isProcessing = ["compressing", "extracting", "analyzing"].includes(phase);
  const hasOutput = !!(extractedText || treatmentPlan);
  const currentText = activeTab === "extract" ? extractedText : treatmentPlan;
  const remaining = MAX_IMAGES - images.length;

  const pillStyle = (bg, border, color) => ({ padding: "0.2rem 0.5rem", borderRadius: "20px", background: bg, border: `1px solid ${border}`, fontSize: "0.65rem", color, fontWeight: 500 });
  const btnStyle = (disabled) => ({ padding: "0.75rem 1.25rem", borderRadius: "10px", border: "none", background: disabled ? "#CBD5E1" : "linear-gradient(135deg, #0C4A6E, #0891B2)", color: "white", fontWeight: 600, fontSize: "0.9rem", cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 2px 8px rgba(8,145,178,0.3)", transition: "all 0.2s", flexShrink: 0, WebkitTapHighlightColor: "transparent" });

  return (
    <>
      <Head>
        <title>PT Analyzer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PT Analyzer" />
        <meta name="theme-color" content="#0C4A6E" />
        <link rel="manifest" href="/manifest.json" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: #F1F5F9; }
          ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }
        `}</style>
      </Head>

      <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg, #EFF6FF 0%, #F0F9FF 40%, #F8FAFC 100%)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: "1rem", paddingBottom: "2rem" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.1rem", paddingBottom: "1rem", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0, background: "linear-gradient(135deg, #0C4A6E, #0891B2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", boxShadow: "0 2px 8px rgba(8,145,178,0.3)" }}>📋</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0C4A6E" }}>MedRecord → PT Plan</h1>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "#64748B" }}>ถ่าย → บีบอัด → อ่าน → วิเคราะห์ → แผน PT</p>
            </div>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
              <span style={pillStyle("#EFF6FF", "#BFDBFE", "#1D4ED8")}>opus-4-7</span>
              <span style={pillStyle("#FFF7ED", "#FED7AA", "#C2410C")}>batch×5</span>
            </div>
          </div>

          {/* Upload card */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "1rem", overflow: "hidden" }}>
            <div style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
                <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em" }}>1. เลือกรูปภาพ</p>
                {images.length > 0 && (
                  <span style={{ fontSize: "0.7rem", color: remaining > 0 ? "#64748B" : "#DC2626", background: remaining > 0 ? "#F1F5F9" : "#FEF2F2", padding: "0.15rem 0.5rem", borderRadius: "20px", border: `1px solid ${remaining > 0 ? "#E2E8F0" : "#FECACA"}` }}>
                    {images.length}/{MAX_IMAGES} {remaining > 0 ? `· เพิ่มได้อีก ${remaining}` : "· เต็มแล้ว"}
                  </span>
                )}
              </div>

              {/* Drop zone — on mobile tap to open camera/gallery */}
              <div
                onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? "#0891B2" : "#CBD5E1"}`, borderRadius: "12px", padding: "1.5rem 1rem", textAlign: "center", cursor: "pointer", background: dragOver ? "#F0F9FF" : "#FAFAFA", transition: "all 0.2s", WebkitTapHighlightColor: "transparent" }}
              >
                <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => processFiles(e.target.files)} />
                <div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>📷</div>
                <p style={{ margin: 0, color: "#0C4A6E", fontWeight: 600, fontSize: "0.9rem" }}>กดเพื่อถ่ายหรือเลือกรูป</p>
                <p style={{ margin: "0.2rem 0 0", color: "#94A3B8", fontSize: "0.73rem" }}>เลือกจาก Camera Roll หรือถ่ายใหม่ · สูงสุด 20 รูป</p>
              </div>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: "0.4rem", marginTop: "0.8rem", maxHeight: "210px", overflowY: "auto" }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "2px solid #E2E8F0" }}>
                      <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => removeImage(i)} style={{ position: "absolute", top: "2px", right: "2px", width: "18px", height: "18px", background: "rgba(0,0,0,0.65)", color: "white", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: "10px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}>✕</button>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "white", fontSize: "0.55rem", padding: "1px 3px", textAlign: "center" }}>{i + 1}</div>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <div onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: "8px", border: "2px dashed #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94A3B8", fontSize: "1.5rem", WebkitTapHighlightColor: "transparent" }}>+</div>
                  )}
                </div>
              )}
            </div>

            {/* Action bar */}
            <div style={{ borderTop: "1px solid #F1F5F9", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button onClick={handleProcess} disabled={!images.length || isProcessing} style={btnStyle(!images.length || isProcessing)}>
                {isProcessing
                  ? (phase === "compressing" ? "🗜️ บีบอัด..." : phase === "extracting" ? "⏳ อ่านรูป..." : "🧠 วิเคราะห์...")
                  : `▶ วิเคราะห์${images.length ? ` (${images.length} รูป)` : ""}`}
              </button>
              {phase !== "idle" && (
                <button onClick={reset} style={{ padding: "0.75rem 0.9rem", borderRadius: "10px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", cursor: "pointer", fontSize: "0.85rem", WebkitTapHighlightColor: "transparent" }}>ล้าง</button>
              )}
            </div>

            {/* Progress */}
            {(isProcessing || phase === "done") && (
              <div style={{ padding: "0 1rem 1rem" }}>
                <ProgressSteps phase={phase} batchProgress={batchProgress} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ margin: "0 1rem 1rem", padding: "0.65rem 0.75rem", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: "0.82rem" }}>
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Output card */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden", opacity: hasOutput ? 1 : 0.55, transition: "opacity 0.3s" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", alignItems: "stretch" }}>
              <span style={{ padding: "0.6rem 0.75rem", fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center" }}>2. ผลลัพธ์</span>
              {[
                { key: "extract", label: "📄 ข้อมูล",       has: !!extractedText },
                { key: "plan",    label: "📋 แผนการรักษา", has: !!treatmentPlan },
              ].map(tab => (
                <button key={tab.key} onClick={() => tab.has && setActiveTab(tab.key)} style={{ padding: "0.6rem 0.85rem", border: "none", background: activeTab === tab.key ? "#F0F9FF" : "white", color: !tab.has ? "#CBD5E1" : activeTab === tab.key ? "#0C4A6E" : "#64748B", fontWeight: activeTab === tab.key ? 600 : 400, fontSize: "0.82rem", cursor: tab.has ? "pointer" : "default", borderBottom: activeTab === tab.key ? "2px solid #0891B2" : "2px solid transparent", transition: "all 0.15s", WebkitTapHighlightColor: "transparent" }}>
                  {tab.label}
                </button>
              ))}
              {hasOutput && (
                <button onClick={handleCopy} style={{ marginLeft: "auto", marginRight: "0.75rem", padding: "0.3rem 0.65rem", borderRadius: "6px", background: copied ? "#F0FDF4" : "#F1F5F9", border: `1px solid ${copied ? "#BBF7D0" : "#E2E8F0"}`, color: copied ? "#166534" : "#64748B", fontSize: "0.72rem", cursor: "pointer", alignSelf: "center", transition: "all 0.2s", WebkitTapHighlightColor: "transparent" }}>
                  {copied ? "✓ คัดลอก" : "📋 คัดลอก"}
                </button>
              )}
            </div>

            <div style={{ padding: "1rem", minHeight: "200px", maxHeight: "60vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              {!hasOutput ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "160px", color: "#94A3B8", textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>ผลลัพธ์จะแสดงที่นี่</p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>เพิ่มรูปและกด วิเคราะห์</p>
                </div>
              ) : !currentText && isProcessing ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "160px", color: "#0891B2" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{phase === "extracting" ? "🔍" : "🧠"}</div>
                  <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>
                    {phase === "extracting" ? `กำลังอ่านกลุ่มที่ ${batchProgress.current}...` : "กำลังวิเคราะห์..."}
                  </p>
                </div>
              ) : (
                <ContentRenderer text={currentText} />
              )}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.65rem", color: "#CBD5E1", marginTop: "1rem" }}>
            claude-opus-4-7 · API key เก็บ server-side · ข้อมูลไม่ถูกบันทึก
          </p>
        </div>
      </div>
    </>
  );
}
