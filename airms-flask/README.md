# AirMS Flask Conversion

This folder is the Flask/Jinja conversion of the AirMS web client. It serves Flask-rendered pages under `/web/...` and uses Python/Flask API routes for the CRUD workflows.

## Structure

- `app.py` / `run.py`: canonical Flask application entrypoint
- `routes/`: Python API routes used by the Flask web pages
- `templates/`: Flask/Jinja pages converted from the React client-web routes
- `static/`: CSS and browser JavaScript used by the Flask pages

The older `server/`, `django_airms/`, and nested `client-web/` folders are legacy migration artifacts and are not the canonical run path.

## Run

```bash
cd airms-flask
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python run.py
```

By default the app runs at: `http://127.0.0.1:5173`

Open the Flask web app at: `http://127.0.0.1:5173/web/login`
