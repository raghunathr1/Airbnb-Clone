
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import axios from "axios";

import {
  FiMail,
  FiLock,
  FiLogIn,
  FiAlertCircle,
} from "react-icons/fi";

import "./Auth.css";
import API_BASE_URL from "./api";

const API_URL = `${API_BASE_URL}/auth`;

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

  // Authenticate the user.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/login`,
        {
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

      if (!token) {
        throw new Error(
          "Login response did not contain an authentication token."
        );
      }

      if (!user || typeof user !== "object") {
        throw new Error(
          "Login succeeded, but user details were not returned by the API."
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
      console.error("Login error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-icon">
          <FiLogIn />
        </div>

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Log in to continue your StayFinder journey.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link
            to="/signup"
            state={{ from: redirectPath }}
          >
            Sign up
          </Link>
        </p>

        <Link to="/" className="auth-home-link">
          Back to home
        </Link>
      </section>
    </main>
  );
}

export default Login;
