import argparse
import json
import os
import pickle

import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

FEATURE_ORDER = ["gender", "insulin", "hdl", "ldl", "hba1c"]
TARGET_COLUMN = "Outcome"
MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "lstm_model.pkl")
METADATA_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "model_features.json")


def build_training_frame(dataset_path):
    dataframe = pd.read_csv(dataset_path)

    required_columns = FEATURE_ORDER + [TARGET_COLUMN]
    missing_columns = [column for column in required_columns if column not in dataframe.columns]

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

    return frame


def train_model(dataset_path):
    frame = build_training_frame(dataset_path)
    x_train = frame[FEATURE_ORDER]
    y_train = frame[TARGET_COLUMN]

    model = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("classifier", LogisticRegression(max_iter=2000)),
        ]
    )

    model.fit(x_train, y_train)

    with open(MODEL_OUTPUT_PATH, "wb") as model_file:
        pickle.dump(model, model_file)

    with open(METADATA_OUTPUT_PATH, "w", encoding="utf-8") as metadata_file:
        json.dump({"feature_order": FEATURE_ORDER}, metadata_file, indent=2)

    print(f"Saved model to: {MODEL_OUTPUT_PATH}")
    print(f"Saved feature metadata to: {METADATA_OUTPUT_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to the training CSV file.")
    args = parser.parse_args()
    train_model(args.data)
