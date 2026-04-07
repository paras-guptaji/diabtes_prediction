import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { loginUser, loginWithGoogle } from "../services/authService";
import { validateLoginForm } from "../utils/validation";

const initialState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const [formValues, setFormValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateLoginForm(formValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: "", message: "" });

      const response = await loginUser(formValues);
      login({ token: response.token, user: response.user });
      navigate("/dashboard");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setStatus({ type: "", message: "" });

      // Decode the Google credential to access the basic profile details.
      const googleProfile = jwtDecode(credentialResponse.credential);

      const response = await loginWithGoogle({
        name: googleProfile.name,
        email: googleProfile.email,
        googleId: googleProfile.sub,
      });

      login({ token: response.token, user: response.user });
      navigate("/dashboard");
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Google login failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setStatus({
      type: "error",
      message: "Google sign-in was cancelled or could not be completed.",
    });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue managing your diabetes prevention workspace."
    >
      {status.message ? (
        <div className={`status-box ${status.type}`}>{status.message}</div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="doctor@example.com"
            value={formValues.email}
            onChange={handleChange}
          />
          {errors.email ? <span className="error-text">{errors.email}</span> : null}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formValues.password}
            onChange={handleChange}
          />
          {errors.password ? (
            <span className="error-text">{errors.password}</span>
          ) : null}
        </div>

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="separator">or continue with</div>

      {/* GoogleLogin renders the official Google Identity Services button. */}
      <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

      <p className="footer-text">
        New to the platform? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
