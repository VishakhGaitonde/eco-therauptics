# 🌿 Eco-Therapeutics AI System

An AI-powered system for plant growth stage detection, therapeutic index prediction, and intelligent elicitation scheduling using Deep Learning and Machine Learning.

---

## 🚀 Overview

This project integrates multiple AI models:

- 🧠 CNN (ResNet18) → Image-based growth stage classification  
- 🔁 LSTM → Time-series forecasting using sensor data  
- ⚡ XGBoost → Feature-based prediction  
- 📊 SHAP → Model explainability  
- 📅 Scheduler → Optimized stress planning  

Backend is built with **Flask**, frontend with **React (Vite)**.

---

## 🏗️ Project Structure

```
eco-therapeutics/
│
├── backend/
│   ├── app.py
│   ├── cnn_best.pth
│   ├── lstm_best.pth
│   ├── xgb_model.pkl
│   ├── scaler.pkl (optional)
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── api.js
│       ├── components/
│       └── services/
│
└── README.md
```

---

## ⚙️ Backend Setup

### Install dependencies
```bash
pip install flask flask-cors torch torchvision xgboost joblib shap pillow numpy pandas matplotlib scipy
```

### Run backend
```bash
cd backend
python app.py
```

Backend runs at:
```
http://127.0.0.1:5000
```

---

## ⚛️ Frontend Setup

### Install dependencies
```bash
cd frontend
npm install
```

### Run frontend
```bash
npm run dev
```

Frontend runs at:
```
http://localhost:5173
```

---

## 🔌 API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "models": ["CNN", "LSTM", "XGBoost"],
  "version": "1.0"
}
```

---

### Growth Stage Classification
```
POST /api/classify
```

Body:
```json
{
  "image": "<base64 image>"
}
```

---

### Forecast (LSTM)
```
POST /api/forecast
```

Body:
```json
{
  "sensor_sequence": [
    {
      "RH_mean": 60,
      "Air_Temp_mean": 23,
      "CO2_mean": 450,
      "pH": 6.5,
      "EC": 2.0,
      "Water_Temp": 22
    }
  ]
}
```

---

### Fusion Prediction
```
POST /api/fusion
```

Body:
```json
{
  "features": [60, 23, 450, 6.5, 2.0, 22]
}
```

---

### SHAP Explainability
```
POST /api/shap
```

Returns feature importance + base64 chart.

---

### Scheduler
```
POST /api/schedule
```

Body:
```json
{
  "n_days": 30,
  "baseline_ti": 1.3,
  "target_ti": 1.8
}
```

---

## 🎨 Features

- Image upload for plant classification  
- Sensor data input for forecasting  
- Real-time ML predictions  
- SHAP visualization  
- Smart scheduling system  
- React dashboard UI  

---

## 🧠 Models Used

| Model   | Purpose                          |
|--------|----------------------------------|
| CNN    | Growth stage classification      |
| LSTM   | Time-series prediction           |
| XGBoost| Regression prediction            |
| SHAP   | Explainability                   |

---

## 🧪 Testing

You can test APIs using Postman:

```
http://127.0.0.1:5000/api/health
```

---

## ⚠️ Notes

- Ensure model files are present in `backend/`
- Backend must run before frontend
- Base64 image required for classification
- Scheduler requires valid numeric inputs

---

## 📌 Future Improvements

- Deployment (AWS / Render / GCP)
- Authentication system
- UI enhancements (Figma-level)
- IoT sensor integration
- Model optimization

---

## 📄 License

For academic and research use.
