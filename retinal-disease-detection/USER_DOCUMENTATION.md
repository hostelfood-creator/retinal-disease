# RetinAI — Retinal Disease Detection System

### PG Project Documentation

**Author:** M. Sara  
**Date:** March 2026  
**Version:** 2.4.0

---

## Table of Contents

1. [What Is This Project About?](#1-what-is-this-project-about)
2. [How Does It Work? (The Big Picture)](#2-how-does-it-work-the-big-picture)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Setting Up the Project (Step by Step)](#5-setting-up-the-project-step-by-step)
6. [Running the Application](#6-running-the-application)
7. [Using the Application — A Walkthrough](#7-using-the-application--a-walkthrough)
8. [Understanding the AI Model](#8-understanding-the-ai-model)
9. [How the Training Works (3-Phase Strategy)](#9-how-the-training-works-3-phase-strategy)
10. [The Dataset — APTOS 2019](#10-the-dataset--aptos-2019)
11. [Image Preprocessing — CLAHE](#11-image-preprocessing--clahe)
12. [API Endpoints Explained](#12-api-endpoints-explained)
13. [PDF Report Generation](#13-pdf-report-generation)
14. [Deployment on Hugging Face Spaces](#14-deployment-on-hugging-face-spaces)
15. [Project Folder Structure](#15-project-folder-structure)
16. [Frequently Asked Questions](#16-frequently-asked-questions)
17. [Troubleshooting Common Issues](#17-troubleshooting-common-issues)
18. [Future Scope & Improvements](#18-future-scope--improvements)
19. [References & Bibliography](#19-references--bibliography)

---

## 1. What Is This Project About?

Diabetic Retinopathy (DR) is one of the leading causes of blindness worldwide. Millions of people with diabetes develop damage to the tiny blood vessels inside the retina — the light-sensitive tissue at the back of the eye. If caught early, vision loss can be prevented. But here's the problem: **manual screening of fundus images by ophthalmologists is slow, expensive, and simply not scalable** to the billions who need it.

This project — **RetinAI** — tackles exactly that. It is an AI-powered web application that:

- Accepts retinal fundus images (photographs of the back of the eye)
- Runs them through a trained deep learning model (DenseNet121)
- Classifies each image into one of **5 severity levels** of Diabetic Retinopathy
- Presents results in an intuitive, clinical-grade dashboard
- Generates downloadable PDF diagnostic reports

**The five classes the model predicts:**

| Class | Severity | What It Means |
|-------|----------|---------------|
| 0 | Normal | No signs of diabetic retinopathy detected |
| 1 | Mild | A few microaneurysms (tiny swellings in blood vessels) |
| 2 | Moderate | More than just microaneurysms — visible vascular changes |
| 3 | Severe | Many blocked blood vessels, retina starting to signal for new vessel growth |
| 4 | Proliferative | Most advanced stage — new abnormal blood vessels growing, high risk of vision loss |

> **Important:** This is an investigational screening tool. It does not replace a qualified ophthalmologist's diagnosis.

---

## 2. How Does It Work? (The Big Picture)

Here is the simplest way to understand the flow:

```
  ┌─────────────────┐
  │  You Upload a    │
  │  Retinal Image   │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │  Image is sent   │
  │  to the Backend  │
  │  (FastAPI Server) │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │  CLAHE Preprocess│  ← Enhance contrast using medical imaging technique
  │  Resize to 224px │
  │  Normalize (0-1) │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │  DenseNet121     │  ← Trained deep learning model makes prediction
  │  AI Inference    │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │  Results Sent    │  ← Diagnosis + probability distribution
  │  Back to Browser │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │  Dashboard Shows │  ← Table, charts, radar graphs, PDF export
  │  Clinical Report │
  └──────────────────┘
```

**In plain English:** You upload an eye image → The AI enhances it, studies it, and tells you what level of retinopathy it sees → You get a beautiful visual report with probabilities and charts.

---

## 3. System Architecture

RetinAI follows a clean **client-server architecture** combining modern web technologies with high-performance machine learning inference. 

> [!NOTE]
> The architectural schema highlights the separation of concerns: a React-based frontend managing the clinical dashboard, and a Python worker processing heavy image operations.

![System Architecture Diagram](C:\Users\msara\.gemini\antigravity\brain\790a5733-264f-4f53-9d8a-faa030659a79\architecture_diagram_1774808919515.png)

**Frontend (What you see):** Built with Next.js 16 and React 19. It handles the user interface — uploading images, displaying results in tables and charts, and letting you download reports.

**Backend (The brain):** Built with Python FastAPI. It receives images, preprocesses them, runs them through the AI model, and sends back the predictions. It also generates PDF reports.

---

## 4. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.1 | React framework with App Router, SSR, and optimised bundling |
| React | 19.2.4 | Component-based UI library |
| TypeScript | 6.0 | Type-safe JavaScript for fewer bugs |
| Tailwind CSS | 3.4.19 | Utility-first CSS framework for responsive styling |
| styled-components | 6.3.12 | CSS-in-JS for complex animated components |
| Recharts | 3.8.0 | Data visualisation (Radar charts, Pie charts) |
| GSAP | 3.14.2 | Professional-grade page animations |
| Framer Motion | 12.38.0 | Loading overlays and transitions |
| Axios | 1.13.6 | HTTP client for API communication |
| react-dropzone | 15.0.0 | Drag-and-drop file upload |
| Phosphor Icons | 2.1.10 | Icon library for the clinical UI |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Core programming language |
| FastAPI | 0.111+ | High-performance async web framework |
| TensorFlow | 2.16+ (CPU) | Deep learning framework to run the AI model |
| OpenCV | 4.10+ | Image preprocessing (CLAHE enhancement) |
| NumPy | <2.0 | Numerical computations |
| ReportLab | 4.2+ | PDF report generation |
| Uvicorn | 0.30+ | ASGI server to run FastAPI |

### AI / Deep Learning
| Technology | Purpose |
|------------|---------|
| DenseNet121 | Pre-trained CNN architecture (ImageNet weights) |
| Transfer Learning | Fine-tuning a proven model on retinal images |
| CLAHE | Contrast-Limited Adaptive Histogram Equalisation for medical images |
| APTOS 2019 Dataset | 3,662 labelled retinal fundus images from Kaggle |

### Deployment
| Technology | Purpose |
|------------|---------|
| Docker | Containerise the backend for consistent deployment |
| Hugging Face Spaces | Cloud hosting for the API (free tier available) |

---

## 5. Setting Up the Project (Step by Step)

### Prerequisites — What You Need Installed

Before you begin, make sure you have these installed on your computer:

| Software | Where to Get It | Why You Need It |
|----------|-----------------|-----------------|
| Python 3.10 or higher | [python.org](https://www.python.org/downloads/) | Runs the backend server and AI model |
| Node.js 18 or higher | [nodejs.org](https://nodejs.org/) | Runs the Next.js frontend |
| Git | [git-scm.com](https://git-scm.com/) | To clone the project (optional) |

> **Tip:** To check if they're installed, open a terminal and type `python --version` and `node --version`.

---

### Step 1: Get the Project Files

If you received the project as a ZIP file, simply extract it. If you're cloning from a repository:

```bash
git clone <your-repository-url>
cd retinal-disease-detection
```

---

### Step 2: Set Up the Backend

Open a terminal in the project root folder and run:

```bash
cd backend
pip install -r requirements.txt
```

This installs all the Python libraries the backend needs — FastAPI, TensorFlow, OpenCV, etc.

> **Note:** TensorFlow is a large download (~400 MB). Be patient and make sure you have a stable internet connection.

---

### Step 3: Set Up the Frontend

Open another terminal (or a new tab) in the project root:

```bash
cd frontend-next
npm install
```

This installs all the JavaScript packages listed in `package.json`. It may take 2–3 minutes the first time.

---

### Step 4: Verify the AI Model Is in Place

The trained DenseNet121 model should already be located at:

```
AI_Models/
  └── models/
      └── densenet_retina_model/
          ├── config.json
          ├── metadata.json
          └── model.weights.h5
```

If this folder is missing or empty, the backend will print a warning and fall back to random mock predictions (useful for testing the UI, but obviously not real predictions).

---

### Step 5: (Optional) Download the Dataset for Training

If you want to retrain the model yourself:

```bash
cd AI_Models
pip install kagglehub
python download_dataset.py
```

This downloads the **APTOS 2019 Blindness Detection** dataset from Kaggle (approximately 11 GB of retinal images).

---

## 6. Running the Application

### The Easy Way (Windows — One Click)

Just double-click the file:

```
start_app.bat
```

This batch file automatically:
1. Starts the FastAPI backend on `http://localhost:8000`
2. Starts the Next.js frontend on `http://localhost:3000`

**Wait about 10–15 seconds**, then open your browser and go to:

```
http://localhost:3000
```

---

### The Manual Way (Any OS)

**Terminal 1 — Start the Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

You should see output like:
```
Success: Successfully loaded real AI Model!
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Terminal 2 — Start the Frontend:**
```bash
cd frontend-next
npm run dev
```

You should see:
```
  ▲ Next.js 16.2.1
  - Local: http://localhost:3000
```

Now open `http://localhost:3000` in your browser.

---

### Using the Hosted Version (No Setup Required)

The backend API is also deployed on Hugging Face Spaces. The frontend is pre-configured to connect to:

```
https://kjndkj-api.hf.space/api/v1
```

So if you only run the frontend (`npm run dev`), it will talk to the cloud-hosted backend automatically. No local Python setup needed.

> **Note:** The cloud API may take 30–60 seconds to "wake up" on first use (Hugging Face Spaces spins down after inactivity).

---

## 7. Using the Application — A Walkthrough

### Step 1: Upload Retinal Images

When you open the app, you'll see the **Analysis** tab with a large drag-and-drop area.

- **Drag and drop** retinal fundus images onto the upload zone, or **click "Browse"** to select files
- You can upload **up to 10 images** at once
- Supported formats: PNG, JPEG
- A session queue on the right shows thumbnails of all queued images

### Step 2: Run the AI Analysis

Once your images are loaded:

- Click the **"DIAGNOSE"** button
- A clinical-style loading animation plays while the AI processes your images
- Each image goes through CLAHE preprocessing and DenseNet121 inference

### Step 3: View Results (Findings Tab)

After processing, the app automatically switches to the **Findings** tab:

- **KPI Cards** at the top show a quick summary — total scans, average confidence, severity breakdown
- **Results Table** lists every image with:
  - Thumbnail preview
  - AI diagnosis (Normal, Mild, Moderate, Severe, or Proliferative)
  - Confidence percentage
  - A mini probability distribution bar
  - Action buttons to view details or download a PDF report

> On mobile devices, some columns are hidden to keep the table readable. You can still see everything in the detail modal.

### Step 4: Open a Detailed Report

Click the **magnifying glass icon** next to any result to open the **Detail Modal**:

- **Left side:** The retinal image, plus an Assessment Summary showing the diagnosis and confidence score with a clinical note explaining the severity level
- **Right side:** 
  - **Probability Vector** — horizontal bars showing the model's confidence for each of the 5 classes
  - **Radar Chart** — a spider/radar visualisation of the probability distribution

### Step 5: Download a PDF Report

Click the **download button** (arrow icon) in the results table, or the **"Export Clinical Report"** button in the detail modal.

The system generates a professional PDF containing:
- The original retinal image
- The AI's diagnosis
- A complete probability breakdown for all 5 classes

The PDF is generated server-side using ReportLab and downloads instantly.

### Step 6: View Analytics (Statistics Tab)

Switch to the **Statistics** tab to see aggregate analytics across all your uploaded images:

- **Diagnosis Distribution** — A pie chart showing how many images fell into each severity category
- **Average Confidence Radar** — A radar chart showing the model's average confidence across all classes

### Step 7: Start Over

Click **"NEW SESSION"** wherever it appears to clear all uploads and results and start fresh.

---

## 8. Understanding the AI Model

### Why DenseNet121?

DenseNet (Dense Convolutional Network) is a CNN architecture where **every layer is connected to every other layer** in a feed-forward fashion. Specifically, DenseNet121 has 121 layers.

**Why we chose it for retinal images:**

1. **Feature Reuse** — Dense connections mean features learned in early layers (edges, textures) are directly available to later layers. This is critical for detecting subtle retinal abnormalities like microaneurysms
2. **Parameter Efficiency** — Despite having 121 layers, DenseNet has fewer parameters (~7 million) than comparable architectures like ResNet-152 (~60 million). This means faster inference
3. **Proven in Medical Imaging** — DenseNet121 is the backbone of CheXNet (Stanford's chest X-ray AI) and has been extensively validated on medical imaging tasks
4. **Pre-trained on ImageNet** — Starting from weights trained on 1.2 million natural images provides a strong foundation for transfer learning

### Model Architecture

```
ImageNet Pre-trained DenseNet121 (feature extractor)
    │
    ▼
GlobalAveragePooling2D          ← Collapses spatial dimensions
    │
    ▼
BatchNormalization              ← Stabilises training
    │
    ▼
Dense(512, relu) + Dropout(0.4) ← Custom classification head
    │
    ▼
BatchNormalization              
    │
    ▼
Dense(256, relu) + Dropout(0.3) ← Further refinement
    │
    ▼
Dense(5, softmax)               ← Output: 5 class probabilities
```

**Total parameters:** ~7.7 million  
**Trainable parameters:** ~7.6 million (after full fine-tuning)  
**Input size:** 224 × 224 × 3 (RGB image)  
**Output:** 5 probabilities that sum to 1.0

---

## 9. How the Training Works (3-Phase Strategy)

Training isn't done all at once. We use a progressive **3-phase transfer learning strategy** that gradually unfreezes the model:

### Phase 1: Train the Head Only (15 epochs)

```
DenseNet121 Base: ❄️ FROZEN (all layers locked)
Custom Head:     🔥 TRAINING
Learning Rate:   1e-3 (relatively fast)
```

**What happens:** Only the new classification layers (Dense 512 → Dense 256 → Dense 5) are trained. The DenseNet base uses its pre-trained ImageNet knowledge as-is. This gives the head layers a good initial set of weights without disturbing the powerful pre-trained features.

### Phase 2: Fine-Tune Top 30% (30 epochs)

```
DenseNet121 Base (bottom 70%): ❄️ FROZEN
DenseNet121 Base (top 30%):    🔥 TRAINING
Custom Head:                    🔥 TRAINING
Learning Rate:                  1e-4 (slower — careful adjustments)
```

**What happens:** The top 30% of DenseNet layers are unlocked and adapted to retinal-specific features. The lower layers (which detect generic edges and textures) stay frozen.

### Phase 3: Full Fine-Tuning (15 epochs)

```
DenseNet121 Base: 🔥 ALL TRAINING
Custom Head:      🔥 TRAINING
Learning Rate:    1e-5 (very slow — fine polish)
```

**What happens:** Every single layer is now trainable. With a very low learning rate, the entire model makes tiny adjustments to specialise completely for retinal disease detection.

### Training Techniques Used

| Technique | What It Does |
|-----------|-------------|
| **Label Smoothing** (0.05–0.1) | Prevents the model from being overconfident; softens the target probabilities slightly |
| **Class Weights** | Compensates for imbalanced data (there are far more "Normal" images than "Proliferative") |
| **Data Augmentation** | Rotation (±30°), shifts, zoom, flips, brightness variation — artificially expands the dataset |
| **EarlyStopping** | Stops training if validation accuracy plateaus — prevents overfitting |
| **ReduceLROnPlateau** | Automatically lowers learning rate when progress stalls |
| **ModelCheckpoint** | Saves the best-performing model weights throughout training |

### Achieved Performance

From the model comparison tests:

| Metric | Value |
|--------|-------|
| Test Accuracy | **98.75%** |
| Test Loss | 0.1157 |
| Model Size | ~35 MB |
| Inference Time | ~0.3 seconds per image (CPU) |

---

## 10. The Dataset — APTOS 2019

### About

The model is trained on the **APTOS 2019 Blindness Detection** dataset, originally hosted on Kaggle as a competition by the Asia Pacific Tele-Ophthalmology Society.

| Property | Detail |
|----------|--------|
| Total Images | 3,662 training images |
| Test Images | 366 images |
| Image Type | Retinal fundus photographs |
| Resolution | Varies (typically ~2000×1500 px, resized to 224×224 for training) |
| Classes | 5 (Normal, Mild, Moderate, Severe, Proliferative) |
| Format | PNG |

### Class Distribution (Why It Matters)

The dataset is **imbalanced** — there are many more "Normal" eyes than "Proliferative" ones:

```
Normal (0):        █████████████████████  ~1,805 images
Mild (1):          █████████              ~370 images
Moderate (2):      █████████████          ~999 images
Severe (3):        ████                   ~193 images
Proliferative (4): █████                  ~295 images
```

This imbalance is why we use **class weights** during training — the model learns to pay extra attention to rare but critical severe cases.

### How to Download It

```bash
cd AI_Models
python download_dataset.py
```

This uses the `kagglehub` library to download the data directly from Kaggle. You'll need internet access but don't need a Kaggle API key for public datasets.

---

## 11. Image Preprocessing — CLAHE

### What Is CLAHE?

CLAHE stands for **Contrast-Limited Adaptive Histogram Equalisation**. It's a medical image enhancement technique that improves the visibility of structures in retinal photographs.

### Why Do We Need It?

Retinal fundus images often suffer from:
- Uneven illumination (bright in the centre, dark at the edges)
- Low contrast between blood vessels and the retina surface
- Colour variations across different cameras and clinics

CLAHE solves these problems by **enhancing local contrast** without amplifying noise.

### How It Works in Our Code

```python
# 1. Convert RGB image to LAB colour space
lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)

# 2. Split into Lightness (L), A, and B channels
l, a, b = cv2.split(lab)

# 3. Apply CLAHE only to the Lightness channel
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
cl = clahe.apply(l)

# 4. Merge back and convert to RGB
limg = cv2.merge((cl, a, b))
img = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
```

**clipLimit=2.0** prevents over-amplification. **tileGridSize=(8,8)** divides the image into 64 regions for local contrast adjustment.

### Before vs After (Conceptually)

```
Before CLAHE:                    After CLAHE:
┌────────────────────┐          ┌────────────────────┐
│   Dark, low         │          │  Clear vessels      │
│   contrast retina   │   →→→   │  visible details    │
│   hard to see       │          │  uniform lighting   │
│   blood vessels     │          │  enhanced features  │
└────────────────────┘          └────────────────────┘
```

---

## 12. API Endpoints Explained

The FastAPI backend exposes these endpoints:

### `GET /`
**Purpose:** Health check  
**Returns:** `{"message": "Retinal Disease AI API is running!"}`

### `POST /api/v1/predict/batch`
**Purpose:** Batch image analysis (up to 10 images)  
**Input:** `multipart/form-data` with field `files` containing image uploads  
**Returns:**
```json
{
  "results": [
    {
      "filename": "retina_001.png",
      "diagnosis": "Moderate",
      "probabilities": {
        "Normal": 5.23,
        "Mild": 12.87,
        "Moderate": 68.41,
        "Severe": 10.22,
        "Proliferative": 3.27
      }
    }
  ]
}
```

### `POST /api/v1/report/generate`
**Purpose:** Generate a PDF diagnostic report for a single image  
**Input:** `multipart/form-data` with field `file` containing one image  
**Returns:** PDF file download (`application/pdf`)

### Interactive API Docs
When the backend is running locally, visit `http://localhost:8000/docs` for the auto-generated Swagger UI where you can test all endpoints interactively.

---

## 13. PDF Report Generation

The system generates clinical-style PDF reports using **ReportLab**. Here's what each report contains:

```
┌────────────────────────────────────────┐
│                                        │
│   Clinical AI Retinal Scan Report      │  ← Title
│                                        │
│   Patient Scan: retina_001.png         │  ← File identifier
│   AI Diagnosis: Moderate Retinopathy   │  ← Primary finding
│                                        │
│   ┌──────────────┐                     │
│   │              │                     │
│   │  [Retinal    │                     │  ← Original image (224×224)
│   │   Image]     │                     │
│   │              │                     │
│   └──────────────┘                     │
│                                        │
│   Probabilities breakdown:             │
│   Normal:         5.23%                │  ← All 5 class probabilities
│   Mild:          12.87%                │
│   Moderate:      68.41%                │
│   Severe:        10.22%                │
│   Proliferative:  3.27%               │
│                                        │
└────────────────────────────────────────┘
```

Reports are generated server-side (never in the browser) and streamed back as a downloadable file.

---

## 14. Deployment on Hugging Face Spaces

The backend is containerised with Docker and deployed to **Hugging Face Spaces** for free cloud hosting.

### How the Dockerfile Works

```dockerfile
FROM python:3.10-slim             # Lightweight Python image
RUN apt-get install libgl1 ...    # OpenCV system dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ ./backend/          # Copy server code
COPY AI_Models/ ./AI_Models/      # Copy trained model
EXPOSE 7860                       # HF Spaces uses port 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### Deployment Steps

1. Create a new Space on [huggingface.co/spaces](https://huggingface.co/spaces) → choose "Docker" SDK
2. Upload the contents of the `hf_target/` folder to the Space repository
3. Hugging Face automatically builds the Docker image and deploys it
4. The API becomes available at `https://<your-space>-api.hf.space`

### Cold Start Behaviour

Hugging Face Spaces on the free tier go to sleep after ~15 minutes of inactivity. The first request after sleep takes 30–60 seconds as the container restarts and the TensorFlow model loads into memory. Subsequent requests are fast.

---

## 15. Project Folder Structure

```
retinal-disease-detection/
│
├── start_app.bat                  # One-click launcher (Windows)
├── requirements.txt               # Root-level Python dependencies
├── Dockerfile                     # Docker configuration for deployment
├── compare_models.py              # Script to compare different model versions
├── README-hf.md                   # Hugging Face Spaces metadata
│
├── AI_Models/                     # Everything related to the AI
│   ├── download_dataset.py        # Downloads APTOS 2019 from Kaggle
│   ├── train_classification.py    # Main training script (3-phase)
│   ├── train_segmentation.py      # (Experimental) segmentation training
│   ├── Colab_Training_Notebook.py # Google Colab-friendly training version
│   └── models/
│       └── densenet_retina_model/ # The trained model lives here
│           ├── config.json
│           ├── metadata.json
│           └── model.weights.h5   # Actual model weights (~28-35 MB)
│
├── backend/                       # Python FastAPI backend
│   ├── main.py                    # All API endpoints and inference logic
│   ├── requirements.txt           # Backend Python dependencies
│   └── test_req.py                # API testing script
│
├── frontend-next/                 # Next.js (React) frontend
│   ├── package.json               # JavaScript dependencies
│   ├── next.config.ts             # Next.js configuration
│   ├── tailwind.config.ts         # Tailwind CSS customisation
│   └── src/
│       ├── app/
│       │   ├── layout.tsx         # Root layout (fonts, viewport)
│       │   ├── page.tsx           # Main page (state, API calls)
│       │   └── globals.css        # Global styles and utilities
│       ├── components/
│       │   ├── Header.tsx         # Navigation bar with tabs
│       │   ├── UploadSection.tsx  # Drag-and-drop file upload
│       │   ├── ResultsTable.tsx   # Diagnostic results data table
│       │   ├── DetailModal.tsx    # Full diagnostic report modal
│       │   ├── AnalyticsSection.tsx # Charts and statistics
│       │   ├── ProcessingOverlay.tsx # Loading animation
│       │   └── ui/
│       │       └── multi-step-loader.tsx # Step-by-step loading UI
│       └── lib/
│           └── utils.ts           # Utility functions (clsx merge)
│
└── hf_target/                     # Deployment package for Hugging Face
    ├── Dockerfile
    ├── README.md
    ├── requirements.txt
    ├── AI_Models/                 # Copy of trained model
    └── backend/                   # Copy of backend code
```

---

## 16. Frequently Asked Questions

### Q: Do I need a GPU to run this?
**No.** The project uses `tensorflow-cpu` for inference. A modern CPU handles predictions in about 0.3 seconds per image. GPU is only beneficial if you want to retrain the model.

### Q: Can I use images from my phone camera?
The model is trained on retinal fundus photographs taken with specialised ophthalmic cameras. Regular phone photos of eyes will not produce meaningful results. You need fundus images.

### Q: How many images can I upload at once?
Up to **10 images** per batch. This limit is set in the backend (`files[:10]`) to keep processing times reasonable.

### Q: Why does the first prediction take so long?
When using the Hugging Face-hosted API, the container may be in a "cold" state. The first request wakes it up, loads TensorFlow, and loads the model into memory. This takes 30–60 seconds. After that, predictions are fast.

### Q: Can I retrain the model on my own dataset?
Yes. Place your images in the `AI_Models/dataset/` folder (organised like the APTOS dataset), update the CSV paths in `train_classification.py`, and run the training script. You'll need a machine with reasonable RAM (8 GB+) or use Google Colab.

### Q: What happens if the model file is missing?
The backend gracefully falls back to **mock predictions** (random probabilities using Dirichlet distribution). The UI will work, but the predictions will be meaningless. Check the terminal for the warning: `"Could not load the model..."`.

### Q: Is this application secure for real patient data?
This is a PG project for educational/research purposes. For real clinical use, you would need HIPAA/GDPR-compliant infrastructure, encrypted data transmission, audit logging, and proper medical device certification. The current CORS configuration (`allow_origins=["*"]`) is deliberately open for development.

---

## 17. Troubleshooting Common Issues

### "Module not found" errors when starting the backend
```
ModuleNotFoundError: No module named 'fastapi'
```
**Fix:** You forgot to install dependencies. Run:
```bash
cd backend
pip install -r requirements.txt
```

### "npm ERR!" when starting the frontend
```bash
cd frontend-next
rm -rf node_modules package-lock.json
npm install
```

### CORS errors in the browser console
If you see `Access-Control-Allow-Origin` errors, make sure the backend is actually running. The frontend expects the API at `https://kjndkj-api.hf.space/api/v1` — if you're running locally, you'll need to update the `API` constant in `page.tsx`.

### Model loading failure
```
Warning: Could not load the model at ...
```
Check that the model folder exists at `AI_Models/models/densenet_retina_model/` and contains `model.weights.h5`. If training was done in Colab, make sure you downloaded and placed the model files correctly.

### "Port already in use" error
Another process is using port 8000 or 3000. Either kill that process or change the port:
```bash
# Backend on different port
uvicorn main:app --reload --port 8001

# Frontend on different port
npx next dev --port 3001
```

### Slow predictions
- On CPU, each image takes ~0.3 seconds. 10 images ≈ 3 seconds
- If using the hosted API, the first request may take 30–60 seconds (cold start)
- If extremely slow, check your system memory — TensorFlow needs ~1 GB RAM

---

## 18. Future Scope & Improvements

While RetinAI already delivers functional end-to-end diagnosis, there are several avenues for improving and extending this project:

1. **User Authentication** — Add login/registration so clinicians can maintain patient histories and review past scans

2. **Patient Records Database** — Store scan results with timestamps, patient ID linkage, and longitudinal tracking of disease progression

3. **Grad-CAM Heatmaps** — Overlay "attention maps" on retinal images showing which region the AI focused on. This is crucial for clinical trust and explainability

4. **Multi-Disease Detection** — Extend beyond Diabetic Retinopathy to detect Glaucoma, Age-related Macular Degeneration (AMD), and other retinal conditions

5. **Segmentation Integration** — The project includes an experimental `train_segmentation.py`. Integrating lesion segmentation (highlighting exact damaged areas) would add significant clinical value

6. **Mobile App** — Wrap the frontend in a React Native or PWA shell for use on tablets during clinical rounds

7. **Edge Deployment** — Convert the model to TensorFlow Lite or ONNX for running on mobile devices or embedded systems without an internet connection

8. **Larger Datasets** — Train on the EyePACS dataset (88,000+ images) or the Messidor-2 dataset for improved generalisation

---

## 19. References & Bibliography

1. **Huang, G., Liu, Z., Van Der Maaten, L., & Weinberger, K. Q.** (2017). "Densely Connected Convolutional Networks." *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, pp. 4700–4708.

2. **Gulshan, V., Peng, L., Coram, M., et al.** (2016). "Development and Validation of a Deep Learning Algorithm for Detection of Diabetic Retinopathy in Retinal Fundus Photographs." *JAMA*, 316(22), pp. 2402–2410.

3. **APTOS 2019 Blindness Detection Challenge.** Kaggle. Asia Pacific Tele-Ophthalmology Society. Available at: https://www.kaggle.com/c/aptos2019-blindness-detection

4. **Zuiderveld, K.** (1994). "Contrast Limited Adaptive Histogram Equalization." *Graphics Gems IV*, Academic Press, pp. 474–485.

5. **Rajpurkar, P., Irvin, J., Zhu, K., et al.** (2017). "CheXNet: Radiologist-Level Pneumonia Detection on Chest X-Rays with Deep Learning." *arXiv preprint arXiv:1711.05225*.

6. **TensorFlow Documentation.** (2026). Transfer Learning and Fine-Tuning. Available at: https://www.tensorflow.org/tutorials/images/transfer_learning

7. **FastAPI Documentation.** Sebastián Ramírez. Available at: https://fastapi.tiangolo.com/

8. **Next.js Documentation.** Vercel. Available at: https://nextjs.org/docs

---

> *This documentation was prepared as part of a Post Graduate project on the application of deep learning in medical image analysis. The system is designed for educational and research purposes and is not intended to replace clinical diagnosis by qualified medical professionals.*
