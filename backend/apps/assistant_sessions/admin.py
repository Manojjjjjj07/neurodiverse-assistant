"""
Admin configuration for the Sessions app.
"""

from django.contrib import admin
from .models import Session, EncryptedMetadata, EmotionSnapshot


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'title', 'started_at', 'ended_at', 'is_active']
    list_filter = ['is_active', 'started_at']
    search_fields = ['user__username', 'title']
    readonly_fields = ['started_at', 'ended_at', 'duration_seconds']


@admin.register(EncryptedMetadata)
class EncryptedMetadataAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'data_type', 'created_at']
    list_filter = ['data_type', 'created_at']
    
    # Note: We can't view the encrypted content
    exclude = ['encrypted_blob', 'iv']
    
    def has_change_permission(self, request, obj=None):
        # Encrypted data should not be editable
        return False


@admin.register(EmotionSnapshot)
class EmotionSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'session', 'dominant_emotion',
        'sarcasm_instances', 'conflict_instances', 'window_start'
    ]
    list_filter = ['dominant_emotion', 'window_start']
