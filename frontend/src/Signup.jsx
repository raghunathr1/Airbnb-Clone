
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import axios from "axios";

import {
  FiUser,
  FiMail,
  FiLock,
  FiUserPlus,
  FiAlertCircle,
} from "react-icons/fi";

import "./Auth.css";
import API_BASE_URL from "./api";

const API_URL = `${API_BASE_URL}/auth`;

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestedPath = location.state?.from;

  const redirectPath =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    !["/login", "/signup"].includes(
      requestedPath.split("?")[0].split("#")[0]
    )
      ? requestedPath
      : "/";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Validate input and create the account.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (name.length < 2 || name.length > 50) {
      setError(
        "Name must contain between 2 and 50 characters."
      );
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (password.length > 72) {
      setError("Password cannot exceed 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/signup`,
        {
          name,
          email,
          password,
        }
      );

      let payload = response.data;

      for (
        let level = 0;
        level < 3 && payload?.data && !payload?.token;
        level += 1
      ) {
        payload = payload.data;
      }

      const token = payload?.token;
      const user = payload?.user;

      if (!token || !user || typeof user !== "object") {
        throw new Error(
          "Invalid signup response. Please check the backend signup API."
        );
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      localStorage.setItem("airbnb-token", token);
      localStorage.setItem("airbnb-user", JSON.stringify(user));
      localStorage.setItem("currentUser", JSON.stringify(user));

      navigate(redirectPath, {
        replace: true,
      });
    } catch (err) {
      console.error("Signup error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-icon">
          <FiUserPlus />
        </div>

        <h1>Create an account</h1>

        <p className="auth-subtitle">
          Join us and discover your next getaway.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="name">Full name</label>

          <div className="auth-input-wrapper">
            <FiUser />

            <input
              id="name"
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              minLength={2}
              maxLength={50}
              autoComplete="name"
              disabled={loading}
              required
            />
          </div>

          <label htmlFor="email">Email address</label>

          <div className="auth-input-wrapper">
            <FiMail />

            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <label htmlFor="password">Password</label>

          <div className="auth-input-wrapper">
            <FiLock />

            <input
              id="password"
              type="password"
              name="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </div>

          <label htmlFor="confirmPassword">
            Confirm password
          </label>

          <div className="auth-input-wrapper">
            <FiLock />

            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link
            to="/login"
            state={{ from: redirectPath }}
          >
            Log in
          </Link>
        </p>

        <Link to="/" className="auth-home-link">
          Back to home
        </Link>
      </section>
    </main>
  );
}

export default Signup;
