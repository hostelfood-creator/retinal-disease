"use client";

import React from "react";
import { IdentificationCard, ChartBar, Desktop } from "@phosphor-icons/react";
import clsx from "clsx";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: "upload" | "results" | "analytics") => void;
  resultsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, resultsCount }) => {
  const TABS = [
    { id: "upload" as const, label: "ANALYSIS", icon: Desktop },
    { id: "results" as const, label: "FINDINGS", icon: IdentificationCard, disabled: resultsCount === 0 },
    { id: "analytics" as const, label: "STATISTICS", icon: ChartBar, disabled: resultsCount === 0 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">

            <div className="flex items-baseline gap-3">
              <span className="text-xl font-black tracking-tight text-slate-900 font-heading">
                RETINAI
              </span>
              <span className="hidden h-4 w-px bg-slate-200 sm:block" />
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:block font-heading">
                Clinical Diagnostic System
              </span>
            </div>
          </div>

          <nav className="flex h-full items-center">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => !t.disabled && onTabChange(t.id)}
                disabled={t.disabled}
                className={clsx(
                  "group relative flex h-full items-center gap-2 px-6 text-[10px] font-bold uppercase tracking-[0.15em] transition-all font-heading",
                  activeTab === t.id
                    ? "text-slate-900"
                    : t.disabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <t.icon weight={activeTab === t.id ? "bold" : "regular"} className="h-4 w-4" />
                {t.label}
                {activeTab === t.id && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900" />
                )}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-6 sm:flex">
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                System Nominal
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};
