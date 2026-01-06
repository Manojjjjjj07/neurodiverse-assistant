"""
Views for the Core app.
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserPreferencesSerializer
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.
    
    POST /api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    User profile endpoint.
    
    GET /api/auth/profile/ - Get current user's profile
    PATCH /api/auth/profile/ - Update current user's profile
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class PreferencesView(generics.RetrieveUpdateAPIView):
    """
    User preferences endpoint (subset of profile).
    
    GET /api/auth/preferences/ - Get current user's preferences
    PATCH /api/auth/preferences/ - Update preferences
    """
    serializer_class = UserPreferencesSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring.
    
    GET /api/auth/health/
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'service': 'neurobridge-api',
            'version': '1.0.0'
        }, status=status.HTTP_200_OK)
