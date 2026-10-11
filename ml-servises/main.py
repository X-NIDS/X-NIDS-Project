from pathlib import Path
from typing import Any
import io

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_FILE = BASE_DIR / "models" / "random_forest.joblib"

THRESHOLD = 0.40

FEATURE_COLUMNS = [
    "duration", "protocol_type", "service", "flag",
    "src_bytes", "dst_bytes", "land", "wrong_fragment",
    "urgent", "hot", "num_failed_logins", "logged_in",
    "num_compromised", "root_shell", "su_attempted",
    "num_root", "num_file_creations", "num_shells",
    "num_access_files", "num_outbound_cmds",
    "is_host_login", "is_guest_login", "count",
    "srv_count", "serror_rate", "srv_serror_rate",
    "rerror_rate", "srv_rerror_rate", "same_srv_rate",
    "diff_srv_rate", "srv_diff_host_rate", "dst_host_count",
    "dst_host_srv_count", "dst_host_same_srv_rate",
    "dst_host_diff_srv_rate", "dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate", "dst_host_serror_rate",
    "dst_host_srv_serror_rate", "dst_host_rerror_rate",
    "dst_host_srv_rerror_rate",
]

# NSL-KDD contains 41 features, followed by label and difficulty.
NSL_KDD_COLUMNS = FEATURE_COLUMNS + ["label", "difficulty"]


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="X-NIDS ML Service",
    description=(
        "Network intrusion detection using a trained "
        "Random Forest model."
    ),
    version="1.0.0",
)

model = None


class PredictionRequest(BaseModel):
    features: dict[str, Any]


# ============================================================
# MODEL LOADING
# ============================================================

@app.on_event("startup")
def load_model():
    global model

    if not MODEL_FILE.exists():
        raise RuntimeError(
            f"Model file not found: {MODEL_FILE}"
        )

    model = joblib.load(MODEL_FILE)

    print("X-NIDS Random Forest model loaded successfully.")


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "service": "X-NIDS ML Service",
        "status": "running",
        "model": "Random Forest",
        "endpoints": [
            "/",
            "/health",
            "/predict",
            "/predict-csv",
        ],
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
    }


# ============================================================
# HELPER: PREDICT A DATAFRAME
# ============================================================

def predict_dataframe(X: pd.DataFrame) -> list[dict]:
    """
    Predict normal/attack labels for a DataFrame containing
    the 41 expected network traffic features.
    """

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded.",
        )

    if X.empty:
        raise HTTPException(
            status_code=400,
            detail="No traffic records were provided.",
        )

    missing = [
        column for column in FEATURE_COLUMNS
        if column not in X.columns
    ]

    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Required features are missing.",
                "missing_features": missing,
            },
        )

    X = X[FEATURE_COLUMNS].copy()

    # Use the same prediction logic as /predict.
    probabilities = model.predict_proba(X)[:, 1]

    results = []

    for index, probability in enumerate(probabilities, start=1):
        probability = float(probability)
        is_attack = probability >= THRESHOLD

        results.append({
            "record_number": index,
            "prediction": (
                "attack" if is_attack else "normal"
            ),
            "attack_probability": round(probability, 4),
            "threshold": THRESHOLD,
        })

    return results


# ============================================================
# INDIVIDUAL TRAFFIC PREDICTION
# ============================================================

@app.post("/predict")
def predict(request: PredictionRequest):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded.",
        )

    missing = [
        column for column in FEATURE_COLUMNS
        if column not in request.features
    ]

    if missing:
        raise HTTPException(
            status_code=422,
            detail={"missing_features": missing},
        )

    try:
        row = {
            column: request.features[column]
            for column in FEATURE_COLUMNS
        }

        X = pd.DataFrame(
            [row],
            columns=FEATURE_COLUMNS,
        )

        results = predict_dataframe(X)
        result = results[0]

        return {
            "prediction": result["prediction"],
            "attack_probability": result["attack_probability"],
            "threshold": THRESHOLD,
            "model": "Random Forest",
        }

    except HTTPException:
        raise
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid feature values: {exc}",
        ) from exc


# ============================================================
# CSV HEADER DETECTION AND LOADING
# ============================================================

def load_traffic_csv(contents: bytes) -> pd.DataFrame:
    """
    Supports:
    1. Header-based CSV containing the 41 feature columns.
    2. Headerless NSL-KDD CSV with 41, 42, or 43 columns.
    """

    try:
        # First try reading the file with a header.
        df = pd.read_csv(io.BytesIO(contents))
        df.columns = [
            str(column).strip()
            for column in df.columns
        ]

        if set(FEATURE_COLUMNS).issubset(set(df.columns)):
            return df

        # If required columns are absent, try as a headerless CSV.
        raw_df = pd.read_csv(
            io.BytesIO(contents),
            header=None,
        )

        if raw_df.shape[1] == 43:
            raw_df.columns = NSL_KDD_COLUMNS

        elif raw_df.shape[1] == 42:
            raw_df.columns = FEATURE_COLUMNS + ["label"]

        elif raw_df.shape[1] == 41:
            raw_df.columns = FEATURE_COLUMNS

        else:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Unsupported CSV format. Expected 41 traffic "
                    "features, optionally followed by label and "
                    "difficulty columns."
                ),
            )

        return raw_df

    except HTTPException:
        raise
    except (ValueError, pd.errors.ParserError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not read CSV file: {exc}",
        ) from exc


# ============================================================
# BATCH CSV PREDICTION
# ============================================================

@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):
    """
    Accept a CSV upload and predict normal/attack traffic.

    Returns:
        total_records
        normal_count
        attack_count
        attack_rate
        predictions
        model
        threshold
    """

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded.",
        )

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty.",
            )

        df = load_traffic_csv(contents)

        missing = [
            column for column in FEATURE_COLUMNS
            if column not in df.columns
        ]

        if missing:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Required traffic features are missing.",
                    "missing_features": missing,
                },
            )

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The CSV contains no traffic records.",
            )

        # Select only the model's 41 input features.
        X = df[FEATURE_COLUMNS].copy()

        # Run batch predictions.
        predictions = predict_dataframe(X)

        total_records = len(predictions)

        attack_count = sum(
            item["prediction"] == "attack"
            for item in predictions
        )

        normal_count = total_records - attack_count

        attack_rate = round(
            (attack_count / total_records) * 100,
            2,
        )

        return {
            "total_records": total_records,
            "normal_count": normal_count,
            "attack_count": attack_count,
            "attack_rate": attack_rate,
            "predictions": predictions,
            "model": "Random Forest",
            "threshold": THRESHOLD,
        }

    except HTTPException:
        raise
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid CSV feature values: {exc}",
        ) from exc
    except Exception as exc:
        print(f"CSV prediction error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during CSV prediction.",
        ) from exc
    finally:
        await file.close()