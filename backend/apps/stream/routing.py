"""
WebSocket URL routing for the Stream app.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/neurobridge/$', consumers.NeuroBridgeConsumer.as_asgi()),
]
