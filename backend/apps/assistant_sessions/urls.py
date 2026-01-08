"""
URL patterns for the Sessions app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, EncryptedMetadataViewSet
from .session_api import (
    save_emotion_session,
    list_emotion_sessions,
    get_latest_session,
    delete_emotion_session,
)

router = DefaultRouter()
router.register(r'', SessionViewSet, basename='session')
router.register(r'metadata', EncryptedMetadataViewSet, basename='metadata')

urlpatterns = [
    # Emotion Session API
    path('emotion/save/', save_emotion_session, name='emotion_session_save'),
    path('emotion/', list_emotion_sessions, name='emotion_session_list'),
    path('emotion/latest/', get_latest_session, name='emotion_session_latest'),
    path('emotion/<int:session_id>/', delete_emotion_session, name='emotion_session_delete'),
    
    # Existing router URLs
    path('', include(router.urls)),
]

