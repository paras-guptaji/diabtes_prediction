import os

import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from tensorflow.keras.models import load_model as keras_load_model

MODEL_PATH = os.path.join(os.path.dirname(__file__), "lstm_model.h5")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.pkl")

FEATURE_ORDER = [
    "hba1c",
    "insulin_levels",
    "hdl",
    "ldl",
    "homa_ir",
    "bmi",
    "triglycerides",
    "crp_levels",
    "fasting_blood_glucose",
    "blood_pressure_systolic",
    "family_history_of_diabetes",
    "obesity",
    "hypertension",
]

NUMERIC_DEFAULTS = {
    "hba1c": 5.7,
    "insulin_levels": 12.0,
    "hdl": 50.0,
    "ldl": 110.0,
    "bmi": 24.9,
    "triglycerides": 150.0,
    "crp_levels": 3.0,
    "blood_pressure_systolic": 120.0,
}

BOOLEAN_FIELDS = {
    "family_history_of_diabetes",
    "obesity",
    "hypertension",
    "physical_activity",
    "smoking",
}

FIELD_ALIASES = {
    "hba1c": ["hba1c", "hb1ac"],
    "insulin_levels": ["insulin_levels", "insulin", "insulinlevel"],
    "hdl": ["hdl"],
    "ldl": ["ldl"],
    "homa_ir": ["homa_ir", "homair"],
    "bmi": ["bmi"],
    "triglycerides": ["triglycerides", "triglyceride_levels"],
    "crp_levels": ["crp_levels", "crp"],
    "fasting_blood_glucose": [
        "fasting_blood_glucose",
        "fasting_glucose",
        "blood_glucose",
    ],
    "blood_pressure_systolic": [
        "blood_pressure_systolic",
        "blood_pressure",
        "systolic_bp",
    ],
    "family_history_of_diabetes": [
        "family_history_of_diabetes",
        "family_history",
    ],
    "obesity": ["obesity"],
    "hypertension": ["hypertension"],
    "physical_activity": ["physical_activity"],
    "smoking": ["smoking"],
}

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


def normalize_payload(data):
    normalized = {}

    for key, value in data.items():
        normalized[str(key).strip().lower()] = value

    return normalized


def get_first_present_value(data, canonical_name):
    for alias in FIELD_ALIASES.get(canonical_name, [canonical_name]):
        if alias in data:
            return data[alias]

    return None


def has_value_for(data, canonical_name):
    value = get_first_present_value(data, canonical_name)
    return value is not None and value != ""


def parse_numeric_value(raw_value, field_name):
    if raw_value is None or raw_value == "":
        return None

    try:
        return float(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a numeric value.") from exc


def parse_boolean_value(raw_value, field_name):
    if raw_value is None or raw_value == "":
        return None

    if isinstance(raw_value, bool):
        return 1.0 if raw_value else 0.0

    if isinstance(raw_value, (int, float)):
        if raw_value in (0, 1):
            return float(raw_value)
        raise ValueError(f"{field_name} must be yes/no or 0/1.")

    normalized = str(raw_value).strip().lower()

    if normalized in {"yes", "y", "true", "1", "active"}:
        return 1.0
    if normalized in {"no", "n", "false", "0", "inactive"}:
        return 0.0

    raise ValueError(f"{field_name} must be yes/no or 0/1.")


def estimate_fasting_glucose(hba1c_value):
    estimated_average_glucose = (28.7 * hba1c_value) - 46.7
    return max(70.0, min(190.0, round(estimated_average_glucose, 2)))


def build_profile(data):
    profile = {}
    auto_filled_fields = []

    for field_name in FEATURE_ORDER:
        raw_value = get_first_present_value(data, field_name)

        if field_name in BOOLEAN_FIELDS:
            parsed_value = parse_boolean_value(raw_value, field_name)
        else:
            parsed_value = parse_numeric_value(raw_value, field_name)

        if parsed_value is not None:
            profile[field_name] = parsed_value

    profile["hba1c"] = profile.get("hba1c", NUMERIC_DEFAULTS["hba1c"])
    if not has_value_for(data, "hba1c"):
        auto_filled_fields.append("hba1c")

    profile["hdl"] = profile.get("hdl", NUMERIC_DEFAULTS["hdl"])
    if not has_value_for(data, "hdl"):
        auto_filled_fields.append("hdl")

    profile["ldl"] = profile.get("ldl", NUMERIC_DEFAULTS["ldl"])
    if not has_value_for(data, "ldl"):
        auto_filled_fields.append("ldl")

    profile["bmi"] = profile.get("bmi", NUMERIC_DEFAULTS["bmi"])
    if not has_value_for(data, "bmi"):
        auto_filled_fields.append("bmi")

    bp_missing = "blood_pressure_systolic" not in profile
    if bp_missing:
        profile["blood_pressure_systolic"] = NUMERIC_DEFAULTS["blood_pressure_systolic"]
        auto_filled_fields.append("blood_pressure_systolic")

    if "insulin_levels" not in profile:
        profile["insulin_levels"] = NUMERIC_DEFAULTS["insulin_levels"]
        auto_filled_fields.append("insulin_levels")

    if "fasting_blood_glucose" not in profile:
        profile["fasting_blood_glucose"] = estimate_fasting_glucose(profile["hba1c"])
        auto_filled_fields.append("fasting_blood_glucose")

    if "homa_ir" not in profile:
        profile["homa_ir"] = round(
            (profile["fasting_blood_glucose"] * profile["insulin_levels"]) / 405.0,
            2,
        )
        auto_filled_fields.append("homa_ir")

    if "triglycerides" not in profile:
        profile["triglycerides"] = NUMERIC_DEFAULTS["triglycerides"]
        auto_filled_fields.append("triglycerides")

    if "crp_levels" not in profile:
        profile["crp_levels"] = NUMERIC_DEFAULTS["crp_levels"]
        auto_filled_fields.append("crp_levels")

    if "family_history_of_diabetes" not in profile:
        profile["family_history_of_diabetes"] = 0.0
        auto_filled_fields.append("family_history_of_diabetes")

    if "obesity" not in profile:
        profile["obesity"] = 1.0 if profile["bmi"] >= 30 else 0.0
        auto_filled_fields.append("obesity")

    if "hypertension" not in profile:
        profile["hypertension"] = (
            1.0 if profile["blood_pressure_systolic"] >= 140 else 0.0
        )
        auto_filled_fields.append("hypertension")

    profile["physical_activity"] = parse_boolean_value(
        get_first_present_value(data, "physical_activity"),
        "physical_activity",
    )
    profile["smoking"] = parse_boolean_value(
        get_first_present_value(data, "smoking"),
        "smoking",
    )

    feature_vector = np.array(
        [[profile[field_name] for field_name in FEATURE_ORDER]],
        dtype=np.float32,
    )

    return profile, feature_vector, sorted(set(auto_filled_fields))


def extract_prediction_and_confidence(model, scaler, features):
    features_scaled = scaler.transform(features)
    features_lstm = features_scaled.reshape(1, features_scaled.shape[1], 1)

    probability = float(model.predict(features_lstm, verbose=0)[0][0])
    prediction = 1 if probability >= 0.5 else 0

    return prediction, probability


def determine_risk_band(probability):
    if probability < 0.4:
        return "Low"
    if probability < 0.7:
        return "Moderate"
    return "High"


def build_guidance(prediction, probability, profile):
    precautions = []
    measures = []

    if profile["hba1c"] >= 6.5:
        precautions.append("Your HbA1c is in a high-risk range and should be reviewed.")
        measures.append("Arrange a doctor visit and repeat HbA1c or fasting glucose testing.")
    elif profile["hba1c"] >= 5.7:
        precautions.append("Your HbA1c is above the ideal range and needs monitoring.")
        measures.append("Reduce sugary foods and schedule routine blood sugar follow-up.")

    if profile["ldl"] >= 130 or profile["hdl"] < 40:
        precautions.append("Your cholesterol pattern may increase metabolic and heart risk.")
        measures.append("Choose a high-fiber, lower-saturated-fat diet and recheck lipids.")

    if profile["bmi"] >= 30:
        precautions.append("A high BMI can increase insulin resistance and diabetes risk.")
        measures.append("Aim for steady weight loss with portion control and daily walking.")

    if profile["blood_pressure_systolic"] >= 140:
        precautions.append("Raised blood pressure can add strain on the heart and kidneys.")
        measures.append("Track blood pressure regularly and reduce salt intake.")

    if profile["smoking"] == 1:
        precautions.append("Smoking can worsen blood vessel damage and diabetes outcomes.")
        measures.append("Start a smoking-cessation plan or speak with a clinician for support.")

    if profile["physical_activity"] == 0:
        precautions.append("Low physical activity can reduce glucose control over time.")
        measures.append("Target at least 30 minutes of moderate activity on most days.")

    if profile["family_history_of_diabetes"] == 1:
        precautions.append("Family history may increase your inherited diabetes risk.")

    if prediction == 1 and not measures:
        measures.append("Book a clinical assessment and repeat the main metabolic tests soon.")

    if prediction == 0 and not measures:
        measures.append("Maintain a balanced diet, healthy weight, and regular yearly screening.")

    if not precautions:
        precautions.append("No major warning pattern was detected from the submitted values.")

    result_text = "Higher diabetes risk detected" if prediction == 1 else "Lower diabetes risk detected"
    summary = (
        "The model sees a stronger pattern associated with diabetes."
        if prediction == 1
        else "The model currently sees a lower diabetes-risk pattern."
    )

    return {
        "result": result_text,
        "risk_level": determine_risk_band(probability),
        "summary": summary,
        "precautions": precautions[:5],
        "measures": measures[:5],
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
    return jsonify(
        {
            "message": "Diabetes prediction API is running.",
            "model_loaded": MODEL_ERROR is None,
            "feature_count": len(FEATURE_ORDER),
        }
    )


@app.route("/predict", methods=["POST"])
def predict():
    if MODEL_ERROR is not None:
        return jsonify({"error": MODEL_ERROR}), 500

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be valid JSON."}), 400

    try:
        normalized_data = normalize_payload(data)
        profile, features, auto_filled_fields = build_profile(normalized_data)
        prediction, probability = extract_prediction_and_confidence(MODEL, SCALER, features)
        guidance = build_guidance(prediction, probability, profile)

        return jsonify(
            {
                "prediction": prediction,
                "result": guidance["result"],
                "riskLevel": guidance["risk_level"],
                "summary": guidance["summary"],
                "diabetesProbability": round(probability, 4),
                "diabetesProbabilityPercent": round(probability * 100, 2),
                "precautions": guidance["precautions"],
                "measures": guidance["measures"],
                "autoFilledFields": auto_filled_fields,
                "modelFeaturesUsed": FEATURE_ORDER,
                "inputSnapshot": {
                    "hba1c": round(profile["hba1c"], 2),
                    "hdl": round(profile["hdl"], 2),
                    "ldl": round(profile["ldl"], 2),
                    "bmi": round(profile["bmi"], 2),
                    "blood_pressure_systolic": round(
                        profile["blood_pressure_systolic"], 2
                    ),
                    "physical_activity": profile["physical_activity"],
                    "smoking": profile["smoking"],
                },
            }
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"Prediction failed: {str(error)}"}), 500


# if __name__ == "__main__":
#     app.run(host="127.0.0.1", port=5001, debug=True)

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)

