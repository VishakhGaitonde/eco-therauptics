import { useState } from "react";
import { shapExplain } from "../services/api";

const DEFAULT_FEATURES = [59, 23, 450, 6.4, 1.87, 22];
const FEATURE_NAMES = ["RH mean", "Air temp", "CO₂", "pH", "EC", "Water temp"];
const FEATURE_UNITS = ["%", "°C", "ppm", "", "mS/cm", "°C"];

const SHAP = ({ setSensorSnapshot }) => {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartImg, setChartImg] = useState(null);

  const handleExplain = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shapExplain(features);
      if (data.error) throw new Error(data.error);
      setResult(data);
      setSensorSnapshot?.(data.input_features ?? {
        RH_mean: features[0],
        Air_Temp_mean: features[1],
        CO2_mean: features[2],
        pH: features[3],
        EC: features[4],
        Water_Temp: features[5],
      });
      if (data.chart) setChartImg(`data:image/png;base64,${data.chart}`);
    } catch (e) {
      setError(e.message || "Failed to compute SHAP values");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const maxVal = result?.shap_values ? Math.max(...Object.values(result.shap_values).map(Math.abs)) : 1;

  return (
    <div>
      <div className="page-header">
        <h2>SHAP Explainability</h2>
        <p>Understand which environmental factors drive Therapeutic Index prediction</p>
      </div>

      <div className="grid-2">
        {/* Input */}
        <div className="card">
          <div className="card-title">Input Features</div>
          <div className="sensor-grid">
            {FEATURE_NAMES.map((name, i) => (
              <div className="sensor-field" key={name}>
                <label>{name} {FEATURE_UNITS[i] && `(${FEATURE_UNITS[i]})`}</label>
                <input
                  type="number"
                  step="0.01"
                  value={features[i]}
                  onChange={(e) => {
                    const updated = [...features];
                    updated[i] = parseFloat(e.target.value) || 0;
                    setFeatures(updated);
                  }}
                />
              </div>
            ))}
          </div>

          <button
            className="btn btn-green btn-full"
            onClick={handleExplain}
            disabled={loading}
            style={{ marginTop: 14 }}
          >
            {loading ? <><span className="spinner" /> Computing SHAP...</> : "Explain Prediction"}
          </button>

          {error && (
            <div className="alert-item alert-warning" style={{ marginTop: 10 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* SHAP Output */}
        <div className="card">
          <div className="card-title">Feature Importance (SHAP)</div>

          {!result && (
            <div style={{ color: "var(--text3)", fontSize: 13 }}>
              Adjust features and click "Explain Prediction" to see SHAP values.
            </div>
          )}

          {result && result.shap_values && (
            <>
              {/* Summary */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <div>
                    <div style={{ color: "var(--text3)", marginBottom: 4 }}>Base Value</div>
                    <div style={{ color: "var(--green)", fontFamily: "var(--mono)", fontWeight: 600 }}>
                      {result.base_value}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text3)", marginBottom: 4 }}>Total Impact</div>
                    <div style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontWeight: 600 }}>
                      {(Object.values(result.shap_values).reduce((a, b) => a + b, 0)).toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SHAP Bars */}
              {Object.entries(result.shap_values)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([name, val]) => {
                  const pct = Math.abs(val) / (maxVal || 1);
                  const isPos = val >= 0;
                  const inputVal = result.input_features?.[name] ?? "—";
                  
                  return (
                    <div key={name} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>
                          {name}
                        </span>
                        <span style={{ 
                          fontSize: 11, 
                          color: "var(--text3)", 
                          fontFamily: "var(--mono)" 
                        }}>
                          {inputVal}
                        </span>
                      </div>
                      <div className="shap-track">
                        <div
                          className="shap-fill"
                          style={{
                            width: `${pct * 100}%`,
                            background: isPos ? "var(--green)" : "var(--red)",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                        <span></span>
                        <span style={{ 
                          fontSize: 11, 
                          fontFamily: "var(--mono)", 
                          color: isPos ? "var(--green)" : "var(--red)",
                          fontWeight: 600
                        }}>
                          {isPos ? "+" : ""}{val.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {/* Insight */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <div className="card-title">Interpretation</div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                  {(() => {
                    const entries = Object.entries(result.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
                    if (entries.length === 0) return "No impact data available.";
                    const [topFeature, topValue] = entries[0];
                    const direction = topValue > 0 ? "INCREASES" : "DECREASES";
                    return `${topFeature} has the strongest impact (${direction} prediction by ${Math.abs(topValue).toFixed(3)}). Adjust this factor to see the most significant changes in therapeutic potential.`;
                  })()}
                </div>
              </div>

              {/* Chart */}
              {chartImg && (
                <div style={{ marginTop: 14 }}>
                  <div className="card-title">SHAP Visualization</div>
                  <img 
                    src={chartImg} 
                    alt="SHAP chart" 
                    style={{ 
                      width: "100%", 
                      borderRadius: "var(--radius)", 
                      marginTop: 8,
                      border: "1px solid var(--border)"
                    }} 
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SHAP;