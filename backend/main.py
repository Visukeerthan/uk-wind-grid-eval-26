from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from typing import Optional, List

app = FastAPI(
    title="UK Wind Power Day-Ahead Forecasting API",
    description="Elexon BMRS January 2026 Day-Ahead Wind Generation Analysis",
    version="1.0.0"
)

# Enable CORS for React frontend (Vercel / Localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "aligned_data_jan_2026.json")

def load_data():
    if not os.path.exists(DATA_PATH):
        return {"summary": {}, "timeseries": []}
    with open(DATA_PATH, "r") as f:
        return json.load(f)

cached_data = load_data()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "UK Day-Ahead Wind Forecast Evaluation Engine",
        "dataset_scope": "January 2026"
    }

@app.get("/api/metrics/summary")
def get_summary():
    """Returns global KPIs for January 2026 (MAE, RMSE, Bias, Generation)."""
    return cached_data.get("summary", {})

@app.get("/api/timeseries")
def get_timeseries(date: Optional[str] = Query(None, description="Filter by date in YYYY-MM-DD format")):
    """Returns aligned 30-min settlement series (Actual vs Day-Ahead Forecast)."""
    records = cached_data.get("timeseries", [])
    if date:
        filtered = [r for r in records if r.get("dateStr") == date]
        return filtered
    return records

@app.get("/api/available-dates")
def get_available_dates():
    """Returns all unique delivery dates present in the January 2026 dataset."""
    records = cached_data.get("timeseries", [])
    dates = sorted(list(set(r.get("dateStr") for r in records if "dateStr" in r)))
    return dates