/**
 * useWebSocket Hook - WebSocket connection with JWT authentication
 * 
 * Handles:
 * - Connection management with auto-reconnect
 * - JWT token authentication via query parameter
 * - Message routing and type-safe handlers
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSessionStore, useSettingsStore } from '../stores';

export type MessageHandler = (data: Record<string, unknown>) => void;

interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    error: string | null;
    connect: () => void;
    disconnect: () => void;
    send: (message: WebSocketMessage) => boolean;
    subscribe: (type: string, handler: MessageHandler) => () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/neurobridge/';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const accessToken = useSettingsStore((s) => s.accessToken);
    const setConnectionStatus = useSessionStore((s) => s.setConnectionStatus);

    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
    const reconnectAttempts = useRef(0);
    const reconnectTimeoutRef = useRef<number | null>(null);

    /**
     * Subscribe to a message type
     */
    const subscribe = useCallback((type: string, handler: MessageHandler) => {
        if (!handlersRef.current.has(type)) {
            handlersRef.current.set(type, new Set());
        }
        handlersRef.current.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            handlersRef.current.get(type)?.delete(handler);
        };
    }, []);

    /**
     * Send a message through the WebSocket
     */
    const send = useCallback((message: WebSocketMessage): boolean => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Cannot send - not connected');
            return false;
        }

        try {
            wsRef.current.send(JSON.stringify(message));
            return true;
        } catch (err) {
            console.error('[WS] Send error:', err);
            return false;
        }
    }, []);

    /**
     * Handle incoming messages
     */
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data) as WebSocketMessage;
            const type = data.type;

            if (!type) {
                console.warn('[WS] Received message without type:', data);
                return;
            }

            // Route to handlers
            const handlers = handlersRef.current.get(type);
            if (handlers) {
                handlers.forEach((handler) => handler(data));
            }

            // Also call wildcard handlers
            const wildcardHandlers = handlersRef.current.get('*');
            if (wildcardHandlers) {
                wildcardHandlers.forEach((handler) => handler(data));
            }
        } catch (err) {
            console.error('[WS] Message parse error:', err);
        }
    }, []);

    /**
     * Connect to the WebSocket server
     */
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        if (!accessToken) {
            setError('No access token available');
            return;
        }

        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        try {
            // Connect with JWT token in query params
            const url = `${WS_URL}?token=${accessToken}`;
            wsRef.current = new WebSocket(url);

            wsRef.current.onopen = () => {
                console.log('[WS] Connected');
                setIsConnected(true);
                setError(null);
                setConnectionStatus(true, null);
                reconnectAttempts.current = 0;
            };

            wsRef.current.onclose = (event) => {
                console.log('[WS] Disconnected:', event.code, event.reason);
                setIsConnected(false);
                setConnectionStatus(false, null);

                // Auth failure - don't reconnect
                if (event.code === 4001) {
                    setError('Authentication failed');
                    return;
                }

                // Auto-reconnect for unexpected disconnections
                if (
                    event.code !== 1000 &&
                    reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
                ) {
                    reconnectAttempts.current++;
                    console.log(
                        `[WS] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts.current})`
                    );
                    reconnectTimeoutRef.current = window.setTimeout(connect, RECONNECT_DELAY);
                }
            };

            wsRef.current.onerror = () => {
                setError('WebSocket connection error');
                setConnectionStatus(false, 'Connection error');
            };

            wsRef.current.onmessage = handleMessage;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setConnectionStatus(false, errorMessage);
        }
    }, [accessToken, handleMessage, setConnectionStatus]);

    /**
     * Disconnect from the WebSocket server
     */
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'User disconnect');
            wsRef.current = null;
        }

        setIsConnected(false);
        setError(null);
        reconnectAttempts.current = 0;
    }, []);

    // Auto-connect when token is available
    useEffect(() => {
        if (accessToken && !isConnected) {
            connect();
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [accessToken, connect, isConnected]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        error,
        connect,
        disconnect,
        send,
        subscribe,
    };
}
