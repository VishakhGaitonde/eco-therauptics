const BASE_URL = "http://127.0.0.1:5000/api";

export const classifyImage = async (base64) => {
  const res = await fetch(`${BASE_URL}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 }),
  });
  return res.json();
};

export const forecastTI = async (sensorData) => {
  const res = await fetch(`${BASE_URL}/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sensor_sequence: sensorData }),
  });
  return res.json();
};

export const fusionPredict = async (features) => {
  const res = await fetch(`${BASE_URL}/fusion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });
  return res.json();
};

export const shapExplain = async (features) => {
  const res = await fetch(`${BASE_URL}/shap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });
  return res.json();
};

export const schedulePlan = async () => {
  const res = await fetch(`${BASE_URL}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      n_days: 30,
      baseline_ti: 1.3,
      target_ti: 1.8,
      max_stress_per_week: 3,
      min_gap_days: 2,
    }),
  });
  return res.json();
};

export const getOptimalParams = async (targetTI) => {
  const res = await fetch(`${BASE_URL}/optimal_params`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_ti: targetTI }),
  });
  return res.json();
};