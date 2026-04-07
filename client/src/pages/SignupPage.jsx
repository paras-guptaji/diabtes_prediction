import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { loginWithGoogle, signupUser } from "../services/authService";
import { validateSignupForm } from "../utils/validation";

const initialState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
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
    const validationErrors = validateSignupForm(formValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: "", message: "" });

      const response = await signupUser({
        name: formValues.name,
        email: formValues.email,
        password: formValues.password,
      });

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
        message: error.message || "Google sign-up failed.",
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
      title="Create your account"
      subtitle="Set up secure access for the Diabetes Type-2 Detection & Prevention System."
    >
      {status.message ? (
        <div className={`status-box ${status.type}`}>{status.message}</div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Dr. Ananya Sharma"
            value={formValues.name}
            onChange={handleChange}
          />
        </div>

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
            placeholder="Choose a password"
            value={formValues.password}
            onChange={handleChange}
          />
          {errors.password ? (
            <span className="error-text">{errors.password}</span>
          ) : null}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formValues.confirmPassword}
            onChange={handleChange}
          />
          {errors.confirmPassword ? (
            <span className="error-text">{errors.confirmPassword}</span>
          ) : null}
        </div>

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className="separator">or continue with</div>

      <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

      <p className="footer-text">
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </AuthLayout>
  );
}
