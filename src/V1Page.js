import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API = "https://pritish0007-pritishdeepbloombackend.hf.space";

const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

// Models served by the backend (keys must match deepbloom_model.MODEL_SPECS)
const MODEL_INFO = {
  distilbert: { name: "DistilBERT", sub: "distilbert-base · 66M parameters", weight: "Lightweight" },
  bert: { name: "BERT", sub: "bert-base · 110M parameters", weight: "Heavyweight" },
  roberta: { name: "RoBERTa", sub: "roberta-base · 125M parameters", weight: "Heavyweight" },
};

// Selection modes
const MODES = [
  {
    key: "lightweight",
    title: "Lightweight",
    models: ["distilbert"],
    desc: "DistilBERT only. Fastest response.",
  },
  {
    key: "heavyweight",
    title: "Heavyweight",
    models: ["bert", "roberta"],
    desc: "BERT and RoBERTa both run; the more confident prediction is shown.",
  },
  {
    key: "best",
    title: "Best of all three",
    models: ["distilbert", "bert", "roberta"],
    desc: "All three models run; the most confident prediction is shown.",
  },
];

// ---------------- Model progress panel ----------------
function ModelRunPanel({ status, selected }) {
  const keys = Object.keys(status);
  if (keys.length === 0) return null;

  return (
    <div className="model-run-panel">
      {keys.map((key) => {
        const s = status[key];
        const info = MODEL_INFO[key];
        const isWinner = selected === key && s.state === "done";
        return (
          <div
            key={key}
            className={`model-run-card ${s.state} ${isWinner ? "winner" : ""}`}
          >
            <div className="model-run-head">
              <span className="model-run-name">{info.name}</span>
              <span className="model-run-weight">{info.weight}</span>
            </div>
            <div className="model-run-sub">{info.sub}</div>

            {s.state === "running" && (
              <div className="model-run-status">
                <span className="spinner" />
                <span>Running…</span>
                <div className="progress-track">
                  <div className="progress-bar" />
                </div>
              </div>
            )}

            {s.state === "done" && s.result && (
              <div className="model-run-status">
                <span className="tick">✓</span>
                <span>
                  {s.result.prediction} · {s.result.confidence.toFixed(3)}
                </span>
                {s.result.time_ms !== undefined && (
                  <span className="model-run-time">
                    {Math.round(s.result.time_ms)} ms
                  </span>
                )}
              </div>
            )}

            {s.state === "done" && !s.result && (
              <div className="model-run-status">
                <span className="tick">✓</span>
                <span>Completed</span>
              </div>
            )}

            {s.state === "error" && (
              <div className="model-run-status error-text">
                Not available on the server
              </div>
            )}

            {isWinner && <div className="winner-badge">Selected</div>}
          </div>
        );
      })}
    </div>
  );
}

function ModeSelector({ mode, setMode, available, disabled }) {
  return (
    <div className="mode-selector">
      {MODES.map((m) => {
        const ok = m.models.some((k) => available[k] !== false);
        return (
          <button
            key={m.key}
            type="button"
            className={`mode-option ${mode === m.key ? "active" : ""}`}
            onClick={() => setMode(m.key)}
            disabled={disabled || !ok}
            title={ok ? m.desc : "These models are not available on the server"}
          >
            <span className="mode-title">{m.title}</span>
            <span className="mode-models">
              {m.models.map((k) => MODEL_INFO[k].name).join(" + ")}
            </span>
            <span className="mode-desc">{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function V1Page() {
  const [mode, setMode] = useState("lightweight");
  const [available, setAvailable] = useState({});

  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [singleStatus, setSingleStatus] = useState({});
  const [singleBusy, setSingleBusy] = useState(false);

  const [assessmentText, setAssessmentText] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [assessStatus, setAssessStatus] = useState({});
  const [assessBusy, setAssessBusy] = useState(false);

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfStatus, setPdfStatus] = useState({});
  const [pdfBusy, setPdfBusy] = useState(false);

  const modeModels = (MODES.find((m) => m.key === mode) || MODES[0]).models;
  const runnableModels = modeModels.filter((k) => available[k] !== false);

  // Which models are loaded on the server
  useEffect(() => {
    fetch(`${API}/models`)
      .then((r) => r.json())
      .then((d) => {
        const a = {};
        (d.models || []).forEach((m) => (a[m.key] = m.available));
        setAvailable(a);
      })
      .catch(() => setAvailable({}));
  }, []);

  const initialStatus = (keys) =>
    Object.fromEntries(keys.map((k) => [k, { state: "running" }]));

  // ================= SINGLE QUESTION =================
  // Each model is called separately, so the panel shows the real progress of every model.
  const predict = async () => {
    if (!question.trim()) {
      alert("Please enter a question first.");
      return;
    }
    setSingleBusy(true);
    setResult(null);
    setSingleStatus(initialStatus(runnableModels));

    const calls = runnableModels.map(async (key) => {
      try {
        const response = await fetch(`${API}/predict-model`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: question, model: key }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Prediction failed");
        setSingleStatus((prev) => ({ ...prev, [key]: { state: "done", result: data } }));
        return data;
      } catch (error) {
        setSingleStatus((prev) => ({ ...prev, [key]: { state: "error" } }));
        return null;
      }
    });

    const outputs = (await Promise.all(calls)).filter(Boolean);
    setSingleBusy(false);

    if (outputs.length === 0) {
      alert("Prediction failed: no model responded.");
      return;
    }

    const chosen = outputs.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    const agreeing = outputs.filter((o) => o.prediction === chosen.prediction).length;

    setResult({
      final_prediction: chosen.prediction,
      confidence: chosen.confidence,
      selected_model: chosen.model,
      selected_model_name: chosen.model_name,
      models_run: outputs.length,
      models_agreeing: agreeing,
      explanation: chosen.explanation,
    });
  };

  // ================= ASSESSMENT =================
  const analyzeAssessment = async () => {
    const questions = assessmentText
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    if (questions.length === 0) {
      alert("Please enter at least one question.");
      return;
    }

    setAssessBusy(true);
    setAnalysisData(null);
    setAssessStatus(initialStatus(runnableModels));

    try {
      const response = await fetch(`${API}/analyze-assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, mode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Assessment analysis failed");

      setAssessStatus(
        Object.fromEntries(runnableModels.map((k) => [k, { state: "done" }]))
      );
      setAnalysisData(data);
    } catch (error) {
      setAssessStatus({});
      alert(`Assessment analysis failed: ${error.message}`);
    } finally {
      setAssessBusy(false);
    }
  };

  // ================= PDF =================
  const handlePdfUpload = async () => {
    if (!pdfFile) {
      alert("Please select a PDF first.");
      return;
    }

    setPdfBusy(true);
    setPdfStatus(initialStatus(runnableModels));

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("mode", mode);

      const response = await fetch(`${API}/upload-paper`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "PDF analysis failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "DeepBloom_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setPdfStatus(
        Object.fromEntries(runnableModels.map((k) => [k, { state: "done" }]))
      );
    } catch (error) {
      setPdfStatus({});
      alert(`PDF analysis failed: ${error.message}`);
    } finally {
      setPdfBusy(false);
    }
  };

  // ================= CHART DATA =================
  const chartData =
    analysisData && analysisData.cognitive_distribution_percent
      ? Object.entries(analysisData.cognitive_distribution_percent).map(
          ([name, value]) => ({ name, value })
        )
      : [];

  const anyBusy = singleBusy || assessBusy || pdfBusy;

  return (
    <div>
      <h1 className="title">🧠 DeepBloom</h1>
      <p className="subtitle">
        Transformer-integrated classification of questions into the six levels of
        Bloom's Taxonomy with DistilBERT, BERT, and RoBERTa
      </p>

      {/* ================= MODEL SELECTION ================= */}
      <div className="card">
        <h2>Choose the model</h2>
        <p className="mode-help">
          DeepBloom offers three fine-tuned transformer models. The lightweight option
          runs DistilBERT. The heavyweight options also run the larger BERT and RoBERTa
          models and show the prediction of the model that is most confident about each
          question.
        </p>
        <ModeSelector
          mode={mode}
          setMode={setMode}
          available={available}
          disabled={anyBusy}
        />
      </div>

      {/* ================= SINGLE QUESTION ================= */}
      <div className="card">
        <h2>Single Question Analysis</h2>

        <textarea
          placeholder="Enter your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button onClick={predict} disabled={singleBusy}>
          {singleBusy ? "Analyzing…" : "Analyze Question"}
        </button>

        <ModelRunPanel
          status={singleStatus}
          selected={result ? result.selected_model : null}
        />

        {result && (
          <div style={{ marginTop: "20px" }}>
            <h3>Prediction: {result.final_prediction}</h3>

            <h4>Confidence: {result.confidence.toFixed(3)}</h4>

            {result.models_run > 1 && (
              <p className="selection-note">
                Selected model: <b>{result.selected_model_name}</b> (most confident of{" "}
                {result.models_run} models). {result.models_agreeing} of{" "}
                {result.models_run} models predicted this level.
              </p>
            )}

            <div className="explanation">
              <h4>Rule-assisted Linguistic Insight</h4>
              {result.explanation &&
                result.explanation.map((exp, i) => <p key={i}>• {exp}</p>)}
            </div>
          </div>
        )}
      </div>

      {/* ================= ASSESSMENT ================= */}
      <div className="card">
        <h2>Assessment Cognitive Analyzer</h2>

        <textarea
          placeholder="Paste questions, one per line..."
          value={assessmentText}
          onChange={(e) => setAssessmentText(e.target.value)}
        />

        <button onClick={analyzeAssessment} disabled={assessBusy}>
          {assessBusy ? "Analyzing…" : "Analyze Assessment"}
        </button>

        <ModelRunPanel status={assessStatus} selected={null} />

        {analysisData && (
          <>
            {analysisData.model_selected_counts &&
              Object.keys(analysisData.model_selected_counts).length > 1 && (
                <p className="selection-note">
                  Most confident model per question:{" "}
                  {Object.entries(analysisData.model_selected_counts)
                    .map(([name, n]) => `${name} ${n}`)
                    .join(" · ")}
                </p>
              )}

            <div className="research-score">
              <div className="score-box">
                <h3>Cognitive Complexity Index</h3>
                <p className="big-score">{analysisData.complexity_score_out_of_10}</p>
                <p>{analysisData.complexity_level}</p>
              </div>

              <div className="formula-box">
                <h4>Computation Formula</h4>
                <p>CCI = Σ (Wi × Pi)</p>
                <p>Wi → Bloom weight</p>
                <p>Pi → Percentage of level</p>
                <p>Normalized to 0–10 scale</p>
              </div>
            </div>

            {chartData.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={140}
                      label
                    >
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </>
        )}
      </div>

      {/* ================= PDF ================= */}
      <div className="card">
        <h2>Upload Question Paper (PDF)</h2>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files[0])}
        />

        <button onClick={handlePdfUpload} disabled={pdfBusy}>
          {pdfBusy ? "Analyzing…" : "Analyze & Download Annotated Report"}
        </button>

        <ModelRunPanel status={pdfStatus} selected={null} />
      </div>
    </div>
  );
}

export default V1Page;
