import os
from pathlib import Path

CURR_DIR = Path(__file__).parent.parent.resolve()
CONFIG_DIR = CURR_DIR / "config"
CONFIG_PATH = CONFIG_DIR / "config.toml"


def load_config():
    if not CONFIG_PATH.exists():
        return {}

    try:
        import tomllib
        with open(CONFIG_PATH, "rb") as f:
            return tomllib.load(f)
    except Exception:
        config = {}
        current_section = None
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("[") and line.endswith("]"):
                    current_section = line[1:-1].strip()
                    config[current_section] = {}
                elif "=" in line and current_section:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    config[current_section][k] = v
        return config


def get_database_url():
    config = load_config()
    db_config = config.get("database", {})
    url = db_config.get("url") or os.environ.get("DATABASE_URL")
    if not url:
        raise ValueError("Database URL is not configured. Set [database].url in ui/config/config.toml or DATABASE_URL.")
    return url


def get_r2_config():
    config = load_config()
    r2_config = config.get("r2", {})
    return {
        "account_id": r2_config.get("account_id") or os.environ.get("R2_ACCOUNT_ID") or "",
        "access_key_id": r2_config.get("access_key_id") or os.environ.get("R2_ACCESS_KEY_ID") or "",
        "secret_access_key": r2_config.get("secret_access_key") or os.environ.get("R2_SECRET_ACCESS_KEY") or "",
        "bucket_name": r2_config.get("bucket_name") or os.environ.get("R2_BUCKET_NAME") or "",
        "public_url": r2_config.get("public_url") or os.environ.get("R2_PUBLIC_URL") or "",
    }
