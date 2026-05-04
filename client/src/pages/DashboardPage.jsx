import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialFormState = {
  hba1c: "",
  hdl: "",
  ldl: "",
  bmi: "",
  bloodPressure: "",
  physicalActivity: "",
  smoking: "",
  insulinLevels: "",
  fastingBloodGlucose: "",
  homaIr: "",
  triglycerides: "",
  crpLevels: "",
  familyHistoryOfDiabetes: "",
  obesity: "",
  hypertension: "",
};

const percentFormatter = (value) => `${Number(value).toFixed(2)}%`;

function buildPayload(formData) {
  const payload = {};
  const numericFieldMap = {
    hba1c: "hba1c",
    hdl: "hdl",
    ldl: "ldl",
    bmi: "bmi",
    bloodPressure: "blood_pressure",
    insulinLevels: "insulin_levels",
    fastingBloodGlucose: "fasting_blood_glucose",
    homaIr: "homa_ir",
    triglycerides: "triglycerides",
    crpLevels: "crp_levels",
  };

  Object.entries(numericFieldMap).forEach(([formKey, apiKey]) => {
    if (formData[formKey] !== "") {
      payload[apiKey] = Number(formData[formKey]);
    }
  });

  const booleanFieldMap = {
    physicalActivity: "physical_activity",
    smoking: "smoking",
    familyHistoryOfDiabetes: "family_history_of_diabetes",
    obesity: "obesity",
    hypertension: "hypertension",
  };

  Object.entries(booleanFieldMap).forEach(([formKey, apiKey]) => {
    if (formData[formKey] !== "") {
      payload[apiKey] = formData[formKey];
    }
  });

  return payload;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setPredictionResult(null);
    setErrorMessage("");

    try {
      const response = await fetch("http://127.0.0.1:5001/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(formData)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Prediction request failed.");
      }

      setPredictionResult(data);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="medical-dashboard">
      <header className="dashboard-navbar">
        <div>
          <p className="dashboard-kicker">Diabetes Prediction Workspace</p>
          <h1>Welcome, {user?.name || "Patient"}</h1>
        </div>

        <button className="dashboard-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-intro-card">
          <div>
            <span className="dashboard-badge">Updated Model Intake</span>
            <h2>Diabetes risk form with optional autofill</h2>
            <p>
              The main fields are HbA1c, HDL, LDL, BMI, and blood pressure.
              Any optional field left blank will be estimated safely by the ML
              API before prediction.
            </p>
          </div>

          <div className="dashboard-mini-stats">
            <div className="mini-stat-card">
              <span>Signed in email</span>
              <strong>{user?.email || "Not available"}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Prediction mode</span>
              <strong>Risk + Prevention Guidance</strong>
            </div>
          </div>
        </section>

        <section className="assessment-card">
          <form className="assessment-form" onSubmit={handleSubmit}>
            <div>
              <span className="section-label">Main health markers</span>
              <div className="assessment-grid">
                <div className="dashboard-form-group">
                  <label htmlFor="hba1c">HbA1c</label>
                  <input
                    id="hba1c"
                    name="hba1c"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 6.2"
                    value={formData.hba1c}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="hdl">HDL</label>
                  <input
                    id="hdl"
                    name="hdl"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 48"
                    value={formData.hdl}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="ldl">LDL</label>
                  <input
                    id="ldl"
                    name="ldl"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 120"
                    value={formData.ldl}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="bmi">BMI</label>
                  <input
                    id="bmi"
                    name="bmi"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 27.5"
                    value={formData.bmi}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="bloodPressure">Blood Pressure (Systolic)</label>
                  <input
                    id="bloodPressure"
                    name="bloodPressure"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 126"
                    value={formData.bloodPressure}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="physicalActivity">Do physical activity?</label>
                  <select
                    id="physicalActivity"
                    name="physicalActivity"
                    value={formData.physicalActivity}
                    onChange={handleChange}
                  >
                    <option value="">Leave blank</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="smoking">Smoking</label>
                  <select
                    id="smoking"
                    name="smoking"
                    value={formData.smoking}
                    onChange={handleChange}
                  >
                    <option value="">Leave blank</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>

            <details className="advanced-section">
              <summary>Advanced optional fields</summary>
              <div className="assessment-grid advanced-grid">
                <div className="dashboard-form-group">
                  <label htmlFor="insulinLevels">Insulin Levels</label>
                  <input
                    id="insulinLevels"
                    name="insulinLevels"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 14"
                    value={formData.insulinLevels}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="fastingBloodGlucose">
                    Fasting Blood Glucose
                  </label>
                  <input
                    id="fastingBloodGlucose"
                    name="fastingBloodGlucose"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 102"
                    value={formData.fastingBloodGlucose}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="homaIr">HOMA-IR</label>
                  <input
                    id="homaIr"
                    name="homaIr"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 2.8"
                    value={formData.homaIr}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="triglycerides">Triglycerides</label>
                  <input
                    id="triglycerides"
                    name="triglycerides"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 155"
                    value={formData.triglycerides}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="crpLevels">CRP Levels</label>
                  <input
                    id="crpLevels"
                    name="crpLevels"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 2.5"
                    value={formData.crpLevels}
                    onChange={handleChange}
                  />
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="familyHistoryOfDiabetes">
                    Family history of diabetes
                  </label>
                  <select
                    id="familyHistoryOfDiabetes"
                    name="familyHistoryOfDiabetes"
                    value={formData.familyHistoryOfDiabetes}
                    onChange={handleChange}
                  >
                    <option value="">Leave blank</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="obesity">Obesity</label>
                  <select
                    id="obesity"
                    name="obesity"
                    value={formData.obesity}
                    onChange={handleChange}
                  >
                    <option value="">Leave blank</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="dashboard-form-group">
                  <label htmlFor="hypertension">Hypertension</label>
                  <select
                    id="hypertension"
                    name="hypertension"
                    value={formData.hypertension}
                    onChange={handleChange}
                  >
                    <option value="">Leave blank</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </details>

            <div className="assessment-actions">
              <button
                className="run-prediction-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Running Prediction..." : "Submit Assessment"}
              </button>
              <p>
                Blank fields are auto-estimated. Lifestyle fields like smoking
                and physical activity are also used to improve the prevention
                advice shown after prediction.
              </p>
            </div>
          </form>

          {errorMessage ? (
            <div className="prediction-result-card high-risk">
              <span>Prediction Error</span>
              <strong>Request Failed</strong>
              <p>{errorMessage}</p>
            </div>
          ) : null}

          {predictionResult ? (
            <div
              className={`prediction-result-card ${
                predictionResult.prediction === 1 ? "high-risk" : "low-risk"
              }`}
            >
              <span>Prediction Result</span>
              <strong>{predictionResult.result}</strong>
              <p>{predictionResult.summary}</p>

              <div className="result-metrics">
                <div className="result-metric">
                  <small>Risk level</small>
                  <strong>{predictionResult.riskLevel}</strong>
                </div>
                <div className="result-metric">
                  <small>Diabetes probability</small>
                  <strong>
                    {percentFormatter(
                      predictionResult.diabetesProbabilityPercent
                    )}
                  </strong>
                </div>
              </div>

              {predictionResult.autoFilledFields?.length ? (
                <div className="autofill-note">
                  <strong>Auto-filled fields:</strong>{" "}
                  {predictionResult.autoFilledFields.join(", ")}
                </div>
              ) : null}

              <h3>Preventive precautions</h3>
              <ul>
                {predictionResult.precautions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3>Recommended measures</h3>
              <ul>
                {predictionResult.measures.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
