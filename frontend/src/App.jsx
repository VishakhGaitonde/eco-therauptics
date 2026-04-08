import { useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import Classifier from "./components/Classifier";
import Forecast from "./components/Forecast";
import Scheduler from "./components/Scheduler";
import SHAP from "./components/SHAP";

const DEFAULT_SENSOR_SNAPSHOT = {
  RH_mean: 59,
  Air_Temp_mean: 23,
  CO2_mean: 450,
  pH: 6.4,
  EC: 1.87,
  Water_Temp: 22,
};

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sensorSnapshot, setSensorSnapshot] = useState(DEFAULT_SENSOR_SNAPSHOT);
  const [growthStage, setGrowthStage] = useState("Mid");
  const [growthStageSource, setGrowthStageSource] = useState("manual");

  const pages = {
    dashboard: { label: "Overview", component: Dashboard, icon: "📊" },
    classifier: { label: "Plant Classifier", component: Classifier, icon: "🌿" },
    forecast: { label: "TI Forecast", component: Forecast, icon: "📈" },
    scheduler: { label: "Scheduler", component: Scheduler, icon: "📅" },
    shap: { label: "SHAP Analysis", component: SHAP, icon: "🔍" },
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🌱 eco-therapeutics</h1>
          <p>Plant Health Intelligence</p>
        </div>

        <nav style={{ flex: 1 }}>
          {Object.entries(pages).map(([key, { label, icon }]) => (
            <div
              key={key}
              className={`nav-item ${currentPage === key ? "active" : ""}`}
              onClick={() => setCurrentPage(key)}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)", marginTop: "auto", padding: "16px 20px 0" }}>
          <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>
            v0.1.0 — Backend running
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main">
        {Object.entries(pages).map(([key, { component: PageComponent }]) => (
          <section
            key={key}
            style={{ display: currentPage === key ? "block" : "none", width: "100%" }}
            aria-hidden={currentPage !== key}
          >
            <PageComponent
              {...(key === "dashboard"
                ? {
                    sensorSnapshot,
                    growthStage,
                    setGrowthStage,
                    growthStageSource,
                    setGrowthStageSource,
                  }
                : {})}
              {...(key === "classifier"
                ? {
                    onGrowthStageDetected: (stage) => setGrowthStage(stage),
                    setGrowthStageSource,
                  }
                : {})}
              {...(key === "shap"
                ? {
                    setSensorSnapshot,
                  }
                : {})}
            />
          </section>
        ))}
      </main>
    </div>
  );
}

export default App;