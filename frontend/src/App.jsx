import { useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import Classifier from "./components/Classifier";
import Forecast from "./components/Forecast";
import Scheduler from "./components/Scheduler";
import SHAP from "./components/SHAP";
import WaterBackground from "./components/WaterBackground";
import Navbar from "./components/Navbar";

const DEFAULT_SENSOR_SNAPSHOT = {
  RH_mean: 59,
  Air_Temp_mean: 23,
  CO2_mean: 450,
  pH: 6.4,
  EC: 1.87,
  Water_Temp: 22,
};

function App() {
  const [currentPage, setCurrentPage] = useState("classifier");
  const [sensorSnapshot, setSensorSnapshot] = useState(DEFAULT_SENSOR_SNAPSHOT);
  const [growthStage, setGrowthStage] = useState("Mid");
  const [growthStageSource, setGrowthStageSource] = useState("manual");
  const [currentTi, setCurrentTi] = useState(null);

  const pages = {
    classifier: { label: "Plant Classifier", component: Classifier, icon: "🌿" },
    shap: { label: "SHAP Analysis", component: SHAP, icon: "🔍" },
    dashboard: { label: "Overview", component: Dashboard, icon: "📊" },
    forecast: { label: "TI Forecast", component: Forecast, icon: "📈" },
    scheduler: { label: "Scheduler", component: Scheduler, icon: "📅" },
  };

  return (
    <>
      <WaterBackground />
      <div className="app-shell">
        {/* Main content */}
        <main className="main full-width">
          <div className="navbar-container">
            <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
          
          <div className="content-container">
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
                        currentTi,
                        setCurrentTi,
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
                  {...(key === "scheduler"
                    ? {
                        currentTi,
                      }
                    : {})}
                />
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

export default App;