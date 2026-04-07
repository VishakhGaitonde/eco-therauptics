import { useState } from "react";
import { schedulePlan } from "../services/api";

export default function Scheduler() {
  const [target, setTarget] = useState(1.8);
  const [max, setMax] = useState(3);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:5000/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n_days: 30,
          baseline_ti: 1.3,
          target_ti: target,
          max_stress_per_week: max,
          min_gap_days: 2
        })
      });
      
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Elicitation Scheduler</h2>
        <p>Optimize stress events to maximize therapeutic potential over 30 days</p>
      </div>

      <div className="grid-equal">
        <div className="card">
          <div className="card-title">Parameters</div>

          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              Target TI: <span style={{ color: "var(--green)", fontWeight: 600 }}>{target.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="2.5" 
              step="0.1"
              value={target} 
              onChange={(e) => setTarget(parseFloat(e.target.value))}
              style={{ width: "100%", cursor: "pointer" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              Max events/week: <span style={{ color: "var(--green)", fontWeight: 600 }}>{max}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5"
              value={max} 
              onChange={(e) => setMax(parseFloat(e.target.value))}
              style={{ width: "100%", cursor: "pointer" }}
            />
          </label>

          <button 
            className="btn btn-green btn-full" 
            onClick={run}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Optimizing...</> : "Run Optimizer"}
          </button>

          {error && (
            <div className="alert-item alert-warning" style={{ marginTop: 10 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Optimized Schedule</div>

          {!data && (
            <div style={{ color: "var(--text3)", fontSize: 13 }}>
              Configure parameters and run optimizer to see schedule.
            </div>
          )}

          {data && (
            <>
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>Final TI</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "var(--green)" }}>
                      {data.final_ti}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>Total Events</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "var(--blue)" }}>
                      {data.total_events}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>Target Reached</div>
                    <span className={`badge ${data.target_reached ? 'badge-green' : 'badge-amber'}`}>
                      {data.target_reached ? '✓ Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {data.schedule?.length > 0 ? (
                  data.schedule.map((e, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "var(--bg3)",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ color: "var(--text2)", fontFamily: "var(--mono)", fontSize: 12, marginRight: 8 }}>
                          Day {e.day}
                        </span>
                        <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 11 }}>
                          W{e.week}
                        </span>
                      </div>
                      <span className="badge badge-amber">
                        {e.stress_type}
                      </span>
                      <span style={{ 
                        marginLeft: 12, 
                        color: "var(--green)", 
                        fontFamily: "var(--mono)", 
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {e.estimated_ti}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "var(--text3)", fontSize: 12, textAlign: "center", padding: 16 }}>
                    No stress events needed
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}