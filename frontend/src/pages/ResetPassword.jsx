import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const ResetPassword = () => {
const [searchParams] = useSearchParams();
const token = searchParams.get("token");

const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
        setError("The reset link is invalid or missing.");
        return;
    }

    if (password.length < 8 || password.length > 128) {
        setError("Password must contain 8–128 characters.");
        return;
    }

    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }

    setLoading(true);

    try {
        const response = await api.post(
            "/auth/reset-password",
            { token, password }
        );

        setMessage(response.data.message);
        setPassword("");
        setConfirmPassword("");
    } catch (err) {
        setError(
            err.response?.data?.message ||
            "Unable to reset your password."
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
                    <h2>Reset Password</h2>
                    <p>Choose a new password for your account.</p>
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

                {token ? (
                    <form
                        className="auth-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="form-group">
                            <label htmlFor="new-password">
                                New Password
                            </label>
                            <input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                autoComplete="new-password"
                                minLength={8}
                                maxLength={128}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm-password">
                                Confirm Password
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                autoComplete="new-password"
                                minLength={8}
                                maxLength={128}
                                required
                            />
                        </div>

                        <button
                            className="auth-submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Resetting..."
                                : "Reset Password"}
                        </button>
                    </form>
                ) : null}

                <div className="auth-footer">
                    <Link to="/login">Back to Sign In</Link>
                </div>
            </div>
        </div>
    </div>
);

};

export default ResetPassword;