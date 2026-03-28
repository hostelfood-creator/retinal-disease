# ============================================================================
# RETINAL DISEASE DETECTION - GOOGLE COLAB TRAINING NOTEBOOK
# ============================================================================
# INSTRUCTIONS:
# 1. Open Google Colab (colab.research.google.com)
# 2. Go to Runtime > Change runtime type > Select GPU (T4 or higher)
# 3. Copy this ENTIRE file into a single Colab cell and run it
# 4. After training, download 'densenet_retina.keras' from the files panel
# 5. Place it in: retinal-disease-detection/AI_Models/models/densenet_retina.keras
# ============================================================================

# ---- CELL 1: Install & Import ----
!pip install -q kagglehub opencv-python-headless scikit-learn matplotlib seaborn

import numpy as np
import cv2
import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix

print(f"TensorFlow version: {tf.__version__}")
print(f"GPU Available: {tf.config.list_physical_devices('GPU')}")

# ---- CELL 2: Download Dataset ----
import kagglehub

print("Downloading APTOS 2019 Blindness Detection dataset...")
dataset_path = kagglehub.dataset_download("mariaherrerot/aptos2019")
print(f"Dataset downloaded to: {dataset_path}")

# Find the CSV and image directory
import glob

csv_files = glob.glob(os.path.join(dataset_path, "**", "train*.csv"), recursive=True)
print(f"Found CSV files: {csv_files}")

# Use the first train CSV found
CSV_PATH = csv_files[0] if csv_files else None
assert CSV_PATH is not None, "Could not find training CSV!"

# Find the train images directory
img_dirs = glob.glob(os.path.join(dataset_path, "**", "train_images"), recursive=True)
IMG_DIR = img_dirs[0] if img_dirs else None

# Check if images are nested (train_images/train_images/)
nested_dir = os.path.join(IMG_DIR, "train_images") if IMG_DIR else None
if nested_dir and os.path.exists(nested_dir) and len(os.listdir(nested_dir)) > 0:
    IMG_DIR = nested_dir

assert IMG_DIR is not None, "Could not find training images directory!"
print(f"CSV: {CSV_PATH}")
print(f"Images: {IMG_DIR}")
print(f"Number of images: {len(os.listdir(IMG_DIR))}")

# ---- CELL 3: Data Analysis ----
df = pd.read_csv(CSV_PATH)
print(f"\nDataset shape: {df.shape}")
print(f"\nClass distribution:")
print(df['diagnosis'].value_counts().sort_index())

# Class names
CLASS_NAMES = ["Normal", "Mild", "Moderate", "Severe", "Proliferative"]

# Plot class distribution
fig, ax = plt.subplots(1, 1, figsize=(8, 4))
counts = df['diagnosis'].value_counts().sort_index()
colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626']
ax.bar(CLASS_NAMES, counts.values, color=colors)
ax.set_title("APTOS 2019 - Class Distribution (Imbalanced)")
ax.set_ylabel("Count")
for i, v in enumerate(counts.values):
    ax.text(i, v + 20, str(v), ha='center', fontweight='bold')
plt.tight_layout()
plt.show()

# ---- CELL 4: Preprocessing ----
def preprocess_image(img_array):
    """Apply CLAHE and normalize for better retinal feature extraction."""
    if img_array.dtype != np.uint8:
        img_array = img_array.astype(np.uint8)

    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    img_clahe = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    img_normalized = img_clahe.astype(np.float32) / 255.0
    return img_normalized

# Show preprocessing effect
sample_files = os.listdir(IMG_DIR)[:3]
fig, axes = plt.subplots(2, 3, figsize=(12, 6))
for i, fname in enumerate(sample_files):
    fpath = os.path.join(IMG_DIR, fname)
    img = cv2.imread(fpath)
    if img is None:
        continue
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (224, 224))
    img_processed = preprocess_image(img_resized)
    axes[0, i].imshow(img_resized)
    axes[0, i].set_title(f"Original: {fname[:15]}")
    axes[0, i].axis('off')
    axes[1, i].imshow(img_processed)
    axes[1, i].set_title("After CLAHE")
    axes[1, i].axis('off')
plt.suptitle("CLAHE Preprocessing Effect", fontsize=14, fontweight='bold')
plt.tight_layout()
plt.show()

# ---- CELL 5: Prepare Data ----
df['id_code'] = df['id_code'].apply(lambda x: f"{x}.png")
df['diagnosis'] = df['diagnosis'].astype(str)

train_df, val_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['diagnosis'])
print(f"Training samples: {len(train_df)}")
print(f"Validation samples: {len(val_df)}")

# Compute class weights (CRITICAL for imbalanced APTOS data)
class_labels = df['diagnosis'].astype(int).values
class_weights_array = compute_class_weight('balanced', classes=np.unique(class_labels), y=class_labels)
class_weight_dict = {i: w for i, w in enumerate(class_weights_array)}
print(f"\nClass weights (balancing): {class_weight_dict}")

# Enhanced augmentation
BATCH_SIZE = 16
IMG_SIZE = (224, 224)

train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_image,
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    vertical_flip=True,
    brightness_range=[0.8, 1.2],
    fill_mode='reflect'
)

val_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_image
)

train_gen = train_datagen.flow_from_dataframe(
    dataframe=train_df,
    directory=IMG_DIR,
    x_col="id_code",
    y_col="diagnosis",
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=True
)

val_gen = val_datagen.flow_from_dataframe(
    dataframe=val_df,
    directory=IMG_DIR,
    x_col="id_code",
    y_col="diagnosis",
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

# ---- CELL 6: Build Model ----
def build_model(num_classes=5):
    """DenseNet121 with enhanced classification head."""
    base_model = DenseNet121(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.4)(x)
    x = BatchNormalization()(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.3)(x)
    predictions = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    return model, base_model

model, base_model = build_model(5)
base_layer_count = len(base_model.layers)
print(f"Total DenseNet base layers: {base_layer_count}")
print(f"Total model layers: {len(model.layers)}")

MODEL_SAVE_PATH = "densenet_retina.keras"

# ============================================================================
# PHASE 1: Train classification head only (base frozen) - 15 epochs
# ============================================================================
print("\n" + "="*70)
print("PHASE 1: Training classification head (DenseNet base FROZEN)")
print("="*70)

# Freeze all DenseNet layers
for layer in model.layers[:base_layer_count]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
    metrics=['accuracy']
)

# Count trainable parameters
trainable_count = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
non_trainable_count = sum([tf.keras.backend.count_params(w) for w in model.non_trainable_weights])
print(f"Trainable params: {trainable_count:,}")
print(f"Non-trainable params: {non_trainable_count:,}")

phase1_callbacks = [
    EarlyStopping(patience=5, restore_best_weights=True, monitor='val_accuracy', verbose=1),
    ReduceLROnPlateau(factor=0.5, patience=3, min_lr=1e-6, monitor='val_loss', verbose=1),
    ModelCheckpoint(MODEL_SAVE_PATH, save_best_only=True, monitor='val_accuracy', verbose=1)
]

history1 = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=15,
    callbacks=phase1_callbacks,
    class_weight=class_weight_dict
)

print(f"\nPhase 1 Best Val Accuracy: {max(history1.history['val_accuracy']):.4f}")

# ============================================================================
# PHASE 2: Fine-tune top 30% of DenseNet layers - 30 epochs
# ============================================================================
print("\n" + "="*70)
print("PHASE 2: Fine-tuning top 30% of DenseNet layers")
print("="*70)

fine_tune_at = int(base_layer_count * 0.7)
print(f"Unfreezing layers from index {fine_tune_at} onwards ({base_layer_count - fine_tune_at} layers)")

for layer in model.layers[fine_tune_at:]:
    layer.trainable = True

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
    loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
    metrics=['accuracy']
)

trainable_count = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
print(f"Trainable params after unfreeze: {trainable_count:,}")

phase2_callbacks = [
    EarlyStopping(patience=8, restore_best_weights=True, monitor='val_accuracy', verbose=1),
    ReduceLROnPlateau(factor=0.2, patience=4, min_lr=1e-7, monitor='val_loss', verbose=1),
    ModelCheckpoint(MODEL_SAVE_PATH, save_best_only=True, monitor='val_accuracy', verbose=1)
]

history2 = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=30,
    callbacks=phase2_callbacks,
    class_weight=class_weight_dict
)

print(f"\nPhase 2 Best Val Accuracy: {max(history2.history['val_accuracy']):.4f}")

# ============================================================================
# PHASE 3: Full model fine-tune with very low LR - 15 epochs
# ============================================================================
print("\n" + "="*70)
print("PHASE 3: Full model fine-tuning (ALL layers unfrozen)")
print("="*70)

for layer in model.layers:
    layer.trainable = True

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.05),
    metrics=['accuracy']
)

phase3_callbacks = [
    EarlyStopping(patience=6, restore_best_weights=True, monitor='val_accuracy', verbose=1),
    ReduceLROnPlateau(factor=0.2, patience=3, min_lr=1e-8, monitor='val_loss', verbose=1),
    ModelCheckpoint(MODEL_SAVE_PATH, save_best_only=True, monitor='val_accuracy', verbose=1)
]

history3 = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=15,
    callbacks=phase3_callbacks,
    class_weight=class_weight_dict
)

print(f"\nPhase 3 Best Val Accuracy: {max(history3.history['val_accuracy']):.4f}")

# ============================================================================
# EVALUATION & VISUALIZATION
# ============================================================================
print("\n" + "="*70)
print("FINAL EVALUATION")
print("="*70)

# Load best model
best_model = tf.keras.models.load_model(MODEL_SAVE_PATH)

# Evaluate on validation set
val_loss, val_acc = best_model.evaluate(val_gen)
print(f"\nFinal Validation Loss: {val_loss:.4f}")
print(f"Final Validation Accuracy: {val_acc:.4f} ({val_acc*100:.2f}%)")

# Predictions for confusion matrix
val_gen_eval = val_datagen.flow_from_dataframe(
    dataframe=val_df,
    directory=IMG_DIR,
    x_col="id_code",
    y_col="diagnosis",
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

y_pred = best_model.predict(val_gen_eval)
y_pred_classes = np.argmax(y_pred, axis=1)
y_true = val_gen_eval.classes

# Classification Report
print("\nClassification Report:")
print(classification_report(y_true, y_pred_classes, target_names=CLASS_NAMES))

# ---- Plot Training History ----
def plot_histories(histories, phase_names):
    fig, axes = plt.subplots(1, 2, figsize=(16, 5))
    
    offset = 0
    for hist, name in zip(histories, phase_names):
        epochs = range(offset + 1, offset + len(hist.history['accuracy']) + 1)
        axes[0].plot(epochs, hist.history['accuracy'], label=f'{name} Train')
        axes[0].plot(epochs, hist.history['val_accuracy'], '--', label=f'{name} Val')
        axes[1].plot(epochs, hist.history['loss'], label=f'{name} Train')
        axes[1].plot(epochs, hist.history['val_loss'], '--', label=f'{name} Val')
        offset += len(hist.history['accuracy'])
    
    axes[0].set_title('Model Accuracy Over 3 Phases', fontsize=13, fontweight='bold')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Accuracy')
    axes[0].legend(fontsize=8)
    axes[0].grid(True, alpha=0.3)
    
    axes[1].set_title('Model Loss Over 3 Phases', fontsize=13, fontweight='bold')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Loss')
    axes[1].legend(fontsize=8)
    axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('training_history.png', dpi=150, bbox_inches='tight')
    plt.show()

plot_histories(
    [history1, history2, history3],
    ['Phase 1 (Head)', 'Phase 2 (Top 30%)', 'Phase 3 (Full)']
)

# Confusion Matrix
fig, ax = plt.subplots(figsize=(8, 6))
cm = confusion_matrix(y_true, y_pred_classes)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES, ax=ax)
ax.set_title('Confusion Matrix', fontsize=14, fontweight='bold')
ax.set_xlabel('Predicted')
ax.set_ylabel('True')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.show()

# ============================================================================
# DOWNLOAD MODEL
# ============================================================================
print("\n" + "="*70)
print(f"MODEL SAVED: {MODEL_SAVE_PATH}")
print(f"File size: {os.path.getsize(MODEL_SAVE_PATH) / (1024*1024):.1f} MB")
print("="*70)
print("\nNEXT STEPS:")
print("1. Download 'densenet_retina.keras' from the Colab files panel (left sidebar)")
print("2. Place it in: retinal-disease-detection/AI_Models/models/densenet_retina.keras")
print("3. Start the backend: cd backend && uvicorn main:app --reload")
print("4. Start the frontend: cd frontend && npm run dev")
print("Done!")

# Auto-download in Colab
try:
    from google.colab import files
    files.download(MODEL_SAVE_PATH)
    print("Download initiated automatically!")
except ImportError:
    print("Not running in Colab - model saved locally.")
