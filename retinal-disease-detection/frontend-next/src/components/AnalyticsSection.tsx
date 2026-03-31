"use client";

import React from "react";
import {
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import clsx from "clsx";

interface Prediction {
  filename: string;
  diagnosis: string;
  probabilities: Record<string, number>;
}

interface AnalyticsSectionProps {
  results: Prediction[];
}

const SEV_COLOR: Record<string, string> = {
  Normal: "#10b981", // Emerald 500
  Mild: "#f59e0b", // Amber 500
  Moderate: "#f97316", // Orange 500
  Severe: "#ef4444", // Red 500
  Proliferative: "#991b1b", // Red 800
};

const CHART_ACCENT = ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ results }) => {
  const stats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach((r) => (counts[r.diagnosis] = (counts[r.diagnosis] || 0) + 1));
    const pieData = Object.entries(counts).map(([name, value]) => ({ name, value }));
    
    // Average probabilities for radar
    const cats = Object.keys(results[0]?.probabilities || {});
    const sums: Record<string, number> = {};
    cats.forEach((c) => (sums[c] = 0));
    results.forEach((p) => cats.forEach((c) => (sums[c] += p.probabilities[c])));
    const radarData = cats.map((c) => ({ cat: c, val: sums[c] / results.length }));

    return { pieData, radarData };
  }, [results]);

  return (
    <section className="mx-auto max-w-7xl pt-8 pb-16 sm:pt-16 sm:pb-32 animate-in-view px-4 sm:px-6">
      <div className="mb-6 sm:mb-8 border-b border-slate-100 pb-6 sm:pb-12 lg:mb-16">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase font-heading lg:text-4xl">Population Metrics</h2>
        <p className="mt-2 sm:mt-3 text-slate-500 text-base sm:text-lg font-medium font-sans">Statistical distribution across the active dataset.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-2">
        <ChartCard title="DIAGNOSIS DISTRIBUTION">
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={stats.pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={0}
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
              >
                {stats.pieData.map((e, i) => (
                  <Cell key={i} fill={SEV_COLOR[e.name] || CHART_ACCENT[i % CHART_ACCENT.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#fff", 
                  border: "2px solid #f1f5f9",
                  borderRadius: "0", 
                  boxShadow: "none",
                  padding: "12px",
                  fontSize: "10px",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-jakarta)"
                }} 
              />
              <Legend verticalAlign="bottom" iconType="rect" iconSize={10} wrapperStyle={{ fontSize: 9, paddingTop: 32, fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", fontFamily: "var(--font-jakarta)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AVERAGE CONFIDENCE VECTOR">
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={stats.radarData} outerRadius={110}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="cat" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: "900", fontFamily: "var(--font-jakarta)" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar 
                name="AVG CONFIDENCE" 
                dataKey="val" 
                stroke="#0f172a" 
                fill="#0f172a" 
                fillOpacity={0.1}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#fff", 
                  border: "2px solid #f1f5f9",
                  borderRadius: "0", 
                  boxShadow: "none",
                  padding: "12px",
                  fontSize: "10px",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-jakarta)"
                }} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="clinical-card border-2 border-slate-100 p-6 sm:p-10 bg-white">
      <h4 className="mb-6 sm:mb-10 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 font-heading">{title}</h4>
      <div className="flex h-[300px] sm:h-[360px] w-full items-center justify-center font-technical">
        {children}
      </div>
    </div>
  );
}
