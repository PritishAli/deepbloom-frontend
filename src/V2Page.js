import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API =
  "https://pritish0007-pritishdeepbloombackend.hf.space";

const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

function V2Page() {
  const [userId, setUserId] = useState("");
  const [domainText, setDomainText] = useState("");
  const [status, setStatus] = useState(null);

  const [compareQuestion, setCompareQuestion] =
    useState("");

  const [v1Score, setV1Score] = useState(null);
  const [v2Score, setV2Score] = useState(null);

  const [adaptLoading, setAdaptLoading] =
    useState(false);

  const [compareLoading, setCompareLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  // =====================================================
  // V2 ADAPTATION
  // =====================================================

  const adapt = async () => {
    try {
      setErrorMessage("");

      const cleanUserId = userId.trim();

      const questions = domainText
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      if (!cleanUserId) {
        alert("Enter User ID");
        return;
      }

      if (questions.length === 0) {
        alert("Paste some questions first");
        return;
      }

      setAdaptLoading(true);

      setStatus(null);

      const response = await fetch(
        `${API}/deepbloom-v2/adapt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: cleanUserId,
            questions: questions,
          }),
        }
      );

      const data = await response.json();

      console.log("V2 adaptation response:", data);

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            "V2 adaptation failed"
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setStatus({
        ...data,
        uploaded:
          data.uploaded !== undefined
            ? data.uploaded
            : questions.length,
      });

      alert(
        "DeepBloom V2 adaptation completed successfully!"
      );
    } catch (error) {
      console.error(
        "V2 adaptation error:",
        error
      );

      setErrorMessage(error.message);

      alert(
        `Adaptation failed: ${error.message}`
      );
    } finally {
      setAdaptLoading(false);
    }
  };

  // =====================================================
  // V1 vs V2 COMPARISON
  // =====================================================

  const compare = async () => {
    try {
      setErrorMessage("");

      const cleanUserId = userId.trim();
      const cleanQuestion = compareQuestion.trim();

      if (!cleanUserId) {
        alert(
          "Enter the same User ID used for adaptation."
        );
        return;
      }

      if (!cleanQuestion) {
        alert(
          "Enter a question for comparison."
        );
        return;
      }

      if (!status) {
        alert(
          "Please run 'Expand Knowledge' first so the V2 adapter is created."
        );
        return;
      }

      setCompareLoading(true);

      setV1Score(null);
      setV2Score(null);

      // =================================================
      // V1
      // =================================================

      console.log("Calling DeepBloom V1...");

      const v1Response = await fetch(
        `${API}/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: cleanQuestion,
          }),
        }
      );

      const v1Data =
        await v1Response.json();

      console.log(
        "V1 response:",
        v1Data
      );

      if (!v1Response.ok) {
        throw new Error(
          v1Data.detail ||
            v1Data.error ||
            "V1 prediction failed"
        );
      }

      const v1Confidence =
        v1Data?.top_predictions?.[0]
          ?.confidence;

      if (
        v1Confidence === undefined ||
        v1Confidence === null
      ) {
        throw new Error(
          "V1 response did not contain confidence."
        );
      }

      // =================================================
      // V2
      // =================================================

      console.log(
        "Calling DeepBloom V2..."
      );

      const v2Response = await fetch(
        `${API}/deepbloom-v2/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: cleanUserId,
            text: cleanQuestion,
          }),
        }
      );

      const v2Data =
        await v2Response.json();

      console.log(
        "V2 response:",
        v2Data
      );

      if (!v2Response.ok) {
        throw new Error(
          v2Data.detail ||
            v2Data.error ||
            "V2 prediction failed"
        );
      }

      if (v2Data.error) {
        throw new Error(v2Data.error);
      }

      const v2Confidence =
        v2Data?.confidence;

      if (
        v2Confidence === undefined ||
        v2Confidence === null
      ) {
        throw new Error(
          "V2 response did not contain confidence."
        );
      }

      setV1Score(
        Number(v1Confidence)
      );

      setV2Score(
        Number(v2Confidence)
      );
    } catch (error) {
      console.error(
        "Comparison error:",
        error
      );

      setErrorMessage(error.message);

      alert(
        `Comparison failed: ${error.message}`
      );
    } finally {
      setCompareLoading(false);
    }
  };

  // =====================================================
  // CHART DATA
  // =====================================================

  const chartData = [
    {
      name: "DeepBloom V1",
      confidence:
        v1Score !== null ? v1Score : 0,
    },
    {
      name: "DeepBloom V2",
      confidence:
        v2Score !== null ? v2Score : 0,
    },
  ];

  const bloomData =
    status?.distribution
      ? Object.entries(
          status.distribution
        ).map(([name, value]) => ({
          name,
          value,
        }))
      : [];

  const pipelineData = status
    ? [
        {
          name: "Uploaded",
          value: status.uploaded || 0,
        },
        {
          name: "Trusted",
          value:
            status.trusted_samples ||
            status.validated_samples ||
            0,
        },
      ]
    : [];

  // =====================================================
  // RESPONSIVE PAGE
  // =====================================================

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        padding: "0 12px 40px",
      }}
    >
      {/* ================= HEADER ================= */}

      <h1
        style={{
          textAlign: "center",
          fontSize: "clamp(32px, 7vw, 52px)",
          margin: "20px 0 10px",
          color: "#4F46E5",
        }}
      >
        🚀 DeepBloom V2
      </h1>

      <p
        style={{
          textAlign: "center",
          marginBottom: "25px",
          fontSize: "clamp(14px, 3vw, 18px)",
          padding: "0 10px",
        }}
      >
        Automatic Knowledge Expansion &
        Domain Adaptation
      </p>

      {/* ================= WORKFLOW ================= */}

      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto 20px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <h2>
          Knowledge Expansion Workflow
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            textAlign: "center",
            padding: "10px",
          }}
        >
          <div>📥 Upload Questions</div>

          <div>↓</div>

          <div>
            🧠 Generate Pseudo Labels
          </div>

          <div>↓</div>

          <div>
            ✅ Verb Validation
          </div>

          <div>↓</div>

          <div>
            🔍 Cluster Annotation
          </div>

          <div>↓</div>

          <div>
            🚀 LoRA Adaptation
          </div>

          <div>↓</div>

          <div>
            🎯 Expanded DeepBloom V2
          </div>
        </div>
      </div>

      {/* ================= KNOWLEDGE EXPANSION ================= */}

      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto 20px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <h2>
          Knowledge Expansion Pipeline
        </h2>

        <ul>
          <li>
            ✓ Pseudo Label Generation
          </li>

          <li>
            ✓ Bloom Verb Validation
          </li>

          <li>
            ✓ Confidence Trust Filtering
          </li>

          <li>
            ✓ Cluster Annotation
          </li>

          <li>
            ✓ Knowledge Expansion
          </li>

          <li>
            ✓ LoRA Adaptation
          </li>
        </ul>

        {/* USER ID */}

        <input
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={(e) =>
            setUserId(e.target.value)
          }
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* QUESTIONS */}

        <textarea
          rows="10"
          placeholder="Paste one question per line..."
          value={domainText}
          onChange={(e) =>
            setDomainText(e.target.value)
          }
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />

        <button
          onClick={adapt}
          disabled={adaptLoading}
        >
          {adaptLoading
            ? "Adapting DeepBloom V2..."
            : "Expand Knowledge"}
        </button>

        {/* ================= ERROR ================= */}

        {errorMessage && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              borderRadius: "10px",
              background: "#FEF2F2",
              color: "#B91C1C",
              wordBreak: "break-word",
            }}
          >
            <strong>Error:</strong>{" "}
            {errorMessage}
          </div>
        )}

        {/* ================= RESULTS ================= */}

        {status && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: "12px",
              background: "#F8FAFC",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <h3>
              Adaptation Results
            </h3>

            {/* BLOOM DISTRIBUTION */}

            {bloomData.length > 0 && (
              <div
                style={{
                  width: "100%",
                  minWidth: 0,
                  height: 300,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={bloomData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius="65%"
                      label
                    >
                      {bloomData.map(
                        (_, index) => (
                          <Cell
                            key={index}
                            fill={
                              COLORS[
                                index %
                                  COLORS.length
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />

                    <Legend
                      wrapperStyle={{
                        fontSize:
                          "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* CLUSTER INFORMATION */}

            {status.cluster_insights && (
              <div
                style={{
                  marginTop: "20px",
                }}
              >
                <p>
                  <strong>
                    Total Clusters:
                  </strong>{" "}
                  {
                    status
                      .cluster_insights
                      .total_clusters
                  }
                </p>

                <p
                  style={{
                    wordBreak:
                      "break-word",
                  }}
                >
                  <strong>
                    Dominant Bloom Level:
                  </strong>{" "}
                  {
                    status
                      .cluster_insights
                      .dominant_bloom
                  }
                </p>

                <p>
                  <strong>
                    Knowledge Retention:
                  </strong>{" "}
                  {
                    status
                      .cluster_insights
                      .knowledge_retention
                  }
                  %
                </p>
              </div>
            )}

            {/* PIPELINE CHART */}

            {pipelineData.length > 0 && (
              <div
                style={{
                  width: "100%",
                  minWidth: 0,
                  height: 300,
                  marginTop: "20px",
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius="65%"
                      label
                    >
                      <Cell fill="#3B82F6" />
                      <Cell fill="#10B981" />
                    </Pie>

                    <Tooltip />

                    <Legend
                      wrapperStyle={{
                        fontSize:
                          "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* STATUS DETAILS */}

            <div
              style={{
                marginTop: "20px",
              }}
            >
              <p>
                <strong>
                  Questions Uploaded:
                </strong>{" "}
                {status.uploaded || 0}
              </p>

              <p>
                <strong>
                  Pseudo Labels:
                </strong>{" "}
                {status.pseudo_labels ||
                  0}
              </p>

              <p>
                <strong>
                  Trusted Samples:
                </strong>{" "}
                {status.trusted_samples ||
                  status.validated_samples ||
                  0}
              </p>

              <p>
                <strong>
                  Adapter Saved:
                </strong>{" "}
                {status.adapter_saved
                  ? "Yes"
                  : "No"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================= V1 VS V2 ================= */}

      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <h2>
          DeepBloom V1 vs DeepBloom V2
        </h2>

        <p
          style={{
            fontSize: "14px",
            lineHeight: "1.5",
          }}
        >
          Compare the confidence of the original
          DeepBloom model with your adapted
          DeepBloom V2 model.
        </p>

        <textarea
          rows="4"
          placeholder="Enter question for comparison..."
          value={compareQuestion}
          onChange={(e) =>
            setCompareQuestion(
              e.target.value
            )
          }
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />

        <button
          onClick={compare}
          disabled={
            compareLoading || !status
          }
        >
          {compareLoading
            ? "Comparing V1 and V2..."
            : "Compare Models"}
        </button>

        {!status && (
          <p
            style={{
              fontSize: "14px",
              marginTop: "10px",
            }}
          >
            First complete V2 adaptation
            above. Then you can compare V1
            and V2.
          </p>
        )}

        {/* ================= COMPARISON RESULTS ================= */}

        {v1Score !== null &&
          v2Score !== null && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "12px",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    padding: "15px",
                    background: "#EEF2FF",
                    borderRadius: "12px",
                    textAlign: "center",
                  }}
                >
                  <strong>
                    DeepBloom V1
                  </strong>

                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      marginTop: "8px",
                    }}
                  >
                    {v1Score.toFixed(3)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "15px",
                    background: "#ECFDF5",
                    borderRadius: "12px",
                    textAlign: "center",
                  }}
                >
                  <strong>
                    DeepBloom V2
                  </strong>

                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      marginTop: "8px",
                    }}
                  >
                    {v2Score.toFixed(3)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  minWidth: 0,
                  height: 300,
                  marginTop: "20px",
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 10,
                    }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      domain={[0, 1]}
                      width={35}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="confidence"
                      fill="#6366F1"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

export default V2Page;
