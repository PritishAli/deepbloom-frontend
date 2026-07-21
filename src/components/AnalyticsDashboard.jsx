import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from "recharts";

const COLORS = [
  "#6366F1", "#22C55E", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4"
];

export default function AnalyticsDashboard({ data }) {

  if (!data) return null;

  const chartData = Object.entries(
    data.cognitive_distribution_percent
  ).map(([level, value]) => ({
    name: level,
    value
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

      {/* PIE CHART */}
      <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-white">
          Cognitive Distribution
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              outerRadius={110}
              label
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* BAR CHART */}
      <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-white">
          Bloom Cognitive Levels
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" radius={[10,10,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* COMPLEXITY SCORE CARD */}
      <div className="col-span-1 md:col-span-2
          bg-gradient-to-r from-indigo-500 to-purple-600
          p-8 rounded-2xl text-center shadow-2xl">

        <h2 className="text-2xl text-white font-semibold">
          Cognitive Complexity Score
        </h2>

        <p className="text-6xl font-bold text-white mt-4">
          {data.complexity_score_out_of_10}
        </p>

        <p className="text-xl text-white mt-2">
          {data.complexity_level}
        </p>

        <p className="mt-4 text-white/80">
          {data.insight}
        </p>
      </div>

    </div>
  );
}