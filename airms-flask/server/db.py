import os
from functools import lru_cache
from pathlib import Path

import certifi
from pymongo import MongoClient
from dotenv import load_dotenv


def _load_env_files():
    # 1) airms-flask/.env
    flask_root = Path(__file__).resolve().parents[1]
    load_dotenv(flask_root / ".env", override=False)
    load_dotenv(flask_root / ".env.local", override=False)

    # 2) existing Node server env for shared credentials
    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / "server" / ".env", override=False)


@lru_cache(maxsize=1)
def get_db():
    _load_env_files()
    mongo_uri = (
        os.getenv("ATLAS_URL") 
        or os.getenv("MONGO_URI")
        or os.getenv("MONGODB_URI")
        or "mongodb://127.0.0.1:27017/airms"
    )
    db_name = (
        os.getenv("MONGO_DB_NAME")
        or os.getenv("DB_NAME")
        or os.getenv("MONGODB_DB")
        or "test"
    )
    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=8000,
        tlsCAFile=certifi.where(),
    )
    return client[db_name]
