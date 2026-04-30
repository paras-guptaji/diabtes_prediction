import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialFormState = {
  gender: "",
  insulin: "",
  hdl: "",
  ldl: "",
  hb1ac: "",
};

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

    const payload = {
      gender: formData.gender,
      insulin: Number(formData.insulin),
      hdl: Number(formData.hdl),
      ldl: Number(formData.ldl),
      hb1ac: Number(formData.hb1ac),
    };

    try {
      const response = await fetch("http://127.0.0.1:5001/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
          <p className="dashboard-kicker">Diabetes Mellitus Type-2 System</p>
          <h1>Welcome, {user?.name || "Patient"}</h1>
        </div>

        <button className="dashboard-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-intro-card">
          <div>
            <span className="dashboard-badge">Medical Assessment Workspace</span>
            <h2>Diabetes Risk Assessment Form</h2>
            <p>
              Enter the patient&apos;s latest measurements to simulate a risk
              prediction for diabetes mellitus type-2.
            </p>
          </div>

          <div className="dashboard-mini-stats">
            <div className="mini-stat-card">
              <span>Signed in email</span>
              <strong>{user?.email || "Not available"}</strong>
            </div>
            <div className="mini-stat-card">
              <span>Assessment mode</span>
              <strong>Prediction Preview</strong>
            </div>
          </div>
        </section>

        <section className="assessment-card">
          <form className="assessment-form" onSubmit={handleSubmit}>
            <div className="assessment-grid">
              <div className="dashboard-form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="dashboard-form-group">
                <label htmlFor="insulin">Insulin</label>
                <input
                  id="insulin"
                  name="insulin"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 125"
                  value={formData.insulin}
                  onChange={handleChange}
                  required
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
                  placeholder="e.g. 45"
                  value={formData.hdl}
                  onChange={handleChange}
                  required
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
                  placeholder="e.g. 110"
                  value={formData.ldl}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-group">
                <label htmlFor="hba1c">HbA1c</label>
                <input
                  id="hb1ac"
                  name="hb1ac"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 6.5"
                  value={formData.hb1ac}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="assessment-actions">
              <button
                className="run-prediction-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Running Prediction..." : "Run Prediction"}
              </button>
              <p>
                Values are sent to the Flask ML API in the trained feature
                order.
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
              <p>Confidence: {Number(predictionResult.confidence).toFixed(4)}</p>

              <h3>Precautions</h3>
              <ul>
                {predictionResult.precautions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3>Measures</h3>
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
