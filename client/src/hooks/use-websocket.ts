import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage, WSResponse } from '@shared/schema';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSResponse | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      // Attempt to reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WSResponse = JSON.parse(event.data);
        setLastMessage(message);
        
        // Call specific handler if registered
        const handler = messageHandlers.current.get(message.type);
        if (handler) {
          handler(message.data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
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
