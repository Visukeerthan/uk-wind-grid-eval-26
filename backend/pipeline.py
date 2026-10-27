import httpx
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
OUTPUT_FILE = "aligned_data_jan_2026.json"

def fetch_january_data():
    client = httpx.Client(timeout=60.0)

    # 1. Fetch FUELHH Actuals for January 2026
    # Query across January 2026
    print("Fetching FUELHH (Actuals) for January 2026...")
    fuel_url = f"{BASE_URL}/FUELHH/stream"
    fuel_params = {
        "publishDateTimeFrom": "2026-01-01T00:00:00Z",
        "publishDateTimeTo": "2026-02-01T00:30:00Z"
    }
    resp = client.get(fuel_url, params=fuel_params)
    resp.raise_for_status()
    actuals_raw = resp.json()
    print(f"Total raw FUELHH records: {len(actuals_raw)}")

    # Filter for fuelType == 'WIND'
    wind_actuals = [
        {
            "startTime": r["startTime"],
            "actualGeneration": r["generation"],
            "settlementPeriod": r.get("settlementPeriod")
        }
        for r in actuals_raw if r.get("fuelType") == "WIND"
    ]
    df_actuals = pd.DataFrame(wind_actuals)
    df_actuals["startTime"] = pd.to_datetime(df_actuals["startTime"])
    # Drop duplicates on startTime, keep latest
    df_actuals = df_actuals.drop_duplicates(subset=["startTime"]).sort_values("startTime")
    print(f"Cleaned WIND Actuals records: {len(df_actuals)}")

    # 2. Fetch WINDFOR Forecasts
    # Forecasts for Jan 1 delivery start publishing on Dec 31
    print("Fetching WINDFOR (Forecasts)...")
    wind_url = f"{BASE_URL}/WINDFOR/stream"
    wind_params = {
        "publishDateTimeFrom": "2025-12-30T00:00:00Z",
        "publishDateTimeTo": "2026-02-01T00:00:00Z"
    }
    resp_wind = client.get(wind_url, params=wind_params)
    resp_wind.raise_for_status()
    forecasts_raw = resp_wind.json()
    print(f"Total raw WINDFOR records: {len(forecasts_raw)}")

    df_forecasts = pd.DataFrame(forecasts_raw)[["startTime", "publishTime", "generation"]]
    df_forecasts["startTime"] = pd.to_datetime(df_forecasts["startTime"])
    df_forecasts["publishTime"] = pd.to_datetime(df_forecasts["publishTime"])
    df_forecasts.rename(columns={"generation": "forecastGeneration"}, inplace=True)

    return df_actuals, df_forecasts

def align_day_ahead(df_actuals, df_forecasts):
    print("Aligning Day-Ahead forecasts to actuals...")
    
    # Calculate Day-Ahead Gate Closure for each delivery slot:
    # Target delivery day D (date of startTime) -> Gate closure at D-1 11:00:00 UTC
    df_actuals["deliveryDate"] = df_actuals["startTime"].dt.date
    aligned_rows = []

    # Group by each delivery day
    for delivery_date, day_actuals in df_actuals.groupby("deliveryDate"):
        # Gate closure is the previous calendar day at 11:00 UTC
        gate_closure = pd.Timestamp(delivery_date - timedelta(days=1), tz="UTC") + pd.Timedelta(hours=11)
        
        # Filter forecasts published before gate closure
        valid_forecasts = df_forecasts[df_forecasts["publishTime"] <= gate_closure]
        
        # For each target startTime, find the latest forecast published before gate closure
        latest_forecasts = valid_forecasts.sort_values("publishTime").groupby("startTime").last().reset_index()
        
        # Merge with actuals
        merged = pd.merge(day_actuals, latest_forecasts[["startTime", "publishTime", "forecastGeneration"]], on="startTime", how="inner")
        aligned_rows.append(merged)

    aligned_df = pd.concat(aligned_rows, ignore_index=True)
    
    # Calculate error metrics per 30-min period:
    # error = forecast - actual (Positive = Over-forecast, Negative = Under-forecast)
    aligned_df["error"] = aligned_df["forecastGeneration"] - aligned_df["actualGeneration"]
    aligned_df["absoluteError"] = aligned_df["error"].abs()

    # Format timestamps for JSON serialization
    aligned_df["startTimeStr"] = aligned_df["startTime"].dt.strftime("%Y-%m-%d %H:%M UTC")
    aligned_df["publishTimeStr"] = aligned_df["publishTime"].dt.strftime("%Y-%m-%d %H:%M UTC")
    aligned_df["dateStr"] = aligned_df["startTime"].dt.strftime("%Y-%m-%d")

    # Global Summary KPIs
    mae = float(aligned_df["absoluteError"].mean())
    rmse = float(np.sqrt((aligned_df["error"] ** 2).mean()))
    bias = float(aligned_df["error"].mean())
    total_actual_mwh = float(aligned_df["actualGeneration"].sum() * 0.5)  # 30-min slots -> 0.5 MWh per MW
    total_forecast_mwh = float(aligned_df["forecastGeneration"].sum() * 0.5)

    summary_metrics = {
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "bias_mw": round(bias, 2),
        "bias_direction": "Over-forecasting" if bias > 0 else "Under-forecasting",
        "total_actual_mwh": round(total_actual_mwh, 2),
        "total_forecast_mwh": round(total_forecast_mwh, 2),
        "total_periods_evaluated": len(aligned_df)
    }

    print("\n--- Summary Metrics for January 2026 ---")
    print(json.dumps(summary_metrics, indent=2))

    # Package output
    records = aligned_df.to_dict(orient="records")
    for r in records:
        r["startTime"] = r["startTimeStr"]
        r["publishTime"] = r["publishTimeStr"]
        del r["deliveryDate"]

    output_payload = {
        "summary": summary_metrics,
        "timeseries": records
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output_payload, f, indent=2)
    print(f"\nSaved aligned dataset to {OUTPUT_FILE}")

if __name__ == "__main__":
    df_actuals, df_forecasts = fetch_january_data()
    align_day_ahead(df_actuals, df_forecasts)