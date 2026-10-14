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

        // Already loaded
        if (
            window.google &&
            window.google.accounts &&
            window.google.accounts.id
        ) {
            resolve();
            return;
        }


        // Script already exists
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


        // Create script
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


const Login = () => {

    const navigate = useNavigate();


    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [rememberMe, setRememberMe] =
        useState(false);

    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(false);


    // ==================================================
    // GOOGLE LOGIN
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


                // Save JWT
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


                navigate("/dashboard");

            } catch (error) {

                console.error(
                    "Google login error:",
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
                            "google-login-button"
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
                                    text: "signin_with",
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
    // NORMAL LOGIN
    // ==================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");


        if (!email || !password) {

            setError(
                "Please enter your email and password"
            );

            return;
        }


        try {

            setLoading(true);


            const result =
                await api.post(
                    "/auth/login",
                    {
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


            // Dashboard
            navigate("/dashboard");

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Login failed"
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
                        AI-Powered Explainable
                        <br />
                        Network Intrusion Detection
                    </h1>


                    <p>
                        Detect threats, understand attacks,
                        and secure your network with
                        explainable artificial intelligence.
                    </p>


                    <div className="auth-features">

                        <div className="auth-feature">

                            <span>🛡️</span>

                            <div>
                                <strong>
                                    Intelligent Detection
                                </strong>

                                <p>
                                    Machine learning based
                                    network threat detection.
                                </p>
                            </div>

                        </div>


                        <div className="auth-feature">

                            <span>🔍</span>

                            <div>
                                <strong>
                                    Explainable AI
                                </strong>

                                <p>
                                    Understand why a network
                                    activity was classified
                                    as malicious.
                                </p>
                            </div>

                        </div>


                        <div className="auth-feature">

                            <span>⚡</span>

                            <div>
                                <strong>
                                    Security Insights
                                </strong>

                                <p>
                                    Get actionable security
                                    recommendations.
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
                            Welcome Back
                        </h2>

                        <p>
                            Sign in to continue to X-NIDS
                        </p>

                    </div>


                    {/* ERROR */}

                    {error && (

                        <div className="auth-error">
                            {error}
                        </div>

                    )}


                    {/* =================================
                        GOOGLE LOGIN
                    ================================= */}

                    <div
                        id="google-login-button"
                        className="google-auth-button"
                    >
                    </div>


                    <div className="auth-divider">

                        <span>
                            OR
                        </span>

                    </div>


                    {/* =================================
                        LOGIN FORM
                    ================================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="auth-form"
                    >


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
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    autoComplete="current-password"
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


                        {/* REMEMBER + FORGOT */}

                        <div className="auth-options">

                            <label className="remember-me">

                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(event) =>
                                        setRememberMe(
                                            event.target.checked
                                        )
                                    }
                                />

                                <span>
                                    Remember me
                                </span>

                            </label>


                            <button
                                type="button"
                                className="forgot-password"
                                onClick={() => {
                                    setError("");
                                    navigate("/forgot-password");
                                }}
                            >
                                Forgot password?
                            </button>

                        </div>


                        {/* LOGIN BUTTON */}

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Signing in..."
                                : "Sign In"}

                        </button>

                    </form>


                    {/* REGISTER */}

                    <div className="auth-footer">

                        <span>
                            Don't have an account?
                        </span>

                        <Link to="/register">
                            Create Account
                        </Link>

                    </div>

                </div>

            </div>

        </div>
    );
};


export default Login;