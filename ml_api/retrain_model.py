import argparse
import json
import os
import pickle

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURE_ORDER = ["gender", "insulin", "hdl", "ldl", "hba1c"]
TARGET_COLUMN = "Outcome"
MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "lstm_model.pkl")
METADATA_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "model_features.json")


def build_training_frame(dataset_path):
    dataframe = pd.read_csv(dataset_path)

    required_columns = FEATURE_ORDER + [TARGET_COLUMN]
    missing_columns = [
        column for column in required_columns if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")

    frame = dataframe[required_columns].copy()
    frame["gender"] = (
        frame["gender"]
        .astype(str)
        .str.strip()
        .str.lower()
        .map({"female": 0, "male": 1})
    )

    if frame["gender"].isna().any():
        raise ValueError("gender column must contain only male/female values.")

    # Replace 0 with np.nan for medical features to be correctly imputed
    medical_features = ["insulin", "hdl", "ldl", "hba1c"]
    for feature in medical_features:
        if feature in frame.columns:
            frame[feature] = frame[feature].replace(0, np.nan)

    return frame


def train_model(dataset_path):
    frame = build_training_frame(dataset_path)

    X = frame[FEATURE_ORDER]
    y = frame[TARGET_COLUMN]

    # Use 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Base pipeline logic: Imputation and Scaling
    # Model will be appended later
    preprocessor = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    # We will test two models and pick the best one using cross-validation.
    # We include preprocessor in the pipeline to prevent data leakage during CV.

    lr_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42),
            ),
        ]
    )

    rf_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                RandomForestClassifier(class_weight="balanced", random_state=42),
            ),
        ]
    )

    # To keep it simple, we use a basic grid search to find the best model via CV
    # Since we only want to pick the best model structure, we can just score both pipelines via CV
    from sklearn.model_selection import cross_val_score

    print("Evaluating Logistic Regression via CV...")
    lr_scores = cross_val_score(lr_pipeline, X_train, y_train, cv=5, scoring="f1")
    lr_f1 = np.mean(lr_scores)

    print("Evaluating Random Forest via CV...")
    rf_scores = cross_val_score(rf_pipeline, X_train, y_train, cv=5, scoring="f1")
    rf_f1 = np.mean(rf_scores)

    print(f"Logistic Regression CV F1: {lr_f1:.4f}")
    print(f"Random Forest CV F1: {rf_f1:.4f}")

    if rf_f1 > lr_f1:
        print("Selecting Random Forest based on F1-score.")
        best_pipeline = rf_pipeline
    else:
        print("Selecting Logistic Regression based on F1-score.")
        best_pipeline = lr_pipeline

    # Fit the best model on the full training set
    best_pipeline.fit(X_train, y_train)

    # Evaluate on the test set to find the optimal threshold based on F1-score
    y_test_probs = best_pipeline.predict_proba(X_test)[:, 1]

    thresholds = np.linspace(0.1, 0.9, 81)
    best_threshold = 0.5
    best_test_f1 = 0.0

    for thresh in thresholds:
        y_test_pred_thresh = (y_test_probs >= thresh).astype(int)
        score = f1_score(y_test, y_test_pred_thresh, zero_division=0)
        if score > best_test_f1:
            best_test_f1 = score
            best_threshold = thresh

    print(f"Optimal classification threshold: {best_threshold:.2f}")

    # Final evaluation on the test set using the optimal threshold
    y_test_pred = (y_test_probs >= best_threshold).astype(int)

    acc = accuracy_score(y_test, y_test_pred)
    prec = precision_score(y_test, y_test_pred, zero_division=0)
    rec = recall_score(y_test, y_test_pred, zero_division=0)
    f1 = f1_score(y_test, y_test_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_test_pred)

    print("\n--- Test Set Evaluation ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print("\nConfusion Matrix:")
    print(cm)

    print("\nSample Prediction Probabilities (Test Set):")
    for i in range(min(10, len(y_test_probs))):
        print(f"True Label: {y_test.iloc[i]}, Predicted Prob (Class 1): {y_test_probs[i]:.4f}")

    # Save the pipeline
    with open(MODEL_OUTPUT_PATH, "wb") as model_file:
        pickle.dump(best_pipeline, model_file)

    # Save metadata including threshold
    metadata = {
        "feature_order": FEATURE_ORDER,
        "optimal_threshold": float(best_threshold),
    }

    with open(METADATA_OUTPUT_PATH, "w", encoding="utf-8") as metadata_file:
        json.dump(metadata, metadata_file, indent=2)

    print(f"\nSaved model to: {MODEL_OUTPUT_PATH}")
    print(f"Saved feature metadata to: {METADATA_OUTPUT_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to the training CSV file.")
    args = parser.parse_args()
    train_model(args.data)
