import json
import os

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from tensorflow.keras.models import load_model as keras_load_model

MODEL_PATH = os.path.join(os.path.dirname(__file__), "lstm_model.h5")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.pkl")
FEATURE_METADATA_PATH = os.path.join(os.path.dirname(__file__), "model_features.json")
FEATURE_ORDER = ["gender", "insulin", "hdl", "ldl", "hb1ac"]

app = Flask(__name__)
CORS(app)


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "lstm_model.h5 not found. Place the exported model inside ml_api."
        )
    if not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(
            "scaler.pkl not found. Place the scaler inside ml_api."
        )

    model = keras_load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return model, scaler


# def get_trained_feature_order(model):
#     trained_features = getattr(model, "feature_names_in_", None)

#     if trained_features is not None:
#         return list(trained_features)

#     if os.path.exists(FEATURE_METADATA_PATH):
#         with open(FEATURE_METADATA_PATH, "r", encoding="utf-8") as metadata_file:
#             metadata = json.load(metadata_file)
#             feature_order = metadata.get("feature_order")

#             if isinstance(feature_order, list):
#                 return feature_order

#     return None


# def validate_model_contract(model):
#     trained_features = get_trained_feature_order(model)

#     if trained_features is None:
#         raise ValueError(
#             "Unable to verify trained feature order. Retrain/export the model "
#             "with feature_names_in_ or add model_features.json containing "
#             '["gender", "insulin", "hdl", "ldl", "hb1ac"].'
#         )

#     if trained_features != FEATURE_ORDER:
#         raise ValueError(
#             f"Model feature mismatch. Expected {FEATURE_ORDER}, got {trained_features}. "
#             "Retrain the model using only dataset-backed features."
#         )


def parse_numeric_field(data, field_name):
    value = data.get(field_name)

    if value is None or value == "":
        raise ValueError(f"{field_name} is required.")

    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a numeric value.") from exc


# def preprocess_input(data):
#     gender = data.get("gender")

#     if gender is None or gender == "":
#         raise ValueError("gender is required.")

#     normalized_gender = str(gender).strip().lower()

#     if normalized_gender not in ["male", "female"]:
#         raise ValueError("gender must be either male or female.")

#     gender_value = 1.0 if normalized_gender == "male" else 0.0

#     features = [
#         gender_value,
#         parse_numeric_field(data, "insulin"),
#         parse_numeric_field(data, "hdl"),
#         parse_numeric_field(data, "ldl"),
#         parse_numeric_field(data, "hb1ac"),
#     ]

#     return np.array([features], dtype=np.float32)

def bin_value(val, low, high):
    """Match exact binning logic from training notebook."""
    if val < low:
        return 0
    elif low <= val <= high:
        return 1
    else:
        return 2

def preprocess_input(data):
    gender = data.get("gender")

    if gender is None or gender == "":
        raise ValueError("gender is required.")

    normalized_gender = str(gender).strip().lower()

    if normalized_gender not in ["male", "female"]:
        raise ValueError("gender must be either male or female.")

    gender_value = 1.0 if normalized_gender == "male" else 0.0

    insulin = parse_numeric_field(data, "insulin")
    hdl     = parse_numeric_field(data, "hdl")
    ldl     = parse_numeric_field(data, "ldl")
    hb1ac   = parse_numeric_field(data, "hb1ac")

    # Apply same binning as training notebook before scaling
    insulin_bin = bin_value(insulin, 8, 12)
    hdl_bin     = bin_value(hdl, 40, 45)
    ldl_bin     = bin_value(ldl, 130, 159)
    hb1ac_bin   = bin_value(hb1ac, 5.6, 6.4)

    features = [
        gender_value,
        insulin_bin,
        hdl_bin,
        ldl_bin,
        hb1ac_bin,
    ]

    return np.array([features], dtype=np.float32)


def extract_prediction_and_confidence(model, scaler, features):
    # Scale the input
    features_scaled = scaler.transform(features)
    
    # Reshape for LSTM: (1, num_features, 1)
    features_lstm = features_scaled.reshape(1, features_scaled.shape[1], 1)
    
    # Predict
    prob = float(model.predict(features_lstm)[0][0])
    prediction = 1 if prob >= 0.5 else 0
    
    return prediction, round(prob, 4)


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
    MODEL, SCALER = load_model()
    MODEL_ERROR = None
except Exception as error:
    MODEL = None
    SCALER = None
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
        prediction, confidence = extract_prediction_and_confidence(MODEL, SCALER, features)
        guidance = build_guidance(prediction)

        return jsonify(
            {
                "prediction": prediction,
                "result": guidance["result"],
                "confidence": confidence,
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
