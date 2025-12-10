import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import signupValidation from "./SignupValidation"; // Validation logic
import axios from "axios";

function Signup() {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleInput = (event) => {
    setValues((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = signupValidation(values);
    setErrors(validationErrors);

    if (
      validationErrors.name === "" &&
      validationErrors.email === "" &&
      validationErrors.password === ""
    ) {
      try {
        const response = await axios.post("http://localhost:8081/signup", values);
        alert(response.data.message || "User registered successfully!");
        navigate("/"); // Redirect to login page
      } catch (err) {
        console.error("Signup Error:", err);
        alert(err.response?.data?.message || "Signup failed. Check backend.");
      }
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-5 rounded-3 shadow-lg w-100" style={{ maxWidth: "400px" }}>
        <h2 className="mb-4 text-center text-primary fw-bold">Sign Up</h2>
        <form onSubmit={handleSubmit}>

          {/* Name Input */}
          <div className="mb-3">
            <label htmlFor="name" className="form-label fw-semibold">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={values.name}
              onChange={handleInput}
              className="form-control form-control-lg border-2 border-primary"
              placeholder="Enter your name"
            />
            {errors.name && <small className="text-danger">{errors.name}</small>}
          </div>

          {/* Email Input */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={values.email}
              onChange={handleInput}
              className="form-control form-control-lg border-2 border-success"
              placeholder="Enter your email"
            />
            {errors.email && <small className="text-danger">{errors.email}</small>}
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label htmlFor="password" className="form-label fw-semibold">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={values.password}
              onChange={handleInput}
              className="form-control form-control-lg border-2 border-warning"
              placeholder="Enter your password"
            />
            {errors.password && <small className="text-danger">{errors.password}</small>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-gradient w-100 text-white fw-bold py-2 mb-3"
            style={{
              background: "linear-gradient(to right, #ff416c, #ff4b2b)",
              transition: "0.3s",
            }}
            onMouseOver={(e) =>
              (e.target.style.background = "linear-gradient(to right, #ff4b2b, #ff416c)")
            }
            onMouseOut={(e) =>
              (e.target.style.background = "linear-gradient(to right, #ff416c, #ff4b2b)")
            }
          >
            Sign Up
          </button>

          <p className="text-center small text-muted">
            By signing up, you agree to our terms and policies.
          </p>

          {/* Link to Login */}
          <Link
            to="/"
            className="btn btn-outline-primary w-100 mt-2 text-center text-decoration-none fw-semibold"
          >
            Already have an account? Login
          </Link>
        </form>
      </div>
    </div>
  );
}

export default Signup;
