"use client";

import React, { useState, useCallback, useRef } from "react";
import axios from "axios";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Components
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { ResultsTable } from "@/components/ResultsTable";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { DetailModal } from "@/components/DetailModal";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";

gsap.registerPlugin(useGSAP);

/* ─── Types ─── */
interface Prediction {
  filename: string;
  diagnosis: string;
  probabilities: Record<string, number>;
}

interface FWP {
  file: File;
  preview: string;
}

const API = "http://127.0.0.1:8000/api/v1";

export default function Page() {
  const container = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<FWP[]>([]);
  const [results, setResults] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);
  const [tab, setTab] = useState<"upload" | "results" | "analytics">("upload");
  const [error, setError] = useState<string | null>(null);

  /* GSAP Animations */
  useGSAP(() => {
    gsap.from("main > section, footer", {
      y: 10,
      opacity: 0,
      stagger: 0.05,
      duration: 0.6,
      ease: "power2.out",
    });
  }, { scope: container });

  /* Dropzone Handler */
  const onDrop = useCallback((accepted: File[]) => {
    setError(null);
    const capped = accepted.slice(0, 10);
    const newFiles = capped.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setFiles(newFiles);
  }, []);

  /* Analysis Handler */
  const handleUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f.file));
    
    try {
      const { data } = await axios.post<{ results: Prediction[] }>(
        `${API}/predict/batch`,
        fd
      );
      setResults(data.results);
      setTab("results");
      
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please ensure the Diagnostic API is reachable and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* PDF Report Handler */
  const downloadPDF = async (index: number) => {
    const fwp = files[index];
    if (!fwp) return;

    const fd = new FormData();
    fd.append("file", fwp.file);
    
    try {
      const res = await axios.post(`${API}/report/generate`, fd, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Diagnostic_Report_${fwp.file.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
  };

  /* Reset Session */
  const reset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setResults([]);
    setDetail(null);
    setTab("upload");
    setError(null);
  };

  return (
    <div ref={container} className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Premium Processing Overlay */}
      <ProcessingOverlay loading={loading} />
      
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header 
          activeTab={tab} 
          onTabChange={setTab} 
          resultsCount={results.length} 
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8">
          {tab === "upload" && (
            <UploadSection
              files={files}
              loading={loading}
              error={error}
              onDrop={onDrop}
              onUpload={handleUpload}
              onReset={reset}
            />
          )}

          {tab === "results" && results.length > 0 && (
            <ResultsTable
              results={results}
              files={files}
              onDetailClick={setDetail}
              onDownloadPDF={downloadPDF}
            />
          )}

          {tab === "analytics" && results.length > 0 && (
            <AnalyticsSection results={results} />
          )}
        </main>

        <footer className="border-t-2 border-slate-100 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
              <div className="flex flex-col items-center gap-2 md:items-start">
                <span className="text-sm font-black tracking-widest text-slate-900 uppercase">RETINAI CORE</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Version 2.4.0 Clinical Release
                </p>
              </div>
              <p className="max-w-md text-center text-[10px] font-bold uppercase tracking-widest leading-loose text-slate-400 md:text-right">
                Approved for investigational use only. This system provides automated screening 
                and does not replace professional clinical judgment.
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Detail Overlay */}
      {detail !== null && results[detail] && (
        <DetailModal
          prediction={results[detail]}
          filePreview={files[detail]?.preview || ""}
          onClose={() => setDetail(null)}
          onDownloadPDF={() => downloadPDF(detail)}
        />
      )}
    </div>
  );
}
