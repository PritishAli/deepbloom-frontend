import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./DeepBloom.css";

const API = "https://pritish0007-pritishdeepbloombackend.hf.space";
const DEMO_PAPER = "/deepbloom-demo-question-paper.pdf";

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

const LEVELS = [
  { key: "Remember", order: 1, tone: "l1", meaning: "Recall facts and basic concepts", verbs: "define, list, name, recall" },
  { key: "Understand", order: 2, tone: "l2", meaning: "Explain ideas or concepts", verbs: "explain, describe, summarize, classify" },
  { key: "Apply", order: 3, tone: "l3", meaning: "Use information in a new situation", verbs: "apply, calculate, solve, use" },
  { key: "Analyze", order: 4, tone: "l4", meaning: "Break information into parts and relate them", verbs: "analyze, compare, differentiate, examine" },
  { key: "Evaluate", order: 5, tone: "l5", meaning: "Justify a decision or a position", verbs: "assess, justify, critique, judge" },
  { key: "Create", order: 6, tone: "l6", meaning: "Produce new or original work", verbs: "design, propose, construct, develop" },
];
const LEVEL_BY_KEY = Object.fromEntries(LEVELS.map((l) => [l.key, l]));
const levelOf = (name) => LEVEL_BY_KEY[name] || LEVEL_BY_KEY[name === "Analyse" ? "Analyze" : "Remember"];

const MODELS = {
  distilbert: { name: "DeepBloom (DistilBERT)", short: "DistilBERT", size: "66M parameters", note: "Lightweight and fastest" },
  bert: { name: "DeepBloom (BERT)", short: "BERT", size: "110M parameters", note: "Heavyweight" },
  roberta: { name: "DeepBloom (RoBERTa)", short: "RoBERTa", size: "125M parameters", note: "Heavyweight" },
};

const CHOICES = [
  { key: "distilbert", engine: "with DistilBERT", detail: "66M parameters", note: "Lightweight and fastest", models: ["distilbert"] },
  { key: "bert", engine: "with BERT", detail: "110M parameters", note: "Heavyweight", models: ["bert"] },
  { key: "roberta", engine: "with RoBERTa", detail: "125M parameters", note: "Heavyweight", models: ["roberta"] },
  {
    key: "ensemble",
    engine: "Best of DistilBERT, BERT and RoBERTa",
    detail: "Runs all three models",
    note: "Shows the most confident cognitive level",
    models: ["distilbert", "bert", "roberta"],
  },
];

const AUTHORS = [
  {
    name: "Pritish Ali",
    role: "Department of Computer Science and Engineering",
  },
  {
    name: "Indrajit Saha",
    role: "Department of Computer Science and Engineering",
    email: "indrajit@nitttrkol.ac.in",
  },
];

/* Example questions taken from the DeepBloom training data, one for each level. */
const EXAMPLES = [
  "Name the four major food groups.",
  "Explain in your own words what a recessive gene is.",
  "Calculate the deflection of a beam under uniform loading.",
  "Distinguish between micro and macro economics.",
  "Evaluate appropriate and inappropriate actions of characters.",
  "Design a building according to given specifications.",
];

const SAMPLE_SET = [
  "List the steps involved in titration.",
  "What is a global variable?",
  "Describe characteristics and importance of secondary market.",
  "Summarize this magazine article.",
  "Use Laplace to solve the following problems",
  "Calculate the market demand and market supply in table form.",
  "Compare two of the characters in this book.",
  "Compare and contrast two characters in the book.",
  "Evaluate the corrosion monitoring needs of a chemical processing plant.",
  "Create a storyboard for a sequel to your book. Use the same characters.",
].join("\n");

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pct = (v) => `${(v * 100).toFixed(1)}%`;

async function postJSON(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `The server answered with status ${res.status}.`);
  return data;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCSV(rows) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}


/* Shows a hint when the server is slow to answer (for example after a cold start). */
function useSlowHint(active, ms = 8000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return slow;
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function LevelTag({ name }) {
  const l = levelOf(name);
  return <span className={`level-tag ${l.tone}`}>{l.key}</span>;
}

function ConfidenceBar({ value }) {
  return (
    <span className="conf">
      <span className="conf-track" aria-hidden="true">
        <span className="conf-fill" style={{ width: `${Math.max(2, value * 100)}%` }} />
      </span>
      <span className="conf-num">{pct(value)}</span>
    </span>
  );
}

function BloomLadder({ active, confidence, compact }) {
  return (
    <ol className={`ladder ${compact ? "compact" : ""} ${active ? "has-active" : ""}`} aria-label="Bloom's Taxonomy levels">
      {[...LEVELS].reverse().map((l) => {
        const on = active === l.key;
        return (
          <li key={l.key} className={`rung ${l.tone} ${on ? "on" : ""}`} aria-current={on ? "true" : undefined}>
            <span className="rung-bar" style={{ "--w": `${110 - l.order * 10}%` }}>
              <span className="rung-name">{l.key}</span>
              {on && confidence != null && <span className="rung-conf">{pct(confidence)}</span>}
            </span>
            {!compact && <span className="rung-verbs">{l.verbs}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/* The brand mark: a six-petal bloom, one petal per cognitive level */
const PETAL = "M0 0 C -46 -30, -42 -96, 0 -120 C 42 -96, 46 -30, 0 0 Z";

function BloomMark({ size = 28 }) {
  return (
    <svg className="bloom-mark" width={size} height={size} viewBox="-130 -130 260 260" aria-hidden="true">
      {LEVELS.map((l, i) => (
        <path key={l.key} d={PETAL} className={`petal ${l.tone}`} transform={`rotate(${i * 60})`} />
      ))}
      <circle r="20" className="bloom-core" />
    </svg>
  );
}

function BloomFlower() {
  return (
    <figure className="flower">
      <svg viewBox="-230 -230 460 460" role="img" aria-label="The six levels of Bloom's Taxonomy as the petals of a flower">
        {LEVELS.map((l, i) => {
          const a = ((i * 60 - 90) * Math.PI) / 180;
          const r = 192;
          return (
            <g key={l.key} className="petal-group" style={{ "--d": `${i * 90}ms` }}>
              <path d={PETAL} className={`petal ${l.tone}`} transform={`rotate(${i * 60}) scale(1.3)`} />
              <text x={Math.cos(a) * r} y={Math.sin(a) * r} className="petal-label" textAnchor="middle" dominantBaseline="middle">
                {l.key}
              </text>
            </g>
          );
        })}
        <circle r="34" className="bloom-core" />
        <text y="1" className="core-label" textAnchor="middle" dominantBaseline="middle">
          6 levels
        </text>
      </svg>
      <figcaption>Bloom&rsquo;s Taxonomy</figcaption>
    </figure>
  );
}

function ModelSelector({ value, onChange, disabled, available }) {
  return (
    <div className="choices" role="radiogroup" aria-label="Model">
      {CHOICES.map((c) => {
        const ok = c.models.every((m) => available[m] !== false);
        const selected = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`choice ${selected ? "selected" : ""} ${c.key === "ensemble" ? "ensemble" : ""}`}
            onClick={() => onChange(c.key)}
            disabled={disabled || !ok}
            title={ok ? undefined : "This model is not available on the server right now"}
          >
            <span className="choice-check" aria-hidden="true">
              <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
            </span>
            <span className="choice-title">DeepBloom</span>
            <span className="choice-engine">({c.engine})</span>
            <span className="choice-detail">{c.detail}</span>
            <span className="choice-note">{c.note}</span>
          </button>
        );
      })}
    </div>
  );
}

function RunStatus({ status }) {
  const keys = Object.keys(status);
  if (!keys.length) return null;
  return (
    <div className="runs" aria-live="polite">
      {keys.map((k) => {
        const s = status[k];
        return (
          <div key={k} className={`run ${s.state}`}>
            <span className="run-icon" aria-hidden="true">
              {s.state === "running" && <span className="spinner" />}
              {s.state === "done" && "✓"}
              {s.state === "error" && "!"}
            </span>
            <span className="run-name">{MODELS[k].name}</span>
            <span className="run-state">
              {s.state === "running" && "Assessing…"}
              {s.state === "done" && (s.ms != null ? `Done in ${Math.round(s.ms)} ms` : "Done")}
              {s.state === "error" && "Not available"}
            </span>
            {s.state === "running" && <span className="run-progress" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}

function SlowNote({ show }) {
  if (!show) return null;
  return (
    <p className="slow-note">
      The server is starting up. The first request after a quiet period can take up to a minute.
    </p>
  );
}

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p className="error-note" role="alert">
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Results for many questions (question set and question paper)        */
/* ------------------------------------------------------------------ */

function SetResults({ data, choice, onDownloadReport }) {
  const rows = data.question_results || [];
  const counts =
    data.cognitive_distribution_count ||
    Object.fromEntries(LEVELS.map((l) => [l.key, rows.filter((r) => r.label === l.key).length]));
  const share = data.cognitive_distribution_percent || {};
  const total = rows.length || data.total_questions || 0;
  const higher = ["Analyze", "Evaluate", "Create"].reduce((s, k) => s + (share[k] || 0), 0);
  const dominant = LEVELS.reduce((best, l) => ((counts[l.key] || 0) > (counts[best.key] || 0) ? l : best), LEVELS[0]);
  const isEnsemble = choice === "ensemble";

  const exportCSV = () => {
    const header = ["#", "Question", "Bloom level", "Confidence", "Model"];
    const body = rows.map((r, i) => [i + 1, r.question, r.label, r.confidence, `DeepBloom (${r.model_name})`]);
    downloadBlob(new Blob([toCSV([header, ...body])], { type: "text/csv" }), "DeepBloom_results.csv");
  };

  return (
    <div className="results reveal">
      <dl className="summary">
        <div>
          <dt>Questions</dt>
          <dd>{total}</dd>
        </div>
        <div>
          <dt>Cognitive Complexity Index</dt>
          <dd>
            {data.complexity_score_out_of_10}
            <small> / 10</small>
          </dd>
          <dd className="summary-sub">{data.complexity_level}. Higher means more demanding questions.</dd>
        </div>
        <div>
          <dt>Most frequent level</dt>
          <dd>
            <LevelTag name={dominant.key} />
          </dd>
        </div>
        <div>
          <dt>Higher-order questions</dt>
          <dd>{higher.toFixed(0)}%</dd>
          <dd className="summary-sub">Questions at Analyze, Evaluate, or Create</dd>
        </div>
      </dl>

      {data.insight && <p className="insight">{data.insight}</p>}

      <div className="stack-bar" aria-hidden="true">
        {LEVELS.map((l) =>
          (share[l.key] || 0) > 0 ? (
            <span key={l.key} className={`stack-seg ${l.tone}`} style={{ flexGrow: share[l.key] }} title={`${l.key}: ${share[l.key]}%`} />
          ) : null
        )}
      </div>

      <h3 className="table-title">Distribution across the six levels</h3>
      <div className="table-wrap">
        <table className="stack dist">
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">What it asks of learners</th>
              <th scope="col" className="num">Questions</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l.key}>
                <td data-label="Level">
                  <LevelTag name={l.key} />
                </td>
                <td className="muted hide-s" data-label="Meaning">{l.meaning}</td>
                <td className="num" data-label="Questions">{counts[l.key] || 0}</td>
                <td data-label="Share">
                  <span className="share">
                    <span className="share-track">
                      <span className={`share-fill ${l.tone}`} style={{ width: `${share[l.key] || 0}%` }} />
                    </span>
                    <span className="share-num">{(share[l.key] || 0).toFixed(1)}%</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-head-row">
        <h3 className="table-title">Every question</h3>
        <div className="table-actions">
          <button type="button" className="btn ghost" onClick={exportCSV}>
            Export as CSV
          </button>
          {onDownloadReport && (
            <button type="button" className="btn ghost" onClick={onDownloadReport}>
              Download PDF report
            </button>
          )}
        </div>
      </div>
      <div className="table-wrap">
        <table className="questions stack">
          <thead>
            <tr>
              <th scope="col" className="num">#</th>
              <th scope="col">Question</th>
              <th scope="col">Bloom level</th>
              <th scope="col">Confidence</th>
              {isEnsemble && <th scope="col">Answered by</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              return (
                <tr key={`${i}-${r.question}`} style={{ "--i": i }}>
                  <td className="num muted qn" data-label="#">{i + 1}</td>
                  <td className="q" data-label="Question">{r.question}</td>
                  <td data-label="Bloom level">
                    <LevelTag name={r.label} />
                  </td>
                  <td data-label="Confidence">
                    <ConfidenceBar value={r.confidence} />
                  </td>
                  {isEnsemble && <td data-label="Answered by">DeepBloom ({r.model_name})</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tool: single question                                               */
/* ------------------------------------------------------------------ */

function SingleQuestion({ choice, available, onBusy }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const slow = useSlowHint(busy);

  useEffect(() => onBusy(busy), [busy, onBusy]);

  const run = async () => {
    const q = text.trim();
    if (!q) {
      setError("Type or paste a question first.");
      return;
    }
    const keys = CHOICES.find((c) => c.key === choice).models.filter((k) => available[k] !== false);
    setError("");
    setResult(null);
    setBusy(true);
    setStatus(Object.fromEntries(keys.map((k) => [k, { state: "running" }])));

    const outputs = await Promise.all(
      keys.map(async (k) => {
        try {
          const d = await postJSON("/predict-model", { text: q, model: k });
          setStatus((s) => ({ ...s, [k]: { state: "done", ms: d.time_ms } }));
          return d;
        } catch {
          setStatus((s) => ({ ...s, [k]: { state: "error" } }));
          return null;
        }
      })
    );
    setBusy(false);
    const ok = outputs.filter(Boolean);
    if (!ok.length) {
      setError("The models could not be reached. Check your connection and try again in a minute.");
      return;
    }
    const chosen = ok.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    setResult({ question: q, outputs: ok, chosen });
  };

  const level = result ? levelOf(result.chosen.prediction) : null;

  return (
    <div className="tool">
      <label className="field-label" htmlFor="single-q">
        Question
      </label>
      <textarea
        id="single-q"
        rows={3}
        value={text}
        placeholder="For example: Distinguish between micro and macro economics."
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run();
        }}
      />
      <div className="examples">
        <span className="muted">Try an example:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => setText(ex)}>
            {ex}
          </button>
        ))}
      </div>
      <div className="actions">
        <button type="button" className={`btn primary ${busy ? "is-busy" : ""}`} onClick={run} disabled={busy}>
          {busy ? "Assessing…" : "Cognitive assessment"}
        </button>
        <span className="hint">Ctrl + Enter also works</span>
      </div>

      <RunStatus status={status} />
      <SlowNote show={slow} />
      <ErrorNote message={error} />

      {result && (
        <div className="results reveal">
          <div className="verdict">
            <div className="verdict-main">
              <p className="verdict-q">“{result.question}”</p>
              <p className={`verdict-level ${level.tone}`}>{level.key}</p>
              <p className="verdict-meaning">{level.meaning}.</p>
              <p className="verdict-meta">
                Confidence {pct(result.chosen.confidence)}, answered by {MODELS[result.chosen.model].name}
                {result.outputs.length > 1 && ", the most confident of the three models"}
              </p>
            </div>
            <BloomLadder active={level.key} confidence={result.chosen.confidence} compact />
          </div>

          <h3 className="table-title">{result.outputs.length > 1 ? "Results of each model" : "Model result"}</h3>
          <div className="table-wrap">
            <table className="stack">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Predicted level</th>
                  <th scope="col">Confidence</th>
                  <th scope="col" className="num">Response time</th>
                  {result.outputs.length > 1 && <th scope="col">Status</th>}
                </tr>
              </thead>
              <tbody>
                {result.outputs.map((o) => (
                  <tr key={o.model} className={o.model === result.chosen.model ? "row-chosen" : ""}>
                    <td data-label="Model">{MODELS[o.model].name}</td>
                    <td data-label="Predicted level">
                      <LevelTag name={o.prediction} />
                    </td>
                    <td data-label="Confidence">
                      <ConfidenceBar value={o.confidence} />
                    </td>
                    <td className="num" data-label="Response time">{Math.round(o.time_ms)} ms</td>
                    {result.outputs.length > 1 && (
                      <td className="hide-empty" data-label="">{o.model === result.chosen.model ? <span className="badge">Most confident</span> : null}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="two-col">
            <div>
              <h3 className="table-title">How sure the model is</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col" className="num">Rank</th>
                      <th scope="col">Level</th>
                      <th scope="col">Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.chosen.top_predictions.map((p, i) => (
                      <tr key={p.level}>
                        <td className="num muted">{i + 1}</td>
                        <td>
                          <LevelTag name={p.level} />
                        </td>
                        <td>
                          <ConfidenceBar value={p.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="table-title">Why this level?</h3>
              <div className="why">
                <p>
                  A <strong>{level.key}</strong> question asks learners to {level.meaning.toLowerCase()}. Questions at
                  this level often use words such as <em>{level.verbs}</em>.
                </p>
                {(result.chosen.explanation || []).length > 0 && (
                  <ul>
                    {result.chosen.explanation.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="fine">
                The model reads the whole question, not only its key words, so a question can belong to a level even
                when its first word suggests another one.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tool: question set                                                  */
/* ------------------------------------------------------------------ */

function QuestionSet({ choice, available, onBusy }) {
  const [text, setText] = useState("");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const slow = useSlowHint(busy);
  const questions = useMemo(() => text.split("\n").map((q) => q.trim()).filter(Boolean), [text]);

  useEffect(() => onBusy(busy), [busy, onBusy]);

  const run = async () => {
    if (!questions.length) {
      setError("Enter at least one question, one per line.");
      return;
    }
    const keys = CHOICES.find((c) => c.key === choice).models.filter((k) => available[k] !== false);
    setError("");
    setData(null);
    setBusy(true);
    setStatus(Object.fromEntries(keys.map((k) => [k, { state: "running" }])));
    try {
      const d = await postJSON("/analyze-assessment", { questions, mode: choice });
      setStatus(Object.fromEntries(keys.map((k) => [k, { state: "done" }])));
      setData({ ...d, _choice: choice });
    } catch (e) {
      setStatus({});
      setError(`The analysis did not finish. ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tool">
      <label className="field-label" htmlFor="set-q">
        Questions, one per line
      </label>
      <textarea
        id="set-q"
        rows={8}
        value={text}
        placeholder={"Define the term ecosystem.\nExplain how vaccines work.\nDesign a poster that promotes road safety."}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="actions">
        <button type="button" className={`btn primary ${busy ? "is-busy" : ""}`} onClick={run} disabled={busy}>
          {busy ? "Analyzing…" : `Analyze ${questions.length || ""} question${questions.length === 1 ? "" : "s"}`}
        </button>
        <button type="button" className="btn ghost" onClick={() => setText(SAMPLE_SET)} disabled={busy}>
          Load a sample set
        </button>
      </div>
      <RunStatus status={status} />
      <SlowNote show={slow} />
      <ErrorNote message={error} />
      {data && <SetResults data={data} choice={data._choice} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tool: question paper (PDF)                                          */
/* ------------------------------------------------------------------ */

function QuestionPaper({ choice, available, onBusy }) {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const slow = useSlowHint(busy);
  const inputRef = useRef(null);

  useEffect(() => onBusy(busy), [busy, onBusy]);

  const analyze = async (pdf) => {
    if (!pdf) {
      setError("Choose a PDF question paper first, or try the demo paper.");
      return;
    }
    const keys = CHOICES.find((c) => c.key === choice).models.filter((k) => available[k] !== false);
    setError("");
    setData(null);
    setBusy(true);
    setStatus(Object.fromEntries(keys.map((k) => [k, { state: "running" }])));
    try {
      const form = new FormData();
      form.append("file", pdf);
      form.append("mode", choice);
      const res = await fetch(`${API}/analyze-paper`, { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || `The server answered with status ${res.status}.`);
      setStatus(Object.fromEntries(keys.map((k) => [k, { state: "done" }])));
      setData({ ...d, _choice: choice });
    } catch (e) {
      setStatus({});
      setError(`The paper could not be analyzed. ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const loadDemo = async () => {
    try {
      const res = await fetch(DEMO_PAPER);
      const blob = await res.blob();
      const demo = new File([blob], "deepbloom-demo-question-paper.pdf", { type: "application/pdf" });
      setFile(demo);
      analyze(demo);
    } catch {
      setError("The demo paper could not be loaded.");
    }
  };

  const pick = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files can be analyzed.");
      return;
    }
    setError("");
    setFile(f);
  };

  const downloadReport = () => {
    if (!data || !data.report_pdf_base64) return;
    const bytes = Uint8Array.from(atob(data.report_pdf_base64), (c) => c.charCodeAt(0));
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "DeepBloom_Report.pdf");
  };

  return (
    <div className="tool">
      <div
        className={`drop ${drag ? "drag" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="visually-hidden"
          id="paper-file"
          onChange={(e) => pick(e.target.files[0])}
        />
        {file ? (
          <p className="drop-file">
            <strong>{file.name}</strong>
            <span className="muted"> · {(file.size / 1024).toFixed(0)} KB</span>
          </p>
        ) : (
          <p className="drop-title">Drop a PDF question paper here</p>
        )}
        <p className="muted drop-help">Questions should be numbered, for example 1., 2., 3. or (a), (b).</p>
        <button type="button" className="btn ghost" onClick={() => inputRef.current && inputRef.current.click()} disabled={busy}>
          {file ? "Choose another file" : "Choose a file"}
        </button>
      </div>

      <div className="actions">
        <button type="button" className={`btn primary ${busy ? "is-busy" : ""}`} onClick={() => analyze(file)} disabled={busy || !file}>
          {busy ? "Analyzing…" : "Analyze question paper"}
        </button>
        <button type="button" className="btn ghost" onClick={loadDemo} disabled={busy}>
          Try the demo paper
        </button>
        <a className="text-link" href={DEMO_PAPER} download>
          Download the demo paper
        </a>
      </div>

      <RunStatus status={status} />
      <SlowNote show={slow} />
      <ErrorNote message={error} />
      {data && <SetResults data={data} choice={data._choice} onDownloadReport={downloadReport} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const TOOLS = [
  { key: "single", label: "Single question" },
  { key: "set", label: "Question set" },
  { key: "paper", label: "Question paper" },
];

/* ------------------------------------------------------------------ */
/* About: institute logo and visit counter                            */
/* ------------------------------------------------------------------ */

const LOGO_SOURCES = [
  `${process.env.PUBLIC_URL}/nitttr-kolkata-logo.png`,
  "https://ws.nitttrkol.ac.in/images/logo.png",
];

function InstituteLogo() {
  const [index, setIndex] = useState(0);
  if (index >= LOGO_SOURCES.length) {
    return (
      <span className="inst-logo inst-fallback" aria-label="NITTTR Kolkata">
        NITTTR
      </span>
    );
  }
  return (
    <img
      className="inst-logo"
      src={LOGO_SOURCES[index]}
      alt="NITTTR Kolkata logo"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

/* Animates a number from 0 up to its value once it is known. */
function useCountUp(target, ms = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return undefined;
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      reduce = false;
    }
    if (reduce || target < 2) {
      setValue(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/* Counts one visit per browser session on the DeepBloom server and shows the total. */
function VisitCounter() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let alive = true;
    let counted = false;
    try {
      counted = sessionStorage.getItem("deepbloom-visit") === "1";
    } catch (e) {
      counted = false;
    }
    const req = counted ? fetch(`${API}/visits`) : fetch(`${API}/visit`, { method: "POST" });
    req
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no counter"))))
      .then((d) => {
        if (!alive || typeof d.visits !== "number") return;
        setCount(d.visits);
        try {
          sessionStorage.setItem("deepbloom-visit", "1");
        } catch (e) {
          /* storage unavailable: the visit may be counted again */
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const shown = useCountUp(count);
  if (count === null) return null;
  return (
    <p className="visits" aria-live="polite">
      <span className="visits-num">{shown.toLocaleString("en-IN")}</span>
      <span className="muted">visits since launch</span>
    </p>
  );
}

export default function DeepBloom() {
  const [choice, setChoice] = useState("distilbert");
  const [tool, setTool] = useState("single");
  const [available, setAvailable] = useState({});
  const [server, setServer] = useState("checking");
  const [busyMap, setBusyMap] = useState({});
  const anyBusy = Object.values(busyMap).some(Boolean);

  const busySingle = useCallback((b) => setBusyMap((m) => ({ ...m, single: b })), []);
  const busySet = useCallback((b) => setBusyMap((m) => ({ ...m, set: b })), []);
  const busyPaper = useCallback((b) => setBusyMap((m) => ({ ...m, paper: b })), []);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/models`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const a = {};
        (d.models || []).forEach((m) => {
          a[m.key] = m.available;
        });
        setAvailable(a);
        setServer("ready");
      })
      .catch(() => alive && setServer("offline"));
    return () => {
      alive = false;
    };
  }, []);

  const current = CHOICES.find((c) => c.key === choice);
  const toolIndex = TOOLS.findIndex((t) => t.key === tool);

  return (
    <div className="site">
      <div className="band">
        <div className="page">
          <header className="topbar">
            <a className="wordmark" href="#top">
              <BloomMark size={28} />
              DeepBloom
            </a>
            <nav className="topnav" aria-label="Sections">
              <a href="#classify">Assessment</a>
              <a href="#about">About</a>
            </nav>
            <span className={`server ${server}`} title="Status of the classification server">
              <span className="server-dot" aria-hidden="true" />
              {server === "ready" && "Models online"}
              {server === "checking" && "Connecting"}
              {server === "offline" && "Server waking up"}
            </span>
          </header>

          <section className="hero" id="top">
            <div className="hero-copy">
              <h1>Transformer-based framework for cognitive assessment of questions</h1>
              <a className="btn bloom" href="#classify">
                Start cognitive assessment
              </a>
            </div>
            <div className="hero-flower">
              <BloomFlower />
            </div>
          </section>
        </div>
      </div>

      <main className="page">
        <section id="classify" className="workspace">
          <div className="step">
            <h2><span className="step-num">1</span>Select model</h2>
            <ModelSelector value={choice} onChange={setChoice} disabled={anyBusy} available={available} />
            <p className="selection-line" aria-live="polite">
              Using <strong>DeepBloom ({current.engine})</strong>
              {current.key === "ensemble"
                ? ": DistilBERT, BERT and RoBERTa all run, and you see the most confident cognitive level."
                : `, ${current.detail}.`}
            </p>
          </div>

          <div className="step">
            <h2><span className="step-num">2</span>Submit question</h2>
            <div className="tabs" role="tablist" aria-label="Analysis type" style={{ "--tab": toolIndex }}>
              {TOOLS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`tab-${t.key}`}
                  aria-selected={tool === t.key}
                  aria-controls={`panel-${t.key}`}
                  className={`tab ${tool === t.key ? "active" : ""}`}
                  onClick={() => setTool(t.key)}
                >
                  {t.label}
                </button>
              ))}
              <span className="tab-indicator" aria-hidden="true" />
            </div>

            <div role="tabpanel" id="panel-single" aria-labelledby="tab-single" hidden={tool !== "single"}>
              <SingleQuestion choice={choice} available={available} onBusy={busySingle} />
            </div>
            <div role="tabpanel" id="panel-set" aria-labelledby="tab-set" hidden={tool !== "set"}>
              <QuestionSet choice={choice} available={available} onBusy={busySet} />
            </div>
            <div role="tabpanel" id="panel-paper" aria-labelledby="tab-paper" hidden={tool !== "paper"}>
              <QuestionPaper choice={choice} available={available} onBusy={busyPaper} />
            </div>
          </div>
        </section>

        <footer id="about" className="about">
          <div className="about-inst">
            <InstituteLogo />
            <div>
              <p className="about-kicker">Developed at</p>
              <h2>National Institute of Technical Teachers&rsquo; Training and Research, Kolkata</h2>
              <p className="muted">
                Department of Computer Science and Engineering, Block FC, Sector III, Salt Lake City, Kolkata 700106,
                India
              </p>
            </div>
          </div>

          <div className="about-grid">
            <div>
              <h3>Developed by</h3>
              <ul className="people">
                {AUTHORS.map((a) => (
                  <li key={a.name}>
                    <span className="person-mark" aria-hidden="true">
                      {a.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </span>
                    <span>
                      <strong>{a.name}</strong>
                      <span className="muted person-role">{a.role}, NITTTR Kolkata</span>
                      {a.email && (
                        <a className="person-mail" href={`mailto:${a.email}`}>
                          {a.email}
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Contact</h3>
              <p className="muted">
                For questions, feedback, or to use DeepBloom in your institution, write to{" "}
                <a href="mailto:indrajit@nitttrkol.ac.in">indrajit@nitttrkol.ac.in</a>.
              </p>
              <VisitCounter />
            </div>
          </div>

          <p className="fine about-note">
            <strong>DeepBloom</strong> &copy; {new Date().getFullYear()} NITTTR Kolkata
          </p>
        </footer>
      </main>
    </div>
  );
}
