# AI Models Directory

This directory contains the ONNX models for local emotion recognition.

## Required Models

### 1. FER+ (Facial Emotion Recognition)

**File:** `emotion-ferplus-8.onnx`  
**Size:** ~34 MB  
**Source:** [ONNX Model Zoo](https://github.com/onnx/models/tree/main/validated/vision/body_analysis/emotion_ferplus)

Download directly:
```bash
curl -L -o emotion-ferplus-8.onnx "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx"
```

Or use PowerShell:
```powershell
Invoke-WebRequest -Uri "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx" -OutFile "emotion-ferplus-8.onnx"
```

### 2. Audio Model (Wav2Vec2)

The audio model is automatically downloaded by Transformers.js on first use.
No manual download required.

## Model Information

| Model | Input | Output | Emotions |
|-------|-------|--------|----------|
| FER+ | 64x64 grayscale | 8 probabilities | neutral, happiness, surprise, sadness, anger, disgust, fear, contempt |
| Wav2Vec2 | 16kHz audio | 8 probabilities | angry, calm, disgust, fearful, happy, neutral, sad, surprised |

## Privacy Note

All models run **entirely in your browser** using:
- ONNX Runtime Web (WebGPU/WASM)
- Transformers.js

**No data is ever sent to external servers.**
