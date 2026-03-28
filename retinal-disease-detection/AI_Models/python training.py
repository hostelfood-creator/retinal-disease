# ============================================================================
# RETINAL DISEASE DETECTION - GOOGLE COLAB TRAINING NOTEBOOK (REVISED)
# ============================================================================
# INSTRUCTIONS:
# 1. Open Google Colab (colab.research.google.com)
# 2. Go to Runtime > Change runtime type > Select GPU (T4 or higher)
#    — If no GPU is available the script automatically falls back to CPU.
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

# ============================================================================
# DEVICE SETUP — CUDA GPU with automatic CPU fallback
# ============================================================================
def setup_device():
    """
    Detects CUDA-capable GPUs and configures them for training.
    Falls back to CPU gracefully if no GPU is found or CUDA fails.

    Returns
    -------
    strategy : tf.distribute.Strategy
        MirroredStrategy  — if 2+ GPUs detected (uses all of them)
        OneDeviceStrategy — if exactly 1 GPU detected
        OneDeviceStrategy — CPU fallback
    device_name : str
        Human-readable string describing the active device(s).
    """
    gpus = tf.config.list_physical_devices('GPU')

    if not gpus:
        # ── No GPU visible at all → pure CPU ──────────────────────────────
        print("⚠️  No GPU detected. Running on CPU (training will be slower).")
        strategy    = tf.distribute.OneDeviceStrategy(device="/cpu:0")
        device_name = "CPU"
        return strategy, device_name

    # ── GPU(s) found → enable memory growth to avoid OOM crashes ──────────
    cuda_ok = True
    for gpu in gpus:
        try:
            tf.config.experimental.set_memory_growth(gpu, True)
        except RuntimeError as e:
            # Memory growth must be set before GPUs are initialised.
            # If it fails (e.g. already initialised) just log and continue.
            print(f"⚠️  Memory-growth config skipped for {gpu.name}: {e}")
            cuda_ok = False

    # ── Try to verify CUDA is actually functional ──────────────────────────
    try:
        with tf.device('/GPU:0'):
            _ = tf.constant([1.0]) + tf.constant([1.0])   # tiny smoke-test
    except Exception as e:
        print(f"⚠️  CUDA smoke-test failed ({e}). Falling back to CPU.")
        # Disable all GPUs so TF uses CPU
        tf.config.set_visible_devices([], 'GPU')
        strategy    = tf.distribute.OneDeviceStrategy(device="/cpu:0")
        device_name = "CPU (CUDA initialisation failed)"
        return strategy, device_name

    # ── CUDA is healthy ────────────────────────────────────────────────────
    gpu_names = [g.name for g in gpus]
    if len(gpus) >= 2:
        strategy    = tf.distribute.MirroredStrategy()          # multi-GPU
        device_name = f"Multi-GPU MirroredStrategy ({len(gpus)} GPUs: {gpu_names})"
    else:
        strategy    = tf.distribute.OneDeviceStrategy("/gpu:0")  # single GPU
        device_name = f"Single GPU: {gpu_names[0]}"

    return strategy, device_name


strategy, DEVICE_NAME = setup_device()

# ── XLA / mixed-precision optimisations (GPU only) ────────────────────────
gpus_active = tf.config.list_physical_devices('GPU')
if gpus_active:
    # Mixed precision (float16 compute + float32 weights) — faster on Ampere+
    try:
        tf.keras.mixed_precision.set_global_policy('mixed_float16')
        print("✅  Mixed precision (float16) enabled.")
    except Exception as e:
        print(f"⚠️  Mixed precision not set: {e}")

    # Enable XLA JIT compilation for extra speed
    try:
        tf.config.optimizer.set_jit(True)
        print("✅  XLA JIT compilation enabled.")
    except Exception as e:
        print(f"⚠️  XLA JIT not enabled: {e}")
else:
    # CPU: use float32 (mixed_float16 offers no benefit on CPU)
    tf.keras.mixed_precision.set_global_policy('float32')

# ── Summary ───────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("DEVICE CONFIGURATION")
print("="*60)
print(f"  Active device  : {DEVICE_NAME}")
print(f"  Precision      : {tf.keras.mixed_precision.global_policy().name}")
print(f"  Num replicas   : {strategy.num_replicas_in_sync}")
print("="*60 + "\n")

# ---- CELL 2: Download Dataset ----
import kagglehub
import glob

print("Downloading APTOS 2019 Blindness Detection dataset...")
dataset_path = kagglehub.dataset_download("mariaherrerot/aptos2019")
print(f"Dataset downloaded to: {dataset_path}")

csv_files = glob.glob(os.path.join(dataset_path, "**", "train*.csv"), recursive=True)
print(f"Found CSV files: {csv_files}")

CSV_PATH = csv_files[0] if csv_files else None
assert CSV_PATH is not None, "Could not find training CSV!"

img_dirs = glob.glob(os.path.join(dataset_path, "**", "train_images"), recursive=True)
IMG_DIR = img_dirs[0] if img_dirs else None

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

# ============================================================================
# CLASS DEFINITIONS — What each grade HAS and DOES NOT HAVE
# ============================================================================
CLASS_NAMES = ["Normal", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]

CLASS_FEATURE_MAP = {
    0: {
        "label": "Normal",
        "HAS":     ["Clear retinal vessels", "Distinct optic disc", "Uniform background"],
        "HAS NOT": ["Microaneurysms", "Hemorrhages", "Hard exudates", "Neovascularization",
                    "Cotton wool spots", "Venous beading"]
    },
    1: {
        "label": "Mild Diabetic Retinopathy",
        "HAS":     ["Microaneurysms (≥1)", "Mild dot hemorrhages"],
        "HAS NOT": ["Hard exudates", "Soft exudates (cotton wool)", "Venous beading",
                    "Neovascularization", "Vitreous hemorrhage"]
    },
    2: {
        "label": "Moderate Diabetic Retinopathy",
        "HAS":     ["Multiple microaneurysms", "Dot & blot hemorrhages", "Hard exudates",
                    "Possible cotton wool spots"],
        "HAS NOT": ["Hemorrhages in all 4 quadrants", "Venous beading in 2+ quadrants",
                    "Neovascularization", "Vitreous hemorrhage"]
    },
    3: {
        "label": "Severe Diabetic Retinopathy",
        "HAS":     ["Extensive hemorrhages (all 4 quadrants)", "Venous beading (2+ quadrants)",
                    "Intraretinal microvascular abnormalities (IRMA)", "Cotton wool spots"],
        "HAS NOT": ["New vessels (neovascularization)", "Vitreous hemorrhage",
                    "Fibrovascular proliferation"]
    },
    4: {
        "label": "Proliferative Diabetic Retinopathy",
        "HAS":     ["Neovascularization (new vessels)", "Vitreous or pre-retinal hemorrhage",
                    "Fibrovascular proliferation", "Tractional retinal detachment (advanced)"],
        "HAS NOT": ["Normal retinal architecture", "Clear vitreous (often obscured)"]
    }
}

fig, ax = plt.subplots(1, 1, figsize=(9, 4))
counts = df['diagnosis'].value_counts().sort_index()
colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626']
ax.bar(CLASS_NAMES, counts.values, color=colors)
ax.set_title("APTOS 2019 - Class Distribution")
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
    return img_clahe.astype(np.float32) / 255.0

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

# ---- CELL 5: Prepare Data — 60/40 Split ----
df['id_code']  = df['id_code'].apply(lambda x: f"{x}.png")
df['diagnosis'] = df['diagnosis'].astype(str)

# ---- 60% TRAIN / 40% VALIDATION ----
train_df, val_df = train_test_split(
    df,
    test_size=0.40,          # 40 % validation
    random_state=42,
    stratify=df['diagnosis']
)
print(f"Training samples  (60%): {len(train_df)}")
print(f"Validation samples(40%): {len(val_df)}")

class_labels          = df['diagnosis'].astype(int).values
class_weights_array   = compute_class_weight('balanced', classes=np.unique(class_labels), y=class_labels)
class_weight_dict     = {i: w for i, w in enumerate(class_weights_array)}
print(f"\nClass weights: {class_weight_dict}")

# ---- Hyperparameters ----
# Batch size scales with the number of GPU replicas so each replica
# always receives 32 samples — total batch grows on multi-GPU setups.
_BASE_BATCH  = 32
BATCH_SIZE   = _BASE_BATCH * strategy.num_replicas_in_sync
IMG_SIZE     = (224, 224)
INITIAL_LR   = 1e-2          # Learning rate starts at 1e-2
MIN_LR       = 2e-7          # Decays down to 2e-7 via ReduceLROnPlateau
# Scale LR linearly with effective batch size (linear scaling rule)
SCALED_LR    = INITIAL_LR * strategy.num_replicas_in_sync

print(f"Effective batch size : {BATCH_SIZE}  ({_BASE_BATCH} × {strategy.num_replicas_in_sync} replica(s))")
print(f"Scaled learning rate : {SCALED_LR:.2e}  (base {INITIAL_LR:.2e} × {strategy.num_replicas_in_sync})")

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

val_datagen = ImageDataGenerator(preprocessing_function=preprocess_image)

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

# ---- CELL 6: Build Model inside strategy scope ----
# strategy.scope() ensures variables are created on the correct device(s).
# On CPU this is a no-op; on GPU(s) it pins weights to GPU memory and
# handles gradient mirroring automatically for multi-GPU setups.
def build_model(num_classes=5):
    base_model = DenseNet121(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.4)(x)
    x = BatchNormalization()(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.3)(x)
    # Cast to float32 before softmax — required when mixed_float16 is active
    x = tf.keras.layers.Activation('linear', dtype='float32')(x)
    predictions = Dense(num_classes, activation='softmax', dtype='float32')(x)
    model = Model(inputs=base_model.input, outputs=predictions)
    return model

MODEL_SAVE_PATH = "densenet_retina.keras"

with strategy.scope():
    model = build_model(5)

    # Unfreeze entire model — single training phase
    for layer in model.layers:
        layer.trainable = True

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=SCALED_LR),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=['accuracy']
    )

# ============================================================================
# SINGLE TRAINING PHASE — Full model, LR scaled → 2e-7 floor
# ============================================================================
print("\n" + "="*70)
print(f"TRAINING  | Device: {DEVICE_NAME}")
print(f"          | LR {SCALED_LR:.2e} → {MIN_LR:.0e} | Batch {BATCH_SIZE} | Split 60/40")
print("="*70)

trainable_count     = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
non_trainable_count = sum([tf.keras.backend.count_params(w) for w in model.non_trainable_weights])
print(f"Trainable params    : {trainable_count:,}")
print(f"Non-trainable params: {non_trainable_count:,}")

callbacks = [
    EarlyStopping(
        patience=8,
        restore_best_weights=True,
        monitor='val_accuracy',
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.3,
        patience=3,
        min_lr=MIN_LR,           # floor = 2e-7
        verbose=1
    ),
    ModelCheckpoint(
        MODEL_SAVE_PATH,
        save_best_only=True,
        monitor='val_accuracy',
        verbose=1
    )
]

history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=40,                   # EarlyStopping will halt when needed
    callbacks=callbacks,
    class_weight=class_weight_dict
)

best_val_acc = max(history.history['val_accuracy'])
print(f"\nBest Validation Accuracy: {best_val_acc:.4f} ({best_val_acc*100:.2f}%)")

# ============================================================================
# EVALUATION & TRAINING CURVE
# ============================================================================
print("\n" + "="*70)
print("EVALUATION")
print("="*70)

best_model = tf.keras.models.load_model(MODEL_SAVE_PATH)
val_loss, val_acc = best_model.evaluate(val_gen, verbose=0)
print(f"Final Val Loss    : {val_loss:.4f}")
print(f"Final Val Accuracy: {val_acc:.4f} ({val_acc*100:.2f}%)")

# Rebuild val generator (no shuffle, for aligned predictions)
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

y_pred        = best_model.predict(val_gen_eval, verbose=1)
y_pred_classes = np.argmax(y_pred, axis=1)
y_true        = val_gen_eval.classes

# Training curve
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
epochs_ran = range(1, len(history.history['accuracy']) + 1)

axes[0].plot(epochs_ran, history.history['accuracy'],     label='Train Acc',  color='royalblue')
axes[0].plot(epochs_ran, history.history['val_accuracy'], label='Val Acc',    color='darkorange', linestyle='--')
axes[0].set_title('Accuracy', fontsize=13, fontweight='bold')
axes[0].set_xlabel('Epoch'); axes[0].set_ylabel('Accuracy')
axes[0].legend(); axes[0].grid(True, alpha=0.3)

axes[1].plot(epochs_ran, history.history['loss'],     label='Train Loss',  color='royalblue')
axes[1].plot(epochs_ran, history.history['val_loss'], label='Val Loss',    color='darkorange', linestyle='--')
axes[1].set_title('Loss', fontsize=13, fontweight='bold')
axes[1].set_xlabel('Epoch'); axes[1].set_ylabel('Loss')
axes[1].legend(); axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('training_curve.png', dpi=150, bbox_inches='tight')
plt.show()

# Confusion Matrix
fig, ax = plt.subplots(figsize=(9, 7))
cm = confusion_matrix(y_true, y_pred_classes)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES, ax=ax)
ax.set_title('Confusion Matrix', fontsize=14, fontweight='bold')
ax.set_xlabel('Predicted'); ax.set_ylabel('True')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.show()

# ============================================================================
# CLEAR CLASSIFICATION REPORT — WHAT EACH IMAGE HAS / DOES NOT HAVE
# ============================================================================
print("\n" + "="*70)
print("CLASSIFICATION REPORT — FEATURE BREAKDOWN PER CLASS")
print("="*70)
print(classification_report(y_true, y_pred_classes, target_names=CLASS_NAMES))

print("\n" + "="*70)
print("WHAT EACH GRADE HAS ✅  vs  DOES NOT HAVE ❌")
print("="*70)
for grade_id, info in CLASS_FEATURE_MAP.items():
    print(f"\n{'─'*60}")
    print(f"  GRADE {grade_id} — {info['label'].upper()}")
    print(f"{'─'*60}")
    print("  ✅  PRESENT (Image HAS):")
    for feature in info['HAS']:
        print(f"       • {feature}")
    print("  ❌  ABSENT  (Image DOES NOT HAVE):")
    for feature in info['HAS NOT']:
        print(f"       • {feature}")

# ============================================================================
# PER-IMAGE PREDICTION DETAIL (first 30 validation images)
# ============================================================================
print("\n" + "="*70)
print("PER-IMAGE PREDICTION DETAIL (first 30 validation samples)")
print("="*70)

filenames    = val_gen_eval.filenames   # relative paths
confidences  = np.max(y_pred, axis=1)  # confidence of top prediction

print(f"\n{'Image':<35} {'True':<22} {'Predicted':<22} {'Conf':>6}  {'Correct?'}")
print("-" * 100)

for i in range(min(30, len(filenames))):
    fname       = os.path.basename(filenames[i])
    true_label  = CLASS_NAMES[y_true[i]]
    pred_label  = CLASS_NAMES[y_pred_classes[i]]
    conf        = confidences[i]
    correct     = "✅" if y_true[i] == y_pred_classes[i] else "❌"
    print(f"{fname:<35} {true_label:<22} {pred_label:<22} {conf:>5.1%}  {correct}")

# Print feature map for each predicted class of first 30
print("\n" + "="*70)
print("DETAILED FEATURE INTERPRETATION (first 30 validation samples)")
print("="*70)
for i in range(min(30, len(filenames))):
    fname      = os.path.basename(filenames[i])
    pred_id    = y_pred_classes[i]
    true_id    = y_true[i]
    conf       = confidences[i]
    info       = CLASS_FEATURE_MAP[pred_id]

    match_flag = "✅ CORRECT" if pred_id == true_id else f"❌ WRONG (actual: {CLASS_NAMES[true_id]})"
    print(f"\n[{i+1:02d}] {fname}  →  {match_flag}")
    print(f"     Predicted : {info['label']}  (confidence {conf:.1%})")
    print(f"     Image HAS  : {', '.join(info['HAS'])}")
    print(f"     Image LACKS: {', '.join(info['HAS NOT'])}")

# ============================================================================
# DOWNLOAD MODEL
# ============================================================================
print("\n" + "="*70)
print(f"MODEL SAVED : {MODEL_SAVE_PATH}")
print(f"File size   : {os.path.getsize(MODEL_SAVE_PATH) / (1024*1024):.1f} MB")
print("="*70)
print("\nNEXT STEPS:")
print("1. Download 'densenet_retina.keras' from the Colab files panel (left sidebar)")
print("2. Place it in: retinal-disease-detection/AI_Models/models/densenet_retina.keras")
print("3. Start the backend : cd backend  && uvicorn main:app --reload")
print("4. Start the frontend: cd frontend && npm run dev")

try:
    from google.colab import files
    files.download(MODEL_SAVE_PATH)
    print("Download initiated automatically!")
except ImportError:
    print("Not running in Colab — model saved locally.")