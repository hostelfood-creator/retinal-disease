"use client";

import React from "react";
import { useDropzone } from "react-dropzone";
import { UploadSimple, FileImage, Trash, Scan, WarningCircle } from "@phosphor-icons/react";
import clsx from "clsx";
import styled from "styled-components";

interface UploadSectionProps {
  files: Array<{ file: File; preview: string }>;
  loading: boolean;
  error: string | null;
  onDrop: (accepted: File[]) => void;
  onUpload: () => void;
  onReset: () => void;
}

const StyledWrapper = styled.div` 
  .button-container {
    display: flex;
    justify-content: center;
    width: 100%;
  }

   .button { 
     --white: #ffe7ff; 
     --purple-100: #f4b1fd; 
     --purple-200: #d190ff; 
     --purple-300: #c389f2; 
     --purple-400: #8e26e2; 
     --purple-500: #5e2b83; 
     --radius: 18px; 
  
     border-radius: var(--radius); 
     outline: none; 
     cursor: pointer; 
     font-size: 14px; 
     font-family: var(--font-jakarta), Arial; 
     background: transparent; 
     letter-spacing: -1px; 
     border: 0; 
     position: relative; 
     width: 100%; 
     height: 64px; 
     transform: rotate(359deg);
     transition: all 0.3s ease;
   }

   @media (min-width: 640px) {
     .button {
       height: 80px;
       font-size: 18px;
     }
   } 

   .button:disabled {
     opacity: 0.5;
     cursor: not-allowed;
     filter: grayscale(1);
   }
  
   .bg { 
     position: absolute; 
     inset: 0; 
     border-radius: inherit; 
     filter: blur(1px); 
   } 
   .bg::before, 
   .bg::after { 
     content: ""; 
     position: absolute; 
     inset: 0; 
     border-radius: calc(var(--radius) * 1.1); 
     background: var(--purple-500); 
   } 
   .bg::before { 
     filter: blur(5px); 
     transition: all 0.3s ease; 
     box-shadow: 
       -7px 6px 0 0 rgb(115 75 155 / 40%), 
       -14px 12px 0 0 rgb(115 75 155 / 30%), 
       -21px 18px 4px 0 rgb(115 75 155 / 25%), 
       -28px 24px 8px 0 rgb(115 75 155 / 15%), 
       -35px 30px 12px 0 rgb(115 75 155 / 12%), 
       -42px 36px 16px 0 rgb(115 75 155 / 8%), 
       -56px 42px 20px 0 rgb(115 75 155 / 5%); 
   } 
  
   .wrap { 
     border-radius: inherit; 
     overflow: hidden; 
     height: 100%; 
     transform: translate(6px, -6px); 
     padding: 3px; 
     background: linear-gradient( 
       to bottom, 
       var(--purple-100) 0%, 
       var(--purple-400) 100% 
     ); 
     position: relative; 
     transition: all 0.3s ease; 
   } 
  
   .outline { 
     position: absolute; 
     overflow: hidden; 
     inset: 0; 
     opacity: 0; 
     outline: none; 
     border-radius: inherit; 
     transition: all 0.4s ease; 
   } 
   .outline::before { 
     content: ""; 
     position: absolute; 
     inset: 2px; 
     width: 120px; 
     height: 300px; 
     margin: auto; 
     background: linear-gradient( 
       to right, 
       transparent 0%, 
       white 50%, 
       transparent 100% 
     ); 
     animation: spin 3s linear infinite; 
     animation-play-state: paused; 
   } 
  
   .content { 
     pointer-events: none; 
     display: flex; 
     align-items: center; 
     justify-content: center; 
     z-index: 1; 
     position: relative; 
     height: 100%; 
     gap: 16px; 
     border-radius: calc(var(--radius) * 0.85); 
     font-weight: 900; 
     transition: all 0.3s ease; 
     background: linear-gradient( 
       to bottom, 
       var(--purple-300) 0%, 
       var(--purple-400) 100% 
     ); 
     box-shadow: 
       inset -2px 12px 11px -5px var(--purple-200), 
       inset 1px -3px 11px 0px rgb(0 0 0 / 35%); 
   } 
   .content::before { 
     content: ""; 
     inset: 0; 
     position: absolute; 
     z-index: 10; 
     width: 80%; 
     top: 45%; 
     bottom: 35%; 
     opacity: 0.7; 
     margin: auto; 
     background: linear-gradient(to bottom, transparent, var(--purple-400)); 
     filter: brightness(1.3) blur(5px); 
   } 
  
   .char { 
     transition: all 0.3s ease; 
     display: flex; 
     align-items: center; 
     justify-content: center; 
   } 
   .char span { 
     display: block; 
     color: transparent; 
     position: relative; 
   } 
   .char.state-1 span { 
     animation: charAppear 1.2s ease backwards calc(var(--i) * 0.03s); 
   } 
   .char.state-1 span::before, 
   .char span::after { 
     content: attr(data-label); 
     position: absolute; 
     color: var(--white); 
     text-shadow: -1px 1px 2px var(--purple-500); 
     left: 0; 
   } 
   .char span::before { 
     opacity: 0; 
     transform: translateY(-100%); 
   } 
   .char.state-2 { 
     position: absolute; 
   } 
   .char.state-2 span::after { 
     opacity: 1; 
   } 
  
   .icon { 
     animation: resetArrow 0.8s cubic-bezier(0.7, -0.5, 0.3, 1.2) forwards; 
     z-index: 10; 
   } 
   .icon div, 
   .icon div::before, 
   .icon div::after { 
     height: 3px; 
     border-radius: 1px; 
     background-color: var(--white); 
   } 
   .icon div::before, 
   .icon div::after { 
     content: ""; 
     position: absolute; 
     right: 0; 
     transform-origin: center right; 
     width: 14px; 
     border-radius: 15px; 
     transition: all 0.3s ease; 
   } 
   .icon div { 
     position: relative; 
     width: 24px; 
     box-shadow: -2px 2px 5px var(--purple-400); 
     transform: scale(0.9); 
     background: linear-gradient(to bottom, var(--white), var(--purple-100)); 
     animation: swingArrow 1s ease-in-out infinite; 
     animation-play-state: paused; 
   } 
   .icon div::before { 
     transform: rotate(44deg); 
     top: 1px; 
     box-shadow: 1px -2px 3px -1px var(--purple-400); 
     animation: rotateArrowLine 1s linear infinite; 
     animation-play-state: paused; 
   } 
   .icon div::after { 
     bottom: 1px; 
     transform: rotate(316deg); 
     box-shadow: -2px 2px 3px 0 var(--purple-400); 
     background: linear-gradient(200deg, var(--white), var(--purple-100)); 
     animation: rotateArrowLine2 1s linear infinite; 
     animation-play-state: paused; 
   } 
  
   .path { 
     position: absolute; 
     z-index: 12; 
     bottom: 0; 
     left: 0; 
     right: 0; 
     stroke-dasharray: 150 480; 
     stroke-dashoffset: 150; 
     pointer-events: none; 
   } 
  
   .splash { 
     position: absolute; 
     top: 0; 
     left: 0; 
     pointer-events: none; 
     stroke-dasharray: 60 60; 
     stroke-dashoffset: 60; 
     transform: translate(-17%, -31%); 
     stroke: var(--purple-300); 
   } 
  
   /** STATES */ 
  
   .button:not(:disabled):hover .char.state-1 span::before { 
     animation: charAppear 0.7s ease calc(var(--i) * 0.03s); 
   } 
  
   .button:not(:disabled):hover .char.state-1 span::after { 
     opacity: 1; 
     animation: charDisappear 0.7s ease calc(var(--i) * 0.03s); 
   } 
  
   .button:not(:disabled):hover .wrap { 
     transform: translate(8px, -8px); 
   } 
  
   .button:not(:disabled):hover .outline { 
     opacity: 1; 
   } 
  
   .button:not(:disabled):hover .outline::before, 
   .button:not(:disabled):hover .icon div::before, 
   .button:not(:disabled):hover .icon div::after, 
   .button:not(:disabled):hover .icon div { 
     animation-play-state: running; 
   } 
  
   .button:not(:disabled):active .bg::before { 
     filter: blur(5px); 
     opacity: 0.7; 
     box-shadow: 
       -7px 6px 0 0 rgb(115 75 155 / 40%), 
       -14px 12px 0 0 rgb(115 75 155 / 25%), 
       -21px 18px 4px 0 rgb(115 75 155 / 15%); 
   } 
   .button:not(:disabled):active .content { 
     box-shadow: 
       inset -1px 12px 8px -5px rgba(71, 0, 137, 0.4), 
       inset 0px -3px 8px 0px var(--purple-200); 
   } 
  
   .button:not(:disabled):active .outline { 
     opacity: 0; 
   } 
  
   .button:not(:disabled):active .wrap { 
     transform: translate(3px, -3px); 
   } 
  
   .button:not(:disabled):active .splash { 
     animation: splash 0.8s cubic-bezier(0.3, 0, 0, 1) forwards 0.05s; 
   } 
  
   .button:focus:not(:active) .path { 
     animation: path 1.6s ease forwards 0.2s; 
   } 
  
   .button:focus:not(:active) .icon { 
     animation: arrow 1s cubic-bezier(0.7, -0.5, 0.3, 1.5) forwards; 
   } 
  
   .char.state-2 span::after, 
   .button:focus:not(:active) .char.state-1 span { 
     animation: charDisappear 0.5s ease forwards calc(var(--i) * 0.03s); 
   } 
  
   .button:focus:not(:active) .char.state-2 span::after { 
     animation: charAppear 1s ease backwards calc(var(--i) * 0.03s); 
   } 
  
   @keyframes spin { 
     0% { transform: rotate(0deg); } 
     100% { transform: rotate(360deg); } 
   } 
  
   @keyframes charAppear { 
     0% { 
       transform: translateY(50%); 
       opacity: 0; 
       filter: blur(20px); 
     } 
     20% { 
       transform: translateY(70%); 
       opacity: 1; 
     } 
     50% { 
       transform: translateY(-15%); 
       opacity: 1; 
       filter: blur(0); 
     } 
     100% { 
       transform: translateY(0); 
       opacity: 1; 
     } 
   } 
  
   @keyframes charDisappear { 
     0% { 
       transform: translateY(0); 
       opacity: 1; 
     } 
     100% { 
       transform: translateY(-70%); 
       opacity: 0; 
       filter: blur(3px); 
     } 
   } 
  
   @keyframes arrow { 
     0% { opacity: 1; } 
     50% { 
       transform: translateX(60px); 
       opacity: 0; 
     } 
     51% { 
       transform: translateX(-200px); 
       opacity: 0; 
     } 
     100% { 
       transform: translateX(-128px); 
       opacity: 1; 
     } 
   } 
  
   @keyframes swingArrow { 
     50% { transform: translateX(5px) scale(0.9); } 
   } 
  
   @keyframes rotateArrowLine { 
     50% { transform: rotate(30deg); } 
     80% { transform: rotate(55deg); } 
   } 
  
   @keyframes rotateArrowLine2 { 
     50% { transform: rotate(330deg); } 
     80% { transform: rotate(300deg); } 
   } 
  
   @keyframes resetArrow { 
     0% { transform: translateX(-128px); } 
     100% { transform: translateX(0); } 
   } 
  
   @keyframes path { 
     from { stroke: white; } 
     to { 
       stroke-dashoffset: -480; 
       stroke: #f9c6fe; 
     } 
   } 
  
   @keyframes splash { 
     to { 
       stroke-dasharray: 2 60; 
       stroke-dashoffset: -60; 
     } 
   }
`;

export const UploadSection: React.FC<UploadSectionProps> = ({
  files,
  loading,
  error,
  onDrop,
  onUpload,
  onReset,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpeg", ".jpg"] },
    maxFiles: 10,
  });

  return (
    <section className="mx-auto max-w-6xl pt-8 pb-16 sm:pt-16 sm:pb-32 px-4 sm:px-6">
      <div className="mb-8 border-l-4 border-slate-900 pl-4 sm:mb-16 sm:pl-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl md:text-7xl mb-3 sm:mb-4 font-heading break-words">
          DIAGNOSTIC CORE
        </h1>
        <p className="max-w-2xl text-base sm:text-lg font-medium text-slate-500 leading-relaxed font-sans">
          Automated screening of fundus photography for diabetic retinopathy.
          Our system utilizes high-precision convolutional networks for clinical assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-8">
          <div
            {...getRootProps()}
            className={clsx(
              "group relative flex min-h-[240px] sm:min-h-[460px] cursor-pointer flex-col items-center justify-center border-2 border-slate-100 bg-white transition-all duration-200",
              isDragActive
                ? "border-slate-900 bg-slate-50"
                : "hover:border-slate-300 hover:bg-slate-50/30"
            )}
          >
            <input {...getInputProps()} />
            
            <div className="relative z-10 flex flex-col items-center p-6 sm:p-12 text-center">
              <div className="mb-6 sm:mb-8 flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                <UploadSimple weight="bold" className={clsx("h-7 w-7 sm:h-10 sm:w-10 transition-colors duration-300", isDragActive ? "text-slate-900" : "text-slate-300 group-hover:text-slate-900")} />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2 sm:mb-3 uppercase font-heading sm:text-2xl">
                {isDragActive ? "INITIATE UPLOAD" : "SELECT PHOTOS"}
              </h3>
              <p className="text-slate-500 max-w-sm text-sm font-medium font-sans">
                Drag and drop fundus photographs here, or <span className="text-slate-900 font-bold underline underline-offset-4 decoration-2">browse directory</span>.
              </p>
              <div className="mt-6 sm:mt-12 flex items-center gap-4 sm:gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-heading">
                <span className="flex items-center gap-2 font-technical"><FileImage size={16} /> PNG/JPG</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="font-technical">BATCH LIMIT: 10</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="clinical-card p-5 sm:p-8 min-h-[280px] sm:min-h-[460px] flex flex-col border-2 border-slate-100">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 font-heading">SESSION QUEUE</h4>
              {files.length > 0 && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors font-heading"
                >
                  <Trash weight="bold" className="h-4 w-4" /> CLEAR
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                  <Scan weight="thin" className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300 font-heading">No assets loaded</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[340px] pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  {files.map((f, i) => (
                    <div key={i} className="group relative aspect-square bg-slate-900 border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                      <img
                        src={f.preview}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                         <p className="text-[10px] font-mono font-bold text-white truncate w-full text-center">
                            {f.file.name}
                         </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-100">
               {error && (
                 <div className="mb-6 flex items-start gap-4 bg-red-50 p-5 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                   <WarningCircle weight="bold" className="h-5 w-5 shrink-0 text-red-600" />
                   <p className="text-[10px] font-black text-red-600 leading-tight uppercase tracking-widest font-heading">{error}</p>
                 </div>
               )}
               <StyledWrapper>
                 <div className="button-container">
                   <button 
                     className="button" 
                     onClick={onUpload} 
                     disabled={files.length === 0 || loading}
                   > 
                     <div className="bg" /> 
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 342 208" style={{ width: '100%', height: 'auto' }} className="splash"> 
                       <path strokeLinecap="round" strokeWidth={3} d="M54.1054 99.7837C54.1054 99.7837 40.0984 90.7874 26.6893 97.6362C13.2802 104.485 1.5 97.6362 1.5 97.6362" /> 
                       <path strokeLinecap="round" strokeWidth={3} d="M285.273 99.7841C285.273 99.7841 299.28 90.7879 312.689 97.6367C326.098 104.486 340.105 95.4893 340.105 95.4893" /> 
                       <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M281.133 64.9917C281.133 64.9917 287.96 49.8089 302.934 48.2295C317.908 46.6501 319.712 36.5272 319.712 36.5272" /> 
                       <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M281.133 138.984C281.133 138.984 287.96 154.167 302.934 155.746C317.908 157.326 319.712 167.449 319.712 167.449" /> 
                       <path strokeLinecap="round" strokeWidth={3} d="M230.578 57.4476C230.578 57.4476 225.785 41.5051 236.061 30.4998C246.337 19.4945 244.686 12.9998 244.686 12.9998" /> 
                       <path strokeLinecap="round" strokeWidth={3} d="M230.578 150.528C230.578 150.528 225.785 166.471 236.061 177.476C246.337 188.481 244.686 194.976 244.686 194.976" /> 
                       <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M170.392 57.0278C170.392 57.0278 173.89 42.1322 169.571 29.54C165.252 16.9478 168.751 2.05227 168.751 2.05227" /> 
                       <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M170.392 150.948C170.392 150.948 173.89 165.844 169.571 178.436C165.252 191.028 168.751 205.924 168.751 205.924" /> 
                       <path strokeLinecap="round" strokeWidth={3} d="M112.609 57.4476C112.609 57.4476 117.401 41.5051 107.125 30.4998C96.8492 19.4945 98.5 12.9998 98.5 12.9998" /> 
                       <path strokeLinecap="round" strokeWidth={3} d="M112.609 150.528C112.609 150.528 117.401 166.471 107.125 177.476C96.8492 188.481 98.5 194.976 98.5 194.976" /> 
                       <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M62.2941 64.9917C62.2941 64.9917 55.4671 49.8089 40.4932 48.2295C25.5194 46.6501 23.7159 36.5272 23.7159 36.5272" /> 
                       <path strokeLinecap="round" strokeWidth={3} strokeOpacity="0.3" d="M62.2941 145.984C62.2941 145.984 55.4671 161.167 40.4932 162.746C25.5194 164.326 23.7159 174.449 23.7159 174.449" /> 
                     </svg> 
                     <div className="wrap"> 
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 221 42" style={{ width: '100%', height: '100%' }} preserveAspectRatio='none' className="path"> 
                         <path strokeLinecap="round" strokeWidth={3} d="M182.674 2H203C211.837 2 219 9.16344 219 18V24C219 32.8366 211.837 40 203 40H18C9.16345 40 2 32.8366 2 24V18C2 9.16344 9.16344 2 18 2H47.8855" /> 
                       </svg> 
                       <div className="outline" /> 
                       <div className="content"> 
                         <span className="char state-1"> 
                           {loading ? (
                             "ANALYZING".split("").map((char, i) => (
                               <span key={i} data-label={char} style={{ "--i": i + 1 } as any}>{char}</span>
                             ))
                           ) : (
                             "DIAGNOSE".split("").map((char, i) => (
                               <span key={i} data-label={char} style={{ "--i": i + 1 } as any}>{char}</span>
                             ))
                           )}
                         </span> 
                         <div className="icon"> 
                           <div /> 
                         </div> 
                         <span className="char state-2"> 
                           {"INITIATE".split("").map((char, i) => (
                             <span key={i} data-label={char} style={{ "--i": i + 1 } as any}>{char}</span>
                           ))}
                         </span> 
                       </div> 
                     </div> 
                   </button> 
                 </div>
               </StyledWrapper>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
