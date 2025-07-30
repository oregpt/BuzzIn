import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage, WSResponse } from '@shared/schema';

// Global WebSocket instance to prevent multiple connections
let globalWs: WebSocket | null = null;
let connectionCount = 0;
let isConnecting = false;
let globalMessageHandlers = new Map<string, Set<(data: any) => void>>();

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSResponse | null>(null);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));

  const connect = useCallback(() => {
    connectionCount++;
    console.log(`[${instanceId.current}] Connecting... Total instances:`, connectionCount);

    // If we already have a global connection that's working, reuse it
    if (globalWs && (globalWs.readyState === WebSocket.CONNECTING || globalWs.readyState === WebSocket.OPEN)) {
      console.log(`[${instanceId.current}] Reusing existing WebSocket connection`);
      setIsConnected(globalWs.readyState === WebSocket.OPEN);
      return;
    }

    // Prevent multiple concurrent connection attempts
    if (isConnecting) {
      console.log(`[${instanceId.current}] Connection already in progress, waiting...`);
      return;
    }

    isConnecting = true;

    // Close existing connection if it exists
    if (globalWs) {
      globalWs.close();
      globalWs = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    globalWs = new WebSocket(wsUrl);

    globalWs.onopen = () => {
      console.log(`[${instanceId.current}] WebSocket connected to:`, wsUrl);
      setIsConnected(true);
      isConnecting = false;
    };

    globalWs.onclose = () => {
      console.log(`[${instanceId.current}] WebSocket disconnected`);
      setIsConnected(false);
      globalWs = null;
      isConnecting = false;
      // Only reconnect if connection was not manually closed
      setTimeout(connect, 3000);
    };

    globalWs.onerror = (error) => {
      console.error(`[${instanceId.current}] WebSocket error:`, error);
      setIsConnected(false);
      isConnecting = false;
    };

    globalWs.onmessage = (event) => {
      try {
        const message: WSResponse = JSON.parse(event.data);
        console.log(`[Global] Received WebSocket message:`, message);
        
        // Broadcast to ALL registered handlers for this message type
        const handlers = globalMessageHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.data);
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    connectionCount--;
    console.log(`[${instanceId.current}] Disconnecting... Remaining instances:`, connectionCount);
    
    // Clean up this instance's message handlers
    messageHandlers.current.forEach((handler, type) => {
      const handlers = globalMessageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          globalMessageHandlers.delete(type);
        }
      }
    });
    
    // Never close the global connection during navigation - keep it alive
    // Only close if explicitly requested or on page unload
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    console.log(`[${instanceId.current}] Attempting to send message:`, message, 'WebSocket state:', globalWs?.readyState);
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      console.log(`[${instanceId.current}] Sending WebSocket message:`, message);
      globalWs.send(JSON.stringify(message));
    } else {
      console.warn(`[${instanceId.current}] WebSocket is not connected, readyState:`, globalWs?.readyState);
      // Queue the message to be sent when connection opens
      if (globalWs && globalWs.readyState === WebSocket.CONNECTING) {
        const queuedSend = () => {
          if (globalWs && globalWs.readyState === WebSocket.OPEN) {
            console.log(`[${instanceId.current}] Sending queued WebSocket message:`, message);
            globalWs.send(JSON.stringify(message));
          }
        };
        globalWs.addEventListener('open', queuedSend, { once: true });
      }
    }
  }, []);

  const onMessage = useCallback((type: string, handler: (data: any) => void) => {
    messageHandlers.current.set(type, handler);
    
    // Add to global handlers
    if (!globalMessageHandlers.has(type)) {
      globalMessageHandlers.set(type, new Set());
    }
    globalMessageHandlers.get(type)!.add(handler);
    
    // Return cleanup function
    return () => {
      messageHandlers.current.delete(type);
      const handlers = globalMessageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          globalMessageHandlers.delete(type);
        }
      }
    };
  }, []);

  useEffect(() => {
    connect();
    
    // Update connection state if global connection exists
    if (globalWs) {
      setIsConnected(globalWs.readyState === WebSocket.OPEN);
    }
    
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    onMessage,
    connect,
    disconnect,
  };
}
