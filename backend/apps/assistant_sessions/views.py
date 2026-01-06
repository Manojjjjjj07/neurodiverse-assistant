"""
Views for the Sessions app.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Session, EncryptedMetadata, EmotionSnapshot
from .serializers import (
    SessionSerializer,
    SessionListSerializer,
    SessionCreateSerializer,
    EncryptedMetadataSerializer,
    EmotionSnapshotSerializer
)


class SessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing assistant sessions.
    
    Endpoints:
    - GET /api/sessions/ - List all sessions for current user
    - POST /api/sessions/ - Start a new session
    - GET /api/sessions/{id}/ - Get session details
    - PATCH /api/sessions/{id}/ - Update session (e.g., title)
    - DELETE /api/sessions/{id}/ - Delete session
    - POST /api/sessions/{id}/end/ - End an active session
    - POST /api/sessions/{id}/metadata/ - Add encrypted metadata
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter sessions to current user only."""
        return Session.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SessionListSerializer
        elif self.action == 'create':
            return SessionCreateSerializer
        return SessionSerializer
    
    def perform_create(self, serializer):
        """Associate new session with current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """
        End an active session.
        
        POST /api/sessions/{id}/end/
        """
        session = self.get_object()
        
        if not session.is_active:
            return Response(
                {'error': 'Session is already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.end_session()
        serializer = SessionSerializer(session)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def metadata(self, request, pk=None):
        """
        Add encrypted metadata to a session.
        
        POST /api/sessions/{id}/metadata/
        
        Body:
        {
            "encrypted_blob": "<base64 encoded AES-GCM ciphertext>",
            "iv": "<base64 encoded 12-byte IV>",
            "data_type": "emotion_timeline"
        }
        """
        session = self.get_object()
        
        serializer = EncryptedMetadataSerializer(data={
            **request.data,
            'session': session.id
        })
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def snapshot(self, request, pk=None):
        """
        Add emotion snapshot to a session.
        
        POST /api/sessions/{id}/snapshot/
        """
        session = self.get_object()
        
        serializer = EmotionSnapshotSerializer(data={
            **request.data,
            'session': session.id
        })
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EncryptedMetadataViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing encrypted metadata.
    
    Users can only access their own session's metadata.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = EncryptedMetadataSerializer
    
    def get_queryset(self):
        """Filter to current user's session metadata only."""
        return EncryptedMetadata.objects.filter(
            session__user=self.request.user
        )
