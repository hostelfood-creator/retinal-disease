"use client";

import React from "react";
import { DownloadSimple, FileImage, CheckCircle, Warning, ShieldCheck, Eye } from "@phosphor-icons/react";
import clsx from "clsx";

interface Prediction {
  filename: string;
  diagnosis: string;
  probabilities: Record<string, number>;
}

interface ResultsTableProps {
  results: Prediction[];
  files: Array<{ file: File; preview: string }>;
  onDetailClick: (index: number) => void;
  onDownloadPDF: (index: number) => void;
}

const SEV_COLOR: Record<string, string> = {
  Normal: "#10b981", // Emerald 500
  Mild: "#f59e0b", // Amber 500
  Moderate: "#f97316", // Orange 500
  Severe: "#ef4444", // Red 500
  Proliferative: "#991b1b", // Red 800
};

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  files,
  onDetailClick,
  onDownloadPDF,
}) => {
  const stats = React.useMemo(() => {
    const total = results.length;
    const abnormal = results.filter((r) => r.diagnosis !== "Normal").length;
    const critical = results.filter((r) => r.diagnosis === "Severe" || r.diagnosis === "Proliferative").length;
    return { total, abnormal, critical, normal: total - abnormal };
  }, [results]);

  return (
    <section className="mx-auto max-w-7xl pt-8 pb-16 sm:pt-12 sm:pb-32 animate-in-view px-4 sm:px-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 sm:mb-12 border-b border-slate-100 pb-8 sm:pb-12">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase font-heading sm:text-4xl">Diagnostic Findings</h2>
          <p className="mt-3 text-slate-500 text-lg font-medium font-sans">Dataset analysis complete. Review findings below.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <KPICard label="TOTAL" value={stats.total} icon={FileImage} color="slate" />
          <KPICard label="NORMAL" value={stats.normal} icon={CheckCircle} color="emerald" />
          <KPICard label="ABNORMAL" value={stats.abnormal} icon={Warning} color="amber" />
          <KPICard label="CRITICAL" value={stats.critical} icon={ShieldCheck} color="red" />
        </div>
      </div>

      <div className="clinical-card bg-white border-2 border-slate-100 -mx-4 sm:mx-0 overflow-hidden sm:rounded-none">
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar px-4 sm:px-0">
          <table className="w-full text-left text-sm border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100 font-heading">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">INDEX</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ASSET IDENTIFIER</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">PRIMARY DIAGNOSIS</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">CONFIDENCE</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">DISTRIBUTION</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((row, idx) => {
                const conf = Math.max(...Object.values(row.probabilities));
                const sortedProbs = Object.entries(row.probabilities).sort((a, b) => b[1] - a[1]);
                
                return (
                  <tr
                    key={idx}
                    onClick={() => onDetailClick(idx)}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-8 py-6">
                      <span className="font-technical text-[11px] font-bold text-slate-300">0{idx + 1}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 shrink-0 bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {files[idx] && <img src={files[idx].preview} alt="" className="max-h-full max-w-full object-contain transition-all" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="max-w-[200px] truncate font-black text-slate-900 uppercase tracking-tight font-heading">{row.filename}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-technical">ID: {row.filename.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(16).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SEV_COLOR[row.diagnosis] }} />
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 font-heading">{row.diagnosis}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="font-technical text-lg font-black text-slate-900">{conf.toFixed(1)}%</span>
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                           <div className="h-full bg-slate-900 transition-all duration-500" style={{ width: `${conf}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex h-4 w-full max-w-[180px] bg-slate-100 p-0.5">
                        {sortedProbs.map(([name, value], i) => (
                          value > 3 && (
                            <div
                              key={i}
                              title={`${name}: ${value.toFixed(1)}%`}
                              className="h-full transition-all duration-500 hover:scale-y-125"
                              style={{ width: `${value}%`, backgroundColor: SEV_COLOR[name] }}
                            />
                          )
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDownloadPDF(idx); }}
                          className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-all"
                        >
                          <DownloadSimple weight="bold" className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDetailClick(idx)}
                          className="flex h-10 w-10 items-center justify-center border border-slate-900 bg-slate-900 text-white hover:bg-black transition-all"
                        >
                          <Eye weight="bold" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

function KPICard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: "slate" | "emerald" | "amber" | "red" }) {
  const styles = {
    slate: "text-slate-900 bg-slate-50 border-slate-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    red: "text-red-600 bg-red-50 border-red-100",
  };

  return (
    <div className="flex items-center gap-4 bg-white border border-slate-100 px-6 py-4 shadow-sm min-w-[140px] font-sans">
      <div className={clsx("flex h-10 w-10 items-center justify-center border", styles[color])}>
        <Icon weight="bold" size={18} />
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 font-heading">{label}</span>
        <span className="text-xl font-black text-slate-900 leading-none mt-1 font-technical">{value}</span>
      </div>
    </div>
  );
}
