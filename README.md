# UK Day-Ahead Wind Forecasting & Balancing Portal

A full-stack electricity market analytics platform engineered to evaluate Elexon BMRS Day-Ahead wind generation forecasts against actual delivered settlement volumes for January 2026. Built to expose physical volume imbalances, assess commercial balancing risks, and prevent look-ahead bias at Day-Ahead Gate Closure.

## Live Demo & Deliverables

* **Live Application (Frontend)**: [https://uk-wind-grid-eval-26.vercel.app/](https://uk-wind-grid-eval-26.vercel.app/)
* **Live API Service (Backend)**: [https://uk-wind-grid-eval-26.onrender.com/](https://uk-wind-grid-eval-26.onrender.com/)
* **Video Walkthrough (YouTube Unlisted)**: [https://youtu.be/9HTSOi5pvrk](https://youtu.be/9HTSOi5pvrk)

---

## Market Background & Commercial Problem

In the UK wholesale electricity market, power cannot be stored in large quantities at low cost. Generation and demand must continuously balance in discrete **30-minute settlement periods** (48 periods per delivery day $D$).

### The Decision Horizon & Gate Closure Logic

* **Day-Ahead Auction Deadline**: By **11:00 UTC on day $D - 1$**, market participants (traders, suppliers, and generators) must lock in their physical notification schedules and power commitments.
* **Intermittency Risk**: Wind output is heavily weather-dependent. When market participants schedule generation based on inaccurate Day-Ahead forecasts, any volume gap between scheduled energy and physical outturn forces the System Operator (National Grid ESO) to dispatch balancing actions (e.g., gas peakers, battery storage, or interconnector adjustments).
* **Financial Penalties**: Short positions are penalized via the System Buy Price (SBP) in the Balancing Mechanism, creating severe financial downside for renewable desks that over-estimate wind volumes.

---

## System Architecture & Pipeline Design

```text
                     ┌───────────────────────────────────────────────┐
                     │          Elexon BMRS Data Streams             │
                     │  - FUELHH (Half-Hourly Outturn Generation)    │
                     │  - WINDFOR (Day-Ahead Forecast Series)        │
                     └──────────────────────┬────────────────────────┘
                                            │
                                            ▼
                     ┌───────────────────────────────────────────────┐
                     │             pipeline.py (ETL Engine)          │
                     │  1. Filter fuelType == 'WIND'                 │
                     │  2. Enforce D-1 11:00 UTC Gate Closure Cutoff │
                     │  3. Select latest pre-cutoff revision         │
                     │  4. Compute MAE, RMSE, Mean Bias              │
                     └──────────────────────┬────────────────────────┘
                                            │
                                            ▼
                     ┌───────────────────────────────────────────────┐
                     │        FastAPI REST API (Python 3.11)         │
                     │  - GET /api/available-dates                   │
                     │  - GET /api/metrics/summary                   │
                     │  - GET /api/timeseries?date=YYYY-MM-DD        │
                     └──────────────────────┬────────────────────────┘
                                            │
                                            ▼
                     ┌───────────────────────────────────────────────┐
                     │          React 19 + Recharts Frontend         │
                     │  - Global Metric KPI Cards (MAE/RMSE/Bias)    │
                     │  - Dual Time-Series (Forecast vs. Actuals)    │
                     │  - Balancing Margin Delta Distribution (MW)   │
                     └───────────────────────────────────────────────┘
```

### Strict Elimination of Look-Ahead Bias

To simulate real-world trading conditions, the ingestion engine in `pipeline.py` rejects any forecast published after $D - 1$ **11:00 UTC**:

$$\text{publishTime} \le \text{DeliveryDate}_{D} - 1 \text{ day} \text{ at 11:00:00 UTC}$$

From all forecasts qualifying before the gate closure cutoff, the system selects the latest revision.

---

## Portfolio Performance Metrics (January 2026)

Across the evaluated delivery timeline in January 2026:

| Metric | Value | Commercial Interpretation |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | **2,106.70 MW** | On average, day-ahead forecasts missed delivered outturn by ~2.1 GW per settlement interval. |
| **Root Mean Square Error (RMSE)** | **2,610.28 MW** | Heavy penalty on extreme forecast outliers, reflecting high ramp-rate volatility during shifting weather fronts. |
| **Mean Forecast Bias** | **+1,839.80 MW** | Systematic over-forecasting tendency ($\text{Forecast} - \text{Actual} > 0$). Market participants were repeatedly left short, having to buy back power at premium balancing rates. |

### Commercial Impact
The sustained positive bias (+1,839.80 MW) indicates that trading desks relying strictly on day-ahead model forecasts faced persistent short positions in real time. To maintain system frequency and avoid steep cash-out imbalance penalties, desks and system operators had to trigger flexible thermal peaking capacity (e.g., CCGT, OCGT) and reserve batteries to bridge the deficit.

---

## Tech Stack

* **Backend**: Python 3.11, FastAPI, Pandas, HTTPX, Uvicorn
* **Frontend**: React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons, Vite
* **Infrastructure & Containerization**: Docker, Docker Compose, Nginx, Vercel (Frontend Hosting), Render (Backend Hosting)

---

## Local Development & Docker Reproduction

The entire platform is containerized for single-command setup.

### Prerequisites

* [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/visukeerthan/uk-wind-grid-eval-26.git
cd uk-wind-grid-eval-26

# 2. Build and launch all services
docker-compose up --build
```

* **Frontend Application**: `http://localhost:3000`
* **Backend API Documentation**: `http://localhost:8000/docs`

---

## AI Usage Disclosure

In compliance with academic and technical submission guidelines, generative AI tools were utilized during the development lifecycle:

* **Tools Used**: Google Gemini
* **Scope of Use**:
  * Drafting initial boilerplate configurations (`docker-compose.yml`, multi-stage Dockerfiles, and Vite proxy settings).
  * Assisting in debugging TypeScript build constraints and syntax alignments (`TS6133` unused import refactoring).
  * Structuring presentation notes and technical documentation frameworks.
* **Verification**: All core business logic—including the Elexon BMRS endpoint parsing, the $D-1$ 11:00 UTC gate closure filtering, the mathematical error metric formulations, and data joins—was validated and verified against UK wholesale power market standards.
