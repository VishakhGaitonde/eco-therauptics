import { useState, useRef } from "react";
import { classifyImage } from "../services/api";

const Classifier = () => {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClassify = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const base64 = preview.split(",")[1];
      const data = await classifyImage(base64);
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const stageColor = {
    Early: "badge-blue",
    Mid: "badge-amber",
    Late: "badge-green",
  };

  return (
    <div>
      <div className="page-header">
        <h2>Plant classifier</h2>
        <p>Upload a segmented plant image — CNN classifies growth stage</p>
      </div>

      <div className="grid-equal">
        {/* Upload */}
        <div className="card">
          <div className="card-title">Upload image</div>

          <div
            className={`upload-area ${drag ? "drag-over" : ""}`}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="upload-icon">🌿</div>
            <div className="upload-text">Drop plant image here</div>
            <div className="upload-hint">PNG or JPG — 640×480 recommended</div>
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {preview && (
            <div style={{ marginTop: 14 }}>
              <img src={preview} alt="preview" className="img-preview" />
            </div>
          )}

          <button
            className="btn btn-green btn-full"
            style={{ marginTop: 14 }}
            onClick={handleClassify}
            disabled={!preview || loading}
          >
            {loading ? <><span className="spinner" /> Classifying...</> : "Run CNN classifier"}
          </button>

          {error && (
            <div className="alert-item alert-warning" style={{ marginTop: 10 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="card">
          <div className="card-title">Classification result</div>

          {!result && (
            <div style={{ color: "var(--text3)", fontSize: 13, paddingTop: 12 }}>
              Upload and classify an image to see results here.
            </div>
          )}

          {result && (
            <>
              <div className="ti-gauge-wrap" style={{ padding: "12px 0" }}>
                <span className={`badge ${stageColor[result.growth_stage] ?? "badge-green"}`}
                  style={{ fontSize: 16, padding: "6px 20px" }}>
                  {result.growth_stage}
                </span>
                <div className="ti-label" style={{ marginTop: 8 }}>Growth stage</div>
              </div>

              <div className="result-box">
                <div className="result-row">
                  <span className="result-key">Confidence</span>
                  <span className="result-val">{(result.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="card-title">Stage probabilities</div>
                {["Early", "Mid", "Late"].map((s) => (
                  <div className="prob-row" key={s}>
                    <span className="prob-label">{s}</span>
                    <div className="prob-track">
                      <div
                        className="prob-fill"
                        style={{
                          width: `${((result.probabilities?.[s] ?? 0) * 100).toFixed(1)}%`,
                          background: s === result.growth_stage ? "var(--green)" : "var(--border2)"
                        }}
                      />
                    </div>
                    <span className="prob-pct">
                      {((result.probabilities?.[s] ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="card-title">Interpretation</div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
                  {result.growth_stage === "Early" && "Plant is in seedling phase. Avoid heavy stress events. Allow root establishment."}
                  {result.growth_stage === "Mid" && "Plant is in vegetative growth. Optimal window for elicitation to boost secondary metabolites."}
                  {result.growth_stage === "Late" && "Plant approaching harvest. Light stress may boost final TI. Harvest within 5–7 days."}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Classifier;