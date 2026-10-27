import { useState, useEffect } from "react";import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from "recharts";
import { Activity, Wind, AlertTriangle, TrendingUp, Calendar, Zap } from "lucide-react";

const API_BASE = "https://uk-wind-grid-eval-26.onrender.com";

interface SummaryMetrics {
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  bias_direction: string;
  total_actual_mwh: number;
  total_forecast_mwh: number;
  total_periods_evaluated: number;
}

interface TimeseriesPoint {
  startTime: string;
  publishTime: string;
  actualGeneration: number;
  forecastGeneration: number;
  error: number;
  absoluteError: number;
  settlementPeriod: number;
  dateStr: string;
}

export default function App() {
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial summary and available dates
  useEffect(() => {
    async function init() {
      try {
        const [sumRes, datesRes] = await Promise.all([
          axios.get<SummaryMetrics>(`${API_BASE}/api/metrics/summary`),
          axios.get<string[]>(`${API_BASE}/api/available-dates`),
        ]);
        setSummary(sumRes.data);
        setDates(datesRes.data);
        if (datesRes.data.length > 0) {
          setSelectedDate(datesRes.data[0]);
        }
      } catch (err) {
        console.error("Error loading initial data", err);
      }
    }
    init();
  }, []);

  // Fetch time-series when selected date changes
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    axios
      .get<TimeseriesPoint[]>(`${API_BASE}/api/timeseries?date=${selectedDate}`)
      .then((res) => {
        setTimeseries(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading timeseries", err);
        setLoading(false);
      });
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Zap className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                UK Day-Ahead Wind Procurement Portal
              </h1>
              <p className="text-sm text-slate-400">
                Elexon BMRS Decision Horizon Analysis • January 2026 Scope
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <Calendar className="h-4 w-4 text-slate-400" />
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Delivery Day:
          </label>
          <select
            className="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {dates.map((d) => (
              <option key={d} value={d} className="bg-slate-900 text-white">
                {d}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* KPI Cards */}
      {summary && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Mean Absolute Error</span>
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {summary.mae_mw?.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Average variance per 30-min settlement slot</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Root Mean Square Error</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {summary.rmse_mw?.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Penalizes large extreme forecasting misses</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Forecast Bias</span>
              <TrendingUp className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-3xl font-bold text-rose-400 tracking-tight">
              +{summary.bias_mw?.toLocaleString()}{" "}
              <span className="text-sm font-normal text-slate-400">MW</span>
            </div>
            <p className="text-xs text-rose-300/70 mt-2 font-medium">
              Systematic {summary.bias_direction} (Deficit Risk)
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Actual Wind Energy</span>
              <Wind className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 tracking-tight">
              {(summary.total_actual_mwh / 1000)?.toFixed(1)}k{" "}
              <span className="text-sm font-normal text-slate-400">MWh</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Total Jan 2026 delivered wind generation</p>
          </div>
        </section>
      )}

      {/* Main Charts Section */}
      <section className="space-y-8">
        {/* Actual vs Forecast Line Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Day-Ahead Forecast vs. Actual Generation
              </h2>
              <p className="text-xs text-slate-400">
                Shows latest available WINDFOR forecast published prior to D-1 11:00 UTC vs FUELHH actuals
              </p>
            </div>
            <span className="text-xs px-3 py-1 bg-slate-800 text-slate-300 rounded-full font-mono self-start sm:self-auto">
              {timeseries.length} Settlement Periods (48 SPs/day)
            </span>
          </div>

          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Loading time-series data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="startTime"
                    tickFormatter={(v: string) => v.split(" ")[1] || v}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" fontSize={12} unit=" MW" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="actualGeneration"
                    name="Actual Wind (FUELHH)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecastGeneration"
                    name="Day-Ahead Forecast (WINDFOR)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Forecast Error / Thermal Margin Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              Procurement Error & Balancing Margin (Forecast - Actual)
            </h2>
            <p className="text-xs text-slate-400">
              Positive values indicate wind over-estimation (requiring thermal/peaker plant buy). Negative values indicate wind surplus.
            </p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Loading error distribution...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="startTime"
                    tickFormatter={(v: string) => v.split(" ")[1] || v}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" fontSize={12} unit=" MW" />
                  <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Bar
                    dataKey="error"
                    name="Forecast Delta (MW)"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        Gridbricks Technical Challenge Submission • Built with FastAPI, React, and Elexon BMRS Real-time Data
      </footer>
    </div>
  );
}