// src/components/ChartPanel.tsx
import React, { useMemo, useState } from "react";
import {
  BarChart3,
  X,
  Maximize2,
  Minimize2,
  Grid,
  List,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import Draggable from "react-draggable";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

interface ChartPanelProps {
  data: ChartDataPoint[];
  className?: string;
}

type ChartKey =
  | "area"
  | "bar"
  | "line"
  | "pie"
  | "doughnut"
  | "scatter"
  | "radar"
  | "treemap";

const ALL_CHARTS: { key: ChartKey; label: string; desc?: string }[] = [
  { key: "bar", label: "Bar Chart", desc: "Compare values across categories" },
  { key: "area", label: "Area Chart", desc: "Cumulative trends over time" },
  { key: "line", label: "Line Chart", desc: "Visualize trends over time" },
  { key: "pie", label: "Pie Chart", desc: "Parts of a whole" },
  { key: "doughnut", label: "Doughnut Chart", desc: "Proportion with center" },
  { key: "scatter", label: "Scatter Plot", desc: "Relationship between variables" },
  { key: "radar", label: "Radar Chart", desc: "Compare multiple variables" },
  { key: "treemap", label: "Treemap", desc: "Hierarchical data visual" },
];

const COLORS = ["#2563EB", "#10B981", "#F97316", "#7C3AED", "#EF4444", "#06B6D4", "#F59E0B"];

const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  onExpand?: () => void;
  onOpen?: () => void;
}> = ({ title, subtitle, onExpand, onOpen }) => (
  <div className="flex items-start justify-between px-4 pt-3 pb-2">
    <div>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
    <div className="flex items-center gap-2">
      {onOpen && (
        <button onClick={onOpen} title="Open full" className="p-1 hover:bg-slate-100 rounded">
          <ArrowUpRight className="w-4 h-4 text-slate-500" />
        </button>
      )}
      {onExpand && (
        <button onClick={onExpand} title="Expand" className="p-1 hover:bg-slate-100 rounded">
          <ArrowUpRight className="w-4 h-4 -rotate-45 text-slate-400" />
        </button>
      )}
    </div>
  </div>
);

const ChartRenderer: React.FC<{ kind: ChartKey; data: ChartDataPoint[] }> = ({ kind, data }) => {
  const safeData = data && data.length > 0 ? data : [{ name: "No data", value: 0 }];

  switch (kind) {
    case "area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safeData} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <ReTooltip />
            <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.18} />
            <Area type="monotone" dataKey="value2" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.14} />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <ReTooltip />
            <Bar dataKey="value" fill={COLORS[1]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safeData} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <ReTooltip />
            <Line type="monotone" dataKey="value" stroke={COLORS[2]} dot />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      );

    case "pie":
    case "doughnut":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              outerRadius={60}
              innerRadius={kind === "doughnut" ? 28 : 0}
              label
            >
              {safeData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ReTooltip />
            <Legend verticalAlign="bottom" height={24} />
          </PieChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
            <CartesianGrid />
            <XAxis dataKey="value" name="X" tick={{ fontSize: 12 }} />
            <YAxis dataKey="value2" name="Y" />
            <ReTooltip />
            <Scatter
              name="Points"
              data={safeData.map((d) => ({ x: d.value, y: d.value2 ?? d.value }))}
              fill={COLORS[3]}
            />
            <Legend />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "radar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={safeData} outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Radar name="Series" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.5} />
            <ReTooltip />
            <Legend verticalAlign="bottom" />
          </RadarChart>
        </ResponsiveContainer>
      );

    case "treemap":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={safeData} dataKey="value" nameKey="name" stroke="#fff" />
        </ResponsiveContainer>
      );

    default:
      return <div className="text-center text-slate-500 p-6">Chart not available</div>;
  }
};

export const ChartPanel: React.FC<ChartPanelProps> = ({ data, className }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [multiMode, setMultiMode] = useState(true);
  const [selected, setSelected] = useState<ChartKey[]>(ALL_CHARTS.slice(0, 6).map((c) => c.key));
  const [focused, setFocused] = useState<ChartKey>(selected[0] ?? "bar");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  const toggle = (k: ChartKey) => {
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  };

  const selectAll = () => setSelected(ALL_CHARTS.map((c) => c.key));
  const clearAll = () => setSelected([]);
  const refresh = () => setLastUpdated(new Date());

  if (selected.length > 0 && !selected.includes(focused)) setFocused(selected[0]);
  if (selected.length === 0 && focused !== "bar") setFocused("bar");

  const gridCols = useMemo(() => {
    const n = Math.max(1, selected.length);
    if (n === 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-2";
    if (n <= 4) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  }, [selected.length]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-slate-800 text-white rounded-full shadow-lg"
        title="Open charts"
      >
        <BarChart3 className="w-5 h-5" />
      </button>
    );
  }

  return (
    <Draggable handle=".drag-handle" bounds="parent" disabled={isExpanded}>
      <div
        className={`fixed z-40 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden ${
          className ?? ""
        } ${isExpanded ? "inset-4" : "bottom-6 right-6 w-[1000px] h-[650px] min-h-[500px]"}`}
      >
        {/* Header */}
        <div className="drag-handle flex items-center justify-between p-4 bg-white border-b border-slate-100 cursor-move">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            <div>
              <div className="text-slate-800 font-semibold">Charts Dashboard</div>
              <div className="text-xs text-slate-500">
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 ml-6">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1 rounded bg-slate-50 border hover:bg-slate-100"
              >
                Select all
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1 rounded bg-white text-slate-600 border hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              title="Refresh"
              className="px-3 py-1 rounded bg-slate-50 hover:bg-slate-100 flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Data
            </button>

            <button
              onClick={() => setMultiMode((m) => !m)}
              className="p-2 rounded hover:bg-slate-50"
              title="Toggle grid / single"
            >
              {multiMode ? <Grid className="w-4 h-4 text-slate-700" /> : <List className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              onClick={() => setIsExpanded((s) => !s)}
              className="p-2 rounded hover:bg-slate-50"
              title="Expand"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4 text-slate-700" /> : <Maximize2 className="w-4 h-4 text-slate-700" />}
            </button>

            <button onClick={() => setIsVisible(false)} className="p-2 rounded hover:bg-slate-50">
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 h-[calc(100%-80px)] overflow-auto">
          <div className="flex gap-2 flex-wrap mb-4">
            {ALL_CHARTS.map((c) => {
              const active = selected.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggle(c.key)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    active ? "bg-slate-800 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {multiMode ? (
            <div className={`grid gap-4 ${gridCols}`}>
              {selected.length === 0 ? (
                <div className="col-span-full p-8 rounded-lg border border-dashed border-slate-200 text-center text-slate-500">
                  No charts selected — use the pills above or "Select all"
                </div>
              ) : (
                selected.map((k) => {
                  const meta = ALL_CHARTS.find((x) => x.key === k);
                  return (
                    <div key={k} className="bg-white rounded-lg shadow-sm border border-slate-100 h-56 flex flex-col">
                      <CardHeader
                        title={meta?.label ?? k}
                        subtitle={meta?.desc}
                        onOpen={() => {
                          setMultiMode(false);
                          setFocused(k);
                        }}
                      />
                      <div className="flex-1 p-3 min-h-0">
                        <div className="relative w-full h-48">
                          <ChartRenderer kind={k} data={data} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold">{ALL_CHARTS.find((c) => c.key === focused)?.label}</div>
                <div className="text-xs text-slate-500">
                  {ALL_CHARTS.find((c) => c.key === focused)?.desc}
                </div>
              </div>
              <div className="h-full bg-white rounded-lg border border-slate-100 p-3">
                <div className="relative w-full h-[calc(100%-1rem)]">
                  <ChartRenderer kind={focused} data={data} />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {ALL_CHARTS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      setFocused(c.key);
                      if (!selected.includes(c.key)) setSelected((s) => [...s, c.key]);
                    }}
                    className={`text-xs px-3 py-1 rounded border ${
                      focused === c.key ? "bg-slate-800 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <div>Built with Recharts · Tailwind · Lucide</div>
          <div>Tip: click a chart's open icon to focus it.</div>
        </div>
      </div>
    </Draggable>
  );
};
