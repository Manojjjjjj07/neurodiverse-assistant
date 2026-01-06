"""
Models for the Sessions app.

PRIVACY ARCHITECTURE:
- The server stores ONLY client-side encrypted data
- All encryption happens in the browser using Web Crypto API (AES-GCM)
- The server CANNOT decrypt this data - it's "zero-knowledge" storage
- This ensures user emotional data remains private even if server is compromised
"""

from django.db import models
from django.conf import settings


class Session(models.Model):
    """
    Represents an assistant session (e.g., a meeting or conversation).
    
    Sessions track when the assistant was active but do NOT store
    any raw audio/video data. Only encrypted metadata is stored.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    
    # Session timing
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Session metadata (not encrypted - safe to store)
    title = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Optional user-provided title for the session'
    )
    
    # Duration in seconds (calculated when session ends)
    duration_seconds = models.PositiveIntegerField(
        null=True,
        blank=True
    )
    
    # Session state
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Session'
        verbose_name_plural = 'Sessions'
    
    def __str__(self):
        return f"Session {self.id} - {self.user.username} ({self.started_at.date()})"
    
    def end_session(self):
        """Mark session as ended and calculate duration."""
        from django.utils import timezone
        
        self.ended_at = timezone.now()
        self.is_active = False
        self.duration_seconds = int(
            (self.ended_at - self.started_at).total_seconds()
        )
        self.save()


class EncryptedMetadata(models.Model):
    """
    Stores client-side encrypted session metadata.
    
    ZERO-KNOWLEDGE STORAGE:
    - The 'encrypted_blob' contains AES-GCM encrypted data
    - Only the client has the decryption key
    - Server stores but CANNOT read this data
    - The 'iv' (initialization vector) is required for decryption
    
    This might contain:
    - Emotion timeline summaries
    - Topic anchoring data
    - Conflict/sarcasm detection events
    - User notes about the session
    """
    
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='encrypted_metadata'
    )
    
    # The encrypted payload (AES-GCM encrypted by client)
    encrypted_blob = models.BinaryField(
        help_text='AES-GCM encrypted data - server cannot decrypt'
    )
    
    # Initialization vector for AES-GCM decryption
    iv = models.BinaryField(
        help_text='12-byte IV required for decryption'
    )
    
    # Metadata type hint (not sensitive, helps client route data)
    # e.g., 'emotion_timeline', 'topic_anchors', 'notes'
    data_type = models.CharField(
        max_length=50,
        default='general',
        help_text='Type of encrypted data for client-side routing'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Encrypted Metadata'
        verbose_name_plural = 'Encrypted Metadata'
    
    def __str__(self):
        return f"EncryptedMetadata ({self.data_type}) - Session {self.session_id}"


class EmotionSnapshot(models.Model):
    """
    Stores aggregated emotion statistics (NOT raw data).
    
    This is OPTIONAL and only stores if user opts-in.
    Contains only statistical aggregates, not moment-by-moment data.
    Used for long-term insights and pattern recognition.
    """
    
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='emotion_snapshots'
    )
    
    # Aggregated stats (averages over session window)
    dominant_emotion = models.CharField(max_length=50, blank=True)
    emotion_distribution = models.JSONField(
        default=dict,
        help_text='Percentage breakdown of detected emotions'
    )
    
    # Conflict detection stats
    sarcasm_instances = models.PositiveIntegerField(default=0)
    conflict_instances = models.PositiveIntegerField(default=0)
    
    # Time window this snapshot covers
    window_start = models.DateTimeField()
    window_end = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['window_start']
        verbose_name = 'Emotion Snapshot'
        verbose_name_plural = 'Emotion Snapshots'
