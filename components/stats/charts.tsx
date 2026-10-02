"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** `2026-10-05` → `Oct 5`, without going through Date (no timezone shifts). */
const shortDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

const axis = { stroke: "var(--border)", tick: { fill: "var(--muted-foreground)", fontSize: 11 }, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />;
const legend = <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)", paddingTop: 4 }} />;

function tooltip(opts: { labelFormatter?: (label: string) => string; cursor?: "bar" | "line" } = {}) {
  return (
    <Tooltip
      contentStyle={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        color: "var(--popover-foreground)",
        fontSize: 12,
        boxShadow: "0 4px 12px color-mix(in oklch, var(--foreground) 12%, transparent)",
        padding: "6px 10px",
      }}
      itemStyle={{ color: "var(--popover-foreground)", padding: 0 }}
      labelStyle={{ color: "var(--muted-foreground)", marginBottom: 2 }}
      labelFormatter={opts.labelFormatter ? (l) => opts.labelFormatter!(String(l)) : undefined}
      cursor={opts.cursor === "line" ? { stroke: "var(--border)", strokeWidth: 1 } : { fill: "var(--muted)", opacity: 0.5 }}
    />
  );
}

function Frame({ className, label, children }: { className?: string; label: string; children: React.ReactElement }) {
  return (
    <div role="img" aria-label={label} className={cn("h-[200px] w-full sm:h-[240px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function SolvesPerDayChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <Frame label={`Problems solved per day over the last 30 days, ${total} in total`}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={28} {...axis} />
        <YAxis allowDecimals={false} width={40} {...axis} />
        {tooltip({ labelFormatter: shortDate })}
        <Bar dataKey="count" name="Solved" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </Frame>
  );
}

export function CumulativeChart({ data }: { data: Array<{ date: string; actual: number; ideal: number }> }) {
  const last = data.at(-1);
  return (
    <Frame label={last ? `Solved ${last.actual} main problems against ${last.ideal} planned so far` : "No data yet"}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={36} {...axis} />
        <YAxis allowDecimals={false} width={44} {...axis} />
        {tooltip({ labelFormatter: shortDate, cursor: "line" })}
        {legend}
        <Line type="monotone" dataKey="ideal" name="Plan" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="actual" name="You" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </Frame>
  );
}

export function DifficultyChart({ data }: { data: Array<{ week: number; Easy: number; Medium: number; Hard: number }> }) {
  return (
    <Frame label="New problems per plan week by difficulty">
      <BarChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
        {grid}
        <XAxis dataKey="week" tickFormatter={(w: number) => `W${w}`} interval="preserveStartEnd" minTickGap={16} {...axis} />
        <YAxis allowDecimals={false} width={40} {...axis} />
        {tooltip({ labelFormatter: (w) => `Week ${w}` })}
        {legend}
        <Bar dataKey="Easy" stackId="d" fill="var(--success)" maxBarSize={28} />
        <Bar dataKey="Medium" stackId="d" fill="var(--warning)" maxBarSize={28} />
        <Bar dataKey="Hard" stackId="d" fill="var(--destructive)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </Frame>
  );
}

interface QuizDotProps {
  cx?: number;
  cy?: number;
  payload?: { pct: number };
}

export function QuizTrendChart({ data, passPct }: { data: Array<{ date: string; kind: string; pct: number }>; passPct: number }) {
  const passed = data.filter((d) => d.pct >= passPct).length;
  const dot = ({ cx, cy, payload }: QuizDotProps) =>
    cx === undefined || cy === undefined || !payload ? (
      <g />
    ) : (
      <circle cx={cx} cy={cy} r={3.5} fill={payload.pct >= passPct ? "var(--success)" : "var(--destructive)"} stroke="var(--card)" strokeWidth={1.5} />
    );
  return (
    <Frame label={`Quiz best scores over time, pass mark ${passPct} percent, ${passed} of ${data.length} passed`}>
      <LineChart data={data} margin={{ top: 12, right: 8, left: -28, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={28} {...axis} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={40} {...axis} />
        {tooltip({ labelFormatter: shortDate, cursor: "line" })}
        <ReferenceLine
          y={passPct}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          label={{ value: `pass ${passPct}%`, fill: "var(--muted-foreground)", fontSize: 11, position: "insideBottomRight" }}
        />
        <Line type="monotone" dataKey="pct" name="Best %" stroke="var(--chart-1)" strokeWidth={2} dot={dot} activeDot={{ r: 5 }} />
      </LineChart>
    </Frame>
  );
}

const shortTitle = (t: string) => (t.length > 14 ? `${t.slice(0, 13)}…` : t);

export function MasteryRadar({ data }: { data: Array<{ title: string; score: number }> }) {
  return (
    <Frame className="h-[260px] sm:h-[300px]" label={`Mastery by topic: ${data.map((d) => `${d.title} ${d.score}%`).join(", ")}`}>
      <RadarChart data={data} outerRadius="65%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="title" tickFormatter={shortTitle} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {tooltip({ cursor: "line" })}
        <Radar dataKey="score" name="Mastery %" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.35} />
      </RadarChart>
    </Frame>
  );
}
