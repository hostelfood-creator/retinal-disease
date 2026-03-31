"use client";

import React from "react";
import Image from "next/image";
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
        {/* Top bar: brand + status */}
        <div className="flex py-3 sm:py-4 items-center justify-between gap-4">
          <div className="flex flex-col justify-center min-w-0 shrink-0">
            <Image 
              src="/logo.png" 
              alt="Netra AI - Intelligent Vision & Analytics" 
              width={350} 
              height={100} 
              className="object-contain h-16 sm:h-20 lg:h-24 w-auto drop-shadow-sm"
              quality={100}
              priority
            />
          </div>

          <div className="hidden sm:flex items-center gap-6">
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                System Nominal
             </div>
          </div>
        </div>
      </div>

      {/* Tab navigation - horizontally scrollable on mobile */}
      <div className="border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center overflow-x-auto no-scrollbar -mb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => !t.disabled && onTabChange(t.id)}
                disabled={t.disabled}
                className={clsx(
                  "group relative flex shrink-0 items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] transition-all font-heading touch-target",
                  activeTab === t.id
                    ? "text-slate-900"
                    : t.disabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-900 active:text-slate-900"
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
        </div>
      </div>
    </header>
  );
};
