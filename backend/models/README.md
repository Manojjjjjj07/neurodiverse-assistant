# Vision Models for NeuroBridge

Download facial emotion recognition models and place them here.

## FER+ ONNX Model (Recommended)

**Download (~35MB):**
https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx

**Save as:**
```
backend/models/emotion-ferplus-8.onnx
```

### Model Details
| Property | Value |
|----------|-------|
| **Size** | ~35 MB |
| **Input** | 64x64 grayscale face |
| **Output** | 8 emotions |
| **Format** | ONNX |

### Emotions Detected
1. Neutral
2. Happiness
3. Surprise
4. Sadness
5. Anger
6. Disgust
7. Fear
8. Contempt

## Usage

After downloading, the backend will automatically load the model from this folder.
