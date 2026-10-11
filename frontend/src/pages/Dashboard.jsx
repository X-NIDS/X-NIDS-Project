import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

const Dashboard = () => {

    const navigate = useNavigate();

    const [analyses, setAnalyses] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const loadHistory = async () => {

        try {

            setLoading(true);

            const response = await api.get(
                "/analysis/history"
            );

            setAnalyses(
                response.data.analyses || []
            );

        } catch (error) {

            setError(
                error.response?.data?.message ||
                "Unable to load analysis history."
            );

        } finally {

            setLoading(false);

        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const handleFileChange = (e) => {

        const file = e.target.files[0];

        setMessage("");
        setError("");

        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {

            setSelectedFile(null);

            setError(
                "Please select a CSV file."
            );

            return;
        }

        setSelectedFile(file);
    };

    const handleUpload = async () => {

        if (!selectedFile) {

            setError(
                "Please select a CSV file first."
            );

            return;
        }

        setUploading(true);
        setError("");
        setMessage("");

        const formData = new FormData();

        formData.append(
            "file",
            selectedFile
        );

        try {

            const response = await api.post(
                "/analysis/upload",
                formData,
                {
                    headers: {
                        "Content-Type":
                            "multipart/form-data"
                    }
                }
            );

            setMessage(
                "Network traffic analysis completed successfully."
            );

            setSelectedFile(null);

            document.getElementById(
                "csvInput"
            ).value = "";

            await loadHistory();

            if (response.data.analysis_id) {

                navigate(
                    `/analysis/${response.data.analysis_id}`
                );

            }

        } catch (error) {

            setError(
                error.response?.data?.message ||
                "Analysis failed. Make sure the ML service is running."
            );

        } finally {

            setUploading(false);

        }
    };

    const totalRecords = analyses.reduce(
        (sum, item) =>
            sum + Number(item.total_records || 0),
        0
    );

    const normalRecords = analyses.reduce(
        (sum, item) =>
            sum + Number(item.normal_count || 0),
        0
    );

    const attackRecords = analyses.reduce(
        (sum, item) =>
            sum + Number(item.attack_count || 0),
        0
    );

    return (
        <div className="app">

            <Navbar />

            <main className="dashboard">

                <div className="dashboard-header">

                    <div>
                        <p className="eyebrow">
                            SECURITY MONITORING
                        </p>

                        <h1>
                            X-NIDS Dashboard
                        </h1>

                        <p className="page-description">
                            Analyze network traffic and
                            identify potentially malicious activity.
                        </p>
                    </div>

                    <div className="status-badge">
                        <span></span>
                        System Online
                    </div>

                </div>

                {/* Statistics */}

                <div className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon">
                            ◈
                        </div>

                        <div>
                            <p>
                                Total Records
                            </p>

                            <h2>
                                {totalRecords}
                            </h2>
                        </div>

                    </div>

                    <div className="stat-card normal">

                        <div className="stat-icon">
                            ✓
                        </div>

                        <div>
                            <p>
                                Normal Traffic
                            </p>

                            <h2>
                                {normalRecords}
                            </h2>
                        </div>

                    </div>

                    <div className="stat-card attack">

                        <div className="stat-icon">
                            !
                        </div>

                        <div>
                            <p>
                                Detected Attacks
                            </p>

                            <h2>
                                {attackRecords}
                            </h2>

                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon">
                            #
                        </div>

                        <div>
                            <p>
                                Analyses
                            </p>

                            <h2>
                                {analyses.length}
                            </h2>
                        </div>

                    </div>

                </div>

                {/* Upload */}

                <section className="upload-card">

                    <div className="section-heading">

                        <div>

                            <p className="eyebrow">
                                TRAFFIC ANALYSIS
                            </p>

                            <h2>
                                Upload Network Traffic
                            </h2>

                            <p>
                                Upload a CSV dataset for
                                machine learning based analysis.
                            </p>

                        </div>

                        <div className="upload-icon">
                            ↑
                        </div>

                    </div>

                    <div className="upload-area">

                        <input
                            id="csvInput"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                        />

                        <label
                            htmlFor="csvInput"
                            className="file-label"
                        >
                            <div className="upload-symbol">
                                ↑
                            </div>

                            <strong>
                                Choose CSV file
                            </strong>

                            <span>
                                Network traffic dataset
                            </span>
                        </label>

                        {selectedFile && (

                            <div className="selected-file">

                                <span>
                                    {selectedFile.name}
                                </span>

                                <small>
                                    {(
                                        selectedFile.size /
                                        1024
                                    ).toFixed(1)} KB
                                </small>

                            </div>

                        )}

                    </div>

                    {message && (
                        <div className="success-message">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        className="primary-btn upload-btn"
                        onClick={handleUpload}
                        disabled={
                            uploading ||
                            !selectedFile
                        }
                    >
                        {uploading
                            ? "Analyzing Traffic..."
                            : "Analyze Network Traffic"}
                    </button>

                </section>

                {/* History */}

                <section className="history-card">

                    <div className="section-heading">

                        <div>

                            <p className="eyebrow">
                                ANALYSIS HISTORY
                            </p>

                            <h2>
                                Recent Analyses
                            </h2>

                        </div>

                    </div>

                    {loading ? (

                        <div className="loading">
                            Loading analysis history...
                        </div>

                    ) : analyses.length === 0 ? (

                        <div className="empty-state">

                            <div className="empty-icon">
                                ◇
                            </div>

                            <h3>
                                No analyses yet
                            </h3>

                            <p>
                                Upload a network traffic
                                CSV file to begin your first analysis.
                            </p>

                        </div>

                    ) : (

                        <div className="table-container">

                            <table>

                                <thead>

                                    <tr>
                                        <th>ID</th>
                                        <th>File</th>
                                        <th>Total</th>
                                        <th>Normal</th>
                                        <th>Attacks</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {analyses.map(
                                        (analysis) => (

                                            <tr
                                                key={
                                                    analysis.id
                                                }
                                            >

                                                <td>
                                                    #
                                                    {
                                                        analysis.id
                                                    }
                                                </td>

                                                <td className="filename">
                                                    {
                                                        analysis.filename
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        analysis.total_records
                                                    }
                                                </td>

                                                <td className="normal-text">
                                                    {
                                                        analysis.normal_count
                                                    }
                                                </td>

                                                <td className="attack-text">
                                                    {
                                                        analysis.attack_count
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        new Date(
                                                            analysis.created_at
                                                        ).toLocaleString()
                                                    }
                                                </td>

                                                <td>

                                                    <Link
                                                        to={`/analysis/${analysis.id}`}
                                                        className="view-btn"
                                                    >
                                                        View
                                                    </Link>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </section>

            </main>

        </div>
    );
};

export default Dashboard;