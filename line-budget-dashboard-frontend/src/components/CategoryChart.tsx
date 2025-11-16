// src/components/CategoryChart.tsx

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type CategoryItem = {
  categoryName: string;
  total: number;
  percent: number;
};

interface CategoryChartProps {
  items: CategoryItem[];
}

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#eab308", "#a855f7"];

export function CategoryChart({ items }: CategoryChartProps) {
  const data: CategoryItem[] =
    items && items.length
      ? items
      : [{ categoryName: "尚未記帳", total: 0, percent: 0 }];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/40">
      <h2 className="mb-3 text-sm font-semibold text-slate-50">分類支出比例</h2>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart margin={{ top: 20, right: 8, bottom: 20, left: 8 }}>
            <Pie
              data={data}
              dataKey="total"
              nameKey="categoryName"
              innerRadius={70}
              outerRadius={85}
              paddingAngle={data.length > 1 ? 2 : 0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.categoryName}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            {/* 🔹這裡是重點：客製 Tooltip，改成淺色字 */}
            <Tooltip
              cursor={false}
              formatter={(value: any, _name, entry: any) => {
                const payload = entry.payload as CategoryItem;
                const amount = Number(value || 0).toLocaleString();
                const percent = payload.percent.toFixed(1);
                // 第一個元素是要顯示的文字，第二個是「系列名稱」，這邊我們用空字串就好
                return [`金額：${amount} (${percent}%)`, ""];
              }}
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.98)", // slate-900
                borderRadius: 12,
                borderColor: "#334155", // slate-700
                color: "#e5e7eb", // 文字改成淺色
                padding: "8px 10px",
                boxShadow: "0 12px 30px rgba(15,23,42,0.9)",
              }}
              itemStyle={{
                color: "#e5e7eb",
                padding: 0,
              }}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value: string, _entry, index: number) => {
                const item = data[index];
                const p =
                  item && typeof item.percent === "number"
                    ? item.percent.toFixed(1)
                    : "0.0";
                return `${value} (${p}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default CategoryChart;
