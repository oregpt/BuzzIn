import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Trophy, Users, Check, X, Star, ArrowLeft, RotateCcw, Settings, Edit, Trash2, UserPlus, Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGameState } from "@/hooks/use-game-state";
import { formatCurrency } from "@/lib/game-data";
import type { CompleteGameState, Question } from "@shared/schema";

export default function GameHost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { gameState, isLoading, error, refreshGameState, sendAction } = useGameState();

  // UI state for dialogs and modals (not game state)
  const [showQuestion, setShowQuestion] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [showEditQuestion, setShowEditQuestion] = useState(false);
  const [showQuestionConfirm, setShowQuestionConfirm] = useState(false);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [clickedButtons, setClickedButtons] = useState<{[key: string]: 'correct' | 'incorrect' | 'neutral'}>({});
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionToSelect, setQuestionToSelect] = useState<{category: string, value: number} | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editQuestionForm, setEditQuestionForm] = useState({
    question: "",
    correctAnswer: "",
    category: "",
    value: 0
  });
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Initialize from game setup or host join
  useEffect(() => {
    // Check if joining existing game as host (from lobby)
    const hostGameState = localStorage.getItem('hostGameState');
    if (hostGameState) {
      const hostData = JSON.parse(hostGameState);
      console.log('Loading host game state:', hostData);
      refreshGameState(hostData.gameId);
      localStorage.removeItem('hostGameState'); // Clean up after use
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

  // Auto-show question when one is selected and start timer
  useEffect(() => {
    if (gameState?.currentQuestion) {
      setShowQuestion(true);
      setTimeRemaining(30); // 30 second timer as requested
      setClickedButtons({}); // Reset clicked button states for new question
    } else {
      setShowQuestion(false);
      setShowAnswer(false);
      setTimeRemaining(0);
      setClickedButtons({}); // Reset clicked button states when no question
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
    setQuestionToSelect({ category, value });
    setShowQuestionConfirm(true);
  };

  const confirmSelectQuestion = () => {
    if (!questionToSelect) return;
    
    sendAction({
      type: "select_question",
      data: { 
        category: questionToSelect.category, 
        value: questionToSelect.value, 
        selectedBy: undefined 
      }
    });
    
    setShowQuestionConfirm(false);
    setQuestionToSelect(null);
  };

  const handleMarkAnswer = (playerId: string, isCorrect: boolean | null) => {
    // Track which button was clicked
    const buttonType = isCorrect === true ? 'correct' : isCorrect === false ? 'incorrect' : 'neutral';
    setClickedButtons(prev => ({
      ...prev,
      [playerId]: buttonType
    }));

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

  const handleCreatePlayer = () => {
    if (!newPlayerName.trim()) return;
    
    sendAction({
      type: "create_player",
      data: { playerName: newPlayerName.trim() }
    });
    
    setNewPlayerName("");
    setShowPlayerDialog(false);
  };

  const handleDeletePlayer = (playerId: string) => {
    sendAction({
      type: "remove_player",
      data: { playerId }
    });
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setEditQuestionForm({
      question: question.question,
      correctAnswer: question.correctAnswer,
      category: question.category,
      value: question.value
    });
    setShowEditQuestion(true);
  };

  const handleUpdateQuestion = () => {
    if (!selectedQuestion) return;
    
    sendAction({
      type: "update_question",
      data: {
        questionId: selectedQuestion.id,
        question: editQuestionForm.question,
        correctAnswer: editQuestionForm.correctAnswer,
        category: editQuestionForm.category,
        value: editQuestionForm.value,
        type: "standard"
      }
    });
    
    setShowEditQuestion(false);
    setSelectedQuestion(null);
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
          <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Player</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="playerName">Player Name</Label>
                  <Input
                    id="playerName"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPlayerDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePlayer}>
                    Create Player
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                    <div key={`${category}-${value}`} className="relative group">
                      <Button
                        variant={isCurrent ? "default" : isUsed ? "secondary" : "outline"}
                        disabled={isUsed}
                        onClick={() => handleSelectQuestion(category, value)}
                        className={`h-20 w-full text-lg font-bold ${
                          isCurrent ? "bg-green-500 text-white" :
                          isUsed ? "opacity-50" : ""
                        }`}
                      >
                        {formatCurrency(value)}
                      </Button>
                      {question && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditQuestion(question)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Question Modal */}
      <Dialog open={!!gameState.currentQuestion && showQuestion} onOpenChange={(open) => {
        if (!open) {
          setShowQuestion(false);
        }
      }}>
        <DialogContent className="max-w-4xl bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 border-2 border-purple-400 text-white shadow-2xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {gameState.currentQuestion?.category} - {formatCurrency(gameState.currentQuestion?.value || 0)}
              </DialogTitle>
              <div className={`text-3xl font-bold px-4 py-2 rounded-lg shadow-lg ${
                timeRemaining <= 5 ? 'bg-gradient-to-r from-red-500 to-red-700 text-white animate-pulse' : 
                timeRemaining <= 10 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : 
                'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
              }`}>
                {timeRemaining}s
              </div>
            </div>
          </DialogHeader>
          
          {gameState.currentQuestion && (
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-xl text-white shadow-lg border border-blue-400">
                <div className="mb-4">
                  {gameState.currentQuestion.question}
                </div>
                
                {/* Show options for multiple choice questions */}
                {gameState.currentQuestion.type === 'multiple_choice' && Array.isArray(gameState.currentQuestion.options) && (
                  <div className="mt-4 space-y-2">
                    <h5 className="font-semibold text-lg">Options:</h5>
                    <div className="grid gap-2">
                      {gameState.currentQuestion.options.map((option: string, index: number) => (
                        <div key={index} className="p-2 bg-white/10 rounded text-lg">
                          <span className="font-bold">{String.fromCharCode(65 + index)}.</span> {option}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Show True/False for true/false questions */}
                {gameState.currentQuestion.type === 'true_false' && (
                  <div className="mt-4 space-y-2">
                    <h5 className="font-semibold text-lg">Choose:</h5>
                    <div className="flex gap-4">
                      <div className="p-3 bg-white/10 rounded text-lg font-bold">TRUE</div>
                      <div className="p-3 bg-white/10 rounded text-lg font-bold">FALSE</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 border-emerald-400 text-white hover:from-emerald-500 hover:to-green-500 shadow-md"
                >
                  {showAnswer ? "Hide Answer" : "Show Answer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseQuestion}
                  className="bg-gradient-to-r from-red-600 to-pink-600 border-red-400 text-white hover:from-red-500 hover:to-pink-500 shadow-md"
                >
                  Close Question
                </Button>
              </div>

              {showAnswer && (
                <div className="p-4 bg-gradient-to-r from-green-700 to-emerald-700 rounded-lg border border-green-400 shadow-lg">
                  <h4 className="font-bold text-white text-lg">Correct Answer:</h4>
                  <p className="text-green-100 text-lg">{gameState.currentQuestion.correctAnswer}</p>
                </div>
              )}

              {gameState.buzzes && gameState.buzzes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-lg">Buzz Order & Answers:</h4>
                    <Button
                      variant="outline"
                      onClick={() => setShowAllAnswers(!showAllAnswers)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white hover:from-blue-500 hover:to-indigo-500"
                    >
                      {showAllAnswers ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showAllAnswers ? 'Hide Answers' : 'Show Answers'}
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {gameState.buzzes.map((buzz, index) => {
                      // Find the submitted answer for this buzz
                      const submittedAnswer = gameState.answers?.find(answer => 
                        answer.playerId === buzz.playerId && 
                        answer.questionId === buzz.questionId
                      );
                      
                      return (
                        <div key={buzz.playerId} className="p-4 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-lg border border-indigo-400 shadow-md">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-medium text-white text-lg">#{buzz.buzzOrder} - {buzz.playerName}</span>
                              {buzz.isFirst && <span className="ml-2 text-xs bg-gradient-to-r from-yellow-400 to-orange-400 px-3 py-1 rounded-full text-black font-bold shadow-sm">FIRST!</span>}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAnswer(buzz.playerId, true)}
                                className={`${
                                  clickedButtons[buzz.playerId] === 'correct' 
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-400 border-green-300 text-black shadow-lg scale-95' 
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400 text-white hover:from-green-500 hover:to-emerald-500'
                                } transition-all duration-200 min-w-[80px]`}
                              >
                                {clickedButtons[buzz.playerId] === 'correct' ? (
                                  <span className="text-xs font-bold">Score!</span>
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAnswer(buzz.playerId, false)}
                                className={`${
                                  clickedButtons[buzz.playerId] === 'incorrect' 
                                    ? 'bg-gradient-to-r from-red-400 to-pink-400 border-red-300 text-black shadow-lg scale-95' 
                                    : 'bg-gradient-to-r from-red-600 to-pink-600 border-red-400 text-white hover:from-red-500 hover:to-pink-500'
                                } transition-all duration-200 min-w-[80px]`}
                              >
                                {clickedButtons[buzz.playerId] === 'incorrect' ? (
                                  <span className="text-xs font-bold">Loss!</span>
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAnswer(buzz.playerId, null)}
                                className={`${
                                  clickedButtons[buzz.playerId] === 'neutral' 
                                    ? 'bg-gradient-to-r from-gray-400 to-slate-400 border-gray-300 text-black shadow-lg scale-95' 
                                    : 'bg-gradient-to-r from-gray-600 to-slate-600 border-gray-400 text-white hover:from-gray-500 hover:to-slate-500'
                                } transition-all duration-200 min-w-[80px]`}
                              >
                                {clickedButtons[buzz.playerId] === 'neutral' ? (
                                  <span className="text-xs font-bold">None</span>
                                ) : (
                                  'Neutral'
                                )}
                              </Button>
                            </div>
                          </div>
                          {showAllAnswers && submittedAnswer && (
                            <div className="mt-3 p-3 bg-black/20 rounded border-l-4 border-blue-400">
                              <div className="text-sm text-blue-200 mb-1">Answer:</div>
                              <div className="text-white font-medium">{submittedAnswer.answer}</div>
                            </div>
                          )}
                          {showAllAnswers && !submittedAnswer && (
                            <div className="mt-3 p-3 bg-black/20 rounded border-l-4 border-gray-400">
                              <div className="text-sm text-gray-300 italic">No answer submitted</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    {gameState.nextPicker?.playerId === player.id && (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                    {player.playerCode && (
                      <Button
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          if (player.playerCode) {
                            navigator.clipboard.writeText(player.playerCode);
                            toast({ title: "Player code copied!", description: `${player.playerCode}` });
                          }
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {player.playerCode}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{formatCurrency(player.score)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePlayer(player.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {/* Edit Question Dialog */}
      <Dialog open={showEditQuestion} onOpenChange={setShowEditQuestion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={editQuestionForm.category}
                onChange={(e) => setEditQuestionForm({...editQuestionForm, category: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                value={editQuestionForm.value}
                onChange={(e) => setEditQuestionForm({...editQuestionForm, value: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                value={editQuestionForm.question}
                onChange={(e) => setEditQuestionForm({...editQuestionForm, question: e.target.value})}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="answer">Correct Answer</Label>
              <Textarea
                id="answer"
                value={editQuestionForm.correctAnswer}
                onChange={(e) => setEditQuestionForm({...editQuestionForm, correctAnswer: e.target.value})}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditQuestion(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateQuestion}>
                Update Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Selection Confirmation Dialog */}
      <Dialog open={showQuestionConfirm} onOpenChange={setShowQuestionConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to select the question from <strong>{questionToSelect?.category}</strong> for <strong>{formatCurrency(questionToSelect?.value || 0)}</strong>?
            </p>
            <p className="text-sm text-gray-600">
              This will start a 30-second timer and show the question to all players.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowQuestionConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSelectQuestion}>
                Start Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}