"""
ASGI config for NeuroBridge project.

This is the entry point for ASGI-compatible web servers.
We use Daphne as the ASGI server for WebSocket support.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

# Import after Django setup to avoid AppRegistryNotReady
from apps.stream.routing import websocket_urlpatterns
from apps.stream.middleware import JWTAuthMiddleware

application = ProtocolTypeRouter({
    # HTTP requests are handled by Django's ASGI application
    'http': django_asgi_app,
    
    # WebSocket connections go through JWT auth middleware
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
