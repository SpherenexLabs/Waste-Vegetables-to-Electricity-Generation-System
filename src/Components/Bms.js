import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import "./App.css";

/**
 * CONFIG
 * - Make the Google Sheet "Anyone with the link: Viewer"
 * - Sheet name must match SHEET_NAME
 */
const SHEET_ID = "1ddPf5XPJ3oGmPbGAcCMWDDVXBP-Vy8u48ZLH8QoTuQY";
const SHEET_NAME = "Sheet1";
const POLL_MS = 5000; // refresh interval

// Parse the odd JSON returned by gviz
function parseGvizJSON(text) {
  // text looks like: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = JSON.parse(text.substring(start, end + 1));
  const rows = json.table.rows || [];
  const cols = json.table.cols || [];

  // Expect columns: DATE, TIME, VOLTAGE, CURRENT, TEMPERATURE
  // Some cells can be null -> coerce carefully
  const data = rows.map((r) => {
    const get = (i) => (r.c[i] && r.c[i].v !== null ? r.c[i].v : null);
    const date = get(0); // e.g. "2025-08-08"
    const time = get(1); // e.g. "17:54:20"
    const voltage = Number(get(2));
    const current = Number(get(3));
    const temperature = Number(get(4));
    const ts = date && time ? `${date} ${time}` : "";
    return { date, time, ts, voltage, current, temperature };
  });

  // Filter rows that have at least one numeric metric
  return data.filter(
    (d) =>
      Number.isFinite(d.voltage) ||
      Number.isFinite(d.current) ||
      Number.isFinite(d.temperature)
  );
}

async function fetchSheet() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    SHEET_NAME
  )}&tqx=out:json`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  return parseGvizJSON(text);
}

// Generate and update a rolling random series (for SOC/SOD)
function useRollingRandomSeries(initial = 50, len = 60, stepMs = POLL_MS) {
  const [series, setSeries] = useState(() => {
    const now = Date.now();
    return Array.from({ length: len }, (_, i) => ({
      t: new Date(now - (len - 1 - i) * stepMs).toLocaleTimeString(),
      v: initial,
    }));
  });

  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1]?.v ?? initial;
        // Random walk within 0..100 with small drift
        const next = Math.max(
          0,
          Math.min(100, last + (Math.random() - 0.5) * 6)
        );
        const n = {
          t: new Date().toLocaleTimeString(),
          v: Number(next.toFixed(1)),
        };
        const arr = [...prev.slice(1), n];
        return arr;
      });
    }, stepMs);
    return () => clearInterval(id);
  }, [initial, stepMs]);

  const latest = series[series.length - 1]?.v ?? initial;
  return { series, latest };
}

// Battery percentage series that rises from min to max then resets to min
function useSawtoothSeries({ min = 95, max = 97, len = 60, stepMin = 0.05, stepMax = 0.3, stepMs = POLL_MS } = {}) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const [series, setSeries] = useState(() => {
    const now = Date.now();
    return Array.from({ length: len }, (_, i) => ({
      t: new Date(now - (len - 1 - i) * stepMs).toLocaleTimeString(),
      v: min,
    }));
  });

  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1]?.v ?? min;
        const inc = stepMin + Math.random() * (stepMax - stepMin);
        const candidate = last + inc;
        const next = candidate >= max ? min : clamp(candidate);
        const n = { t: new Date().toLocaleTimeString(), v: Number(next.toFixed(2)) };
        return [...prev.slice(1), n];
      });
    }, stepMs);
    return () => clearInterval(id);
  }, [min, max, stepMin, stepMax, stepMs]);

  const latest = series[series.length - 1]?.v ?? min;
  return { series, latest };
}

// Reusable wave chart
function WaveChart({ data, dataKey = "y", height = "100%", yTicks, unit }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="x"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }}
            axisLine={false}
            tickLine={false}
            ticks={yTicks}
            width={40}
          />
          <Tooltip
            formatter={(val) => [`${val}${unit ?? ""}`, ""]}
            labelStyle={{ fontSize: 12, color: '#333' }}
            contentStyle={{ 
              borderRadius: 12, 
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#60a5fa"
            fill="url(#grad)"
            strokeWidth={2}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Small helper to convert sheet rows into simple {x,y}
function seriesFrom(rows, key, limit = 60) {
  const slice = rows.slice(-limit);
  return slice.map((r) => ({
    x: r.time || r.ts || "",
    y: Number(r[key]),
  }));
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // SOC/SOD random series
  const { series: socSeries, latest: soc } = useRollingRandomSeries(76);
  const { series: sodSeries, latest: sod } = useRollingRandomSeries(22);
  // Battery percentage (random varying data)
  const { series: batteryPctSeries, latest: batteryPct } = useSawtoothSeries({ min: 95, max: 97 });

  // Poll the sheet
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchSheet();
        if (!mounted) return;
        setRows(data);
        setErr("");
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setErr("Failed to fetch sheet. Check sharing permissions.");
        setLoading(false);
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const latest = useMemo(() => (rows.length ? rows[rows.length - 1] : null), [
    rows,
  ]);

  const voltageSeries = useMemo(() => seriesFrom(rows, "voltage"), [rows]);
  const currentSeries = useMemo(() => seriesFrom(rows, "current"), [rows]);
  const temperatureSeries = useMemo(
    () => seriesFrom(rows, "temperature"),
    [rows]
  );

  // Calculate power (V × A)
  const power = latest?.voltage && latest?.current ? 
    (latest.voltage * latest.current).toFixed(2) : null;

  return (
    <div className="wrap">
      <header className="header">
        <div className="header-main">
          <div className="title-section">
            <div className="icon">⚡</div>
            <h1>Battery Management System</h1>
          </div>
          <div className="status-badge">
            <span className="live-dot"></span>
            Live
          </div>
        </div>
        <div className="sub">
          Google Sheet — React (auto-updating)
          {latest?.ts ? ` — Last updated: ${latest.ts}` : ""}
        </div>
      </header>

      {err && <div className="error">{err}</div>}

      {/* Top metric cards */}
      <section className="metrics-grid">
        <SimpleMetricCard
          title="CURRENT"
          value={latest?.current}
          unit="A"
          subtitle="Latest value from sheet"
        />
        <SimpleMetricCard
          title="VOLTAGE"
          value={latest?.voltage}
          unit="V"
          subtitle="Latest value from sheet"
        />
        <SimpleMetricCard
          title="TEMPERATURE"
          value={latest?.temperature}
          unit="°C"
          subtitle="Latest value from sheet"
        />
        <SimpleMetricCard
          title="POWER"
          value={power}
          unit="W"
          subtitle="Computed (V × A)"
        />
      </section>

      {/* Chart section */}
      <section className="charts-grid">
        <ChartCard
          title="Current (A) - 500 data points"
          series={currentSeries}
          yTicks={[-60, 0, 60]}
          unit=" A"
        />
        <ChartCard
          title="Voltage (V) - 500 data points"
          series={voltageSeries}
          yTicks={[0, 10, 20]}
          unit=" V"
        />
        <ChartCard
          title="Temperature (°C) - 500 data points"
          series={temperatureSeries}
          yTicks={[-20, 0, 20, 40, 60]}
          unit=" °C"
        />
      </section>

      {/* Battery section: SOC / SOD */}
      <section className="battery-grid">
        <BatteryCard title="SOC (State of Charge)" value={soc} mode="charging" />
        <BatteryCard title="SOD (State of Discharge)" value={sod} mode="discharging" />
        <BatteryCard title="Battery Percentage" value={batteryPct} mode={batteryPct >= 50 ? "charging" : "discharging"} asProgress />
      </section>

      {/* Power chart - full width */}
      <section className="power-chart">
        <ChartCard
          title="Power (W) - 500 data points"
          series={voltageSeries.map((v, i) => ({
            x: v.x,
            y: currentSeries[i] ? (v.y * currentSeries[i].y) : 0
          }))}
          yTicks={[0, 500, 1000, 1500]}
          unit=" W"
        />
      </section>

      {loading && <div className="hint">Loading data…</div>}
    </div>
  );
}

function SimpleMetricCard({ title, value, unit, subtitle }) {
  const display =
    value === null || value === undefined || Number.isNaN(value)
      ? "—"
      : Number(value).toFixed(2);

  return (
    <div className="metric-card">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-value">
        {display}
        <span className="metric-unit">{unit}</span>
      </div>
      <div className="metric-subtitle">{subtitle}</div>
    </div>
  );
}

function ChartCard({ title, series, yTicks, unit }) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-body">
        <WaveChart data={series} yTicks={yTicks} unit={unit} height="100%" />
      </div>
    </div>
  );
}

function BatteryCard({ title, value = 0, mode = "charging", asProgress = false }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const display = Number.isFinite(pct) ? pct.toFixed(0) : "—";
  return (
    <div className={`battery-card ${mode}`}>
      <div className="battery-head">
        <h3 className="battery-title">{title}</h3>
        <div className="battery-value">
          {display}
          <span className="battery-unit">%</span>
        </div>
      </div>
      {asProgress ? (
        <div className="battery-progress">
          <Progress value={pct} label="Battery" />
        </div>
      ) : (
        <div className="battery-visual" aria-hidden>
          <div className="battery">
            <div className="battery-cap" />
            <div className="battery-body">
              <div className="battery-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}
      <div className="battery-sub">
        {asProgress
          ? "Battery percentage (live)"
          : mode === "charging"
          ? "Charging status (SOC)"
          : "Discharging status (SOD)"}
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, series, yTicks, secondary }) {
  const display =
    value === null || value === undefined || Number.isNaN(value)
      ? "—"
      : Number(value).toFixed(1);

  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
        <div className="value">
          {display}
          <span className="unit">{unit}</span>
        </div>
      </div>
      <WaveChart data={series} yTicks={yTicks} unit={unit} />
      {secondary ? <div className="card-foot">{secondary}</div> : null}
    </div>
  );
}

function Progress({ value = 0, label = "", className = "" }) {
  return (
    <div className={`progress-wrap ${className}`}>
      <div className="progress-top">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="bar">
        <div className="fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function TrendBadge({ v }) {
  const prevRef = useRef(v);
  const diff = Number((v - prevRef.current).toFixed(1));
  useEffect(() => {
    prevRef.current = v;
  }, [v]);

  const up = diff > 0;
  const cls = up ? "badge up" : diff < 0 ? "badge down" : "badge";
  return (
    <div className={cls}>
      {up ? "Rising" : diff < 0 ? "Falling" : "Stable"} {diff ? `(${diff})` : ""}
    </div>
  );
}
