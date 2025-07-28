import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { Trophy, Users, Pause, Square, Check, X, Star, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, VALUES, formatCurrency } from "@/lib/game-data";
import type { Player, Question } from "@shared/schema";

interface GameState {
  roomCode: string;
  gameId: string;
  players: Player[];
  currentQuestion: Question | null;
  buzzerResults: Array<{
    playerId: string;
    playerName: string;
    timestamp: number;
    isFirst: boolean;
    buzzOrder: number;
  }>;
  submittedAnswers: Array<{
    playerId: string;
    playerName: string;
    answer: string;
  }>;
  usedQuestions: Set<string>;
  nextPicker: { playerId: string; playerName: string } | null;
  selectedBy: string | null;
}

export default function GameHost() {
  const [, navigate] = useLocation();
  const { sendMessage, onMessage } = useWebSocket();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>({
    roomCode: "",
    gameId: "",
    players: [],
    currentQuestion: null,
    buzzerResults: [],
    submittedAnswers: [],
    usedQuestions: new Set(),
    nextPicker: null,
    selectedBy: null,
  });

  const [showQuestion, setShowQuestion] = useState(false);

  // Initialize from game setup or URL params
  useEffect(() => {
    // Check for game setup data from the new flow
    const gameSetup = localStorage.getItem('gameSetup');
    if (gameSetup) {
      const setup = JSON.parse(gameSetup);
      setGameState(prev => ({ 
        ...prev, 
        roomCode: setup.roomCode,
        gameId: `game_${Date.now()}` // Generate a temporary gameId for local use
      }));
      return;
    }

    // Fallback to URL params
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    const gameId = urlParams.get('game');
    
    if (!roomCode || !gameId) {
      navigate('/');
      return;
    }

    setGameState(prev => ({ ...prev, roomCode, gameId }));
  }, [navigate]);

  // WebSocket message handlers
  onMessage("player_joined", (data) => {
    setGameState(prev => ({
      ...prev,
      players: [...prev.players, data.player]
    }));
    toast({
      title: "Player Joined",
      description: `${data.player.name} joined the game`,
    });
  });

  onMessage("question_selected", (data) => {
    setGameState(prev => ({
      ...prev,
      currentQuestion: data.question,
      buzzerResults: [],
      submittedAnswers: [],
      selectedBy: data.selectedBy || null,
    }));
    setShowQuestion(true);
  });

  onMessage("buzz_received", (data) => {
    setGameState(prev => ({
      ...prev,
      buzzerResults: [...prev.buzzerResults, data].sort((a, b) => a.buzzOrder - b.buzzOrder)
    }));
  });

  onMessage("buzz_order_update", (data) => {
    setGameState(prev => ({
      ...prev,
      buzzerResults: data.buzzes.sort((a: any, b: any) => a.buzzOrder - b.buzzOrder)
    }));
  });

  onMessage("answer_submitted", (data) => {
    setGameState(prev => ({
      ...prev,
      submittedAnswers: [...prev.submittedAnswers, data]
    }));
  });

  onMessage("answer_marked", (data) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === data.playerId 
          ? { ...p, score: data.newScore }
          : p
      )
    }));
    
    toast({
      title: data.isCorrect ? "Correct!" : "Incorrect",
      description: `${data.pointsAwarded > 0 ? '+' : ''}${formatCurrency(data.pointsAwarded)}`,
      variant: data.isCorrect ? "default" : "destructive",
    });
  });

  onMessage("question_closed", (data) => {
    if (gameState.currentQuestion) {
      setGameState(prev => ({
        ...prev,
        currentQuestion: null,
        usedQuestions: new Set(Array.from(prev.usedQuestions).concat([prev.currentQuestion!.id])),
        nextPicker: data.nextPicker || null,
      }));
    }
    setShowQuestion(false);
  });

  const handleSelectQuestion = (category: string, value: number) => {
    const questionKey = `${category}-${value}`;
    if (gameState.usedQuestions.has(questionKey)) return;

    sendMessage({
      type: "select_question",
      data: { 
        category, 
        value,
        selectedBy: gameState.nextPicker?.playerId 
      }
    });
  };

  const handleMarkAnswer = (playerId: string, isCorrect: boolean, acceptClose = false) => {
    sendMessage({
      type: "mark_answer",
      data: { playerId, isCorrect, acceptClose }
    });
  };

  const handleCloseQuestion = () => {
    sendMessage({
      type: "close_question",
      data: {}
    });
  };

  const handleEndGame = () => {
    sendMessage({
      type: "end_game",
      data: {}
    });
  };

  const firstBuzzer = gameState.buzzerResults.find(b => b.isFirst);
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-game-dark text-gray-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Game Header */}
        <Card className="bg-game-surface border-border-game-gray mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex items-center">
                <h1 className="font-game text-3xl font-bold text-game-secondary mr-6">
                  ROOM: {gameState.roomCode}
                </h1>
                <div className="flex items-center text-game-accent">
                  <Users className="mr-2" />
                  <span>{gameState.players.length} Players</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {gameState.nextPicker && (
                  <div className="bg-game-accent px-4 py-2 rounded-lg">
                    <span className="text-sm text-game-dark">Next Picker:</span>
                    <span className="ml-2 font-bold text-game-dark">{gameState.nextPicker.playerName}</span>
                  </div>
                )}
                {firstBuzzer && (
                  <div className="bg-game-primary px-4 py-2 rounded-lg">
                    <span className="text-sm text-gray-300">Current Turn:</span>
                    <span className="ml-2 font-bold text-white">{firstBuzzer.playerName}</span>
                  </div>
                )}
                <Button
                  onClick={handleEndGame}
                  variant="destructive"
                  className="bg-game-danger hover:bg-red-600"
                >
                  <Square className="mr-2 h-4 w-4" />
                  End Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Board Grid */}
        <Card className="bg-game-surface border-border-game-gray mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-6 gap-3">
              {/* Category Headers */}
              {CATEGORIES.map(category => (
                <div
                  key={category}
                  className="bg-game-primary text-white p-4 rounded-lg text-center font-bold text-sm md:text-base"
                >
                  {category}
                </div>
              ))}

              {/* Question Cards */}
              {VALUES.map(value => 
                CATEGORIES.map(category => {
                  const questionKey = `${category}-${value}`;
                  const isUsed = gameState.usedQuestions.has(questionKey);
                  
                  return (
                    <Button
                      key={questionKey}
                      onClick={() => handleSelectQuestion(category, value)}
                      disabled={isUsed}
                      className={`
                        font-game font-bold text-2xl md:text-3xl p-6 rounded-lg min-h-[80px] flex items-center justify-center
                        ${isUsed 
                          ? 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed' 
                          : 'bg-game-secondary text-game-dark hover:bg-yellow-400 transition-all duration-200 game-card-hover'
                        }
                      `}
                    >
                      {isUsed ? 'USED' : formatCurrency(value)}
                    </Button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scoreboard */}
        <Card className="bg-game-surface border-border-game-gray">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold text-white">
              <Trophy className="text-game-secondary mr-2" />
              Scoreboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedPlayers.map(player => (
                <div key={player.id} className="bg-game-dark p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{player.name}</span>
                    <span className="font-game text-xl font-bold text-game-accent">
                      {formatCurrency(player.score)}
                    </span>
                  </div>
                  {player.isHost && (
                    <div className="text-sm text-game-secondary mt-1">Host</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question View Modal */}
      {showQuestion && gameState.currentQuestion && (
        <div className="fixed inset-0 bg-game-dark bg-opacity-95 z-50 flex items-center justify-center p-4">
          <Card className="bg-game-surface border-border-game-gray max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardContent className="pt-8">
              {/* Question Header */}
              <div className="text-center mb-8">
                <div className="text-game-secondary font-game text-2xl font-bold mb-2">
                  {gameState.currentQuestion.category} - {formatCurrency(gameState.currentQuestion.value)}
                </div>
{gameState.selectedBy && (
                  <div className="text-gray-400 text-sm mb-4">
                    Selected by {gameState.selectedBy}
                  </div>
                )}
                <div className="text-white text-3xl md:text-4xl font-bold leading-tight">
                  {gameState.currentQuestion.question}
                </div>
              </div>

              {/* Buzz Order Display */}
              {gameState.buzzerResults.length > 0 && (
                <Card className="bg-game-primary mb-8">
                  <CardContent className="pt-6">
                    <div className="text-white text-lg mb-4 text-center">Buzz Order:</div>
                    <div className="space-y-2">
                      {gameState.buzzerResults.map((buzz, index) => (
                        <div 
                          key={buzz.playerId}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            buzz.isFirst ? 'bg-game-accent text-game-dark' : 'bg-game-dark text-white'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-bold text-lg mr-3">#{buzz.buzzOrder}</span>
                            <span className="font-medium">{buzz.playerName}</span>
                            {buzz.isFirst && <Star className="ml-2 h-4 w-4" />}
                          </div>
                          <div className="text-sm opacity-75">
                            {((buzz.timestamp % 1000) / 1000).toFixed(2)}s
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Question Options */}
              {gameState.currentQuestion.type === 'multiple_choice' && gameState.currentQuestion.options && (
                <div className="space-y-4 mb-8">
                  {(gameState.currentQuestion.options as string[]).map((option: string, index: number) => (
                    <div
                      key={index}
                      className="w-full bg-game-dark p-4 rounded-lg border border-gray-600"
                    >
                      <span className="font-bold text-game-secondary mr-3">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="text-white">{option}</span>
                    </div>
                  ))}
                </div>
              )}

              {gameState.currentQuestion.type === 'true_false' && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-game-accent p-6 rounded-lg text-white font-bold text-xl text-center">
                    <Check className="inline mr-2" />TRUE
                  </div>
                  <div className="bg-game-danger p-6 rounded-lg text-white font-bold text-xl text-center">
                    <X className="inline mr-2" />FALSE
                  </div>
                </div>
              )}

              {/* Submitted Answers */}
              {gameState.submittedAnswers.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-white mb-4">Submitted Answers:</h3>
                  {gameState.submittedAnswers.map((answer, index) => (
                    <Card key={index} className="bg-game-dark mb-2">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-game-secondary font-bold">{answer.playerName}:</span>
                          <span className="text-white">{answer.answer}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Admin Controls */}
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                {firstBuzzer && (
                  <>
                    <Button
                      onClick={() => handleMarkAnswer(firstBuzzer.playerId, true)}
                      className="bg-game-accent hover:bg-green-600 text-white font-bold"
                    >
                      <Check className="mr-2" />
                      Correct (+{formatCurrency(gameState.currentQuestion.value)})
                    </Button>
                    <Button
                      onClick={() => handleMarkAnswer(firstBuzzer.playerId, false)}
                      className="bg-game-danger hover:bg-red-600 text-white font-bold"
                    >
                      <X className="mr-2" />
                      Incorrect (-{formatCurrency(gameState.currentQuestion.value)})
                    </Button>
                    <Button
                      onClick={() => handleMarkAnswer(firstBuzzer.playerId, false, true)}
                      className="bg-game-secondary hover:bg-yellow-500 text-game-dark font-bold"
                    >
                      <Star className="mr-2" />
                      Accept Close Answer
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleCloseQuestion}
                  variant="secondary"
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold"
                >
                  <ArrowLeft className="mr-2" />
                  Back to Board
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
