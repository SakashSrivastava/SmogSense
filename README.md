# SmogSense

SmogSense is an air-quality forecasting and visualization project focused on PM2.5 for Delhi. It provides a small ML pipeline (training + saved model), a FastAPI backend that serves predictions, and a static frontend (HTML/CSS/JS + Leaflet) to visualize current conditions and a 7-day forecast.

Key features
- Train a RandomForest model to predict next-day PM2.5 using recent measurements and rolling averages.
- FastAPI endpoint (/predict) that returns current PM2.5, AQI category and a 7-day forecast generated iteratively from the model.
- Static frontend (frontend/) with an interactive map, station markers (frontend/stations.json) and forecast cards.
- Simple local prediction script (src/predict_local.py) for one-off predictions.

Repository structure
- frontend/
  - index.html — dashboard UI
  - script.js — frontend logic; fetches /predict and renders map/forecast
  - style.css — styles
  - stations.json — station metadata used by the frontend
- src/
  - api.py — FastAPI app (app = FastAPI()) and /predict implementation
  - train_model.py — data preparation and RandomForest training; saves models/aqi_model.pkl
  - predict_local.py — loads model and prints a one-step prediction
  - __init__.py
- data/
  - raw/delhi_pm25.csv — expected input CSV for training and prediction (not included)
- models/
  - models/aqi_model.pkl — expected output of training (created by train_model.py)
- requirements.txt

Requirements
- Python 3.10+ recommended
- Install dependencies:

  pip install -r requirements.txt

(Requirements include FastAPI, uvicorn, pandas, scikit-learn, joblib, etc.)

Data expectations
- The code expects data/raw/delhi_pm25.csv to exist.
- Required columns in the CSV:
  - period.datetimeFrom.utc — datetime column used for sorting
  - value — PM2.5 measurement
- The training/prediction pipeline renames 'value' to 'pm25' and computes rolling averages (3, 6, 12) as features.

Quick start
1. Clone and prepare environment
   git clone https://github.com/SakashSrivastava/SmogSense.git
   cd SmogSense

   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt

2. Train the model (creates models/aqi_model.pkl)
   python src/train_model.py

   - This script:
     - loads data/raw/delhi_pm25.csv
     - creates a target shifted by -24 (next-day PM2.5)
     - computes roll_3, roll_6, roll_12 features
     - trains RandomForestRegressor and saves models/aqi_model.pkl

3. Run the FastAPI backend
   uvicorn src.api:app --reload --host 127.0.0.1 --port 8000

   - Interactive docs: http://127.0.0.1:8000/docs
   - The API expects models/aqi_model.pkl and data/raw/delhi_pm25.csv to be present.

4. Serve the frontend (simple static server)
   cd frontend
   python -m http.server 5500
   # Open http://localhost:5500 in your browser

   The frontend fetches the backend at http://127.0.0.1:8000/predict (CORS is enabled in src/api.py).

API Endpoints
- GET /  — returns {"status":"SmogSense API running"}
- GET /predict  — returns current_pm25, current_aqi_category and forecast_7day array

Example /predict response:
{
  "current_pm25": 85.12,
  "current_aqi_category": "Unhealthy",
  "forecast_7day": [
    {"day":1,"pm25":88.23,"aqi_category":"Unhealthy"},
    {"day":2,"pm25":92.11,"aqi_category":"Unhealthy"},
    ...
  ]
}

Frontend notes
- The frontend uses Leaflet for map rendering and stations.json for placing station markers.
- Default map center coordinates are set to Delhi: [28.6139, 77.2090].
- To change the backend address, edit the fetch URL in frontend/script.js (line that calls /predict).

Local prediction
- Run a quick prediction without starting the API:
  python src/predict_local.py

Troubleshooting
- If models/aqi_model.pkl is missing: run python src/train_model.py
- If data/raw/delhi_pm25.csv is missing or has different column names: provide a CSV with the expected columns (period.datetimeFrom.utc and value)
- If frontend fails to load predictions: ensure uvicorn is running and API is reachable at the configured host/port

Development ideas
- Add Dockerfile and docker-compose to simplify running the API + frontend
- Add automated tests for data preprocessing, model training and API responses
- Improve forecasting model and add model versioning
- Add user accounts & alerting features (email/SMS/push)

License
This repository does not contain a LICENSE file yet. If you want to apply the MIT license, add a LICENSE file with the MIT text. For now, please choose and add a license that matches your needs.

Contact
Maintainer: Sakash Srivastava
Repo: https://github.com/SakashSrivastava/SmogSense

Notes
- This README was generated and committed by GitHub Copilot Chat Assistant based on the current repository contents. If you want edits (formatting, added screenshots, or a license), tell me and I will update the README.md accordingly.