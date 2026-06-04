# AirMS Flask Conversion

This folder now supports a React frontend paired with a Flask backend. React lives in `client-web/`, while Flask serves the API and uploaded files.

## Structure

- `run.py`: canonical Flask application entrypoint
- `app.py`: Flask app factory and API wiring
- `routes/`: Python API routes
- `client-web/`: React app
- `templates/`: only needed for Flask-rendered pages; not required for a pure React UI
- `static/`: assets used by Flask-rendered pages and uploads

## Run

### Backend

```bash
cd airms-flask
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python run.py
```

By default the Flask backend runs at: `http://127.0.0.1:5000`

### Frontend

```bash
cd airms-flask/client-web
npm install
npm run dev
```

React runs at `http://127.0.0.1:5173` and proxies `/api` and `/uploads` to Flask.

### Production

Build the React app with `npm run build` inside `client-web/`, then serve `client-web/dist` from Flask if you want a single deployed app.
