import numpy as np
import cv2
import tensorflow as tf
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.utils.class_weight import compute_class_weight
import os

# 1. Preprocessing function: CLAHE, Normalization
def preprocess_image(img_array):
    if img_array.dtype != np.uint8:
        img_array = img_array.astype(np.uint8)

    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    img_clahe = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)

    img_normalized = img_clahe.astype(np.float32) / 255.0
    return img_normalized

# 2. Build DenseNet121 Model - Enhanced Architecture for 80-90% Accuracy
def build_classification_model(num_classes=5, fine_tune_from=0):
    base_model = DenseNet121(weights='imagenet', include_top=False, input_shape=(224, 224, 3))

    # Control which layers to freeze
    for layer in base_model.layers[:fine_tune_from]:
        layer.trainable = False
    for layer in base_model.layers[fine_tune_from:]:
        layer.trainable = True

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
    return model

if __name__ == "__main__":
    import pandas as pd
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from sklearn.model_selection import train_test_split

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    CSV_PATH = os.path.join(BASE_DIR, "dataset", "train_1.csv")
    IMG_DIR = os.path.join(BASE_DIR, "dataset", "train_images", "train_images")

    if not os.path.exists(CSV_PATH):
        print(f"Dataset not found at {CSV_PATH}. Please run download_dataset.py first.")
        exit(1)

    # Load labels
    df = pd.read_csv(CSV_PATH)
    df['id_code'] = df['id_code'].apply(lambda x: f"{x}.png")
    df['diagnosis'] = df['diagnosis'].astype(str)

    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['diagnosis'])

    # Compute class weights to handle APTOS data imbalance
    class_labels = df['diagnosis'].astype(int).values
    class_weights_array = compute_class_weight('balanced', classes=np.unique(class_labels), y=class_labels)
    class_weight_dict = {i: w for i, w in enumerate(class_weights_array)}
    print("Class weights (handling imbalance):", class_weight_dict)

    # Enhanced data augmentation
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

    BATCH_SIZE = 16  # Smaller batch for better generalization

    print("Setting up data generators...")
    train_gen = train_datagen.flow_from_dataframe(
        dataframe=train_df,
        directory=IMG_DIR,
        x_col="id_code",
        y_col="diagnosis",
        target_size=(224, 224),
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=True
    )

    val_gen = val_datagen.flow_from_dataframe(
        dataframe=val_df,
        directory=IMG_DIR,
        x_col="id_code",
        y_col="diagnosis",
        target_size=(224, 224),
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=False
    )

    models_dir = os.path.join(BASE_DIR, 'models')
    os.makedirs(models_dir, exist_ok=True)
    model_save_path = os.path.join(models_dir, 'densenet_retina.keras')

    # ============================
    # PHASE 1: Train head only (frozen base) - 15 epochs
    # ============================
    print("\n========== PHASE 1: Training classification head (base frozen) ==========")
    model = build_classification_model(5, fine_tune_from=len(DenseNet121(weights=None, include_top=False).layers))
    # All base layers frozen, only head trains
    for layer in model.layers:
        if hasattr(layer, '_name') and 'dense_net' not in layer.name:
            pass  # head layers already trainable

    # Freeze all DenseNet layers
    base_layer_count = len(DenseNet121(weights=None, include_top=False).layers)
    for layer in model.layers[:base_layer_count]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=['accuracy']
    )
    model.summary()

    phase1_callbacks = [
        EarlyStopping(patience=5, restore_best_weights=True, monitor='val_accuracy'),
        ReduceLROnPlateau(factor=0.5, patience=3, min_lr=1e-6, monitor='val_loss'),
        ModelCheckpoint(model_save_path, save_best_only=True, monitor='val_accuracy')
    ]

    print("Starting Phase 1 training...")
    history1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=15,
        callbacks=phase1_callbacks,
        class_weight=class_weight_dict
    )

    # ============================
    # PHASE 2: Fine-tune top 30% of DenseNet layers - 30 epochs
    # ============================
    print("\n========== PHASE 2: Fine-tuning top DenseNet layers ==========")
    fine_tune_at = int(base_layer_count * 0.7)  # Unfreeze top 30%
    for layer in model.layers[fine_tune_at:]:
        layer.trainable = True

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=['accuracy']
    )

    phase2_callbacks = [
        EarlyStopping(patience=8, restore_best_weights=True, monitor='val_accuracy'),
        ReduceLROnPlateau(factor=0.2, patience=4, min_lr=1e-7, monitor='val_loss'),
        ModelCheckpoint(model_save_path, save_best_only=True, monitor='val_accuracy')
    ]

    print("Starting Phase 2 fine-tuning...")
    history2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=30,
        callbacks=phase2_callbacks,
        class_weight=class_weight_dict
    )

    # ============================
    # PHASE 3: Full model fine-tune with very low LR - 15 epochs
    # ============================
    print("\n========== PHASE 3: Full model fine-tuning ==========")
    for layer in model.layers:
        layer.trainable = True

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.05),
        metrics=['accuracy']
    )

    phase3_callbacks = [
        EarlyStopping(patience=6, restore_best_weights=True, monitor='val_accuracy'),
        ReduceLROnPlateau(factor=0.2, patience=3, min_lr=1e-8, monitor='val_loss'),
        ModelCheckpoint(model_save_path, save_best_only=True, monitor='val_accuracy')
    ]

    print("Starting Phase 3 full fine-tuning...")
    history3 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=15,
        callbacks=phase3_callbacks,
        class_weight=class_weight_dict
    )

    print("\n========================================")
    print("Training completed! Model saved to:", model_save_path)
    print("========================================")
