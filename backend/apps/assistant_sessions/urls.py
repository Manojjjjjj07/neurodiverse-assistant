"""
URL patterns for the Sessions app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, EncryptedMetadataViewSet

router = DefaultRouter()
router.register(r'', SessionViewSet, basename='session')
router.register(r'metadata', EncryptedMetadataViewSet, basename='metadata')

urlpatterns = [
    path('', include(router.urls)),
]
