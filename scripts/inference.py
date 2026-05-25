import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import sys

import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'severity_model.pt')
device = "mps" if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available() else "cpu"

model = models.resnet18(weights=None)
model.fc = nn.Sequential(
    nn.Dropout(0.3),
    nn.Linear(model.fc.in_features, 1),
    nn.Sigmoid()
)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.eval()
model = model.to(device)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

def get_severity(image_path):
    img = Image.open(image_path).convert("RGB")
    img = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        score = model(img).item()
    return round(score, 4)

if len(sys.argv) == 2:
    image1 = sys.argv[1]
    score1 = get_severity(image1)
    print(f"{score1}")
elif len(sys.argv) == 3:
    image1 = sys.argv[1]
    image2 = sys.argv[2]
    score1 = get_severity(image1)
    score2 = get_severity(image2)
    
    # ── Min-Max Normalization (Feature Scaling) ──
    # The model's outputs are heavily squeezed (approx 0.55 to 0.75) due to regression to the mean.
    # We mathematically stretch these boundaries to [0.0, 1.0] to calibrate the scores.
    MIN_VAL = 0.55
    MAX_VAL = 0.75
    
    def normalize_score(s):
        if s < MIN_VAL: s = MIN_VAL
        if s > MAX_VAL: s = MAX_VAL
        return (s - MIN_VAL) / (MAX_VAL - MIN_VAL)
        
    norm1 = normalize_score(score1)
    norm2 = normalize_score(score2)
    
    improvement = ((norm1 - norm2) / norm1) * 100 if norm1 != 0 else 0
    
    if improvement > 100.0:
        improvement = 100.0
    elif improvement < -100.0:
        improvement = -100.0
        
    print(f"{score1},{score2},{round(improvement, 2)}")
