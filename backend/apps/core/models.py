"""
Custom User Model for NeuroBridge.

Extends Django's AbstractUser with neuro-preference settings
to personalize the assistant experience for neurodivergent users.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model with neurodivergent-specific preferences.
    
    These settings allow users to customize how the assistant
    presents information, respecting sensory sensitivities and
    cognitive preferences common in ADHD, ASD, and anxiety.
    """
    
    # HUD Intensity Preferences
    HUD_INTENSITY_CHOICES = [
        ('subtle', 'Subtle - Minimal visual indicators'),
        ('moderate', 'Moderate - Balanced feedback'),
        ('prominent', 'Prominent - Clear, visible indicators'),
    ]
    preferred_hud_intensity = models.CharField(
        max_length=20,
        choices=HUD_INTENSITY_CHOICES,
        default='moderate',
        help_text='Controls the visibility of emotion indicators'
    )
    
    # Feature Toggles
    enable_topic_anchoring = models.BooleanField(
        default=True,
        help_text='Show topic anchors to help re-engage in conversation (ADHD)'
    )
    
    enable_sarcasm_detection = models.BooleanField(
        default=True,
        help_text='Highlight potential sarcasm/irony (ASD)'
    )
    
    enable_audio_analysis = models.BooleanField(
        default=True,
        help_text='Analyze vocal prosody for emotion detection'
    )
    
    enable_facial_analysis = models.BooleanField(
        default=True,
        help_text='Analyze facial expressions for emotion detection'
    )
    
    # Personal Calibration Data (client-side encrypted before storage)
    # This stores the user's personal baseline for emotion detection
    # to account for neurodivergent expression patterns
    emotion_baseline = models.JSONField(
        default=dict,
        blank=True,
        help_text='Encrypted personal baseline for emotion calibration'
    )
    
    # Sensory Preferences
    sensory_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text='Color schemes, animation preferences, etc.'
    )
    
    # Privacy Settings
    auto_delete_sessions = models.BooleanField(
        default=False,
        help_text='Automatically delete session data after 24 hours'
    )
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.username
    
    def get_default_sensory_preferences(self):
        """
        Returns default sensory preferences based on the relaxing color palette.
        Colors derived from sage greens, warm beiges, and muted terracotta.
        """
        return {
            'theme': 'calm',
            'colors': {
                'primary': '#8B9A82',      # Sage green
                'secondary': '#D4C5B9',    # Warm beige
                'accent': '#C4A484',        # Muted terracotta
                'background': '#F5F1EB',   # Soft cream
                'surface': '#E8E2D9',      # Light taupe
                'text': '#4A4A4A',         # Soft charcoal
            },
            'animations': {
                'enabled': True,
                'reducedMotion': False,
                'transitionSpeed': 'normal',
            },
        }
