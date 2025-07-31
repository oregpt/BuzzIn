import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { Hand, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/game-data";
import type { Player, Question } from "@shared/schema";

interface PlayerState {
  playerId: string;
  gameId: string;
  roomCode: string;
  playerName: string;
  score: number;
  otherPlayers: Player[];
  currentQuestion: Question | null;
  gameStatus: string;
  hasSubmitted: boolean;
  answer: string;
  timeRemaining: number;
  questionStartTime: number | null;
  showResults: boolean;
  submittedAnswers: Array<{
    playerId: string;
    playerName: string;
    answer: string;
    submissionOrder: number;
    submissionTime: number;
  }>;
}

export default function GamePlayer() {
  const [, navigate] = useLocation();
  const { sendMessage, onMessage } = useWebSocket();
  const { toast } = useToast();

  const [playerState, setPlayerState] = useState<PlayerState>({
    playerId: "",
    gameId: "",
    roomCode: "",
    playerName: "",
    score: 0,
    otherPlayers: [],
    currentQuestion: null,
    gameStatus: "Waiting for game to start...",
    hasSubmitted: false,
    answer: "",
    timeRemaining: 0,
    questionStartTime: null,
    showResults: false,
    submittedAnswers: [],
  });

  // Initialize from URL params or redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('player');
    const gameId = urlParams.get('game');
    const roomCode = urlParams.get('room');
    
    if (!playerId || !gameId || !roomCode) {
      navigate('/');
      return;
    }

    setPlayerState(prev => ({ 
      ...prev, 
      playerId, 
      gameId, 
      roomCode 
    }));
  }, [navigate]);

  // WebSocket message handlers
  onMessage("game_joined", (data) => {
    const currentPlayer = data.players.find((p: Player) => p.id === playerState.playerId);
    if (currentPlayer) {
      setPlayerState(prev => ({
        ...prev,
        playerName: currentPlayer.name,
        score: currentPlayer.score,
        otherPlayers: data.players.filter((p: Player) => p.id !== playerState.playerId),
        gameStatus: "Game ready! Waiting for host to select first question...",
      }));
    }
  });

  onMessage("player_joined", (data) => {
    if (data.player.id !== playerState.playerId) {
      setPlayerState(prev => ({
        ...prev,
        otherPlayers: prev.otherPlayers.some(p => p.id === data.player.id)
          ? prev.otherPlayers.map(p => p.id === data.player.id ? data.player : p)
          : [...prev.otherPlayers, data.player]
      }));
    }
  });

  onMessage("question_selected", (data) => {
    const startTime = Date.now();
    setPlayerState(prev => ({
      ...prev,
      currentQuestion: data.question,
      gameStatus: "Question active - Submit your answer!",
      hasSubmitted: false,
      answer: "",
      timeRemaining: 30,
      questionStartTime: startTime,
      showResults: false,
      submittedAnswers: [],
    }));
  });

  onMessage("answer_submitted", (data) => {
    if (data.playerId === playerState.playerId) {
      setPlayerState(prev => ({
        ...prev,
        hasSubmitted: true,
        gameStatus: `Answer submitted! (${getOrdinal(data.submissionOrder)} place)`,
      }));
    } else {
      setPlayerState(prev => ({
        ...prev,
        submittedAnswers: [...prev.submittedAnswers, {
          playerId: data.playerId,
          playerName: data.playerName,
          answer: data.answer,
          submissionOrder: data.submissionOrder,
          submissionTime: data.submissionTime,
        }]
      }));
    }
  });

  onMessage("all_answers_collected", (data) => {
    setPlayerState(prev => ({
      ...prev,
      showResults: true,
      gameStatus: "All answers submitted! Host is reviewing...",
    }));
  });

  const getOrdinal = (num: number) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  onMessage("answer_marked", (data) => {
    if (data.playerId === playerState.playerId) {
      setPlayerState(prev => ({
        ...prev,
        score: data.newScore,
      }));
      
      toast({
        title: data.isCorrect ? "Correct!" : "Incorrect",
        description: `${data.pointsAwarded > 0 ? '+' : ''}${formatCurrency(data.pointsAwarded)}`,
        variant: data.isCorrect ? "default" : "destructive",
      });
    } else {
      // Update other player's score
      setPlayerState(prev => ({
        ...prev,
        otherPlayers: prev.otherPlayers.map(p => 
          p.id === data.playerId 
            ? { ...p, score: data.newScore }
            : p
        )
      }));
    }
  });

  onMessage("question_closed", () => {
    setPlayerState(prev => ({
      ...prev,
      currentQuestion: null,
      gameStatus: "Waiting for next question...",
      hasSubmitted: false,
      answer: "",
      timeRemaining: 0,
      questionStartTime: null,
      showResults: false,
      submittedAnswers: [],
    }));
  });

  onMessage("game_ended", () => {
    navigate('/results');
  });

  onMessage("game_reset", (data) => {
    setPlayerState(prev => ({
      ...prev,
      score: 0,
      currentQuestion: null,
      gameStatus: "Game reset! Waiting for host to select first question...",
      hasSubmitted: false,
      answer: "",
      timeRemaining: 0,
      questionStartTime: null,
      showResults: false,
      submittedAnswers: [],
      otherPlayers: data.players.filter((p: Player) => p.id !== playerState.playerId),
    }));
    
    toast({
      title: "Game Reset",
      description: "All scores have been reset. Ready to play again!",
    });
  });

  // Timer effect for countdown
  useEffect(() => {
    if (!playerState.currentQuestion || playerState.hasSubmitted || playerState.questionStartTime === null) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - playerState.questionStartTime!) / 1000;
      const remaining = Math.max(0, 15 - elapsed);
      
      setPlayerState(prev => ({
        ...prev,
        timeRemaining: remaining
      }));

      if (remaining <= 0 && !playerState.hasSubmitted) {
        // Auto-submit empty answer when time runs out
        handleSubmitAnswer();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [playerState.currentQuestion, playerState.hasSubmitted, playerState.questionStartTime]);

  const handleSubmitAnswer = () => {
    if (!playerState.currentQuestion || playerState.hasSubmitted || playerState.questionStartTime === null) return;

    const submissionTime = (Date.now() - playerState.questionStartTime) / 1000;
    const answerText = playerState.answer.trim() || "(No answer)";

    // Immediately mark as submitted to prevent duplicate submissions
    setPlayerState(prev => ({
      ...prev,
      hasSubmitted: true,
      gameStatus: "Answer submitted! Waiting for host..."
    }));

    sendMessage({
      type: "submit_answer",
      data: {
        questionId: playerState.currentQuestion.id,
        answer: answerText,
        submissionTime
      }
    });
  };

  const handleExitGame = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Player Header */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg mb-6 text-center relative">
          <Button
            onClick={handleExitGame}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
          <CardContent className="pt-6">
            <h1 className="font-game text-2xl font-bold text-blue-600 dark:text-yellow-400 mb-2">
              ROOM: {playerState.roomCode}
            </h1>
            <div className="text-gray-900 dark:text-white text-lg font-bold">{playerState.playerName}</div>
            <div className="text-green-600 dark:text-green-400 text-2xl font-game font-bold">
              {formatCurrency(playerState.score)}
            </div>
          </CardContent>
        </Card>

        {/* Game Status */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg mb-6 text-center">
          <CardContent className="pt-6">
            <div className="text-gray-600 dark:text-gray-300 text-sm mb-2">Current Status</div>
            {playerState.currentQuestion && (
              <div className="text-gray-900 dark:text-white text-lg font-bold mb-2">
                {playerState.currentQuestion.category} - {formatCurrency(playerState.currentQuestion.value)}
              </div>
            )}
            <div className="text-gray-600 dark:text-gray-300 text-sm">{playerState.gameStatus}</div>
          </CardContent>
        </Card>

        {/* Timer */}
        {playerState.currentQuestion && !playerState.hasSubmitted && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg mb-6">
            <CardContent className="pt-6 text-center">
              <div className="text-gray-600 dark:text-gray-300 text-sm mb-2">Time Remaining</div>
              <div className={`text-6xl font-bold font-game ${
                playerState.timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-green-500'
              }`}>
                {Math.ceil(playerState.timeRemaining)}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-4">
                <div 
                  className={`h-2 rounded-full transition-all duration-100 ${
                    playerState.timeRemaining <= 5 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(playerState.timeRemaining / 30) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Display */}
        {playerState.currentQuestion && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg mb-6">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <div className="text-blue-600 dark:text-yellow-400 text-lg font-bold mb-2">
                  {playerState.currentQuestion.category} - {formatCurrency(playerState.currentQuestion.value)}
                </div>
                <div className="text-gray-900 dark:text-white text-lg">
                  {playerState.currentQuestion.question}
                </div>
              </div>

              {/* Answer Input */}
              {!playerState.hasSubmitted && (
                <div className="space-y-4">
                  {playerState.currentQuestion.type === 'multiple_choice' && playerState.currentQuestion.options ? (
                    <div className="space-y-2">
                      {(playerState.currentQuestion.options as string[]).map((option, index) => (
                        <Button
                          key={index}
                          onClick={() => setPlayerState(prev => ({ ...prev, answer: String.fromCharCode(65 + index) }))}
                          className={`w-full justify-start ${
                            playerState.answer === String.fromCharCode(65 + index)
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </Button>
                      ))}
                    </div>
                  ) : playerState.currentQuestion.type === 'true_false' ? (
                    <div className="flex space-x-4">
                      <Button
                        onClick={() => setPlayerState(prev => ({ ...prev, answer: 'true' }))}
                        className={`flex-1 ${
                          playerState.answer === 'true'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        True
                      </Button>
                      <Button
                        onClick={() => setPlayerState(prev => ({ ...prev, answer: 'false' }))}
                        className={`flex-1 ${
                          playerState.answer === 'false'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        False
                      </Button>
                    </div>
                  ) : (
                    <Textarea
                      value={playerState.answer}
                      onChange={(e) => setPlayerState(prev => ({ ...prev, answer: e.target.value }))}
                      placeholder="Type your answer here..."
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      rows={3}
                    />
                  )}

                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={playerState.timeRemaining <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 text-lg"
                  >
                    Submit Answer
                  </Button>
                </div>
              )}

              {/* Submitted Feedback */}
              {playerState.hasSubmitted && (
                <div className="text-center">
                  <div className="text-green-500 text-lg font-bold mb-2">Answer Submitted!</div>
                  <div className="text-gray-300">Waiting for other players...</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Answer Submitted Feedback */}
        {playerState.hasSubmitted && (
          <Card className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 mb-6 text-center">
            <CardContent className="pt-4">
              <div className="text-green-800 dark:text-green-200 text-lg font-bold">Answer submitted!</div>
              <div className="text-green-600 dark:text-green-300 text-sm">
                Waiting for host to review answers...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Answer Input (for specific answer questions) */}
        {playerState.canAnswer && (
          <Card className="bg-game-surface border-border-game-gray mb-6">
            <CardContent className="pt-6">
              <div className="text-white text-lg font-bold mb-4 text-center">Enter Your Answer</div>
              <Textarea
                placeholder="Type your answer here..."
                value={playerState.answer}
                onChange={(e) => setPlayerState(prev => ({ ...prev, answer: e.target.value }))}
                className="w-full px-4 py-3 bg-game-dark border-border-game-gray text-white resize-none h-24 focus:ring-2 focus:ring-game-accent focus:border-transparent mb-4"
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={!playerState.answer.trim()}
                className="w-full bg-game-accent hover:bg-green-600 text-white font-bold py-3"
              >
                Submit Answer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Other Players */}
        <Card className="bg-game-surface border-border-game-gray">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Users className="text-game-accent mr-2" />
              Other Players
            </h3>
            <div className="space-y-3">
              {playerState.otherPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between">
                  <span className="text-gray-300">{player.name}</span>
                  <span className="text-game-accent font-game font-bold">
                    {formatCurrency(player.score)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
