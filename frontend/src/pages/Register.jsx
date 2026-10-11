import React, {
    useState,
    useEffect,
    useCallback
} from "react";

import {
    Link,
    useNavigate
} from "react-router-dom";

import api from "../services/api";


// ======================================================
// LOAD GOOGLE IDENTITY SERVICES
// ======================================================

const loadGoogleScript = () => {

    return new Promise((resolve, reject) => {

        if (
            window.google &&
            window.google.accounts &&
            window.google.accounts.id
        ) {
            resolve();
            return;
        }


        const existingScript =
            document.querySelector(
                'script[src="https://accounts.google.com/gsi/client"]'
            );


        if (existingScript) {

            existingScript.addEventListener(
                "load",
                resolve,
                { once: true }
            );

            existingScript.addEventListener(
                "error",
                reject,
                { once: true }
            );

            return;
        }


        const script =
            document.createElement("script");

        script.src =
            "https://accounts.google.com/gsi/client";

        script.async = true;
        script.defer = true;

        script.onload = resolve;
        script.onerror = reject;

        document.head.appendChild(script);
    });
};


const Register = () => {

    const navigate = useNavigate();


    const [name, setName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [agreeTerms, setAgreeTerms] =
        useState(false);

    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(false);


    // ==================================================
    // GOOGLE SIGN UP
    // ==================================================

    const handleGoogleResponse =
        useCallback(async (response) => {

            try {

                setError("");
                setLoading(true);


                const result =
                    await api.post(
                        "/auth/google",
                        {
                            credential:
                                response.credential
                        }
                    );


                localStorage.setItem(
                    "token",
                    result.data.token
                );


                localStorage.setItem(
                    "user",
                    JSON.stringify(
                        result.data.user
                    )
                );


                navigate("/dashboard");

            } catch (error) {

                console.error(
                    "Google registration error:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                    "Google authentication failed"
                );

            } finally {

                setLoading(false);
            }

        }, [navigate]);


    // ==================================================
    // INITIALIZE GOOGLE BUTTON
    // ==================================================

    useEffect(() => {

        let cancelled = false;


        const initializeGoogle =
            async () => {

                try {

                    await loadGoogleScript();


                    if (cancelled) {
                        return;
                    }


                    const clientId =
                        import.meta.env
                            .VITE_GOOGLE_CLIENT_ID;


                    if (!clientId) {

                        console.error(
                            "VITE_GOOGLE_CLIENT_ID is missing"
                        );

                        return;
                    }


                    window.google.accounts.id.initialize({

                        client_id:
                            clientId,

                        callback:
                            handleGoogleResponse
                    });


                    const button =
                        document.getElementById(
                            "google-signup-button"
                        );


                    if (button) {

                        button.innerHTML = "";


                        window.google.accounts.id
                            .renderButton(
                                button,
                                {
                                    theme: "outline",
                                    size: "large",
                                    width: 400,
                                    text: "signup_with",
                                    shape: "rectangular"
                                }
                            );
                    }

                } catch (error) {

                    console.error(
                        "Google script loading failed:",
                        error
                    );
                }
            };


        initializeGoogle();


        return () => {
            cancelled = true;
        };

    }, [handleGoogleResponse]);


    // ==================================================
    // NORMAL REGISTRATION
    // ==================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");


        // Validation

        if (
            !name ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            setError(
                "Please fill in all fields"
            );

            return;
        }


        if (password.length < 6) {

            setError(
                "Password must contain at least 6 characters"
            );

            return;
        }


        if (password !== confirmPassword) {

            setError(
                "Passwords do not match"
            );

            return;
        }


        if (!agreeTerms) {

            setError(
                "Please accept the terms and conditions"
            );

            return;
        }


        try {

            setLoading(true);


            const result =
                await api.post(
                    "/auth/register",
                    {
                        name,
                        email,
                        password
                    }
                );


            // Save token
            localStorage.setItem(
                "token",
                result.data.token
            );


            // Save user
            localStorage.setItem(
                "user",
                JSON.stringify(
                    result.data.user
                )
            );


            // Go to dashboard
            navigate("/dashboard");

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Registration failed"
            );

        } finally {

            setLoading(false);
        }
    };


    return (

        <div className="auth-page">


            {/* =========================================
                LEFT SIDE
            ========================================= */}

            <div className="auth-hero">

                <div className="auth-hero-content">

                    <div className="brand-logo">
                        X-NIDS
                    </div>


                    <h1>
                        Secure Your Network
                        <br />
                        With Intelligent Detection
                    </h1>


                    <p>
                        Create your X-NIDS account and
                        start analyzing network traffic
                        with explainable AI.
                    </p>


                    <div className="auth-features">


                        <div className="auth-feature">

                            <span>🛡️</span>

                            <div>

                                <strong>
                                    AI-Powered Security
                                </strong>

                                <p>
                                    Detect suspicious and
                                    malicious network activity.
                                </p>

                            </div>

                        </div>


                        <div className="auth-feature">

                            <span>🔍</span>

                            <div>

                                <strong>
                                    Explainable Results
                                </strong>

                                <p>
                                    Understand the reasons
                                    behind every prediction.
                                </p>

                            </div>

                        </div>


                        <div className="auth-feature">

                            <span>📊</span>

                            <div>

                                <strong>
                                    Security Dashboard
                                </strong>

                                <p>
                                    Monitor analyses and
                                    security insights in one place.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            {/* =========================================
                RIGHT SIDE
            ========================================= */}

            <div className="auth-container">

                <div className="auth-card">


                    <div className="auth-card-header">

                        <h2>
                            Create Account
                        </h2>

                        <p>
                            Join X-NIDS and secure your network
                        </p>

                    </div>


                    {/* ERROR */}

                    {error && (

                        <div className="auth-error">
                            {error}
                        </div>

                    )}


                    {/* =================================
                        GOOGLE SIGN UP
                    ================================= */}

                    <div
                        id="google-signup-button"
                        className="google-auth-button"
                    >
                    </div>


                    <div className="auth-divider">

                        <span>
                            OR
                        </span>

                    </div>


                    {/* =================================
                        REGISTRATION FORM
                    ================================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="auth-form"
                    >


                        {/* NAME */}

                        <div className="form-group">

                            <label htmlFor="name">
                                Full Name
                            </label>

                            <input
                                id="name"
                                type="text"
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(event) =>
                                    setName(
                                        event.target.value
                                    )
                                }
                                autoComplete="name"
                            />

                        </div>


                        {/* EMAIL */}

                        <div className="form-group">

                            <label htmlFor="email">
                                Email Address
                            </label>

                            <input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }
                                autoComplete="email"
                            />

                        </div>


                        {/* PASSWORD */}

                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>


                            <div className="password-wrapper">

                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    autoComplete="new-password"
                                />


                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                >
                                    {showPassword
                                        ? "Hide"
                                        : "Show"}
                                </button>

                            </div>

                        </div>


                        {/* CONFIRM PASSWORD */}

                        <div className="form-group">

                            <label htmlFor="confirmPassword">
                                Confirm Password
                            </label>


                            <div className="password-wrapper">

                                <input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(
                                            event.target.value
                                        )
                                    }
                                    autoComplete="new-password"
                                />


                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword
                                        )
                                    }
                                >
                                    {showConfirmPassword
                                        ? "Hide"
                                        : "Show"}
                                </button>

                            </div>

                        </div>


                        {/* TERMS */}

                        <label className="terms-checkbox">

                            <input
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(event) =>
                                    setAgreeTerms(
                                        event.target.checked
                                    )
                                }
                            />

                            <span>
                                I agree to the terms and
                                conditions
                            </span>

                        </label>


                        {/* REGISTER */}

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Creating account..."
                                : "Create Account"}

                        </button>

                    </form>


                    {/* LOGIN */}

                    <div className="auth-footer">

                        <span>
                            Already have an account?
                        </span>

                        <Link to="/login">
                            Sign In
                        </Link>

                    </div>

                </div>

            </div>

        </div>
    );
};


export default Register;