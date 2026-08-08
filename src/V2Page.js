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
  Legend
} from "recharts";

function V2Page() {
  const [userId, setUserId] = useState("");
  const [domainText, setDomainText] = useState("");
  const [status, setStatus] = useState(null);

  const [compareQuestion, setCompareQuestion] = useState("");
  const [v1Score, setV1Score] = useState(null);
  const [v2Score, setV2Score] = useState(null);

  const adapt = async () => {
    try {
      const questions = domainText
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      if (!userId) {
        alert("Enter User ID");
        return;
      }

      if (questions.length === 0) {
        alert("Paste some questions first");
        return;
      }

      const response = await fetch(
  "https://pritish0007-pritishdeepbloombackend.hf.space/deepbloom-v2/adapt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            questions,
          }),
        }
      );

      const data = await response.json();

      setStatus({
        ...data,
        uploaded: questions.length,
      });
    } catch (err) {
      console.error(err);
      alert("Adaptation failed");
    }
  };

  const compare = async () => {
    try {
      if (!compareQuestion.trim()) return;

      const v1res = await fetch(
  "https://translated-tournament-influenced-roles.trycloudflare.com/deepbloom-v2/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: compareQuestion,
          }),
        }
      );

      const v1data = await v1res.json();

      const v2res = await fetch(
  "https://translated-tournament-influenced-roles.trycloudflare.com/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            text: compareQuestion,
          }),
        }
      );

      const v2data = await v2res.json();

      setV1Score(
        v1data?.top_predictions?.[0]?.confidence || 0
      );

      setV2Score(
        v2data?.confidence || 0
      );
    } catch (err) {
      console.error(err);
      alert("Comparison failed");
    }
  };

  const chartData = [
    {
      name: "DeepBloom V1",
      confidence: v1Score || 0,
    },
    {
      name: "DeepBloom V2",
      confidence: v2Score || 0,
    },
  ];
  const bloomData = status?.distribution
  ? Object.entries(status.distribution).map(
      ([name, value]) => ({
        name,
        value
      })
    )
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

  return (
    <div>
    <div className="stats-grid">

  <div className="stat-card">
    <h3>{status?.uploaded || 0}</h3>
    <p>Questions Uploaded</p>
  </div>

  <div className="stat-card">
    <h3>
      {status?.pseudo_labels ||
        status?.uploaded ||
        0}
    </h3>
    <p>Pseudo Labels</p>
  </div>

  <div className="stat-card">
    <h3>
      {status?.trusted_samples ||
        status?.validated_samples ||
        0}
    </h3>
    <p>Trusted Samples</p>
  </div>

  <div className="stat-card">
    <h3>
      {status ? "✓" : "-"}
    </h3>
    <p>Adaptation Status</p>
  </div>

</div>
      <h1 className="title">
        🚀 DeepBloom V2
      </h1>

      <p
        style={{
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        Automatic Knowledge Expansion &
        Domain Adaptation
      </p>
      <div className="card">

  <h2>
    Knowledge Expansion Workflow
  </h2>

  <div className="workflow">

    <div>📥 Upload Questions</div>

    <div>⬇</div>

    <div>🧠 Generate Pseudo Labels</div>

    <div>⬇</div>

    <div>✅ Verb Validation</div>

    <div>⬇</div>

    <div>🔍 Cluster Annotation</div>

    <div>⬇</div>

    <div>🚀 LoRA Adaptation</div>

    <div>⬇</div>

    <div>🎯 Expanded DeepBloom V2</div>

  </div>

</div>

      <div className="card">
        <h2>Knowledge Expansion Pipeline</h2>

        <ul>
          <li>✓ Pseudo Label Generation</li>
          <li>✓ Bloom Verb Validation</li>
          <li>✓ Confidence Trust Filtering</li>
          <li>✓ Cluster Annotation</li>
          <li>✓ Knowledge Expansion</li>
          <li>✓ LoRA Adaptation</li>
        </ul>

        <input
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={(e) =>
            setUserId(e.target.value)
          }
        />

        <textarea
          rows="10"
          placeholder="Paste one question per line..."
          value={domainText}
          onChange={(e) =>
            setDomainText(e.target.value)
          }
        />

        <button onClick={adapt}>
          Expand Knowledge
        </button>

        {status && (
          <div
            style={{
              marginTop: "20px",
            }}
          >
            <h3>Adaptation Results</h3>
            <div
  style={{
    background: "#f8fafc",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "20px",
  }}
>

  <h4>Knowledge Expansion Report</h4>
<p>
  <strong>Uploaded Questions:</strong>{" "}
  {status.uploaded}
</p>

<p>
  <strong>Trusted Samples:</strong>{" "}
  {status.trusted_samples}
</p>
  

  <p>
    <strong>Pseudo Labels Generated:</strong>{" "}
    {status.pseudo_labels}
  </p>

  

  <p>
    <strong>Retention Rate:</strong>{" "}
    {(
      (status.trusted_samples /
        status.uploaded) *
      100
    ).toFixed(1)}
    %
  </p>

  <p>
    <strong>Adaptation:</strong>{" "}
    Successful
  </p>

</div>
{status?.distribution && (
  <div
    style={{
      marginTop: "20px",
      background: "#fff",
      padding: "20px",
      borderRadius: "12px"
    }}
  >
    <h3>Bloom Distribution</h3>

    <ResponsiveContainer
      width="100%"
      height={300}
    >
      <PieChart>

        <Pie
  data={bloomData}
  dataKey="value"
  nameKey="name"
  outerRadius={100}
  label
>
  <Cell fill="#3B82F6" />
  <Cell fill="#10B981" />
  <Cell fill="#F59E0B" />
  <Cell fill="#EF4444" />
  <Cell fill="#8B5CF6" />
  <Cell fill="#06B6D4" />
</Pie>

        <Tooltip />

        <Legend />

      </PieChart>
    </ResponsiveContainer>
  </div>
)}
{status?.cluster_insights && (
  <div
    style={{
      marginTop: "20px",
      background: "#fff",
      padding: "20px",
      borderRadius: "12px"
    }}
  >
    <h3>Cluster Insights</h3>

    <p>
      <strong>Total Clusters:</strong>{" "}
      {status.cluster_insights.total_clusters}
    </p>

    <p>
      <strong>Dominant Bloom Level:</strong>{" "}
      {status.cluster_insights.dominant_bloom}
    </p>

    <p>
      <strong>Knowledge Retention:</strong>{" "}
      {status.cluster_insights.knowledge_retention}%
    </p>

  </div>
)}
            

            

            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <PieChart>
                <Pie
                  data={pipelineData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  <Cell fill="#3B82F6" />
                  <Cell fill="#10B981" />
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h2>
          DeepBloom V1 vs DeepBloom V2
        </h2>

        <textarea
          rows="4"
          placeholder="Enter question for comparison..."
          value={compareQuestion}
          onChange={(e) =>
            setCompareQuestion(e.target.value)
          }
        />

        <button onClick={compare}>
          Compare Models
        </button>

        {v1Score !== null &&
          v2Score !== null && (
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Bar
                  dataKey="confidence"
                  fill="#6366F1"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
      </div>
    </div>
  );
}

export default V2Page;
