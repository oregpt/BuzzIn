import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Trophy, Users, Check, X, Star, ArrowLeft, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGameState } from "@/hooks/use-game-state";
import { formatCurrency } from "@/lib/game-data";
import type { CompleteGameState } from "@shared/schema";

export default function GameHost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { gameState, isLoading, error, refreshGameState, sendAction } = useGameState();

  // UI state for dialogs and modals (not game state)
  const [showQuestion, setShowQuestion] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize from game setup or URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCodeParam = urlParams.get('roomCode');
    const gameIdParam = urlParams.get('gameId');
    
    // Check if joining existing game as host
    if (roomCodeParam && gameIdParam) {
      refreshGameState(gameIdParam);
      return;
    }
    
    // Check for game setup data from the new flow
    const gameSetup = localStorage.getItem('gameSetup');
    if (gameSetup) {
      const setup = JSON.parse(gameSetup);
      
      // Create game with custom categories and questions via WebSocket
      sendAction({
        type: "create_game",
        data: {
          gameName: setup.gameName,
          hostName: setup.hostName,
          categories: setup.categories,
          gameSetup: JSON.stringify(setup)
        }
      });
      
      // Clear the setup data since we're now creating the game
      localStorage.removeItem('gameSetup');
      return;
    }

    // No setup data, redirect to lobby
    navigate('/');
  }, [sendAction, refreshGameState, navigate]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Auto-show question when one is selected
  useEffect(() => {
    if (gameState?.currentQuestion) {
      setShowQuestion(true);
    } else {
      setShowQuestion(false);
      setShowAnswer(false);
    }
  }, [gameState?.currentQuestion]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1>Loading game...</h1>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1>No game found</h1>
          <Button onClick={() => navigate('/')}>Return to Lobby</Button>
        </div>
      </div>
    );
  }

  const handleSelectQuestion = (category: string, value: number) => {
    sendAction({
      type: "select_question",
      data: { category, value, selectedBy: undefined }
    });
  };

  const handleMarkAnswer = (playerId: string, isCorrect: boolean | null) => {
    sendAction({
      type: "mark_answer",
      data: { playerId, isCorrect }
    });
  };

  const handleCloseQuestion = () => {
    sendAction({
      type: "close_question",
      data: {}
    });
  };

  const handleResetGame = () => {
    sendAction({
      type: "reset_game",
      data: {}
    });
  };

  const handleRefreshHost = () => {
    if (!gameState.gameId) return;
    refreshGameState(gameState.gameId);
    toast({
      title: "Refreshing Host...",
      description: "Getting latest game state...",
    });
  };

  const nonHostPlayers = gameState.players.filter(p => !p.isHost);
  const categories = gameState.categories || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Host Dashboard</h1>
          <p className="text-gray-600">Room: {gameState.roomCode} | Game: {gameState.gameId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshHost}>
            Refresh Host
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>

      {/* Game Board */}
      <Card>
        <CardHeader>
          <CardTitle>Game Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Categories Header */}
            <div className="grid grid-cols-6 gap-2">
              {categories.map(category => (
                <div key={category} className="text-center font-bold p-2 bg-blue-100 rounded">
                  {category}
                </div>
              ))}
            </div>

            {/* Questions Grid */}
            {[100, 200, 300, 400, 500].map(value => (
              <div key={value} className="grid grid-cols-6 gap-2">
                {categories.map(category => {
                  const question = gameState.questions?.find(q => 
                    q.category === category && q.value === value
                  );
                  const isUsed = question?.isUsed || false;
                  const isCurrent = gameState.currentQuestion?.id === question?.id;

                  return (
                    <Button
                      key={`${category}-${value}`}
                      variant={isCurrent ? "default" : isUsed ? "secondary" : "outline"}
                      disabled={isUsed}
                      onClick={() => handleSelectQuestion(category, value)}
                      className={`h-20 text-lg font-bold ${
                        isCurrent ? "bg-green-500 text-white" :
                        isUsed ? "opacity-50" : ""
                      }`}
                    >
                      {formatCurrency(value)}
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      {gameState.currentQuestion && showQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>Current Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="font-bold text-lg">{gameState.currentQuestion.category} - {formatCurrency(gameState.currentQuestion.value)}</h3>
              <p className="mt-2">{gameState.currentQuestion.question}</p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                {showAnswer ? "Hide Answer" : "Show Answer"}
              </Button>
              <Button 
                variant="outline"
                onClick={handleCloseQuestion}
              >
                Close Question
              </Button>
            </div>

            {showAnswer && (
              <div className="p-4 bg-green-50 rounded">
                <h4 className="font-bold">Correct Answer:</h4>
                <p>{gameState.currentQuestion.correctAnswer}</p>
              </div>
            )}

            {/* Buzzer Results */}
            {gameState.buzzes && gameState.buzzes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold">Buzz Order:</h4>
                {gameState.buzzes.map((buzz, index) => (
                  <div key={buzz.playerId} className="flex items-center justify-between p-2 border rounded">
                    <span>#{buzz.buzzOrder} - {buzz.playerName}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAnswer(buzz.playerId, true)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAnswer(buzz.playerId, false)}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAnswer(buzz.playerId, null)}
                      >
                        Neutral
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Players ({nonHostPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {nonHostPlayers.map(player => (
              <div key={player.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-medium">{player.name}</span>
                  {gameState.nextPicker?.playerId === player.id && (
                    <Star className="inline ml-2 h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg">{formatCurrency(player.score)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Game Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleResetGame}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}