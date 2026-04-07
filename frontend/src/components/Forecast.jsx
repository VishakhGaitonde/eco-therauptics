import { useState, useEffect } from "react";
import { forecastTI, fusionPredict } from "../services/api";

// ✅ Generate realistic default values with some variation
const generateDefaultRows = () => [
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

const FIELDS = [
  { key: "RH_mean", label: "RH mean (%)", min: 30, max: 80, step: 0.1 },
  { key: "Air_Temp_mean", label: "Air temp (°C)", min: 10, max: 45, step: 0.1 },
  { key: "CO2_mean", label: "CO₂ (ppm)", min: 380, max: 600, step: 1 },
  { key: "pH", label: "pH", min: 4, max: 9, step: 0.01 },
  { key: "EC", label: "EC (mS/cm)", min: 0.5, max: 4, step: 0.01 },
  { key: "Water_Temp", label: "Water temp (°C)", min: 10, max: 35, step: 0.1 },
];

const Forecast = () => {
  const [rows, setRows] = useState(generateDefaultRows());
  const [result, setResult] = useState(null);
  const [fusion, setFusion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  // ✅ Auto-forecast on mount
  useEffect(() => {
    handleForecastInternal(rows);
  }, []);

  const updateField = (dayIdx, key, val) => {
    const updated = [...rows];
    updated[dayIdx] = { ...updated[dayIdx], [key]: parseFloat(val) || 0 };
    setRows(updated);
  };

  const handleForecastInternal = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const [lstm, xgb] = await Promise.all([
        forecastTI(data),
        fusionPredict(Object.values(data[data.length - 1]).map(Number))
      ]);
      if (lstm.error) throw new Error(lstm.error);
      setResult(lstm);
      setFusion(xgb);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleForecast = async () => {
    handleForecastInternal(rows);
  };

  const ti = result?.therapeutic_index;
  const tiColor = !ti ? "var(--text3)" : ti >= 1.5 ? "var(--green)" : ti >= 1.0 ? "var(--amber)" : "var(--red)";

  return (
    <div>
      <div className="page-header">
        <h2>TI forecast</h2>
        <p>Enter 3 days of sensor readings — LSTM + XGBoost predicts Therapeutic Index</p>
      </div>

      <div className="grid-2">
        {/* Inputs */}
        <div className="card">
          <div className="card-title">Sensor sequence (3 days)</div>

          {/* Day tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {rows.map((_, i) => (
              <button
                key={i}
                className={`btn ${activeDay === i ? "btn-green" : ""}`}
                style={{ padding: "5px 14px", fontSize: 12 }}
                onClick={() => setActiveDay(i)}
              >
                Day {i + 1}
              </button>
            ))}
          </div>

          {/* Fields for active day */}
          <div className="sensor-grid">
            {FIELDS.map(({ key, label, min, max, step }) => (
              <div className="sensor-field" key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={rows[activeDay][key]}
                  onChange={(e) => updateField(activeDay, key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            className="btn btn-green btn-full"
            onClick={handleForecast}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Forecasting...</> : "Run LSTM + XGBoost forecast"}
          </button>

          {error && (
            <div className="alert-item alert-warning" style={{ marginTop: 10 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="card">
          <div className="card-title">Forecast result</div>

          {!result && (
            <div style={{ color: "var(--text3)", fontSize: 13 }}>
              Enter sensor data and run forecast to see predictions.
            </div>
          )}

          {result && (
            <>
              <div className="ti-gauge-wrap" style={{ padding: "8px 0 16px" }}>
                <div className="ti-number" style={{ color: tiColor }}>
                  {ti?.toFixed(3)}
                </div>
                <div className="ti-label">Therapeutic Index</div>
                <div className="ti-bar-track">
                  <div
                    className="ti-bar-fill"
                    style={{
                      width: `${Math.min((ti / 2.0) * 100, 100)}%`,
                      background: ti >= 1.5 ? "var(--green)" : ti >= 1.0 ? "var(--amber)" : "var(--red)"
                    }}
                  />
                </div>
              </div>

              <div className="result-box">
                <div className="result-row">
                  <span className="result-key">LSTM prediction</span>
                  <span className="result-val">{result.lstm_prediction?.toFixed(4)}</span>
                </div>
                <div className="result-row">
                  <span className="result-key">XGBoost fusion</span>
                  <span className="result-val">{fusion?.prediction?.toFixed(4) ?? "—"}</span>
                </div>
                <div className="result-row">
                  <span className="result-key">Interpretation</span>
                  <span className={`badge ${ti >= 1.5 ? "badge-green" : ti >= 1.0 ? "badge-amber" : "badge-red"}`}>
                    {result.interpretation}
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-key">Recommendation</span>
                  <span className="result-val">{result.recommendation}</span>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="card-title">Interpretation</div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
                  {ti >= 1.5 && "High therapeutic potential. Maintain current conditions and consider harvest window."}
                  {ti >= 1.0 && ti < 1.5 && "Moderate TI. Apply controlled stress (pH or EC) to increase secondary metabolite production."}
                  {ti < 1.0 && "Low TI. Increase stress elicitation immediately. Check EC and pH levels."}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forecast;