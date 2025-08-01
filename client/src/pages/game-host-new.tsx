import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Trophy, Users, Check, X, Star, ArrowLeft, RotateCcw, Settings, Edit, Trash2, UserPlus, Copy } from "lucide-react";
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
    } else {
      setShowQuestion(false);
      setShowAnswer(false);
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
      type: "delete_player",
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

      {/* Current Question */}
      {gameState.currentQuestion && showQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>Current Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded relative">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{gameState.currentQuestion.category} - {formatCurrency(gameState.currentQuestion.value)}</h3>
                <div className={`text-2xl font-bold px-3 py-1 rounded ${
                  timeRemaining <= 5 ? 'bg-red-500 text-white' : 
                  timeRemaining <= 10 ? 'bg-yellow-500 text-white' : 
                  'bg-green-500 text-white'
                }`}>
                  {timeRemaining}s
                </div>
              </div>
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