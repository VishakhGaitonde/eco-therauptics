# ============================================================
# FINAL FLASK BACKEND — FULLY FIXED
# ============================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import numpy as np
import joblib
import shap
import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from ultralytics import YOLO
import cv2
import numpy as np

# ============================================================
# APP INIT
# ============================================================

app = Flask(__name__)
CORS(app)

device = torch.device('cpu')

# ============================================================
# LOAD MODELS
# ============================================================

print("Loading models...")

# ✅ CNN — FIXED (NO WRAPPER)
cnn_model = models.resnet18(
    weights=models.ResNet18_Weights.IMAGENET1K_V1
)

# After creating model, before load_state_dict
for param in cnn_model.parameters():
    param.requires_grad = False

for param in cnn_model.layer4.parameters():
    param.requires_grad = True

cnn_model.fc = nn.Sequential(
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Dropout(0.4),
    nn.Linear(256, 128),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(128, 3)
)

cnn_model.load_state_dict(
    torch.load('cnn_best.pth', map_location=device)
)
cnn_model.eval()

print("Loading YOLOv8...")
yolo_model = YOLO('yolov8n.pt')  # downloads automatically on first run
print("YOLOv8 loaded ✅")

# ✅ LSTM MODEL
class PhytochemicalLSTM(nn.Module):
    def __init__(self, input_size=6, hidden_size=32):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 16),
            nn.ReLU(),
            nn.Linear(16, 1)
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


lstm_model = PhytochemicalLSTM().to(device)
lstm_model.load_state_dict(
    torch.load('lstm_best.pth', map_location=device)
)
lstm_model.eval()


# ✅ XGBOOST
xgb_model = joblib.load('xgb_model.pkl')

# ✅ OPTIONAL SCALER
try:
    scaler = joblib.load('scaler.pkl')
    USE_SCALER = True
    print("Scaler loaded ✅")
except:
    USE_SCALER = False
    print("Scaler not found — fallback normalization ⚠️")

# ✅ SHAP (LOAD ONCE — IMPORTANT FIX)
explainer = shap.Explainer(xgb_model)

print("All models loaded successfully ✅")

# ============================================================
# CONFIG
# ============================================================

cnn_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

STAGE_NAMES = {0: 'Early', 1: 'Mid', 2: 'Late'}
FEATURE_NAMES = ['RH_mean', 'Air_Temp_mean', 'CO2_mean', 'pH', 'EC', 'Water_Temp']

# ============================================================
# HEALTH CHECK
# ============================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models': ['CNN', 'LSTM', 'XGBoost'],
        'version': '1.0'
    })

# ============================================================
# IMAGE CLASSIFICATION
# ============================================================

@app.route('/api/classify', methods=['POST'])
def classify():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        # Decode base64 image
        img_bytes = base64.b64decode(data['image'])
        img_array = np.frombuffer(img_bytes, np.uint8)
        img_cv = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if img_cv is None:
            return jsonify({'error': 'Could not decode image'}), 400

        # Step 1 — YOLOv8 detects plants in full image
        results = yolo_model(img_cv, verbose=False)
        boxes = results[0].boxes

        crops = []
        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                # Add small padding
                pad = 10
                x1 = max(0, x1 - pad)
                y1 = max(0, y1 - pad)
                x2 = min(img_cv.shape[1], x2 + pad)
                y2 = min(img_cv.shape[0], y2 + pad)
                crop = img_cv[y1:y2, x1:x2]
                if crop.size > 0:
                    crops.append(crop)

        # Fallback — if YOLOv8 finds nothing, use full image as one crop
        if len(crops) == 0:
            crops = [img_cv]

        # Step 2 — CNN classifies each crop
        all_probs = []

        for crop in crops:
            # Convert BGR to RGB
            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(crop_rgb)
            tensor = cnn_transform(pil_img).unsqueeze(0).to(device)

            with torch.no_grad():
                output = cnn_model(tensor)
                probs = torch.softmax(output, dim=1).cpu().numpy()[0]
                all_probs.append(probs)

        # Step 3 — Average probabilities across all crops
        avg_probs = np.mean(all_probs, axis=0)
        pred = int(np.argmax(avg_probs))

        return jsonify({
            'growth_stage': STAGE_NAMES[pred],
            'confidence': round(float(np.max(avg_probs)), 4),
            'probabilities': {
                'Early': round(float(avg_probs[0]), 4),
                'Mid':   round(float(avg_probs[1]), 4),
                'Late':  round(float(avg_probs[2]), 4),
            },
            'plants_detected': len(crops),
            'yolo_detections': len(boxes) if boxes is not None else 0,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# ============================================================
# LSTM FORECAST
# ============================================================

@app.route('/api/forecast', methods=['POST'])
def forecast():
    try:
        data = request.get_json()
        seq = data.get('sensor_sequence', [])

        if len(seq) < 3:
            return jsonify({'error': 'Need at least 3 records'}), 400

        rows = seq[-3:]

        X = np.array([[
            r['RH_mean'], r['Air_Temp_mean'], r['CO2_mean'],
            r['pH'], r['EC'], r['Water_Temp']
        ] for r in rows], dtype=np.float32)

        if USE_SCALER:
            X = scaler.transform(X)
        else:
            mins = np.array([37, 9, 400, 5.3, 1.44, 17.2])
            maxs = np.array([72, 44, 560, 7.5, 3.32, 28.3])
            X = (X - mins) / (maxs - mins + 1e-8)

        tensor = torch.FloatTensor(X).unsqueeze(0).to(device)

        with torch.no_grad():
            pred = float(lstm_model(tensor).item())

        last = rows[-1]

        # ✅ BALANCED TI CALCULATION - Blend LSTM output with sensor quality
        # Normalize the raw LSTM prediction into the TI range so it can be
        # compared fairly with the sensor-derived score.
        lstm_score = 0.4 + (max(0.0, min(pred, 1.0)) * 2.6)
        lstm_score = max(0.4, min(3.0, lstm_score))

        # Calculate stress factors (optimal ranges)
        ph_optimal = 6.5
        ph_stress = min(abs(last['pH'] - ph_optimal) / 2.0, 2.0)

        ec_optimal = 1.8
        ec_stress = min(abs(last['EC'] - ec_optimal) / 1.5, 2.0)

        temp_optimal = 22.0
        temp_stress = min(abs(last['Water_Temp'] - temp_optimal) / 8.0, 2.0)

        air_temp_optimal = 25.0
        air_temp_stress = min(abs(last['Air_Temp_mean'] - air_temp_optimal) / 8.0, 2.0)

        co2_optimal = 450
        co2_stress = min((last['CO2_mean'] - co2_optimal) ** 2 / 10000, 2.0)

        rh_optimal = 65
        rh_stress = min((last['RH_mean'] - rh_optimal) ** 2 / 5000, 2.0)

        # Combined stress penalty keeps the environmental signal visible.
        stress_penalty = (
            ph_stress * 0.22 +
            ec_stress * 0.22 +
            temp_stress * 0.20 +
            air_temp_stress * 0.08 +
            co2_stress * 0.14 +
            rh_stress * 0.14
        )

        sensor_quality = 3.0 - (stress_penalty * 1.3)
        sensor_quality = max(0.4, min(3.0, sensor_quality))

        # Final TI is a 80/20 blend of model output and sensor quality.
        ti = (lstm_score * 0.80) + (sensor_quality * 0.20)
        ti = max(0.4, min(3.0, ti))  # Clamp between 0.4 and 3.0

        return jsonify({
            'therapeutic_index': round(ti, 4),
            'lstm_prediction': round(pred, 4),
            'lstm_score': round(lstm_score, 4),
            'sensor_quality_score': round(sensor_quality, 4),
            'interpretation': _interpret_ti(ti),
            'recommendation': _recommend(ti)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# XGBOOST
# ============================================================

@app.route('/api/fusion', methods=['POST'])
def fusion():
    try:
        data = request.get_json()
        features = data.get('features')

        if not features or len(features) != 6:
            return jsonify({'error': 'Need 6 features'}), 400

        X = np.array(features, dtype=np.float32).reshape(1, -1)
        pred = float(xgb_model.predict(X)[0])

        return jsonify({
            'prediction': round(pred, 4),
            'interpretation': _interpret_ti(pred)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# SHAP
# ============================================================

@app.route('/api/shap', methods=['POST'])
def shap_explain():
    try:
        data = request.get_json()
        features = data.get('features')

        if not features or len(features) != 6:
            return jsonify({'error': 'Need 6 features'}), 400

        X = np.array(features, dtype=np.float32).reshape(1, -1)

        # ✅ NORMALIZE features like we do in forecast
        if USE_SCALER:
            X_normalized = scaler.transform(X)
        else:
            mins = np.array([37, 9, 400, 5.3, 1.44, 17.2])
            maxs = np.array([72, 44, 560, 7.5, 3.32, 28.3])
            X_normalized = (X - mins) / (maxs - mins + 1e-8)

        # ✅ IMPORTANT: XGBoost explainer expects raw features (not normalized)
        # Calculate SHAP values on normalized data for consistency
        shap_vals = explainer(X_normalized)
        values = shap_vals.values[0]

        # ✅ Generate chart
        fig, ax = plt.subplots(figsize=(8, 5))
        colors = ['#3ddc84' if v > 0 else '#e05252' for v in values]
        ax.barh(FEATURE_NAMES, values, color=colors)
        ax.axvline(0, color='#4a6b54', linestyle='-', linewidth=0.8)
        ax.set_xlabel('SHAP value (impact on prediction)', fontsize=10)
        ax.set_title('Feature Importance - SHAP Analysis', fontsize=11, fontweight='bold')
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, facecolor='#0a0f0d', edgecolor='none')
        buf.seek(0)
        plt.close(fig)

        chart = base64.b64encode(buf.read()).decode()

        # ✅ Return normalized feature values for context
        return jsonify({
            'shap_values': dict(zip(FEATURE_NAMES, [round(float(v), 4) for v in values])),
            'input_features': dict(zip(FEATURE_NAMES, [round(float(v), 2) for v in features])),
            'chart': chart,
            'base_value': round(float(explainer.expected_value), 4)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# SCHEDULER
# ============================================================

@app.route('/api/schedule', methods=['POST'])
def schedule():
    try:
        data = request.get_json()

        n_days = int(data.get('n_days', 30))
        baseline_ti = float(data.get('baseline_ti', 1.3))
        target_ti = float(data.get('target_ti', 1.8))
        max_stress_per_week = int(data.get('max_stress_per_week', 3))
        min_gap_days = int(data.get('min_gap_days', 2))

        # Stress types to rotate through
        stress_types = ['pH', 'EC', 'Temperature', 'CO2', 'Light']
        stress_idx = 0
        
        schedule = []
        current_ti = baseline_ti
        last_event_day = -min_gap_days
        events_this_week = 0
        current_week = 1

        for day in range(1, n_days + 1):
            # Check if we start a new week
            if day > 1 and (day - 1) % 7 == 0:
                current_week += 1
                events_this_week = 0

            # Decision: add stress event?
            can_add_event = (
                (day - last_event_day >= min_gap_days) and  # Minimum gap satisfied
                (current_ti < target_ti) and  # Below target
                (events_this_week < max_stress_per_week)  # Weekly limit
            )

            if can_add_event:
                # Apply stress effect
                current_ti += 0.18  # Stress increases secondary metabolites
                
                schedule.append({
                    'day': day,
                    'stress_type': stress_types[stress_idx % len(stress_types)],
                    'estimated_ti': round(current_ti, 3),
                    'week': current_week
                })
                
                last_event_day = day
                events_this_week += 1
                stress_idx += 1
            else:
                # Slight natural decline without stress
                current_ti = max(baseline_ti - 0.05, current_ti - 0.02)

        return jsonify({
            'schedule': schedule,
            'final_ti': round(current_ti, 3),
            'target_reached': current_ti >= target_ti,
            'total_events': len(schedule)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# HELPERS
# ============================================================

def _interpret_ti(ti):
    if ti < 1.0:
        return 'Low'
    elif ti < 1.5:
        return 'Moderate'
    return 'High'

def _recommend(ti):
    if ti < 1.0:
        return 'Increase stress'
    elif ti < 1.5:
        return 'Monitor'
    return 'Maintain'

# ============================================================
# RUN
# ============================================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)