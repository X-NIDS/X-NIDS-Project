import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "./TrafficPrediction.css";

const defaultFeatures = {
    duration: 0,
    protocol_type: "tcp",
    service: "http",
    flag: "SF",
    src_bytes: 100,
    dst_bytes: 5000,
    land: 0,
    wrong_fragment: 0,
    urgent: 0,
    hot: 0,
    num_failed_logins: 0,
    logged_in: 1,
    num_compromised: 0,
    root_shell: 0,
    su_attempted: 0,
    num_root: 0,
    num_file_creations: 0,
    num_shells: 0,
    num_access_files: 0,
    num_outbound_cmds: 0,
    is_host_login: 0,
    is_guest_login: 0,
    count: 5,
    srv_count: 5,
    serror_rate: 0,
    srv_serror_rate: 0,
    rerror_rate: 0,
    srv_rerror_rate: 0,
    same_srv_rate: 1,
    diff_srv_rate: 0,
    srv_diff_host_rate: 0,
    dst_host_count: 100,
    dst_host_srv_count: 80,
    dst_host_same_srv_rate: 0.8,
    dst_host_diff_srv_rate: 0.1,
    dst_host_same_src_port_rate: 0.5,
    dst_host_srv_diff_host_rate: 0.1,
    dst_host_serror_rate: 0,
    dst_host_srv_serror_rate: 0,
    dst_host_rerror_rate: 0,
    dst_host_srv_rerror_rate: 0
};

const attackFeatures = {
    ...defaultFeatures,
    protocol_type: "tcp",
    service: "private",
    flag: "S0",
    src_bytes: 0,
    dst_bytes: 0,
    logged_in: 0,
    count: 200,
    srv_count: 200,
    serror_rate: 1,
    srv_serror_rate: 1,
    same_srv_rate: 0.01,
    diff_srv_rate: 0.99,
    dst_host_count: 255,
    dst_host_srv_count: 1,
    dst_host_same_srv_rate: 0.01,
    dst_host_serror_rate: 1,
    dst_host_srv_serror_rate: 1
};

const numericFields = Object.keys(defaultFeatures).filter(
    (key) =>
        !["protocol_type", "service", "flag"].includes(key)
);

const TrafficPrediction = () => {
    const [features, setFeatures] = useState(defaultFeatures);
    const [mode, setMode] = useState("normal");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const selectPreset = (preset) => {
        setMode(preset);
        setResult(null);
        setError("");

        if (preset === "normal") {
            setFeatures({ ...defaultFeatures });
        } else if (preset === "attack") {
            setFeatures({ ...attackFeatures });
        } else {
            setFeatures({ ...defaultFeatures });
        }
    };

    const updateFeature = (key, value) => {
        setFeatures((previous) => ({
            ...previous,
            [key]: value
        }));

        setMode("custom");
        setResult(null);
        setError("");
    };

    const handlePredict = async (event) => {
        event.preventDefault();
        setLoading(true);
        setResult(null);
        setError("");

        try {
            const response = await api.post(
                "/analysis/predict",
                { features }
            );

            setResult(response.data);
        } catch (err) {
            if (err.response?.status === 401) {
                setError(
                    "Your session may have expired. Please log in again."
                );
            } else {
                setError(
                    err.response?.data?.message ||
                    "Prediction failed. Check that the backend and ML service are running."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const prediction = String(
        result?.prediction ?? ""
    ).toLowerCase();

    const isAttack = prediction === "attack";

    return (
        <div className="app">
            <Navbar />

            <main className="prediction-page">
                <div className="prediction-header">
                    <div>
                        <p className="eyebrow">
                            INTELLIGENT THREAT DETECTION
                        </p>
                        <h1>Traffic Prediction</h1>
                        <p className="page-description">
                            Evaluate a network traffic record using
                            the trained Random Forest classifier.
                        </p>
                    </div>

                    <Link
                        to="/dashboard"
                        className="back-link"
                    >
                        ← Dashboard
                    </Link>
                </div>

                <section className="prediction-card">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">TEST CONFIGURATION</p>
                            <h2>Select a test scenario</h2>
                            <p>
                                Presets are illustrative inputs.
                                The model determines the actual result.
                            </p>
                        </div>
                    </div>

                    <div className="preset-grid">
                        <button
                            type="button"
                            className={`preset-btn ${
                                mode === "normal" ? "active" : ""
                            }`}
                            onClick={() => selectPreset("normal")}
                        >
                            <span>✓</span>
                            <strong>Normal sample</strong>
                            <small>Typical HTTP traffic</small>
                        </button>

                        <button
                            type="button"
                            className={`preset-btn ${
                                mode === "attack" ? "active" : ""
                            }`}
                            onClick={() => selectPreset("attack")}
                        >
                            <span>!</span>
                            <strong>Attack-like sample</strong>
                            <small>High connection-error rates</small>
                        </button>

                        <button
                            type="button"
                            className={`preset-btn ${
                                mode === "custom" ? "active" : ""
                            }`}
                            onClick={() => selectPreset("custom")}
                        >
                            <span>⚙</span>
                            <strong>Custom input</strong>
                            <small>Edit traffic features</small>
                        </button>
                    </div>

                    <form onSubmit={handlePredict}>
                        <div className="section-heading feature-heading">
                            <div>
                                <p className="eyebrow">NETWORK FEATURES</p>
                                <h2>Traffic record</h2>
                                <p>
                                    Numeric values can be edited.
                                    Categorical features use the selectors.
                                </p>
                            </div>
                            <span className="feature-count">
                                {Object.keys(features).length} features
                            </span>
                        </div>

                        <div className="feature-grid">
                            {Object.entries(features).map(
                                ([key, value]) => (
                                    <label
                                        className="feature-field"
                                        key={key}
                                    >
                                        <span>{key}</span>

                                        {[
                                            "protocol_type",
                                            "service",
                                            "flag"
                                        ].includes(key) ? (
                                            <input
                                                type="text"
                                                value={value}
                                                required
                                                onChange={(event) =>
                                                    updateFeature(
                                                        key,
                                                        event.target.value.trim()
                                                    )
                                                }
                                            />
                                        ) : (
                                            <input
                                                type="number"
                                                step="any"
                                                value={value}
                                                required
                                                onChange={(event) =>
                                                    updateFeature(
                                                        key,
                                                        event.target.value === ""
                                                            ? ""
                                                            : Number(event.target.value)
                                                    )
                                                }
                                            />
                                        )}
                                    </label>
                                )
                            )}
                        </div>

                        <button
                            type="submit"
                            className="primary-btn predict-btn"
                            disabled={loading}
                        >
                            {loading
                                ? "Analyzing traffic..."
                                : "Run Traffic Prediction"}
                        </button>
                    </form>
                </section>

                {error && (
                    <div className="prediction-error" role="alert">
                        {error}
                    </div>
                )}

                {result && (
                    <section className="prediction-result">
                        <p className="eyebrow">MODEL OUTPUT</p>
                        <h2>Prediction Result</h2>

                        <div
                            className={`result-banner ${
                                isAttack ? "attack" : "normal"
                            }`}
                        >
                            <span className="result-symbol">
                                {isAttack ? "!" : "✓"}
                            </span>
                            <div>
                                <small>Classification</small>
                                <h3>{result.prediction}</h3>
                            </div>
                        </div>

                        <div className="result-metrics">
                            <div className="result-metric">
                                <span>Attack probability</span>
                                <strong>
                                    {typeof result.attack_probability === "number"
                                        ? `${(
                                            result.attack_probability * 100
                                        ).toFixed(2)}%`
                                        : String(
                                            result.attack_probability ?? "N/A"
                                        )}
                                </strong>
                            </div>

                            <div className="result-metric">
                                <span>Decision threshold</span>
                                <strong>
                                    {result.threshold ?? "N/A"}
                                </strong>
                            </div>

                            <div className="result-metric">
                                <span>Model</span>
                                <strong>
                                    {result.model ?? "N/A"}
                                </strong>
                            </div>
                        </div>

                        <p className="result-disclaimer">
                            This is a model prediction, not a guarantee
                            that traffic is safe or malicious.
                        </p>
                    </section>
                )}
            </main>
        </div>
    );
};

export default TrafficPrediction;