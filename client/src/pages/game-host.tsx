import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { Trophy, Users, Pause, Square, Check, X, Star, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_CATEGORIES, VALUES, formatCurrency } from "@/lib/game-data";
import type { Player, Question } from "@shared/schema";

interface GameState {
  roomCode: string;
  gameId: string;
  categories: string[];
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
    submissionOrder: number;
    submissionTime: number;
    isCorrect?: boolean;
    pointsAwarded?: number;
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
    categories: DEFAULT_CATEGORIES,
    players: [],
    currentQuestion: null,
    buzzerResults: [],
    submittedAnswers: [],
    usedQuestions: new Set(),
    nextPicker: null,
    selectedBy: null,
  });

  const [showQuestion, setShowQuestion] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  // Initialize from game setup or URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCodeParam = urlParams.get('roomCode');
    
    // Check if joining existing game as host
    if (roomCodeParam) {
      setGameState(prev => ({
        ...prev,
        roomCode: roomCodeParam,
      }));
      
      // This case should not happen for hosts - they should navigate with proper params
      navigate('/');
      return;
    }
    
    // Check for game setup data from the new flow
    const gameSetup = localStorage.getItem('gameSetup');
    if (gameSetup) {
      const setup = JSON.parse(gameSetup);
      
      // Update local state with custom categories first
      setGameState(prev => ({
        ...prev,
        categories: setup.categories
      }));
      
      // Create game with custom categories and questions via WebSocket
      sendMessage({
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

    // Fallback to URL params
    const roomCode = urlParams.get('room');
    const gameId = urlParams.get('game');
    
    if (!roomCode || !gameId) {
      navigate('/');
      return;
    }

    setGameState(prev => ({ ...prev, roomCode, gameId }));
  }, [navigate, sendMessage]);

  // WebSocket message handlers
  onMessage("game_created", (data) => {
    // Get categories from setup if available
    const storedCategories = localStorage.getItem('categories');
    const categories = storedCategories ? JSON.parse(storedCategories) : DEFAULT_CATEGORIES;
    
    setGameState(prev => ({
      ...prev,
      roomCode: data.roomCode,
      gameId: data.gameId,
      categories: categories
    }));
    
    // Clean up stored categories
    localStorage.removeItem('categories');
    
    toast({
      title: "Game Created!",
      description: `Room: ${data.roomCode} | Host Code: ${data.hostCode}`,
      duration: 10000, // Show longer so host can note the codes
    });
  });

  onMessage("game_joined", (data) => {
    // When host joins an existing game, set the initial state
    setGameState(prev => ({
      ...prev,
      roomCode: data.roomCode || prev.roomCode,
      gameId: data.gameId,
      players: data.players
    }));
    
    // Request game questions and state for existing game
    sendMessage({
      type: "get_game_state",
      data: { gameId: data.gameId }
    });
  });

  onMessage("game_state_loaded", (data) => {
    // Load questions and mark used ones when rejoining existing game
    const usedQuestions = new Set<string>();
    
    // Extract used questions from server data
    data.questions?.forEach((q: any) => {
      if (q.isUsed) {
        usedQuestions.add(`${q.category}-${q.value}`);
      }
    });

    setGameState(prev => ({
      ...prev,
      categories: data.categories || prev.categories,
      usedQuestions
    }));
  });

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
    console.log('Question selected:', data);
    if (data.question) {
      setGameState(prev => ({
        ...prev,
        currentQuestion: data.question,
        buzzerResults: [],
        submittedAnswers: [],
        selectedBy: data.selectedBy || null,
        // Don't automatically mark as used - only when explicitly marked
      }));
      setShowQuestion(true);
      setShowAnswer(false); // Reset answer visibility for new question
    }
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
    console.log('Answer submitted:', data);
    setGameState(prev => ({
      ...prev,
      submittedAnswers: [...prev.submittedAnswers, {
        playerId: data.playerId,
        playerName: data.playerName,
        answer: data.answer,
        submissionOrder: data.submissionOrder,
        submissionTime: data.submissionTime
      }]
    }));
  });

  onMessage("all_answers_collected", (data) => {
    console.log('All answers collected:', data);
    setGameState(prev => ({
      ...prev,
      submittedAnswers: data.answers
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
    setGameState(prev => ({
      ...prev,
      currentQuestion: null,
      nextPicker: data.nextPicker || null,
      // Don't automatically add to usedQuestions here - only when explicitly marked
    }));
    setShowQuestion(false);
    setShowAnswer(false); // Reset answer visibility when question closes
  });

  onMessage("question_marked_used", (data) => {
    // Update local state to mark question as used
    if (gameState.currentQuestion && data.questionId === gameState.currentQuestion.id) {
      const questionKey = `${gameState.currentQuestion.category}-${gameState.currentQuestion.value}`;
      setGameState(prev => ({
        ...prev,
        usedQuestions: new Set(Array.from(prev.usedQuestions).concat(questionKey))
      }));
    }
  });

  onMessage("game_ended", (data) => {
    toast({
      title: "Game Ended",
      description: "The game has been completed. Final scores displayed.",
    });
    // Game ended, navigate back to lobby
    setTimeout(() => {
      navigate("/");
    }, 3000);
  });

  const handleSelectQuestion = (category: string, value: number) => {
    console.log('Selecting question:', { category, value, usedQuestions: Array.from(gameState.usedQuestions) });
    
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

  const handleGoBack = () => {
    setShowQuestion(false);
    setShowAnswer(false);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleMarkUsed = () => {
    // Send message to mark question as used on server
    if (gameState.currentQuestion) {
      sendMessage({
        type: "mark_question_used",
        data: { questionId: gameState.currentQuestion.id }
      });
    }
    // Then close the question
    handleCloseQuestion();
  };

  const handleEndGame = () => {
    setShowEndGameConfirm(true);
  };

  const confirmEndGame = () => {
    sendMessage({
      type: "end_game",
      data: {}
    });
    setShowEndGameConfirm(false);
  };

  const handleExitGame = () => {
    // Just navigate back to lobby without ending the game
    navigate("/");
  };

  const firstBuzzer = gameState.buzzerResults.find(b => b.isFirst);
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Game Header */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex items-center">
                <h1 className="font-game text-3xl font-bold text-blue-600 dark:text-yellow-400 mr-6">
                  ROOM: {gameState.roomCode}
                </h1>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Users className="mr-2" />
                  <span>{gameState.players.length} Players</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {gameState.nextPicker && (
                  <div className="bg-blue-600 dark:bg-yellow-400 px-4 py-2 rounded-lg">
                    <span className="text-sm text-white dark:text-black">Next Picker:</span>
                    <span className="ml-2 font-bold text-white dark:text-black">{gameState.nextPicker.playerName}</span>
                  </div>
                )}
                {firstBuzzer && (
                  <div className="bg-green-600 dark:bg-green-500 px-4 py-2 rounded-lg">
                    <span className="text-sm text-white">Current Turn:</span>
                    <span className="ml-2 font-bold text-white">{firstBuzzer.playerName}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleExitGame}
                    variant="outline"
                    className="border-gray-600 text-gray-600 hover:bg-gray-100"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Exit Game
                  </Button>
                  <Button
                    onClick={handleEndGame}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    End Game
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Board Grid */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 mb-6">
          <CardContent className="pt-6">
            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${gameState.categories.length}, minmax(0, 1fr))` }}>
              {/* Category Headers */}
              {gameState.categories.map(category => (
                <div
                  key={category}
                  className="bg-blue-600 dark:bg-gray-800 text-white p-4 rounded-lg text-center font-bold text-sm md:text-base"
                >
                  {category}
                </div>
              ))}

              {/* Question Cards */}
              {VALUES.map(value => 
                gameState.categories.map(category => {
                  const questionKey = `${category}-${value}`;
                  // For now, let's use the questionKey format for consistency
                  const isUsed = gameState.usedQuestions.has(questionKey);
                  
                  return (
                    <Button
                      key={questionKey}
                      onClick={() => handleSelectQuestion(category, value)}
                      disabled={isUsed}
                      className={`
                        font-game font-bold text-2xl md:text-3xl p-6 rounded-lg min-h-[80px] flex items-center justify-center
                        ${isUsed 
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed' 
                          : 'bg-yellow-400 dark:bg-yellow-500 text-black hover:bg-yellow-500 dark:hover:bg-yellow-400 transition-all duration-200'
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
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold text-black dark:text-white">
              <Trophy className="text-yellow-500 mr-2" />
              Scoreboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedPlayers.map(player => (
                <div key={player.id} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-black dark:text-white">{player.name}</span>
                    <span className="font-game text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(player.score)}
                    </span>
                  </div>
                  {player.isHost && (
                    <div className="text-sm text-blue-600 dark:text-yellow-400 mt-1">Host</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question View Modal */}
      {showQuestion && gameState.currentQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardContent className="pt-8">
              {/* Question Header */}
              <div className="text-center mb-8">
                <div className="text-blue-600 dark:text-yellow-400 font-game text-2xl font-bold mb-2">
                  {gameState.currentQuestion.category} - {formatCurrency(gameState.currentQuestion.value)}
                </div>
                {gameState.selectedBy && (
                  <div className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Selected by {gameState.selectedBy}
                  </div>
                )}
                <div className="text-black dark:text-white text-3xl md:text-4xl font-bold leading-tight">
                  {gameState.currentQuestion.question}
                </div>
              </div>

              {/* Buzz Order Display */}
              {gameState.buzzerResults.length > 0 && (
                <Card className="bg-blue-50 dark:bg-gray-800 border-blue-200 dark:border-gray-600 mb-8">
                  <CardContent className="pt-6">
                    <div className="text-black dark:text-white text-lg mb-4 text-center">Buzz Order:</div>
                    <div className="space-y-2">
                      {gameState.buzzerResults.map((buzz, index) => (
                        <div 
                          key={buzz.playerId}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            buzz.isFirst 
                              ? 'bg-yellow-400 dark:bg-yellow-500 text-black' 
                              : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
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
                  {(gameState.currentQuestion.options as string[]).map((option, index) => (
                    <div
                      key={index}
                      className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600"
                    >
                      <span className="font-bold text-blue-600 dark:text-yellow-400 mr-3">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="text-black dark:text-white">{String(option)}</span>
                    </div>
                  ))}
                </div>
              )}

              {gameState.currentQuestion.type === 'true_false' && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-green-600 dark:bg-green-500 p-6 rounded-lg text-white font-bold text-xl text-center">
                    <Check className="inline mr-2" />TRUE
                  </div>
                  <div className="bg-red-600 dark:bg-red-500 p-6 rounded-lg text-white font-bold text-xl text-center">
                    <X className="inline mr-2" />FALSE
                  </div>
                </div>
              )}

              {/* Answer Display */}
              {showAnswer && (
                <Card className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 mb-8">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-green-800 dark:text-green-200 text-lg mb-2 font-bold">CORRECT ANSWER:</div>
                      <div className="text-green-900 dark:text-green-100 text-2xl font-bold">
                        {gameState.currentQuestion.correctAnswer}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submitted Answers */}
              {gameState.submittedAnswers.length > 0 && (
                <Card className="bg-green-50 dark:bg-gray-800 border-green-200 dark:border-gray-600 mb-8">
                  <CardContent className="pt-6">
                    <div className="text-black dark:text-white text-lg mb-4 text-center">
                      Submitted Answers ({gameState.submittedAnswers.length}):
                    </div>
                    <div className="space-y-3">
                      {gameState.submittedAnswers.map((answer, index) => (
                        <div 
                          key={answer.playerId}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            answer.submissionOrder === 1 
                              ? 'bg-yellow-400 dark:bg-yellow-500 text-black border-yellow-500' 
                              : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center flex-1">
                            <span className="font-bold text-lg mr-3">#{answer.submissionOrder}</span>
                            <div className="flex-1">
                              <div className="font-medium">{answer.playerName}</div>
                              <div className="text-sm opacity-75">
                                {answer.submissionTime?.toFixed(2)}s
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex items-center gap-4">
                            <div className="font-bold">{answer.answer}</div>
                            {answer.isCorrect !== undefined && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-bold ${
                                answer.isCorrect 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}>
                                {answer.isCorrect ? (
                                  <>
                                    <Check className="h-3 w-3" />
                                    +{formatCurrency(answer.pointsAwarded || 0)}
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3 w-3" />
                                    {formatCurrency(answer.pointsAwarded || 0)}
                                  </>
                                )}
                              </div>
                            )}
                            {answer.isCorrect === undefined && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleMarkAnswer(answer.playerId, true)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleMarkAnswer(answer.playerId, false)}
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Admin Controls */}
              <div className="flex flex-col gap-4">
                {/* Primary Question Controls */}
                {!showAnswer ? (
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Button
                      onClick={handleGoBack}
                      variant="secondary"
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold"
                    >
                      <ArrowLeft className="mr-2" />
                      Go Back (Don't Mark Used)
                    </Button>
                    <Button
                      onClick={handleShowAnswer}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      Show Answer
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Button
                      onClick={handleGoBack}
                      variant="secondary"
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold"
                    >
                      <ArrowLeft className="mr-2" />
                      Go Back (Don't Mark Used)
                    </Button>
                    <Button
                      onClick={handleMarkUsed}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      <Check className="mr-2" />
                      Mark Used & Return to Board
                    </Button>
                  </div>
                )}

                {/* Buzzer/Answer Controls (when someone has buzzed) */}
                {firstBuzzer && (
                  <div className="border-t pt-4">
                    <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
                      Buzzer Controls for {firstBuzzer.playerName}:
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <Button
                        onClick={() => handleMarkAnswer(firstBuzzer.playerId, true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      >
                        <Check className="mr-2" />
                        Correct (+{formatCurrency(gameState.currentQuestion.value)})
                      </Button>
                      <Button
                        onClick={() => handleMarkAnswer(firstBuzzer.playerId, false)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        <X className="mr-2" />
                        Incorrect (-{formatCurrency(gameState.currentQuestion.value)})
                      </Button>
                      <Button
                        onClick={() => handleMarkAnswer(firstBuzzer.playerId, false, true)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                      >
                        <Star className="mr-2" />
                        Accept Close Answer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* End Game Confirmation Dialog */}
      <Dialog open={showEndGameConfirm} onOpenChange={setShowEndGameConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Game</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this game? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEndGameConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmEndGame}
            >
              End Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
