import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialFormState = {
  age: "",
  bmi: "",
  glucose: "",
  bloodPressure: "",
  insulin: "",
  cbcLipidProfiles: "",
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

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

    // Replace this timeout with your real machine learning API call.
    // Example:
    // const response = await fetch("http://localhost:5000/api/predict", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(formData),
    // });
    // const result = await response.json();
    // setPredictionResult(result.prediction);
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const glucoseValue = Number(formData.glucose);
    const bmiValue = Number(formData.bmi);
    const ageValue = Number(formData.age);

    const mockRisk =
      glucoseValue > 145 || bmiValue > 30 || ageValue > 50
        ? "High Risk"
        : "Low Risk";

    setPredictionResult(mockRisk);
    setLoading(false);
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
                <label htmlFor="age">Age (years)</label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 45"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-group">
                <label htmlFor="bmi">BMI (Body Mass Index)</label>
                <input
                  id="bmi"
                  name="bmi"
                  type="number"
                  min="10"
                  max="70"
                  step="0.1"
                  placeholder="e.g. 28.4"
                  value={formData.bmi}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-group">
                <label htmlFor="glucose">Glucose Level (mg/dL)</label>
                <input
                  id="glucose"
                  name="glucose"
                  type="number"
                  min="40"
                  max="400"
                  placeholder="e.g. 135"
                  value={formData.glucose}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-group">
                <label htmlFor="bloodPressure">
                  Blood Pressure (Diastolic, mm Hg)
                </label>
                <input
                  id="bloodPressure"
                  name="bloodPressure"
                  type="number"
                  min="30"
                  max="180"
                  placeholder="e.g. 82"
                  value={formData.bloodPressure}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-group">
                <label htmlFor="insulin">Insulin Level (mu U/ml)</label>
                <input
                  id="insulin"
                  name="insulin"
                  type="number"
                  min="0"
                  max="900"
                  placeholder="e.g. 125"
                  value={formData.insulin}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-group dashboard-form-group-full">
                <label htmlFor="cbcLipidProfiles">CBC Lipid Profiles</label>
                <textarea
                  id="cbcLipidProfiles"
                  name="cbcLipidProfiles"
                  rows="4"
                  placeholder="Enter lipid profile summary, HDL, LDL, triglycerides, hemoglobin, or any relevant CBC notes."
                  value={formData.cbcLipidProfiles}
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
                This mock flow is ready to connect to your prediction API when
                the model endpoint is available.
              </p>
            </div>
          </form>

          {predictionResult ? (
            <div
              className={`prediction-result-card ${
                predictionResult === "High Risk" ? "high-risk" : "low-risk"
              }`}
            >
              <span>Mock Prediction Result</span>
              <strong>{predictionResult}</strong>
              <p>
                Connect your backend model here to return the actual diabetes
                risk classification and probability score.
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
