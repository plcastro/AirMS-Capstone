from pathlib import Path
from uuid import uuid4

from flask import current_app


def save_upload(file_storage):
    folder = Path(current_app.root_path) / current_app.config["UPLOAD_FOLDER"]
    folder.mkdir(parents=True, exist_ok=True)
    suffix = Path(file_storage.filename).suffix
    filename = f"{uuid4().hex}{suffix}"
    file_path = folder / filename
    file_storage.save(file_path)
    return filename, str(file_path)
