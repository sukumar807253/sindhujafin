import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import validation from "./LoginValidation";

function Login() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleInput = (event) => {
    setValues((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validation(values);
    setErrors(validationErrors);

    if (validationErrors.email === "" && validationErrors.password === "") {
      axios
        .post("http://localhost:8081/login", values)
        .then((res) => {
          if (res.data.success) {
            alert("Login successful 🎉");
            navigate("/home");
          } else {
            alert(res.data.message);
          }
        })
        .catch((err) => {
          console.error("Login error:", err);
          alert("Login failed. Please try again.");
        });
    }
  };

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-5 rounded-3 shadow-lg w-100" style={{ maxWidth: "400px" }}>
        <h2 className="mb-4 text-center text-primary fw-bold">Login</h2>
        <form onSubmit={handleSubmit}>

          {/* Email field */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">Email</label>
            <input
              type="email"
              name="email"
              value={values.email}
              onChange={handleInput}
              placeholder="Enter your email"
              className="form-control form-control-lg border-2 border-success"
            />
            {errors.email && <small className="text-danger">{errors.email}</small>}
          </div>

          {/* Password field */}
          <div className="mb-4">
            <label htmlFor="password" className="form-label fw-semibold">Password</label>
            <input
              type="password"
              name="password"
              value={values.password}
              onChange={handleInput}
              placeholder="Enter your password"
              className="form-control form-control-lg border-2 border-warning"
            />
            {errors.password && <small className="text-danger">{errors.password}</small>}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="btn btn-gradient w-100 text-white fw-bold py-2 mb-3"
            style={{
              background: "linear-gradient(to right, #36D1DC, #5B86E5)",
              transition: "0.3s",
            }}
            onMouseOver={(e) =>
              (e.target.style.background = "linear-gradient(to right, #5B86E5, #36D1DC)")
            }
            onMouseOut={(e) =>
              (e.target.style.background = "linear-gradient(to right, #36D1DC, #5B86E5)")
            }
          >
            Login
          </button>

          <p className="text-center small text-muted">
            By logging in, you agree to our terms and policies.
          </p>

          {/* Link to Signup */}
          <Link
            to="/signup"
            className="btn btn-outline-primary w-100 mt-2 text-decoration-none fw-semibold"
          >
            Create Account
          </Link>
        </form>
      </div>
    </div>
  );
}

export default Login;
