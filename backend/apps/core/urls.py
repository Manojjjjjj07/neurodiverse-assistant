"""
URL patterns for the Core app.
"""

from django.urls import path
from .views import RegisterView, ProfileView, PreferencesView, HealthCheckView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('preferences/', PreferencesView.as_view(), name='preferences'),
    path('health/', HealthCheckView.as_view(), name='health'),
]
