"""
Serializers for the Core app.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with preference fields."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'preferred_hud_intensity', 'enable_topic_anchoring',
            'enable_sarcasm_detection', 'enable_audio_analysis',
            'enable_facial_analysis', 'sensory_preferences',
            'auto_delete_sessions'
        ]
        read_only_fields = ['id']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords don't match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for updating user preferences only."""
    
    class Meta:
        model = User
        fields = [
            'preferred_hud_intensity', 'enable_topic_anchoring',
            'enable_sarcasm_detection', 'enable_audio_analysis',
            'enable_facial_analysis', 'sensory_preferences',
            'auto_delete_sessions'
        ]
