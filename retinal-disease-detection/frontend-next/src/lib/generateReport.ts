"use client";

import jsPDF from "jspdf";

/* ─── Types ─── */
interface Prediction {
  filename: string;
  diagnosis: string;
  probabilities: Record<string, number>;
}

/* ─── Severity colors (R, G, B) ─── */
const SEV_RGB: Record<string, [number, number, number]> = {
  Normal: [16, 185, 129],
  Mild: [245, 158, 11],
  Moderate: [249, 115, 22],
  Severe: [239, 68, 68],
  Proliferative: [153, 27, 27],
};

/* ─── Clinical directives ─── */
const SEV_LABEL: Record<string, string> = {
  Normal: "No signs of diabetic retinopathy detected. Routine follow-up recommended.",
  Mild: "Micro-aneurysms only. Annual screening recommended.",
  Moderate: "More than micro-aneurysms, less than severe NPDR. Refer to ophthalmologist.",
  Severe: "Significant vascular damage. Urgent specialist referral required.",
  Proliferative: "Neovascularization present. Immediate treatment required.",
};

/* ─── Health status labels ─── */
function getHealthTag(key: string, value: number): string {
  if (value < 30) return "Unlikely";
  if (key === "Normal") return "Safe / Healthy";
  if (value >= 50) return "Medical Help Needed";
  return "Precaution Advised";
}

/* ─── Food recommendations (NO emojis) ─── */
const FOOD_RECS: Record<string, { name: string; benefit: string }[]> = {
  Normal: [
    { name: "Carrots & Sweet Potatoes", benefit: "Rich in beta-carotene for retinal health" },
    { name: "Spinach & Kale", benefit: "Lutein & zeaxanthin protect the macula" },
    { name: "Salmon & Sardines", benefit: "Omega-3 fatty acids reduce inflammation" },
    { name: "Blueberries", benefit: "Anthocyanins improve blood flow to eyes" },
    { name: "Eggs", benefit: "Lutein, zinc & vitamin E for lens protection" },
  ],
  Mild: [
    { name: "Broccoli & Brussels Sprouts", benefit: "Vitamin C supports blood vessel integrity" },
    { name: "Citrus Fruits", benefit: "High vitamin C to slow vascular damage" },
    { name: "Almonds & Walnuts", benefit: "Vitamin E protects against oxidative stress" },
    { name: "Lentils & Chickpeas", benefit: "Low-GI foods for blood sugar regulation" },
    { name: "Fatty Fish (2-3x/week)", benefit: "Omega-3s slow retinopathy progression" },
    { name: "Garlic & Onions", benefit: "Allicin helps regulate blood pressure" },
  ],
  Moderate: [
    { name: "Leafy Greens (daily)", benefit: "Essential carotenoids - increase intake" },
    { name: "Bell Peppers", benefit: "Very high vitamin C for capillary repair" },
    { name: "Sweet Potatoes (not fried)", benefit: "Low-GI carb with vitamin A" },
    { name: "Avocado", benefit: "Monounsaturated fats & lutein" },
    { name: "Green Tea", benefit: "Catechins protect retinal blood vessels" },
    { name: "Avoid: Sugary Drinks & Processed Food", benefit: "Blood sugar spikes worsen retinopathy" },
  ],
  Severe: [
    { name: "Dark Leafy Greens (2x daily)", benefit: "Maximize lutein & folate intake" },
    { name: "Berries & Cherries", benefit: "Powerful anti-inflammatory antioxidants" },
    { name: "Omega-3 Rich Fish (3-4x/week)", benefit: "Critical for reducing retinal inflammation" },
    { name: "Turmeric & Ginger", benefit: "Curcumin reduces vascular inflammation" },
    { name: "Strict: No White Rice / White Bread", benefit: "High-GI foods accelerate damage" },
    { name: "Strict: Limit Sodium & Trans Fats", benefit: "Protects blood pressure & vessels" },
  ],
  Proliferative: [
    { name: "Medical Diet Plan Required", benefit: "Consult a dietitian for personalized plan" },
    { name: "Anti-inflammatory Diet", benefit: "Greens, fish, nuts - reduce neovascularization" },
    { name: "High-Fiber, Low-GI Only", benefit: "Strict glycemic control is essential" },
    { name: "Green Tea & Turmeric Water", benefit: "Anti-angiogenic compounds may help" },
    { name: "Eliminate: Alcohol & Smoking", benefit: "Both dramatically worsen proliferative DR" },
    { name: "Eliminate: All Processed Sugar", benefit: "Immediate blood sugar control needed" },
  ],
};

/* ─── Helper: load image as base64 ─── */
async function loadImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ─── Helper: file to base64 ─── */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Helper: draw a sleek double-line border ─── */
function drawPageBorder(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Outer border
  doc.setDrawColor(50, 55, 65); // dark charcoal
  doc.setLineWidth(1.2);
  doc.rect(8, 8, w - 16, h - 16);

  // Inner border
  doc.setLineWidth(0.3);
  doc.rect(11, 11, w - 22, h - 22);
}

/* ─── Helper: draw a thin horizontal rule ─── */
function drawRule(doc: jsPDF, y: number, x1: number, x2: number) {
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

/* ─── Helper: draw colored severity dot ─── */
function drawSeverityDot(doc: jsPDF, x: number, y: number, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x, y, 1.5, "F");
}

/* ─── Helper: draw a probability bar ─── */
function drawBar(doc: jsPDF, x: number, y: number, width: number, value: number, color: [number, number, number]) {
  // Background track
  doc.setFillColor(240, 242, 245);
  doc.roundedRect(x, y, width, 3, 1.5, 1.5, "F");

  // Filled bar
  if (value > 0) {
    const filledWidth = Math.max(3, (value / 100) * width);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y, filledWidth, 3, 1.5, 1.5, "F");
  }
}

/* ─── Helper: wrap text and return lines ─── */
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

/* ═══════════════════════════════════════════════════
   MAIN: Generate Professional PDF Report
   ═══════════════════════════════════════════════════ */
export async function generateDiagnosticPDF(
  prediction: Prediction,
  imageFile: File | null,
  downloadFilename: string = "Diagnostic_Report.pdf"
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();   // 210
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Load logo ──
  let logoB64: string | null = null;
  try {
    logoB64 = await loadImageAsBase64("/logo.png");
  } catch {
    // Logo loading failed, continue without
  }

  // ── Load retinal image ──
  let imgB64: string | null = null;
  if (imageFile) {
    try {
      imgB64 = await fileToBase64(imageFile);
    } catch {
      // Image loading failed, continue without
    }
  }

  /* ═══════════════════════════════════════
     PAGE 1: Header + Diagnosis + Probabilities
     ═══════════════════════════════════════ */
  drawPageBorder(doc);

  // ── Logo & Header ──
  y = 18;
  if (logoB64) {
    doc.addImage(logoB64, "PNG", margin, y, 40, 20);
  }

  // Report title (right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(50, 55, 65);
  doc.text("DIAGNOSTIC REPORT", pageW - margin, y + 6, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(130, 140, 155);
  doc.setFont("helvetica", "normal");
  doc.text("Retinal Disease Detection System", pageW - margin, y + 12, { align: "right" });
  doc.text(`Report ID: RPT-${Date.now().toString(36).toUpperCase()}`, pageW - margin, y + 17, { align: "right" });

  y += 26;
  drawRule(doc, y, margin, pageW - margin);

  // ── Report metadata row ──
  y += 6;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 110, 125);

  doc.text("PATIENT FILE", margin, y);
  doc.text("DATE", margin + 65, y);
  doc.text("SYSTEM VERSION", margin + 115, y);

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 40, 55);

  const displayName = prediction.filename.length > 30
    ? prediction.filename.substring(0, 27) + "..."
    : prediction.filename;
  doc.text(displayName, margin, y);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  doc.text(`${dateStr}, ${timeStr}`, margin + 65, y);
  doc.text("v2.4.0 Clinical Release", margin + 115, y);

  y += 6;
  drawRule(doc, y, margin, pageW - margin);

  // ── Primary Diagnosis Box ──
  y += 7;
  const diagColor = SEV_RGB[prediction.diagnosis] || [30, 40, 55];
  const confidence = Math.max(...Object.values(prediction.probabilities));

  // Diagnosis container
  doc.setFillColor(diagColor[0], diagColor[1], diagColor[2]);
  doc.rect(margin, y, 4, 22, "F");

  doc.setFillColor(248, 249, 251);
  doc.rect(margin + 4, y, contentW - 4, 22, "F");

  // Thin border around the box
  doc.setDrawColor(diagColor[0], diagColor[1], diagColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 22);

  // Diagnosis text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 125);
  doc.text("PRIMARY DIAGNOSIS", margin + 10, y + 6);

  doc.setFontSize(16);
  doc.setTextColor(diagColor[0], diagColor[1], diagColor[2]);
  doc.text(prediction.diagnosis.toUpperCase(), margin + 10, y + 15);

  // Confidence (right side)
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 125);
  doc.text("CONFIDENCE", pageW - margin - 5, y + 6, { align: "right" });

  doc.setFontSize(20);
  doc.setTextColor(30, 40, 55);
  doc.text(`${confidence.toFixed(1)}%`, pageW - margin - 5, y + 16, { align: "right" });

  y += 28;

  // ── Clinical Directive ──
  doc.setFillColor(248, 249, 251);
  doc.rect(margin, y, contentW, 14, "F");
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentW, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 125);
  doc.text("CLINICAL DIRECTIVE", margin + 5, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(50, 60, 75);
  doc.text(SEV_LABEL[prediction.diagnosis] || "", margin + 5, y + 10.5);

  y += 20;

  // ── Retinal Image (if available) ──
  if (imgB64) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 55, 65);
    doc.text("RETINAL SCAN IMAGE", margin, y);
    y += 5;

    // Image container with border
    const imgSize = 45;
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, imgSize, imgSize);
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 0.3, y + 0.3, imgSize - 0.6, imgSize - 0.6, "F");

    try {
      doc.addImage(imgB64, "JPEG", margin + 2, y + 2, imgSize - 4, imgSize - 4);
    } catch {
      // If image format not supported, try as PNG
      try {
        doc.addImage(imgB64, "PNG", margin + 2, y + 2, imgSize - 4, imgSize - 4);
      } catch {
        // skip image
      }
    }

    // Probability section next to image
    const probX = margin + imgSize + 10;
    const probW = contentW - imgSize - 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 55, 65);
    doc.text("PROBABILITY ANALYSIS", probX, y);

    let probY = y + 7;
    const sortedProbs = Object.entries(prediction.probabilities).sort((a, b) => b[1] - a[1]);

    for (const [key, val] of sortedProbs) {
      const color = SEV_RGB[key] || [100, 110, 125];

      // Severity dot
      drawSeverityDot(doc, probX + 2, probY, color);

      // Category name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 40, 55);
      doc.text(key, probX + 6, probY + 1);

      // Value
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 90, 105);
      doc.text(`${val.toFixed(2)}%`, probX + probW - 2, probY + 1, { align: "right" });

      // Health tag
      const tag = getHealthTag(key, val);
      doc.setFontSize(6);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(`[${tag}]`, probX + probW - 2, probY + 5.5, { align: "right" });

      // Progress bar
      drawBar(doc, probX + 6, probY + 3, probW - 24, val, color);

      probY += 9;
    }

    y += imgSize + 5;
  } else {
    // No image – just show probabilities full width
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 55, 65);
    doc.text("PROBABILITY ANALYSIS", margin, y);

    y += 7;
    const sortedProbs = Object.entries(prediction.probabilities).sort((a, b) => b[1] - a[1]);

    for (const [key, val] of sortedProbs) {
      const color = SEV_RGB[key] || [100, 110, 125];

      drawSeverityDot(doc, margin + 2, y, color);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 40, 55);
      doc.text(key, margin + 6, y + 1);

      doc.setFont("helvetica", "normal");
      doc.text(`${val.toFixed(2)}%`, margin + contentW - 2, y + 1, { align: "right" });

      const tag = getHealthTag(key, val);
      doc.setFontSize(6);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(`[${tag}]`, margin + contentW - 2, y + 5.5, { align: "right" });

      drawBar(doc, margin + 6, y + 3, contentW - 30, val, color);

      y += 9;
    }
    y += 3;
  }

  /* ═══════════════════════════════════════
     PAGE 2: Dietary Recommendations
     ═══════════════════════════════════════ */
  doc.addPage();
  drawPageBorder(doc);

  // ── Page 2 Header ──
  y = 18;
  if (logoB64) {
    doc.addImage(logoB64, "PNG", margin, y, 30, 15);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(50, 55, 65);
  doc.text("DIETARY RECOMMENDATIONS", pageW - margin, y + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 140, 155);
  doc.text(`Based on diagnosis: ${prediction.diagnosis}`, pageW - margin, y + 11, { align: "right" });

  y += 20;
  drawRule(doc, y, margin, pageW - margin);
  y += 6;

  // ── Severity indicator bar ──
  const sevColor = SEV_RGB[prediction.diagnosis] || [100, 110, 125];
  doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
  doc.rect(margin, y, contentW, 1.5, "F");
  y += 6;

  // ── Section title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 40, 55);
  doc.text("Recommended Foods & Nutritional Guidance", margin, y);
  y += 3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 140, 155);
  doc.text(
    "The following dietary recommendations are tailored to the detected severity level.",
    margin,
    y + 4
  );
  y += 10;
  drawRule(doc, y, margin, pageW - margin);
  y += 6;

  // ── Food items ──
  const foodItems = FOOD_RECS[prediction.diagnosis] || FOOD_RECS["Normal"];
  const colW = (contentW - 6) / 2; // Two columns with 6mm gap

  for (let i = 0; i < foodItems.length; i++) {
    const item = foodItems[i];
    const col = i % 2;
    const colX = margin + col * (colW + 6);

    // New row every 2 items
    if (col === 0 && i > 0) {
      y += 22;
    }

    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      drawPageBorder(doc);
      y = 20;
    }

    const isWarning = item.name.startsWith("Avoid") || item.name.startsWith("Strict") || item.name.startsWith("Eliminate") || item.name.startsWith("Medical");

    // Card background — professional slate tones
    if (isWarning) {
      doc.setFillColor(253, 245, 245);
      doc.setDrawColor(210, 190, 190);
    } else {
      doc.setFillColor(248, 249, 252);
      doc.setDrawColor(210, 215, 225);
    }
    doc.setLineWidth(0.2);
    doc.roundedRect(colX, y, colW, 19, 1, 1, "FD");

    // Left accent bar — navy blue for normal, muted red for warnings
    if (isWarning) {
      doc.setFillColor(180, 70, 70);
    } else {
      doc.setFillColor(50, 55, 65);
    }
    doc.rect(colX, y, 2.5, 19, "F");

    // Item number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(isWarning ? 180 : 50, isWarning ? 70 : 55, isWarning ? 70 : 65);
    doc.text(`${String(i + 1).padStart(2, "0")}`, colX + 6, y + 6);

    // Food name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 40, 55);
    const nameLines = wrapText(doc, item.name, colW - 14);
    doc.text(nameLines[0], colX + 13, y + 6);

    // Benefit
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 125);
    const benefitLines = wrapText(doc, item.benefit, colW - 14);
    let bY = y + 11;
    for (const line of benefitLines.slice(0, 2)) {
      doc.text(line, colX + 13, bY);
      bY += 3.5;
    }
  }

  // Handle odd number of items
  y += 26;

  // ── Disclaimer Box ──
  if (y > 245) {
    doc.addPage();
    drawPageBorder(doc);
    y = 20;
  }

  drawRule(doc, y, margin, pageW - margin);
  y += 5;

  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, 20, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 125);
  doc.text("IMPORTANT NOTICE", margin + 5, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(130, 140, 155);
  const disclaimer1 = "Dietary recommendations are general guidance based on medical literature and should not replace professional clinical advice.";
  const disclaimer2 = "Always consult your healthcare provider or a registered dietitian before making significant dietary changes.";
  doc.text(disclaimer1, margin + 5, y + 10);
  doc.text(disclaimer2, margin + 5, y + 14.5);

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.getHeight();

    // Footer separator
    doc.setDrawColor(50, 55, 65);
    doc.setLineWidth(0.4);
    doc.line(margin, ph - 20, pageW - margin, ph - 20);

    // Footer left: branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(50, 55, 65);
    doc.text("Netra AI", margin, ph - 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(140, 150, 165);
    doc.text("Intelligent Vision & Analytics  |  v2.4.0 Clinical Release", margin, ph - 13);

    // Footer center: disclaimer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(160, 170, 180);
    doc.text(
      "For investigational use only. Does not replace professional clinical judgment.",
      pageW / 2,
      ph - 13,
      { align: "center" }
    );

    // Footer right: page number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(50, 55, 65);
    doc.text(`${p} / ${totalPages}`, pageW - margin, ph - 16, { align: "right" });
  }

  // ── Direct save as PDF ──
  doc.save(downloadFilename);
}
