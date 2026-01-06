"""
JWT Authentication Middleware for Django Channels WebSocket.

WHY CUSTOM MIDDLEWARE:
- Standard HTTP auth headers don't work with WebSocket protocol
- We pass the JWT token as a query parameter during connection
- This middleware validates the token and attaches the user to scope

SECURITY NOTES:
- Token in query params is visible in server logs - use HTTPS in production
- Consider implementing short-lived WebSocket-specific tokens for production
- Token validation happens only on connect, not per-message (performance)
"""

import jwt
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token: str):
    """
    Validate JWT token and return the associated user.
    
    Returns AnonymousUser if token is invalid or expired.
    """
    try:
        # Decode the token using Django's secret key
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=['HS256']
        )
        
        # Get user from token payload
        user_id = payload.get('user_id')
        if user_id is None:
            return AnonymousUser()
        
        user = User.objects.get(id=user_id)
        return user
        
    except jwt.ExpiredSignatureError:
        # Token has expired
        return AnonymousUser()
    except jwt.InvalidTokenError:
        # Token is invalid
        return AnonymousUser()
    except User.DoesNotExist:
        # User no longer exists
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware that authenticates WebSocket connections using JWT.
    
    Usage:
        1. Client connects to: ws://localhost:8000/ws/neurobridge/?token=<jwt_token>
        2. This middleware extracts and validates the token
        3. User object is attached to scope['user']
        4. Consumer can check self.scope['user'].is_authenticated
    """
    
    async def __call__(self, scope, receive, send):
        # Extract query string from scope
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        
        # Get token from query params
        token_list = query_params.get('token', [])
        token = token_list[0] if token_list else None
        
        if token:
            # Validate token and get user
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
