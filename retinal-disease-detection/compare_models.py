import os
import io
import time
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import cv2

print("TensorFlow Version:", tf.__version__)

paths = {
    "Model 1 (Root)": r"c:\Users\msara\OneDrive\Desktop\PG project\retinal-disease-detection\densenet_retina.keras",
    "Model 2 (Root Copy)": r"c:\Users\msara\OneDrive\Desktop\PG project\retinal-disease-detection\densenet_retina.keras (1)",
    "Model 3 (AI_Models)": r"c:\Users\msara\OneDrive\Desktop\PG project\retinal-disease-detection\AI_Models\models\densenet_retina.keras"
}

def preprocess_image(img_array):
    if img_array.dtype != np.uint8:
        img_array = img_array.astype(np.uint8)
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    img_clahe = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    return img_clahe.astype(np.float32) / 255.0

# Prepare Test Data
IMG_DIR = r"c:\Users\msara\OneDrive\Desktop\PG project\retinal-disease-detection\AI_Models\dataset\test_images\test_images"
CSV_PATH = r"c:\Users\msara\OneDrive\Desktop\PG project\retinal-disease-detection\AI_Models\dataset\test.csv"
use_test_data = False

if os.path.exists(CSV_PATH) and os.path.exists(IMG_DIR):
    df_test = pd.read_csv(CSV_PATH)
    if not df_test['id_code'].iloc[0].endswith('.png') and not df_test['id_code'].iloc[0].endswith('.jpeg'):
        df_test['id_code'] = df_test['id_code'].apply(lambda x: f"{x}.png")
    
    valid_files = [f for f in df_test['id_code'] if os.path.exists(os.path.join(IMG_DIR, f))]
    df_test = df_test[df_test['id_code'].isin(valid_files)]
    
    if len(df_test) > 0:
        df_test['diagnosis'] = df_test['diagnosis'].astype(str)
        test_datagen = ImageDataGenerator(preprocessing_function=preprocess_image)
        test_gen = test_datagen.flow_from_dataframe(
            dataframe=df_test,
            directory=IMG_DIR,
            x_col="id_code",
            y_col="diagnosis",
            target_size=(224, 224),
            batch_size=32,
            class_mode="categorical",
            shuffle=False
        )
        use_test_data = True
        print(f"Test data loaded: {len(df_test)} samples.")
    else:
        print("No valid test images found.")

print("\n--- MODEL COMPARISON ---")

for name, path in paths.items():
    print(f"\n=======================")
    print(f"Loading {name}...")
    print(f"Path: {path}")
    
    if os.path.isdir(path):
        size = sum(os.path.getsize(os.path.join(dirpath, filename)) for dirpath, _, filenames in os.walk(path) for filename in filenames)
        print(f"Size: {size / (1024*1024):.2f} MB (Directory)")
    else:
        if os.path.exists(path):
            print(f"Size: {os.path.getsize(path) / (1024*1024):.2f} MB (File)")
        else:
            print("File not found.")
            continue
        
    try:
        start_time = time.time()
        # Ensure we try to load it securely and nicely
        model = tf.keras.models.load_model(path, compile=False)
        load_time = time.time() - start_time
        
        trainable_count = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
        non_trainable_count = sum([tf.keras.backend.count_params(w) for w in model.non_trainable_weights])
        total_count = trainable_count + non_trainable_count
        
        print(f"--> LOAD SUCCESS (took {load_time:.2f}s)")
        print(f"--> Architecture: {model.name}")
        print(f"--> Total params: {total_count:,} | Trainable: {trainable_count:,} | Non-trainable: {non_trainable_count:,}")
        
        model.compile(loss='categorical_crossentropy', metrics=['accuracy'])
        
        if use_test_data:
            print(f"--> Evaluating {name} on {min(5, len(test_gen))} batches...")
            start_time = time.time()
            steps = min(5, len(test_gen))
            metrics = model.evaluate(test_gen, steps=steps, verbose=0)
            eval_time = time.time() - start_time
            print(f"--> Test Loss: {metrics[0]:.4f} | Test Accuracy: {metrics[1]*100:.2f}% ( evaluated in {eval_time:.2f}s )")
        
    except Exception as e:
        print(f"--> LOAD ERROR: {e}")

print("\n--- END COMPARISON ---")
