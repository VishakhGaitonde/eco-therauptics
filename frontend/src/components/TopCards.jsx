const TopCards = ({ ti, stage, pH, EC }) => {
  const getStageColor = (s) => {
    if (s === "Early") return "badge-blue";
    if (s === "Mid") return "badge-amber";
    if (s === "Late") return "badge-green";
    return "badge-green";
  };

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-label">Therapeutic Index</div>
        <div className="metric-value">{ti ?? "—"}</div>
        <div className="metric-sub">proxy medicinal potency</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Growth Stage</div>
        <div style={{ marginTop: 6 }}>
          <span className={`badge ${getStageColor(stage)}`}>
            {stage ?? "—"}
          </span>
        </div>
        <div className="metric-sub">CNN classification</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">pH Level</div>
        <div className="metric-value" style={{ color: pH < 6 || pH > 7.5 ? "var(--amber)" : "var(--green)" }}>
          {pH ?? "—"}
        </div>
        <div className="metric-sub">optimal: 6.0 – 7.0</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">EC Value</div>
        <div className="metric-value" style={{ color: "var(--blue)" }}>
          {EC ?? "—"}
        </div>
        <div className="metric-sub">mS/cm</div>
      </div>
    </div>
  );
};

export default TopCards;