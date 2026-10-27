# UK Day-Ahead Wind Forecasting & Procurement Portal

A full-stack analytics platform built to evaluate Elexon BMRS Day-Ahead wind generation forecasts against actual delivered settlement volumes for January 2026.

## Live Demo
- Frontend: [Live Vercel Link]
- Video Walkthrough: [Unlisted YouTube Link]

## System Architecture & Decision Horizon Logic
- **Data Ingestion**: Ingests half-hourly outturn generation from the `FUELHH` stream (filtered for `fuelType == 'WIND'`) and day-ahead forecast curves from `WINDFOR`.
- **Gate Closure Alignment**: For each settlement delivery day $D$, forecasts are filtered to the latest available revision published strictly prior to Day-Ahead Gate Closure ($D-1$ 11:00 UTC).
- **Core Error Metrics**:
  - **MAE**: 2,106.70 MW (mean variance per settlement period)
  - **RMSE**: 2,610.28 MW (penalizes extreme volume forecasting errors)
  - **Mean Bias**: +1,839.80 MW (consistent over-forecasting tendency)

## Tech Stack
- **Backend**: Python 3.11, FastAPI, Pandas, HTTPX
- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, Lucide React
- **DevOps**: Docker, Docker Compose, Nginx

## Running Locally with Docker
```bash
git clone <repo-url>
cd gridbricks-challenge
docker-compose up --build