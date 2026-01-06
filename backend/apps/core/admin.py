"""
Admin configuration for the Core app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Custom User admin with neuro-preference fields."""
    
    list_display = [
        'username', 'email', 'preferred_hud_intensity',
        'enable_topic_anchoring', 'is_active'
    ]
    
    fieldsets = UserAdmin.fieldsets + (
        ('Neuro-Preferences', {
            'fields': (
                'preferred_hud_intensity',
                'enable_topic_anchoring',
                'enable_sarcasm_detection',
                'enable_audio_analysis',
                'enable_facial_analysis',
                'sensory_preferences',
                'auto_delete_sessions',
            )
        }),
        ('Calibration', {
            'fields': ('emotion_baseline',),
            'classes': ('collapse',)
        }),
    )
