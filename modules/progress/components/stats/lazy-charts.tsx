"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// recharts is large and only needed once a chart is on screen, so it loads as its own chunk.
const chartFallback = () => <Skeleton className="h-64 w-full rounded-lg" aria-hidden />;

export const CumulativeChart = dynamic(() => import("./charts").then((m) => m.CumulativeChart), { ssr: false, loading: chartFallback });
export const DifficultyChart = dynamic(() => import("./charts").then((m) => m.DifficultyChart), { ssr: false, loading: chartFallback });
export const MasteryRadar = dynamic(() => import("./charts").then((m) => m.MasteryRadar), { ssr: false, loading: chartFallback });
export const QuizTrendChart = dynamic(() => import("./charts").then((m) => m.QuizTrendChart), { ssr: false, loading: chartFallback });
export const SolvesPerDayChart = dynamic(() => import("./charts").then((m) => m.SolvesPerDayChart), { ssr: false, loading: chartFallback });
