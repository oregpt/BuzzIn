import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Hand, Users, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGameState } from "@/hooks/use-game-state";
import { formatCurrency } from "@/lib/game-data";

export default function GamePlayer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { gameState, isLoading, error, refreshGameState, sendAction } = useGameState();

  // Local player state
  const [playerId, setPlayerId] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [answer, setAnswer] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Initialize from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const playerIdParam = urlParams.get('player');
    const gameIdParam = urlParams.get('game');
    const roomCodeParam = urlParams.get('room');
    
    if (!playerIdParam || !gameIdParam) {
      navigate('/');
      return;
    }

    setPlayerId(playerIdParam);
    refreshGameState(gameIdParam);
  }, [navigate, refreshGameState]);

  // Handle timer for current question
  useEffect(() => {
    if (gameState?.currentQuestion) {
      setTimeRemaining(30); // 30 second timer
      setHasSubmitted(false);
      setAnswer("");
    } else {
      setTimeRemaining(0);
    }
  }, [gameState?.currentQuestion]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining > 0 && gameState?.currentQuestion) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, gameState?.currentQuestion]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const handleBuzz = () => {
    if (!gameState?.currentQuestion || !playerId) return;
    
    sendAction({
      type: "buzz",
      data: { questionId: gameState.currentQuestion.id }
    });
  };

  const handleSubmitAnswer = () => {
    if (!gameState?.currentQuestion || !playerId || !answer.trim()) return;
    
    sendAction({
      type: "submit_answer",
      data: {
        questionId: gameState.currentQuestion.id,
        answer: answer.trim(),
        submissionTime: Date.now()
      }
    });
    
    setHasSubmitted(true);
  };

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
          <h1>Game not found</h1>
          <Button onClick={() => navigate('/')}>Return to Lobby</Button>
        </div>
      </div>
    );
  }

  // Find current player
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  if (!currentPlayer) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1>Player not found</h1>
          <Button onClick={() => navigate('/')}>Return to Lobby</Button>
        </div>
      </div>
    );
  }

  const otherPlayers = gameState.players.filter(p => p.id !== playerId && !p.isHost);
  const playerBuzz = gameState.buzzes?.find(b => b.playerId === playerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{currentPlayer.name}</h1>
            <p className="text-blue-200">Room: {gameState.roomCode} | Score: {formatCurrency(currentPlayer.score)}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>

        {/* Current Question */}
        {gameState.currentQuestion ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">
                  {gameState.currentQuestion.category} - {formatCurrency(gameState.currentQuestion.value)}
                </CardTitle>
                <div className={`text-2xl font-bold px-3 py-1 rounded ${
                  timeRemaining <= 5 ? 'bg-red-500 text-white' : 
                  timeRemaining <= 10 ? 'bg-yellow-500 text-white' : 
                  'bg-green-500 text-white'
                }`}>
                  {timeRemaining}s
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-900 rounded text-lg">
                {gameState.currentQuestion.question}
              </div>

              {/* Buzz Button */}
              {!playerBuzz && timeRemaining > 0 && (
                <Button
                  onClick={handleBuzz}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-8 text-2xl"
                  size="lg"
                >
                  <Hand className="mr-3 h-8 w-8" />
                  BUZZ IN!
                </Button>
              )}

              {/* Buzz Status */}
              {playerBuzz && (
                <div className="text-center p-4 bg-yellow-600 rounded">
                  <p className="text-lg font-bold">
                    You buzzed in #{playerBuzz.buzzOrder}!
                  </p>
                  {playerBuzz.isFirst && (
                    <p className="text-sm">You were first! Wait for the host to respond.</p>
                  )}
                </div>
              )}

              {/* Answer Submission */}
              {timeRemaining > 0 && !hasSubmitted && (
                <div className="space-y-2">
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Submit Answer
                  </Button>
                </div>
              )}

              {hasSubmitted && (
                <div className="text-center p-4 bg-green-600 rounded">
                  <p className="font-bold">Answer submitted!</p>
                  <p className="text-sm">Waiting for host to review...</p>
                </div>
              )}

              {/* Buzz Order Display */}
              {gameState.buzzes && gameState.buzzes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-white">Buzz Order:</h4>
                  <div className="grid gap-1">
                    {gameState.buzzes.map((buzz) => (
                      <div
                        key={buzz.playerId}
                        className={`p-2 rounded text-sm ${
                          buzz.playerId === playerId ? 'bg-yellow-600' : 'bg-gray-700'
                        }`}
                      >
                        #{buzz.buzzOrder} - {buzz.playerName}
                        {buzz.isFirst && <span className="ml-2 text-xs">(FIRST!)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Waiting for Question</h3>
              <p className="text-gray-300">Host will select the next question...</p>
            </CardContent>
          </Card>
        )}

        {/* Other Players */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5" />
              Other Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {otherPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <span className="text-white">{player.name}</span>
                  <span className="font-bold text-lg text-green-400">{formatCurrency(player.score)}</span>
                </div>
              ))}
              {otherPlayers.length === 0 && (
                <p className="text-gray-400 text-center py-4">No other players yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}