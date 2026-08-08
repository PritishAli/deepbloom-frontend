import React, { useState } from "react";
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

function V1Page() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);

  const [assessmentText, setAssessmentText] = useState("");
  const [analysisData, setAnalysisData] = useState(null);

  const [pdfFile, setPdfFile] = useState(null);

  // ================= SINGLE QUESTION =================
  const predict = async () => {
    try {
      if (!question.trim()) {
        alert("Please enter a question first.");
        return;
      }

      const response = await fetch(`${API}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: question,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Prediction failed");
      }

      setResult(data);
    } catch (error) {
      console.error("Prediction error:", error);
      alert(`Prediction failed: ${error.message}`);
    }
  };

  // ================= ASSESSMENT =================
  const analyzeAssessment = async () => {
    try {
      const questions = assessmentText
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      if (questions.length === 0) {
        alert("Please enter at least one question.");
        return;
      }

      const response = await fetch(`${API}/analyze-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Assessment analysis failed"
        );
      }

      setAnalysisData(data);
    } catch (error) {
      console.error("Assessment error:", error);
      alert(`Assessment analysis failed: ${error.message}`);
    }
  };

  // ================= PDF =================
  const handlePdfUpload = async () => {
    try {
      if (!pdfFile) {
        alert("Please select a PDF first.");
        return;
      }

      const formData = new FormData();
      formData.append("file", pdfFile);

      const response = await fetch(`${API}/upload-paper`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.detail || "PDF analysis failed"
        );
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
    } catch (error) {
      console.error("PDF error:", error);
      alert(`PDF analysis failed: ${error.message}`);
    }
  };

  // ================= CHART DATA =================

  const chartData =
    analysisData &&
    analysisData.cognitive_distribution_percent
      ? Object.entries(
          analysisData.cognitive_distribution_percent
        ).map(([name, value]) => ({
          name,
          value,
        }))
      : [];

  return (
    <div>
      <h1 className="title">🧠 DeepBloom</h1>

      {/* ================= SINGLE QUESTION ================= */}
      <div className="card">
        <h2>Single Question Analysis</h2>

        <textarea
          placeholder="Enter your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button onClick={predict}>
          Analyze Question
        </button>

        {result && (
          <div style={{ marginTop: "20px" }}>
            <h3>
              Prediction: {result.final_prediction}
            </h3>

            <h4>
              Confidence:{" "}
              {result.top_predictions &&
              result.top_predictions.length > 0
                ? result.top_predictions[0].confidence.toFixed(3)
                : "N/A"}
            </h4>

            <div className="explanation">
              <h4>Explainable AI Insight</h4>

              {result.explanation &&
                result.explanation.map((exp, i) => (
                  <p key={i}>• {exp}</p>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= ASSESSMENT ================= */}
      <div className="card">
        <h2>Assessment Cognitive Analyzer</h2>

        <textarea
          placeholder="Paste questions..."
          value={assessmentText}
          onChange={(e) =>
            setAssessmentText(e.target.value)
          }
        />

        <button onClick={analyzeAssessment}>
          Analyze Assessment
        </button>

        {analysisData && (
          <>
            <div className="research-score">
              <div className="score-box">
                <h3>Cognitive Complexity Index</h3>

                <p className="big-score">
                  {analysisData.complexity_score_out_of_10}
                </p>

                <p>
                  {analysisData.complexity_level}
                </p>
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
                <ResponsiveContainer
                  width="100%"
                  height={350}
                >
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={140}
                      label
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            COLORS[
                              index % COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="#6366F1"
                    />
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
          onChange={(e) =>
            setPdfFile(e.target.files[0])
          }
        />

        <button onClick={handlePdfUpload}>
          Analyze & Download Annotated Report
        </button>
      </div>
    </div>
  );
}

export default V1Page;
