import httpx
import json

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

def test_stream_endpoints():
    client = httpx.Client(timeout=30.0)

    # 1. Test FUELHH (Actuals) for one day
    print("Testing FUELHH (Actuals)...")
    fuel_url = f"{BASE_URL}/FUELHH/stream"
    fuel_params = {
        "publishDateTimeFrom": "2026-01-01T00:00:00Z",
        "publishDateTimeTo": "2026-01-01T04:00:00Z"
    }
    
    fuel_resp = client.get(fuel_url, params=fuel_params)
    print(f"FUELHH Status: {fuel_resp.status_code}")
    if fuel_resp.status_code == 200:
        actuals = fuel_resp.json()
        print(f"Retrieved {len(actuals)} FUELHH records.")
        # Filter for WIND
        wind_actuals = [r for r in actuals if r.get("fuelType") == "WIND"]
        if wind_actuals:
            print("Sample WIND Actual record:")
            print(json.dumps(wind_actuals[0], indent=2))
    else:
        print("Error response:", fuel_resp.text[:200])

    print("-" * 50)

    # 2. Test WINDFOR (Forecasts)
    print("Testing WINDFOR (Forecasts)...")
    wind_url = f"{BASE_URL}/WINDFOR/stream"
    wind_params = {
        "publishDateTimeFrom": "2026-01-01T00:00:00Z",
        "publishDateTimeTo": "2026-01-01T04:00:00Z"
    }
    
    wind_resp = client.get(wind_url, params=wind_params)
    print(f"WINDFOR Status: {wind_resp.status_code}")
    if wind_resp.status_code == 200:
        forecasts = wind_resp.json()
        print(f"Retrieved {len(forecasts)} WINDFOR records.")
        if forecasts:
            print("Sample WINDFOR Forecast record:")
            print(json.dumps(forecasts[0], indent=2))
    else:
        print("Error response:", wind_resp.text[:200])

if __name__ == "__main__":
    test_stream_endpoints()