import { useState } from "react";
import TopCards from "./TopCards";
import { forecastTI } from "../services/api";

const MAX_TI = 2.0;

const DEFAULT_SENSOR_SNAPSHOT = {
  RH_mean: 59,
  Air_Temp_mean: 23,
  CO2_mean: 450,
  pH: 6.4,
  EC: 1.87,
  Water_Temp: 22,
};

const Dashboard = ({
  sensorSnapshot = DEFAULT_SENSOR_SNAPSHOT,
  setSensorSnapshot,
  growthStage = "Mid",
  setGrowthStage,
  growthStageSource = "manual",
  setGrowthStageSource,
  currentTi,
  setCurrentTi,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tiHistory, setTiHistory] = useState([]);
  const [error, setError] = useState(null);

  const refreshForecast = () => {
    const sequence = [sensorSnapshot, sensorSnapshot, sensorSnapshot];
    setLoading(true);
    setError(null);

    forecastTI(sequence)
      .then((result) => {
        setData(result);
        if (typeof result?.therapeutic_index === "number") {
          setTiHistory((history) => [...history.slice(-9), result.therapeutic_index]);
          setCurrentTi?.(result.therapeutic_index);
        }
      })
      .catch((err) => {
        console.error("Forecast error:", err);
        setError(err?.message || "Failed to run forecast");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  const ti = data?.therapeutic_index ?? (tiHistory.length > 0 ? tiHistory[tiHistory.length - 1] : null);
  const last = sensorSnapshot ?? {};

  const stageOptions = ["Early", "Mid", "Late"];

  const handleReset = () => {
    setSensorSnapshot?.(DEFAULT_SENSOR_SNAPSHOT);
    setGrowthStage?.("Mid");
    setGrowthStageSource?.("manual");
    setCurrentTi?.(null);
    setData(null);
    setTiHistory([]);
    setError(null);
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Overview</h2>
        <p>Snapshot monitoring — sensor values come from SHAP analysis, and forecast updates only when you click the button</p>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-green" onClick={refreshForecast} disabled={loading}>
          {loading ? <><span className="spinner" /> Running forecast...</> : "Run forecast on current SHAP data"}
        </button>
        <button className="btn" onClick={handleReset} disabled={loading}>
          Reset dashboard
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Growth stage</div>
        <div style={{ display: "grid", gap: 10, maxWidth: 260 }}>
          <select
            value={growthStage}
            onChange={(e) => {
              setGrowthStage?.(e.target.value);
              setGrowthStageSource?.("manual");
            }}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "rgba(0, 0, 0, 0.2)",
              color: "var(--text)",
              fontFamily: "var(--mono)",
              outline: "none",
            }}
          >
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            Source: {growthStageSource === "classifier" ? "Plant classifier" : "Manual dashboard input"}
          </div>
        </div>
      </div>

      <TopCards
        ti={ti != null ? ti.toFixed(3) : "—"}
        stage={growthStage}
        pH={typeof last.pH === "number" ? last.pH.toFixed(1) : "—"}
        EC={typeof last.EC === "number" ? last.EC.toFixed(2) : "—"}
      />

      <div className="grid-2">
        {/* TI Chart */}
        <div className="card">
          <div className="card-title">Therapeutic Index — trend</div>
          <div className="ti-chart">
            {tiHistory.length > 0 ? tiHistory.map((v, i) => (
              <div
                key={i}
                className={`ti-bar ${v > 1.3 ? "high" : "med"}`}
                style={{ height: `${(v / MAX_TI) * 100}%` }}
                title={`Day ${i + 1}: ${v.toFixed(3)}`}
              />
            )) : (
              <div style={{ color: "var(--text3)", fontSize: 12, alignSelf: "center", padding: "20px 0" }}>
                No forecast history yet. Click the button above to create it.
              </div>
            )}
          </div>
          <div className="chart-labels">
            <span>Day 1</span>
            <span>Day {tiHistory.length || 0}</span>
          </div>

          {/* TI gauge */}
          <div className="ti-gauge-wrap" style={{ marginTop: 20 }}>
            <div className="ti-number">
              {loading ? <span className="spinner" /> : ti != null ? ti.toFixed(3) : "—"}
            </div>
            <div className="ti-label">Therapeutic Index</div>
            <div className="ti-bar-track">
              <div
                className="ti-bar-fill"
                style={{ width: `${ti != null ? Math.min((ti / MAX_TI) * 100, 100) : 0}%` }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>0.0</span>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>2.0</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="card-title">System alerts</div>

          <div className="alert-item alert-warning">
            <span>⚡</span>
            <span>EC above threshold — consider elicitation</span>
          </div>
          <div className="alert-item alert-success">
            <span>✓</span>
            <span>pH within optimal range</span>
          </div>
          <div className="alert-item alert-info">
            <span>◎</span>
            <span>Elicitation event due: Day 12</span>
          </div>
          <div className="alert-item alert-info">
            <span>◎</span>
            <span>Growth stage: Mid (Day 14)</span>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div className="card-title">Recommendation</div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
              {data?.recommendation ?? "Monitor environmental parameters. Apply pH stress on Day 12 to boost TI toward target."}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor summary */}
      <div className="card">
        <div className="card-title">Latest sensor readings</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "RH mean", val: typeof last.RH_mean === "number" ? `${last.RH_mean.toFixed(1)}%` : "—" },
            { label: "Air temp", val: typeof last.Air_Temp_mean === "number" ? `${last.Air_Temp_mean.toFixed(1)}°C` : "—" },
            { label: "CO₂", val: typeof last.CO2_mean === "number" ? `${last.CO2_mean.toFixed(0)} ppm` : "—" },
            { label: "pH", val: typeof last.pH === "number" ? last.pH.toFixed(2) : "—" },
            { label: "EC", val: typeof last.EC === "number" ? `${last.EC.toFixed(2)} mS/cm` : "—" },
            { label: "Water temp", val: typeof last.Water_Temp === "number" ? `${last.Water_Temp.toFixed(1)}°C` : "—" },
          ].map(({ label, val }) => (
            <div key={label} className="result-box" style={{ margin: 0 }}>
              <div className="metric-label" style={{ marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: "var(--green)" }}>{val}</div>
            </div>
          ))}
        </div>
        {error && (
          <div className="alert-item alert-warning" style={{ marginTop: 12 }}>
            ⚠ {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;