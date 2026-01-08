"""
URL configuration for NeuroBridge project.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from apps.stream.emotion_api import analyze_emotion_view, health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Emotion Analysis API
    path('api/emotion/analyze/', analyze_emotion_view, name='emotion_analyze'),
    path('api/emotion/health/', health_check, name='emotion_health'),
    
    # App-specific endpoints
    path('api/auth/', include('apps.core.urls')),
    path('api/sessions/', include('apps.assistant_sessions.urls')),
]
