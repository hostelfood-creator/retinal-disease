import os
import cv2
import numpy as np
import io
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

app = FastAPI(title="Retinal Disease AI API")

# Update CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Retinal Disease AI API is running! Access /docs for the API documentation."}

# --- LOAD ACTUAL TRAINED AI MODEL ---
# Pointing to the .keras file you downloaded from Google Colab
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "AI_Models", "models", "densenet_retina_model"))

try:
    classifier_model = tf.keras.models.load_model(MODEL_PATH)
    print("Success: Successfully loaded real AI Model!")
except Exception as e:
    print(f"Warning: Could not load the model at {MODEL_PATH}. Check if the file is placed correctly. Using mock for now. Error: {e}")
    classifier_model = None

CLASSES = ["Normal", "Mild", "Moderate", "Severe", "Proliferative"]

def process_image(file_bytes):
    img_array = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Preprocess: CLAHE
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl,a,b))
    img = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)

    img_resized = cv2.resize(img, (224, 224))
    img_normalized = img_resized / 255.0
    return img_resized, img_normalized

@app.post("/api/v1/predict/batch")
async def predict_batch(files: list[UploadFile] = File(...)):
    results = []
    
    # Process up to 10 images as requested
    for file in files[:10]:
        contents = await file.read()
        raw_img, normalized_img = process_image(contents)
        
        # --- ACTUAL INFERENCE ---
        if classifier_model is not None:
            # The model expects a batch shape, so we use expand_dims to turn (224, 224, 3) into (1, 224, 224, 3)
            preds = classifier_model.predict(np.expand_dims(normalized_img, axis=0))[0]
        else:
            print("Fallback to mock data because model is missing.")
            preds = np.random.dirichlet(np.ones(5), size=1)[0] # Mock probability array
        
        max_idx = np.argmax(preds)
        diagnosis = CLASSES[max_idx]
        
        # Format probabilities for the frontend charts
        probabilities = {CLASSES[i]: round(float(preds[i]) * 100, 2) for i in range(5)}
        
        results.append({
            "filename": file.filename,
            "diagnosis": diagnosis,
            "probabilities": probabilities
        })
        
    return JSONResponse(content={"results": results})

@app.post("/api/v1/report/generate")
async def generate_report(file: UploadFile = File(...)):
    contents = await file.read()
    raw_img, normalized_img = process_image(contents)
    
    # --- ACTUAL INFERENCE FOR PDF REPORT ---
    if classifier_model is not None:
        preds = classifier_model.predict(np.expand_dims(normalized_img, axis=0))[0]
    else:
        preds = np.random.dirichlet(np.ones(5), size=1)[0]
        
    max_idx = np.argmax(preds)
    diagnosis = CLASSES[max_idx]
    
    # Generate PDF Report
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    
    # Formatting the PDF
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, 750, "Clinical AI Retinal Scan Report")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 720, f"Patient Scan: {file.filename}")
    c.drawString(50, 700, f"AI Diagnosis: {diagnosis} Retinopathy")
    
    # Embed the original image into the PDF
    is_success, buffer = cv2.imencode(".png", cv2.cvtColor(raw_img, cv2.COLOR_RGB2BGR))
    if is_success:
        img_reader = ImageReader(io.BytesIO(buffer))
        c.drawImage(img_reader, 50, 450, width=224, height=224)
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 420, "Probabilities breakdown:")
    
    c.setFont("Helvetica", 12)
    y = 390
    for i, class_name in enumerate(CLASSES):
        c.drawString(50, y, f"{class_name}: {round(preds[i]*100, 2)}%")
        y -= 25
        
    c.showPage()
    c.save()
    
    pdf_bytes = pdf_buffer.getvalue()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=Diagnostic_Report_{file.filename}.pdf"}
    )

if __name__ == "__main__":
    import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=8000)
    print("Run using: uvicorn main:app --reload")