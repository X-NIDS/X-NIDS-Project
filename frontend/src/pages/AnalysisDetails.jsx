import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

const AnalysisDetails = () => {

    const { id } = useParams();

    const [analysis, setAnalysis] = useState(null);
    const [predictions, setPredictions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        const fetchAnalysis = async () => {

            try {

                const response = await api.get(
                    `/analysis/${id}`
                );

                setAnalysis(
                    response.data.analysis
                );

                setPredictions(
                    response.data.predictions || []
                );

            } catch (error) {

                setError(
                    error.response?.data?.message ||
                    "Unable to load analysis."
                );

            } finally {

                setLoading(false);

            }
        };

        fetchAnalysis();

    }, [id]);

    if (loading) {

        return (
            <div className="app">

                <Navbar />

                <main className="dashboard">

                    <div className="loading">
                        Loading analysis...
                    </div>

                </main>

            </div>
        );
    }

    if (error) {

        return (
            <div className="app">

                <Navbar />

                <main className="dashboard">

                    <div className="error-message">
                        {error}
                    </div>

                    <Link
                        to="/dashboard"
                        className="back-link"
                    >
                        ← Back to Dashboard
                    </Link>

                </main>

            </div>
        );
    }

    const attackPercentage =
        analysis.total_records > 0
            ? (
                (analysis.attack_count /
                    analysis.total_records) *
                100
            ).toFixed(2)
            : 0;

    return (
        <div className="app">

            <Navbar />

            <main className="dashboard">

                <div className="details-top">

                    <div>

                        <Link
                            to="/dashboard"
                            className="back-link"
                        >
                            ← Back to Dashboard
                        </Link>

                        <p className="eyebrow">
                            ANALYSIS #{analysis.id}
                        </p>

                        <h1>
                            Analysis Results
                        </h1>

                        <p className="page-description">
                            {analysis.filename}
                        </p>

                    </div>

                </div>

                <div className="result-stats">

                    <div className="result-card">

                        <span>
                            Total Records
                        </span>

                        <strong>
                            {analysis.total_records}
                        </strong>

                    </div>

                    <div className="result-card normal-result">

                        <span>
                            Normal Traffic
                        </span>

                        <strong>
                            {analysis.normal_count}
                        </strong>

                    </div>

                    <div className="result-card attack-result">

                        <span>
                            Attack Traffic
                        </span>

                        <strong>
                            {analysis.attack_count}
                        </strong>

                    </div>

                    <div className="result-card">

                        <span>
                            Attack Rate
                        </span>

                        <strong>
                            {attackPercentage}%
                        </strong>

                    </div>

                </div>

                <section className="history-card">

                    <div className="section-heading">

                        <div>

                            <p className="eyebrow">
                                PREDICTION RESULTS
                            </p>

                            <h2>
                                Network Traffic Predictions
                            </h2>

                        </div>

                    </div>

                    {predictions.length === 0 ? (

                        <div className="empty-state">

                            <h3>
                                No prediction details available
                            </h3>

                        </div>

                    ) : (

                        <div className="table-container">

                            <table>

                                <thead>

                                    <tr>

                                        <th>
                                            Record
                                        </th>

                                        <th>
                                            Prediction
                                        </th>

                                        <th>
                                            Attack Type
                                        </th>

                                        <th>
                                            Confidence
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {predictions.map(
                                        (prediction, index) => {

                                            const isAttack =
                                                prediction.prediction
                                                    ?.toLowerCase()
                                                    .includes(
                                                        "attack"
                                                    ) ||
                                                prediction.prediction
                                                    ?.toLowerCase()
                                                    .includes(
                                                        "malicious"
                                                    );

                                            return (

                                                <tr
                                                    key={index}
                                                >

                                                    <td>
                                                        {
                                                            prediction.record_number
                                                        }
                                                    </td>

                                                    <td>

                                                        <span
                                                            className={
                                                                isAttack
                                                                    ? "prediction-badge attack-badge"
                                                                    : "prediction-badge normal-badge"
                                                            }
                                                        >
                                                            {
                                                                prediction.prediction
                                                            }
                                                        </span>

                                                    </td>

                                                    <td>
                                                        {
                                                            prediction.attack_type ||
                                                            "-"
                                                        }
                                                    </td>

                                                    <td>

                                                        {prediction.confidence
                                                            ? `${(
                                                                Number(
                                                                    prediction.confidence
                                                                ) *
                                                                100
                                                            ).toFixed(2)}%`
                                                            : "-"}

                                                    </td>

                                                </tr>

                                            );
                                        }
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

export default AnalysisDetails;