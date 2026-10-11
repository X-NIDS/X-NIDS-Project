
from pathlib import Path

import joblib
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)

BASE_DIR = Path(__file__).resolve().parent

DATA_FILE = (
    BASE_DIR.parent / "datasets" / "NSL-KDD" / "KDDTest+.txt"
)
MODEL_FILE = BASE_DIR / "models" / "random_forest.joblib"

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


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Test dataset not found: {DATA_FILE}")

    if not MODEL_FILE.exists():
        raise FileNotFoundError(f"Trained model not found: {MODEL_FILE}")

    print("Loading saved Random Forest pipeline...")
    model = joblib.load(MODEL_FILE)

    print("Loading independent NSL-KDD test dataset...")
    df = pd.read_csv(DATA_FILE, header=None, names=COLUMNS)

    y_test = (df["label"] != "normal").astype(int)
    X_test = df.drop(columns=["label", "difficulty"])

    print(f"\nTest records: {len(df):,}")
    print(f"Normal records: {(y_test == 0).sum():,}")
    print(f"Attack records: {(y_test == 1).sum():,}")

    print("\nGenerating predictions...")
    probabilities = model.predict_proba(X_test)[:, 1]

    for threshold in [0.50, 0.40]:
        predictions = (probabilities >= threshold).astype(int)

        print(f"\n========== THRESHOLD {threshold:.2f} ==========")
        print(f"Accuracy: {accuracy_score(y_test, predictions):.4f}")
        print(f"ROC-AUC:  {roc_auc_score(y_test, probabilities):.4f}")

        print("\nClassification report:")
        print(
            classification_report(
                y_test,
                predictions,
                labels=[0, 1],
                target_names=["Normal", "Attack"],
                zero_division=0,
            )
        )

        print("Confusion matrix (rows=true, columns=predicted):")
        print(confusion_matrix(y_test, predictions, labels=[0, 1]))

    print("\nEvaluation completed successfully!")


if __name__ == "__main__":
    main()
