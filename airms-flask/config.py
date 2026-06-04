import os


class Config:
    APP_NAME = "AirMS Flask API"
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "dev-jwt-secret")
    MONGO_URI = os.getenv("ATLAS_URL") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "airms")
    JWT_ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
    JWT_REFRESH_TOKEN_EXPIRES_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", "7"))
    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081,http://localhost:8000,http://127.0.0.1:8000",
        ).split(",")
        if o.strip()
    ]
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    PORT = int(os.getenv("PORT", "5173"))
