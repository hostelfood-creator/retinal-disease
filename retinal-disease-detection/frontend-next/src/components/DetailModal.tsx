"use client";

import React from "react";
import { X, DownloadSimple, Info, Aperture as RadarIcon, ChartBar, Pulse, Leaf } from "@phosphor-icons/react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import clsx from "clsx";

/* ─── Food & Nutrition Recommendations per severity ─── */
const FOOD_RECS: Record<string, { emoji: string; name: string; benefit: string }[]> = {
  Normal: [
    { emoji: "🥕", name: "Carrots & Sweet Potatoes", benefit: "Rich in beta-carotene for retinal health" },
    { emoji: "🥬", name: "Spinach & Kale", benefit: "Lutein & zeaxanthin protect the macula" },
    { emoji: "🐟", name: "Salmon & Sardines", benefit: "Omega-3 fatty acids reduce inflammation" },
    { emoji: "🫐", name: "Blueberries", benefit: "Anthocyanins improve blood flow to eyes" },
    { emoji: "🥚", name: "Eggs", benefit: "Lutein, zinc & vitamin E for lens protection" },
  ],
  Mild: [
    { emoji: "🥦", name: "Broccoli & Brussels Sprouts", benefit: "Vitamin C supports blood vessel integrity" },
    { emoji: "🍊", name: "Citrus Fruits", benefit: "High vitamin C to slow vascular damage" },
    { emoji: "🥜", name: "Almonds & Walnuts", benefit: "Vitamin E protects against oxidative stress" },
    { emoji: "🫘", name: "Lentils & Chickpeas", benefit: "Low-GI foods for blood sugar regulation" },
    { emoji: "🐟", name: "Fatty Fish (2-3x/week)", benefit: "Omega-3s slow retinopathy progression" },
    { emoji: "🧅", name: "Garlic & Onions", benefit: "Allicin helps regulate blood pressure" },
  ],
  Moderate: [
    { emoji: "🥗", name: "Leafy Greens (daily)", benefit: "Essential carotenoids — increase intake" },
    { emoji: "🫑", name: "Bell Peppers", benefit: "Very high vitamin C for capillary repair" },
    { emoji: "🍠", name: "Sweet Potatoes (not fried)", benefit: "Low-GI carb with vitamin A" },
    { emoji: "🥑", name: "Avocado", benefit: "Monounsaturated fats & lutein" },
    { emoji: "🍵", name: "Green Tea", benefit: "Catechins protect retinal blood vessels" },
    { emoji: "⛔", name: "Avoid: Sugary Drinks & Processed Food", benefit: "Blood sugar spikes worsen retinopathy" },
  ],
  Severe: [
    { emoji: "🥬", name: "Dark Leafy Greens (2x daily)", benefit: "Maximize lutein & folate intake" },
    { emoji: "🫐", name: "Berries & Cherries", benefit: "Powerful anti-inflammatory antioxidants" },
    { emoji: "🐟", name: "Omega-3 Rich Fish (3-4x/week)", benefit: "Critical for reducing retinal inflammation" },
    { emoji: "🧄", name: "Turmeric & Ginger", benefit: "Curcumin reduces vascular inflammation" },
    { emoji: "⛔", name: "Strict: No White Rice / White Bread", benefit: "High-GI foods accelerate damage" },
    { emoji: "⛔", name: "Strict: Limit Sodium & Trans Fats", benefit: "Protects blood pressure & vessels" },
  ],
  Proliferative: [
    { emoji: "🚨", name: "Medical Diet Plan Required", benefit: "Consult a dietitian for personalized plan" },
    { emoji: "🥬", name: "Anti-inflammatory Diet", benefit: "Greens, fish, nuts — reduce neovascularization" },
    { emoji: "🫘", name: "High-Fiber, Low-GI Only", benefit: "Strict glycemic control is essential" },
    { emoji: "🍵", name: "Green Tea & Turmeric Water", benefit: "Anti-angiogenic compounds may help" },
    { emoji: "⛔", name: "Eliminate: Alcohol & Smoking", benefit: "Both dramatically worsen proliferative DR" },
    { emoji: "⛔", name: "Eliminate: All Processed Sugar", benefit: "Immediate blood sugar control needed" },
  ],
};

interface Prediction {
  filename: string;
  diagnosis: string;
  probabilities: Record<string, number>;
}

interface DetailModalProps {
  prediction: Prediction;
  filePreview: string;
  onClose: () => void;
  onDownloadPDF: () => void;
}

const SEV_COLOR: Record<string, string> = {
  Normal: "#10b981", // Emerald 500
  Mild: "#f59e0b", // Amber 500
  Moderate: "#f97316", // Orange 500
  Severe: "#ef4444", // Red 500
  Proliferative: "#991b1b", // Red 800
};

const SEV_LABEL: Record<string, string> = {
  Normal:        "No signs of diabetic retinopathy detected. Routine follow-up recommended.",
  Mild:          "Micro-aneurysms only. Annual screening recommended.",
  Moderate:      "More than micro-aneurysms, less than severe NPDR. Refer to ophthalmologist.",
  Severe:        "Significant vascular damage. Urgent specialist referral required.",
  Proliferative: "Neovascularization present. Immediate treatment required.",
};

export const DetailModal: React.FC<DetailModalProps> = ({
  prediction,
  filePreview,
  onClose,
  onDownloadPDF,
}) => {
  const radarData = Object.entries(prediction.probabilities).map(([cat, val]) => ({ cat, val }));
  const conf = Math.max(...Object.values(prediction.probabilities));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-8 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full sm:max-w-6xl max-h-[95vh] overflow-hidden bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-slate-100 bg-white px-4 py-4 sm:px-10 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center bg-slate-900 shrink-0">
              <Pulse weight="bold" className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight font-heading">Diagnostic Report</h3>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-0.5 font-technical truncate">ASSET: {prediction.filename}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all active:scale-95 shrink-0 touch-target"
          >
            <X weight="bold" size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-12 custom-scrollbar max-h-[calc(95vh-130px)] sm:max-h-[calc(95vh-160px)] font-sans">
          <div className="grid grid-cols-1 gap-8 lg:gap-16 lg:grid-cols-12">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-10">
              <div className="bg-slate-900 flex items-center justify-center p-2 border-2 border-slate-200 aspect-square overflow-hidden shadow-inner">
                <img src={filePreview} alt="" className="max-h-full max-w-full object-contain transition-all duration-700" />
              </div>
              
              <div className="clinical-card p-5 sm:p-10 bg-slate-50/30 border-2 border-slate-100 shadow-none">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 sm:mb-6 font-heading">ASSESSMENT SUMMARY</h4>
                <div className="flex items-baseline justify-between mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 font-heading">Diagnosis</span>
                    <span className="text-xl sm:text-2xl font-black uppercase tracking-widest text-slate-900 font-heading">{prediction.diagnosis}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 font-heading">Confidence</span>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 font-technical">{conf.toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="flex gap-4 sm:gap-6 items-start">
                   <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-900 flex items-center justify-center shrink-0">
                      <Info weight="bold" className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                   </div>
                   <div>
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-2 font-heading">Clinical Directive</h5>
                      <p className="text-sm font-medium leading-relaxed text-slate-500 font-sans">{SEV_LABEL[prediction.diagnosis]}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-10">
              <div className="clinical-card p-5 sm:p-10 shadow-none border-2 border-slate-100 bg-white">
                <div className="flex items-center gap-3 mb-6 sm:mb-10 pb-4 border-b border-slate-100">
                  <ChartBar weight="bold" className="h-5 w-5 text-slate-900" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-heading">PROBABILITY VECTOR</h4>
                </div>
                <div className="space-y-6 sm:space-y-10">
                  {Object.entries(prediction.probabilities).sort((a,b) => b[1]-a[1]).map(([k, v]) => (
                    <div key={k}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-3 font-heading">
                           <div className="h-2 w-2" style={{ backgroundColor: SEV_COLOR[k] }} />
                           {k}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={clsx(
                             "text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm",
                             v < 30 ? "bg-slate-100 text-slate-400" :
                             k === "Normal" ? "bg-emerald-100 text-emerald-700" :
                             v >= 50 ? "bg-red-100 text-red-700 animate-pulse" : "bg-amber-100 text-amber-700"
                          )}>
                            {v < 30 ? "Unlikely" : k === "Normal" ? "Safe / Healthy" : v >= 50 ? "Medical Help Needed" : "Precaution Advised"}
                          </span>
                          <span className="font-technical text-sm font-black text-slate-500 w-12 text-right">{v.toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000 ease-out" 
                          style={{ width: `${v}%`, backgroundColor: SEV_COLOR[k] }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Food & Nutrition Recommendations ── */}
              <div className={clsx(
                "clinical-card p-5 sm:p-10 shadow-none border-2 bg-white",
                prediction.diagnosis === "Normal" ? "border-emerald-200" :
                prediction.diagnosis === "Mild" ? "border-amber-200" :
                prediction.diagnosis === "Moderate" ? "border-orange-200" :
                "border-red-200"
              )}>
                <div className="flex items-center gap-3 mb-6 sm:mb-8 pb-4 border-b border-slate-100">
                  <Leaf weight="bold" className="h-5 w-5 text-emerald-600" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-heading">DIETARY RECOMMENDATIONS</h4>
                  <span className={clsx(
                    "ml-auto text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm",
                    prediction.diagnosis === "Normal" ? "bg-emerald-100 text-emerald-700" :
                    prediction.diagnosis === "Mild" ? "bg-amber-100 text-amber-700" :
                    prediction.diagnosis === "Moderate" ? "bg-orange-100 text-orange-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    Based on: {prediction.diagnosis}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {(FOOD_RECS[prediction.diagnosis] || FOOD_RECS["Normal"]).map((item, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        "flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-all duration-200 hover:shadow-md",
                        item.emoji === "⛔" || item.emoji === "🚨"
                          ? "bg-red-50/60 border-red-100"
                          : "bg-emerald-50/40 border-emerald-100"
                      )}
                    >
                      <span className="text-xl sm:text-2xl shrink-0 mt-0.5">{item.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-black text-slate-800 leading-tight mb-1">{item.name}</p>
                        <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-snug">{item.benefit}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 sm:mt-6 text-[9px] font-bold uppercase tracking-widest text-slate-300 text-center font-heading">
                  ⚕ Recommendations are general guidance — always consult your healthcare provider
                </p>
              </div>

              <div className="clinical-card p-5 sm:p-10 shadow-none border-2 border-slate-100 flex flex-col items-center justify-center bg-slate-50/20">
                <div className="w-full flex items-center gap-3 mb-6 sm:mb-8 pb-4 border-b border-slate-100">
                  <RadarIcon weight="bold" className="h-5 w-5 text-slate-900" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-heading">PATHOLOGY RADAR</h4>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} outerRadius={90}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="cat" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: "900", fontFamily: "var(--font-jakarta)" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="val" stroke="#0f172a" fill="#0f172a" fillOpacity={0.05} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t-2 border-slate-100 bg-slate-50 px-4 py-4 sm:px-12 sm:py-8 flex justify-end gap-4 sm:gap-6 font-heading">
           <button 
             onClick={onDownloadPDF} 
             className="flex items-center gap-2 sm:gap-3 bg-slate-900 px-6 py-3 sm:px-10 sm:py-5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-black transition-all touch-target"
           >
              <DownloadSimple weight="bold" size={18} /> DOWNLOAD CLINICAL REPORT
           </button>
        </div>
      </div>
    </div>
  );
};
