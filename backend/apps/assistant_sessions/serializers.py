"""
Serializers for the Sessions app.
"""

import base64
from rest_framework import serializers
from .models import Session, EncryptedMetadata, EmotionSnapshot


class EncryptedMetadataSerializer(serializers.ModelSerializer):
    """
    Serializer for encrypted metadata.
    
    Handles base64 encoding/decoding for binary fields since
    JSON doesn't support raw binary data.
    """
    
    # Convert binary to base64 for JSON transport
    encrypted_blob = serializers.CharField(write_only=True)
    encrypted_blob_b64 = serializers.SerializerMethodField(read_only=True)
    iv = serializers.CharField(write_only=True)
    iv_b64 = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = EncryptedMetadata
        fields = [
            'id', 'session', 'encrypted_blob', 'encrypted_blob_b64',
            'iv', 'iv_b64', 'data_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_encrypted_blob_b64(self, obj):
        return base64.b64encode(obj.encrypted_blob).decode('utf-8')
    
    def get_iv_b64(self, obj):
        return base64.b64encode(obj.iv).decode('utf-8')
    
    def validate_encrypted_blob(self, value):
        """Decode base64 to bytes."""
        try:
            return base64.b64decode(value)
        except Exception:
            raise serializers.ValidationError("Invalid base64 encoding")
    
    def validate_iv(self, value):
        """Decode base64 to bytes and validate length."""
        try:
            iv_bytes = base64.b64decode(value)
            if len(iv_bytes) != 12:
                raise serializers.ValidationError(
                    "IV must be exactly 12 bytes for AES-GCM"
                )
            return iv_bytes
        except Exception:
            raise serializers.ValidationError("Invalid base64 encoding")


class EmotionSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for emotion snapshots."""
    
    class Meta:
        model = EmotionSnapshot
        fields = [
            'id', 'session', 'dominant_emotion', 'emotion_distribution',
            'sarcasm_instances', 'conflict_instances',
            'window_start', 'window_end', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SessionSerializer(serializers.ModelSerializer):
    """Serializer for Session model."""
    
    encrypted_metadata = EncryptedMetadataSerializer(many=True, read_only=True)
    emotion_snapshots = EmotionSnapshotSerializer(many=True, read_only=True)
    
    class Meta:
        model = Session
        fields = [
            'id', 'user', 'title', 'started_at', 'ended_at',
            'duration_seconds', 'is_active',
            'encrypted_metadata', 'emotion_snapshots'
        ]
        read_only_fields = [
            'id', 'user', 'started_at', 'ended_at',
            'duration_seconds', 'is_active'
        ]


class SessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for session lists (no nested data)."""
    
    class Meta:
        model = Session
        fields = [
            'id', 'title', 'started_at', 'ended_at',
            'duration_seconds', 'is_active'
        ]
        read_only_fields = ['id', 'started_at', 'ended_at', 'duration_seconds']


class SessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new session."""
    
    class Meta:
        model = Session
        fields = ['id', 'title', 'started_at', 'is_active']
        read_only_fields = ['id', 'started_at', 'is_active']
