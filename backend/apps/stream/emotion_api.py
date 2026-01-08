"""
Emotion Analysis API - Local FER+ ONNX Model

Uses the FER+ (Facial Expression Recognition Plus) ONNX model
stored locally in backend/models/ for emotion detection.

Model: emotion-ferplus-8.onnx (~35MB)
Input: 64x64 grayscale face image
Output: 8 emotions with confidence scores

PRIVACY: All processing happens locally. Frames are never stored.
"""

import base64
import logging
import os
from typing import Optional

import cv2
import numpy as np
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import onnxruntime as ort

logger = logging.getLogger(__name__)

# Models (lazy loaded)
_face_cascade = None
_emotion_session = None

# FER+ emotion labels (in order of model output)
EMOTIONS = ['neutral', 'happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'contempt']

# Model paths
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
EMOTION_MODEL_PATH = os.path.abspath(os.path.join(MODEL_DIR, 'emotion-ferplus-8.onnx'))


def get_face_detector():
    """Get OpenCV Haar cascade face detector."""
    global _face_cascade
    if _face_cascade is None:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        _face_cascade = cv2.CascadeClassifier(cascade_path)
        logger.info("Face detector loaded (OpenCV Haar cascade)")
    return _face_cascade


def get_emotion_model():
    """Load FER+ ONNX emotion classification model."""
    global _emotion_session
    if _emotion_session is None:
        if not os.path.exists(EMOTION_MODEL_PATH):
            raise FileNotFoundError(
                f"Emotion model not found: {EMOTION_MODEL_PATH}\n"
                "Please download from: https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx"
            )
        
        logger.info(f"Loading emotion model: {EMOTION_MODEL_PATH}")
        _emotion_session = ort.InferenceSession(
            EMOTION_MODEL_PATH,
            providers=['CPUExecutionProvider']
        )
        logger.info("Emotion model loaded successfully (FER+ ONNX)")
    return _emotion_session


def decode_base64_image(base64_string: str) -> Optional[np.ndarray]:
    """Decode base64 image to OpenCV BGR format."""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return image
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        return None


def preprocess_face_for_fer(face_bgr: np.ndarray) -> np.ndarray:
    """
    Preprocess face for FER+ model.
    
    FER+ expects:
    - 64x64 grayscale image
    - Float32 normalized
    - Shape: (1, 1, 64, 64) - NCHW format
    """
    # Convert to grayscale
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    
    # Resize to 64x64
    resized = cv2.resize(gray, (64, 64))
    
    # Normalize to float32
    normalized = resized.astype(np.float32)
    
    # Reshape to NCHW: (batch, channels, height, width)
    tensor = normalized.reshape(1, 1, 64, 64)
    
    return tensor


def softmax(x):
    """Compute softmax values."""
    exp_x = np.exp(x - np.max(x))
    return exp_x / exp_x.sum()


def analyze_emotion(image: np.ndarray) -> dict:
    """
    Detect face and analyze emotion.
    
    Returns dict with:
    - emotion: dominant emotion string
    - confidence: float 0-1
    - face_detected: bool
    - all_emotions: dict of all emotion scores
    """
    try:
        # Detect faces
        detector = get_face_detector()
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(48, 48)
        )
        
        if len(faces) == 0:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'face_detected': False,
                'all_emotions': {}
            }
        
        # Get largest face
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        
        # Extract and preprocess face
        face_roi = image[y:y+h, x:x+w]
        face_tensor = preprocess_face_for_fer(face_roi)
        
        # Run emotion model
        session = get_emotion_model()
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: face_tensor})
        
        # Get probabilities
        logits = outputs[0][0]
        probs = softmax(logits)
        
        # Build emotion scores dict
        all_emotions = {EMOTIONS[i]: float(probs[i]) for i in range(len(EMOTIONS))}
        
        # Get top emotion
        top_idx = np.argmax(probs)
        top_emotion = EMOTIONS[top_idx]
        top_confidence = float(probs[top_idx])
        
        return {
            'emotion': top_emotion,
            'confidence': top_confidence,
            'face_detected': True,
            'all_emotions': all_emotions
        }
        
    except FileNotFoundError as e:
        logger.error(str(e))
        return {
            'emotion': 'neutral',
            'confidence': 0.0,
            'face_detected': False,
            'error': 'Model not found'
        }
    except Exception as e:
        logger.exception(f"Emotion analysis error: {e}")
        return {
            'emotion': 'neutral',
            'confidence': 0.0,
            'face_detected': False,
            'error': str(e)
        }


@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_emotion_view(request):
    """
    API endpoint to analyze emotion from base64 image.
    
    POST /api/emotion/analyze/
    Body: { "image": "data:image/jpeg;base64,..." }
    
    Response: {
        "emotion": "happiness",
        "confidence": 0.87,
        "face_detected": true,
        "all_emotions": { "neutral": 0.05, "happiness": 0.87, ... }
    }
    """
    image_data = request.data.get('image')
    if not image_data:
        return JsonResponse({'error': 'No image provided'}, status=400)
    
    image = decode_base64_image(image_data)
    if image is None:
        return JsonResponse({'error': 'Failed to decode image'}, status=400)
    
    result = analyze_emotion(image)
    
    return JsonResponse({
        'emotion': result['emotion'],
        'confidence': round(result['confidence'], 2),
        'face_detected': result['face_detected'],
        'all_emotions': {k: round(v, 3) for k, v in result.get('all_emotions', {}).items()}
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Check if emotion analysis service is ready."""
    try:
        get_face_detector()
        get_emotion_model()
        return JsonResponse({
            'status': 'healthy',
            'model': 'fer-plus-onnx',
            'model_path': EMOTION_MODEL_PATH
        })
    except FileNotFoundError as e:
        return JsonResponse({
            'status': 'model_missing',
            'error': str(e)
        }, status=503)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=503)
