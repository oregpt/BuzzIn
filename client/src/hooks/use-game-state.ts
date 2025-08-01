import { useState, useCallback } from 'react';
import { CompleteGameState, WSMessage } from '@shared/schema';
import { useWebSocket } from './use-websocket';

export function useGameState() {
  const [gameState, setGameState] = useState<CompleteGameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { sendMessage, onMessage } = useWebSocket();

  // Handle complete game state updates from server
  onMessage("game_state", (data: CompleteGameState) => {
    console.log('Received complete game state from server:', data);
    setGameState(data);
    setIsLoading(false);
    setError(null);
  });

  // Handle errors
  onMessage("error", (data: { message: string }) => {
    console.error('Server error:', data.message);
    setError(data.message);
    setIsLoading(false);
  });

  // Request current game state from server
  const refreshGameState = useCallback((gameId: string) => {
    setIsLoading(true);
    setError(null);
    sendMessage({
      type: "get_game_state",
      data: { gameId }
    });
  }, [sendMessage]);

  // Send action to server (server will update state and broadcast)
  const sendAction = useCallback((message: WSMessage) => {
    setError(null);
    sendMessage(message);
  }, [sendMessage]);

  return {
    gameState,
    isLoading,
    error,
    refreshGameState,
    sendAction,
    setGameState // For direct state updates from other message handlers
  };
}