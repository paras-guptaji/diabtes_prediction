import json
import os

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

MODEL_PATH = os.path.join(os.path.dirname(__file__), "lstm_model.pkl")
FEATURE_METADATA_PATH = os.path.join(os.path.dirname(__file__), "model_features.json")
FEATURE_ORDER = ["gender", "insulin", "hdl", "ldl", "hba1c"]

app = Flask(__name__)
CORS(app)


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "lstm_model.pkl not found. Place the exported model inside ml_api."
        )

    return joblib.load(MODEL_PATH)


def load_metadata():
    if not os.path.exists(FEATURE_METADATA_PATH):
        return {}
    with open(FEATURE_METADATA_PATH, "r", encoding="utf-8") as metadata_file:
        return json.load(metadata_file)


def get_trained_feature_order(model, metadata):
    trained_features = getattr(model, "feature_names_in_", None)

    if trained_features is not None:
        return list(trained_features)

    feature_order = metadata.get("feature_order")
    if isinstance(feature_order, list):
        return feature_order

    return None


def validate_model_contract(model, metadata):
    trained_features = get_trained_feature_order(model, metadata)

    if trained_features is None:
        raise ValueError(
            "Unable to verify trained feature order. Retrain/export the model "
            "with feature_names_in_ or add model_features.json containing "
            '["gender", "insulin", "hdl", "ldl", "hba1c"].'
        )

    if trained_features != FEATURE_ORDER:
        raise ValueError(
            f"Model feature mismatch. Expected {FEATURE_ORDER}, got {trained_features}. "
            "Retrain the model using only dataset-backed features."
        )


def parse_numeric_field(data, field_name):
    value = data.get(field_name)

    if value is None or value == "":
        raise ValueError(f"{field_name} is required.")

    try:
        val = float(value)
        # Handle the 0s logically if they represent missing values in medical features
        if val == 0.0 and field_name in ["insulin", "hdl", "ldl", "hba1c"]:
            return np.nan
        return val
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a numeric value.") from exc


def preprocess_input(data):
    gender = data.get("gender")

    if gender is None or gender == "":
        raise ValueError("gender is required.")

    normalized_gender = str(gender).strip().lower()

    if normalized_gender not in ["male", "female"]:
        raise ValueError("gender must be either male or female.")

    gender_value = 1.0 if normalized_gender == "male" else 0.0

    features = [
        gender_value,
        parse_numeric_field(data, "insulin"),
        parse_numeric_field(data, "hdl"),
        parse_numeric_field(data, "ldl"),
        parse_numeric_field(data, "hba1c"),
    ]

    return pd.DataFrame([features], columns=FEATURE_ORDER, dtype=np.float32)


def extract_prediction_and_confidence(model, features, threshold=0.5):
    if hasattr(model, "predict_proba"):
        probabilities = np.asarray(model.predict_proba(features), dtype=float)

        if probabilities.ndim == 2 and probabilities.shape[1] >= 2:
            confidence = float(probabilities[0][1])
        else:
            confidence = float(probabilities.reshape(-1)[0])

        prediction = 1 if confidence >= threshold else 0
        return prediction, round(confidence, 4)

    raw_prediction = np.asarray(model.predict(features), dtype=float).reshape(-1)

    if raw_prediction.size == 0:
        raise ValueError("Model returned an empty prediction.")

    value = float(raw_prediction[0])

    # Supports sigmoid-style models that return a probability directly.
    if 0.0 <= value <= 1.0:
        prediction = 1 if value >= threshold else 0
        return prediction, round(value, 4)

    raise ValueError(
        "Model does not expose a probability score. Retrain/export a model that "
        "supports predict_proba or returns probabilities."
    )


def build_guidance(prediction):
    if prediction == 1:
        return {
            "result": "Diabetic",
            "precautions": [
                "Avoid sugar & refined carbs",
                "Monitor HbA1c regularly",
                "Maintain weight",
            ],
            "measures": [
                "Exercise daily (30 min)",
                "Low-carb diet",
                "Doctor consultation",
            ],
        }

    return {
        "result": "Non-Diabetic",
        "precautions": [
            "Maintain healthy lifestyle",
            "Regular checkups",
        ],
        "measures": [
            "Maintain healthy lifestyle",
            "Regular checkups",
        ],
    }


try:
    MODEL = load_model()
    METADATA = load_metadata()
    validate_model_contract(MODEL, METADATA)
    OPTIMAL_THRESHOLD = METADATA.get("optimal_threshold", 0.5)
    MODEL_ERROR = None
except Exception as error:
    MODEL = None
    METADATA = {}
    OPTIMAL_THRESHOLD = 0.5
    MODEL_ERROR = str(error)


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"message": "Diabetes prediction API is running."})


@app.route("/predict", methods=["POST"])
def predict():
    if MODEL_ERROR is not None:
        return jsonify({"error": MODEL_ERROR}), 500

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be valid JSON."}), 400

    missing_fields = [field for field in FEATURE_ORDER if field not in data]

    if missing_fields:
        return jsonify({"error": f"Missing input fields: {missing_fields}"}), 400

    try:
        features = preprocess_input(data)
        prediction, confidence = extract_prediction_and_confidence(
            MODEL, features, threshold=OPTIMAL_THRESHOLD
        )
        guidance = build_guidance(prediction)

        return jsonify(
            {
                "prediction": prediction,
                "result": guidance["result"],
                "confidence": confidence,
                "threshold_used": OPTIMAL_THRESHOLD,
                "precautions": guidance["precautions"],
                "measures": guidance["measures"],
            }
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"Prediction failed: {str(error)}"}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
