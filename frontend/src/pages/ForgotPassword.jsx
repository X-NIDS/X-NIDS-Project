import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const ForgotPassword = () => {
const [email, setEmail] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
        const response = await api.post(
            "/auth/forgot-password",
            { email }
        );

        setMessage(response.data.message);
    } catch (err) {
        setError(
            err.response?.data?.message ||
            "Unable to process your request. Please try again."
        );
    } finally {
        setLoading(false);
    }
};

return (
    <div className="auth-page">
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-card-header">
                    <h2>Forgot Password?</h2>
                    <p>
                        Enter your registered email to request
                        a password reset link.
                    </p>
                </div>

                {message && (
                    <div className="auth-success">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                >
                    <div className="form-group">
                        <label htmlFor="reset-email">
                            Email Address
                        </label>

                        <input
                            id="reset-email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <button
                        className="auth-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Sending..."
                            : "Send Reset Link"}
                    </button>
                </form>

                <div className="auth-footer">
                    <Link to="/login">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    </div>
);

};

export default ForgotPassword;