
from pathlib import Path

import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = (
    BASE_DIR.parent / "datasets" / "NSL-KDD" / "KDDTrain+.txt"
)

COLUMNS = [
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
    "dst_host_srv_rerror_rate", "label", "difficulty"
]

CATEGORICAL = ["protocol_type", "service", "flag"]


def main():
    df = pd.read_csv(DATA_FILE, header=None, names=COLUMNS)
    X = df.drop(columns=["label", "difficulty"])
    y = (df["label"] != "normal").astype(int)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    numeric = [c for c in X.columns if c not in CATEGORICAL]

    preprocess = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
        ("num", "passthrough", numeric),
    ])

    model = Pipeline([
        ("preprocessor", preprocess),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    print("Training temporary model on training split...")
    model.fit(X_train, y_train)

    probabilities = model.predict_proba(X_val)[:, 1]

    print("\nValidation results by threshold")
    print("Threshold | Accuracy | Attack precision | Attack recall | Attack F1")

    for threshold in [0.20, 0.30, 0.40, 0.50, 0.60, 0.70]:
        predictions = (probabilities >= threshold).astype(int)

        print(
            f"{threshold:8.2f} | "
            f"{accuracy_score(y_val, predictions):8.4f} | "
            f"{precision_score(y_val, predictions, zero_division=0):16.4f} | "
            f"{recall_score(y_val, predictions, zero_division=0):13.4f} | "
            f"{f1_score(y_val, predictions, zero_division=0):8.4f}"
        )

    # Illustrate the confusion matrix at the default threshold.
    default_predictions = (probabilities >= 0.50).astype(int)
    print("\nConfusion matrix at threshold 0.50:")
    print(confusion_matrix(y_val, default_predictions, labels=[0, 1]))

    print("\nThreshold tuning complete.")
    print("KDDTest+ was not used to select the threshold.")


if __name__ == "__main__":
    main()
