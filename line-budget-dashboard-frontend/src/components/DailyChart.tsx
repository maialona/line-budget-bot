import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DailyPoint {
  date: string;
  total: number;
}

export function DailyChart({ points }: { points: DailyPoint[] }) {
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
        本月目前還沒有任何支出 👛
      </div>
    );
  }

  const data = points.map((p) => ({
    date: p.date.slice(5),
    total: p.total,
  }));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-medium text-slate-100">每日支出趨勢</h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" stroke="#64748b" tickLine={false} />
            <YAxis stroke="#64748b" tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #1f2933",
                borderRadius: 12,
              }}
              formatter={(value: unknown) => {
                const v = value as number;
                return v.toLocaleString("zh-TW");
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
