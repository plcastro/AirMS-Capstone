# AirMS Flask (Python Replica)

This folder is a Python/Flask replica layout of the existing AirMS `client-web` + `server` setup.

## Structure

- `server/`: Flask backend and HTML template rendering
- `client-web/static/`: Static frontend assets (CSS, JS, images)

## Run

```bash
cd airms-flask
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python server/app.py
```

App runs at: `http://127.0.0.1:5000`
