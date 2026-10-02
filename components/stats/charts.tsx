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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** `2026-10-05` → `Oct 5`, without going through Date (no timezone shifts). */
const shortDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

const axis = { stroke: "var(--border)", tick: { fill: "var(--muted-foreground)", fontSize: 11 }, tickLine: false } as const;
const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />;
const tooltip = (
  <Tooltip
    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }}
    labelStyle={{ color: "var(--muted-foreground)" }}
    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
  />
);

function Frame({ height = 220, label, children }: { height?: number; label: string; children: React.ReactElement }) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
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
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={24} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        {tooltip}
        <Bar dataKey="count" name="Solved" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </Frame>
  );
}

export function CumulativeChart({ data }: { data: Array<{ date: string; actual: number; ideal: number }> }) {
  const last = data.at(-1);
  return (
    <Frame label={last ? `Solved ${last.actual} main problems against ${last.ideal} planned so far` : "No data yet"}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={32} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        {tooltip}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="ideal" name="Plan" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="actual" name="You" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
      </LineChart>
    </Frame>
  );
}

export function DifficultyChart({ data }: { data: Array<{ week: number; Easy: number; Medium: number; Hard: number }> }) {
  return (
    <Frame label="New problems per plan week by difficulty">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        {grid}
        <XAxis dataKey="week" tickFormatter={(w: number) => `W${w}`} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        {tooltip}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Easy" stackId="d" fill="var(--chart-2)" />
        <Bar dataKey="Medium" stackId="d" fill="var(--chart-3)" />
        <Bar dataKey="Hard" stackId="d" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </Frame>
  );
}

export function QuizTrendChart({ data, passPct }: { data: Array<{ date: string; kind: string; pct: number }>; passPct: number }) {
  return (
    <Frame label={`Quiz best scores over time, pass mark ${passPct} percent`}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={24} {...axis} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...axis} />
        {tooltip}
        <ReferenceLine y={passPct} stroke="var(--chart-3)" strokeDasharray="4 4" label={{ value: `pass ${passPct}%`, fill: "var(--muted-foreground)", fontSize: 11, position: "insideTopRight" }} />
        <Line type="monotone" dataKey="pct" name="Best %" stroke="var(--chart-5)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </Frame>
  );
}

export function MasteryRadar({ data }: { data: Array<{ title: string; score: number }> }) {
  return (
    <Frame height={280} label={`Mastery by topic: ${data.map((d) => `${d.title} ${d.score}%`).join(", ")}`}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="title" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {tooltip}
        <Radar dataKey="score" name="Mastery %" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.35} />
      </RadarChart>
    </Frame>
  );
}
