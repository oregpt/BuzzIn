import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage, WSResponse } from '@shared/schema';

// Global WebSocket instance to prevent multiple connections
let globalWs: WebSocket | null = null;
let connectionCount = 0;
let isConnecting = false;

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
        console.log(`[${instanceId.current}] Received WebSocket message:`, message);
        setLastMessage(message);
        
        // Broadcast to all active message handlers
        const handler = messageHandlers.current.get(message.type);
        if (handler) {
          handler(message.data);
        }
      } catch (error) {
        console.error(`[${instanceId.current}] Failed to parse WebSocket message:`, error);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    connectionCount--;
    console.log(`[${instanceId.current}] Disconnecting... Remaining instances:`, connectionCount);
    
    // Only actually close the connection if no other components are using it
    if (connectionCount <= 0 && globalWs) {
      console.log(`[${instanceId.current}] Closing global WebSocket connection`);
      globalWs.close();
      globalWs = null;
      connectionCount = 0;
    }
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
    
    // Return cleanup function
    return () => {
      messageHandlers.current.delete(type);
    };
  }, []);

  useEffect(() => {
    connect();
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
