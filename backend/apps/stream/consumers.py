"""
WebSocket Consumers for NeuroBridge real-time communication.

PRIVACY ARCHITECTURE:
- These consumers NEVER receive raw audio/video data
- They only handle:
  1. Connection management (auth, presence)
  2. Encrypted metadata sync
  3. State synchronization across devices
  
All ML inference happens client-side. The server is a "dumb pipe"
for encrypted data that it cannot read.
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)


class NeuroBridgeConsumer(AsyncWebsocketConsumer):
    """
    Main WebSocket consumer for NeuroBridge real-time features.
    
    Handles:
    - Session state synchronization
    - Encrypted metadata transmission
    - Multi-device presence (same user, multiple tabs/devices)
    
    Message Types (from client):
    - session.start: Start a new session
    - session.end: End current session
    - metadata.sync: Sync encrypted metadata to server
    - presence.ping: Keep-alive ping
    
    Message Types (to client):
    - session.started: Confirms session start with session ID
    - session.ended: Confirms session end
    - metadata.synced: Confirms metadata stored
    - error: Error message
    """
    
    async def connect(self):
        """
        Handle WebSocket connection.
        
        Validates authentication and sets up user-specific channel group.
        """
        self.user = self.scope['user']
        
        # Reject unauthenticated connections
        if not self.user.is_authenticated:
            logger.warning("Rejected unauthenticated WebSocket connection")
            await self.close(code=4001)  # Custom close code for auth failure
            return
        
        # Create user-specific group for multi-device sync
        self.user_group = f"user_{self.user.id}"
        
        # Join user group
        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name
        )
        
        # Accept the connection
        await self.accept()
        
        logger.info(f"WebSocket connected: user={self.user.username}")
        
        # Send connection confirmation
        await self.send_json({
            'type': 'connection.established',
            'user_id': self.user.id,
            'username': self.user.username,
            'timestamp': timezone.now().isoformat()
        })
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name
            )
        
        logger.info(
            f"WebSocket disconnected: user={getattr(self.user, 'username', 'unknown')}, "
            f"code={close_code}"
        )
    
    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages.
        
        All messages should be JSON with a 'type' field.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if not message_type:
                await self.send_error("Missing 'type' field in message")
                return
            
            # Route to appropriate handler
            handler = getattr(self, f"handle_{message_type.replace('.', '_')}", None)
            
            if handler:
                await handler(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON")
        except Exception as e:
            logger.exception(f"Error handling WebSocket message: {e}")
            await self.send_error(f"Internal error: {str(e)}")
    
    # ========== Message Handlers ==========
    
    async def handle_session_start(self, data):
        """
        Start a new assistant session.
        
        Expected data: { type: 'session.start', title?: string }
        """
        from apps.sessions.models import Session
        
        title = data.get('title', '')
        session = await self.create_session(title)
        
        await self.send_json({
            'type': 'session.started',
            'session_id': session.id,
            'started_at': session.started_at.isoformat()
        })
        
        # Notify other devices
        await self.channel_layer.group_send(
            self.user_group,
            {
                'type': 'session_update',
                'action': 'started',
                'session_id': session.id
            }
        )
    
    async def handle_session_end(self, data):
        """
        End an active session.
        
        Expected data: { type: 'session.end', session_id: number }
        """
        from apps.sessions.models import Session
        
        session_id = data.get('session_id')
        if not session_id:
            await self.send_error("Missing session_id")
            return
        
        success = await self.end_session(session_id)
        
        if success:
            await self.send_json({
                'type': 'session.ended',
                'session_id': session_id
            })
            
            # Notify other devices
            await self.channel_layer.group_send(
                self.user_group,
                {
                    'type': 'session_update',
                    'action': 'ended',
                    'session_id': session_id
                }
            )
        else:
            await self.send_error("Failed to end session")
    
    async def handle_metadata_sync(self, data):
        """
        Store encrypted metadata.
        
        Expected data: {
            type: 'metadata.sync',
            session_id: number,
            encrypted_blob: string (base64),
            iv: string (base64),
            data_type: string
        }
        
        PRIVACY: We store this data but CANNOT decrypt it.
        """
        import base64
        from apps.sessions.models import EncryptedMetadata, Session
        
        session_id = data.get('session_id')
        encrypted_blob = data.get('encrypted_blob')
        iv = data.get('iv')
        data_type = data.get('data_type', 'general')
        
        if not all([session_id, encrypted_blob, iv]):
            await self.send_error("Missing required fields for metadata sync")
            return
        
        try:
            metadata = await self.store_metadata(
                session_id, encrypted_blob, iv, data_type
            )
            
            await self.send_json({
                'type': 'metadata.synced',
                'metadata_id': metadata.id,
                'timestamp': metadata.created_at.isoformat()
            })
        except Exception as e:
            await self.send_error(f"Failed to store metadata: {str(e)}")
    
    async def handle_presence_ping(self, data):
        """
        Keep-alive ping.
        
        Expected data: { type: 'presence.ping' }
        """
        await self.send_json({
            'type': 'presence.pong',
            'timestamp': timezone.now().isoformat()
        })
    
    # ========== Group Message Handlers ==========
    
    async def session_update(self, event):
        """Handle session update broadcasts to user group."""
        await self.send_json({
            'type': 'session.update',
            'action': event['action'],
            'session_id': event['session_id']
        })
    
    # ========== Helper Methods ==========
    
    async def send_json(self, data):
        """Send JSON data to client."""
        await self.send(text_data=json.dumps(data))
    
    async def send_error(self, message):
        """Send error message to client."""
        await self.send_json({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        })
    
    @database_sync_to_async
    def create_session(self, title):
        """Create a new session in database."""
        from apps.sessions.models import Session
        return Session.objects.create(user=self.user, title=title)
    
    @database_sync_to_async
    def end_session(self, session_id):
        """End a session in database."""
        from apps.sessions.models import Session
        try:
            session = Session.objects.get(id=session_id, user=self.user)
            session.end_session()
            return True
        except Session.DoesNotExist:
            return False
    
    @database_sync_to_async
    def store_metadata(self, session_id, encrypted_blob, iv, data_type):
        """Store encrypted metadata in database."""
        import base64
        from apps.sessions.models import EncryptedMetadata, Session
        
        session = Session.objects.get(id=session_id, user=self.user)
        
        return EncryptedMetadata.objects.create(
            session=session,
            encrypted_blob=base64.b64decode(encrypted_blob),
            iv=base64.b64decode(iv),
            data_type=data_type
        )
