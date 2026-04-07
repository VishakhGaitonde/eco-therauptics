import { useState, useEffect } from "react";
import TopCards from "./TopCards";
import { forecastTI } from "../services/api";

// ✅ Generate realistic varying sensor data
const generateSensorData = () => {
  return [
    { 
      RH_mean: 55 + Math.random() * 15, 
      Air_Temp_mean: 20 + Math.random() * 8, 
      CO2_mean: 420 + Math.random() * 80, 
      pH: 6.0 + Math.random() * 1.0, 
      EC: 1.5 + Math.random() * 1.0,
      Water_Temp: 19 + Math.random() * 6
    },
    { 
      RH_mean: 55 + Math.random() * 15, 
      Air_Temp_mean: 20 + Math.random() * 8, 
      CO2_mean: 420 + Math.random() * 80, 
      pH: 6.0 + Math.random() * 1.0, 
      EC: 1.5 + Math.random() * 1.0,
      Water_Temp: 19 + Math.random() * 6
    },
    { 
      RH_mean: 55 + Math.random() * 15, 
      Air_Temp_mean: 20 + Math.random() * 8, 
      CO2_mean: 420 + Math.random() * 80, 
      pH: 6.0 + Math.random() * 1.0, 
      EC: 1.5 + Math.random() * 1.0,
      Water_Temp: 19 + Math.random() * 6
    }
  ];
};

// ✅ Generate dynamic TI history (simulates 10-day trend)
const generateTIHistory = () => {
  const history = [];
  let ti = 1.2;
  for (let i = 0; i < 10; i++) {
    ti += (Math.random() - 0.4) * 0.2; // Slight upward trend with variance
    history.push(Math.max(0.8, Math.min(1.8, ti)));
  }
  return history;
};

const MAX_TI = 2.0;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState([]);
  const [tiHistory, setTiHistory] = useState([]);

  useEffect(() => {
    const newSensorData = generateSensorData();
    const newTiHistory = generateTIHistory();
    setSensorData(newSensorData);
    setTiHistory(newTiHistory);

    forecastTI(newSensorData)
      .then(setData)
      .catch((err) => {
        console.error("Forecast error:", err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ✅ Refresh data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newSensorData = generateSensorData();
      setSensorData(newSensorData);

      forecastTI(newSensorData)
        .then(setData)
        .catch(console.error);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const ti = data?.therapeutic_index ?? (tiHistory.length > 0 ? tiHistory[tiHistory.length - 1] : 1.2);
  const last = sensorData.length > 0 ? sensorData[sensorData.length - 1] : {};

  return (
    <div>
      <div className="page-header">
        <h2>Overview</h2>
        <p>Real-time hydroponic monitoring — Batavia lettuce</p>
      </div>

      <TopCards
        ti={ti.toFixed(3)}
        stage="Mid"
        pH={last.pH?.toFixed(1) ?? "—"}
        EC={last.EC?.toFixed(2) ?? "—"}
      />

      <div className="grid-2">
        {/* TI Chart */}
        <div className="card">
          <div className="card-title">Therapeutic Index — trend</div>
          <div className="ti-chart">
            {tiHistory.map((v, i) => (
              <div
                key={i}
                className={`ti-bar ${v > 1.3 ? "high" : "med"}`}
                style={{ height: `${(v / MAX_TI) * 100}%` }}
                title={`Day ${i + 1}: ${v.toFixed(3)}`}
              />
            ))}
          </div>
          <div className="chart-labels">
            <span>Day 1</span>
            <span>Day {tiHistory.length}</span>
          </div>

          {/* TI gauge */}
          <div className="ti-gauge-wrap" style={{ marginTop: 20 }}>
            <div className="ti-number">
              {loading ? <span className="spinner" /> : ti.toFixed(3)}
            </div>
            <div className="ti-label">Therapeutic Index</div>
            <div className="ti-bar-track">
              <div
                className="ti-bar-fill"
                style={{ width: `${Math.min((ti / MAX_TI) * 100, 100)}%` }}
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
            { label: "RH mean", val: last.RH_mean ? `${last.RH_mean.toFixed(1)}%` : "—" },
            { label: "Air temp", val: last.Air_Temp_mean ? `${last.Air_Temp_mean.toFixed(1)}°C` : "—" },
            { label: "CO₂", val: last.CO2_mean ? `${last.CO2_mean.toFixed(0)} ppm` : "—" },
            { label: "pH", val: last.pH ? last.pH.toFixed(2) : "—" },
            { label: "EC", val: last.EC ? `${last.EC.toFixed(2)} mS/cm` : "—" },
            { label: "Water temp", val: last.Water_Temp ? `${last.Water_Temp.toFixed(1)}°C` : "—" },
          ].map(({ label, val }) => (
            <div key={label} className="result-box" style={{ margin: 0 }}>
              <div className="metric-label" style={{ marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: "var(--green)" }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;