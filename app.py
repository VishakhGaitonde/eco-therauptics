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

cnn_model.fc = nn.Sequential(
    nn.Linear(512, 128),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(128, 3)
)

cnn_model.load_state_dict(
    torch.load('cnn_best.pth', map_location=device)
)

cnn_model = cnn_model.to(device)
cnn_model.eval()


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

        img_bytes = base64.b64decode(data['image'])
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')

        tensor = cnn_transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            outputs = cnn_model(tensor)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()[0]
            pred = int(np.argmax(probs))

        return jsonify({
            'growth_stage': STAGE_NAMES[pred],
            'confidence': round(float(np.max(probs)), 4),
            'probabilities': {
                'Early': round(float(probs[0]), 4),
                'Mid': round(float(probs[1]), 4),
                'Late': round(float(probs[2]), 4)
            }
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

        ph_stress = abs(last['pH'] - 6.5)
        temp_stress = abs(last['Water_Temp'] - 22.0)

        ti = last['EC'] * 0.4 + ph_stress * 0.4 + temp_stress * 0.2

        return jsonify({
            'therapeutic_index': round(ti, 4),
            'lstm_prediction': round(pred, 4),
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

        shap_vals = explainer(X)
        values = shap_vals.values[0]

        fig, ax = plt.subplots()
        ax.barh(FEATURE_NAMES, values)
        ax.axvline(0)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)

        chart = base64.b64encode(buf.read()).decode()

        return jsonify({
            'shap_values': dict(zip(FEATURE_NAMES, values.tolist())),
            'chart': chart
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
        ti = float(data.get('baseline_ti', 1.3))
        target = float(data.get('target_ti', 1.8))

        events = []
        last = -2

        for day in range(1, n_days + 1):
            if (day - last >= 2) and (ti < target):
                ti += 0.15
                events.append({'day': day, 'ti': round(ti, 3)})
                last = day

        return jsonify({
            'final_ti': round(ti, 3),
            'events': events
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