"""
Session API - Endpoints for saving and retrieving emotion sessions.

Endpoints:
- POST /api/sessions/emotion/save/ - Save a new emotion session
- GET /api/sessions/emotion/ - List all emotion sessions
- GET /api/sessions/emotion/latest/ - Get the most recent session
- DELETE /api/sessions/emotion/<id>/ - Delete a session
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import EmotionSession
import json
from datetime import datetime


@api_view(['POST'])
@permission_classes([AllowAny])
def save_emotion_session(request):
    """
    Save a new emotion session.
    
    Request body:
    {
        "started_at": "2026-01-09T00:00:00Z",
        "ended_at": "2026-01-09T00:10:00Z",
        "duration_seconds": 600,
        "dominant_emotion": "happiness",
        "dominant_emotion_percentage": 45.5,
        "emotion_breakdown": {"happiness": 45.5, "neutral": 30.2, ...},
        "total_readings": 60,
        "average_confidence": 0.75,
        "title": "Team Meeting"  // optional
    }
    """
    try:
        data = request.data
        
        # Parse timestamps
        started_at = datetime.fromisoformat(data['started_at'].replace('Z', '+00:00'))
        ended_at = datetime.fromisoformat(data['ended_at'].replace('Z', '+00:00'))
        
        session = EmotionSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            started_at=started_at,
            ended_at=ended_at,
            duration_seconds=data['duration_seconds'],
            dominant_emotion=data['dominant_emotion'],
            dominant_emotion_percentage=data['dominant_emotion_percentage'],
            emotion_breakdown=data['emotion_breakdown'],
            total_readings=data.get('total_readings', 0),
            average_confidence=data.get('average_confidence', 0.0),
            title=data.get('title', '')
        )
        
        return JsonResponse({
            'id': session.id,
            'message': 'Session saved successfully',
            'created_at': session.created_at.isoformat()
        }, status=201)
        
    except KeyError as e:
        return JsonResponse({'error': f'Missing field: {e}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_emotion_sessions(request):
    """List all emotion sessions, most recent first."""
    sessions = EmotionSession.objects.all()[:50]  # Limit to 50
    
    result = []
    for s in sessions:
        result.append({
            'id': s.id,
            'started_at': s.started_at.isoformat(),
            'ended_at': s.ended_at.isoformat(),
            'duration_seconds': s.duration_seconds,
            'dominant_emotion': s.dominant_emotion,
            'dominant_emotion_percentage': s.dominant_emotion_percentage,
            'emotion_breakdown': s.emotion_breakdown,
            'total_readings': s.total_readings,
            'average_confidence': s.average_confidence,
            'title': s.title,
            'created_at': s.created_at.isoformat()
        })
    
    return JsonResponse({'sessions': result, 'count': len(result)})


@api_view(['GET'])
@permission_classes([AllowAny])
def get_latest_session(request):
    """Get the most recent emotion session."""
    try:
        session = EmotionSession.objects.first()  # Already ordered by -ended_at
        
        if not session:
            return JsonResponse({'session': None, 'message': 'No sessions found'})
        
        return JsonResponse({
            'session': {
                'id': session.id,
                'started_at': session.started_at.isoformat(),
                'ended_at': session.ended_at.isoformat(),
                'duration_seconds': session.duration_seconds,
                'dominant_emotion': session.dominant_emotion,
                'dominant_emotion_percentage': session.dominant_emotion_percentage,
                'emotion_breakdown': session.emotion_breakdown,
                'total_readings': session.total_readings,
                'average_confidence': session.average_confidence,
                'title': session.title,
                'created_at': session.created_at.isoformat()
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_emotion_session(request, session_id):
    """Delete an emotion session by ID."""
    try:
        session = EmotionSession.objects.get(id=session_id)
        session.delete()
        return JsonResponse({'message': 'Session deleted successfully'})
    except EmotionSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
