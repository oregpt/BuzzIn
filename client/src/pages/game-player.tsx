import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { Hand, Users } from "lucide-react";
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
  hasBuzzed: boolean;
  buzzRank: number;
  canAnswer: boolean;
  answer: string;
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
    hasBuzzed: false,
    buzzRank: 0,
    canAnswer: false,
    answer: "",
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
      }));
    }
  });

  onMessage("player_joined", (data) => {
    if (data.player.id !== playerState.playerId) {
      setPlayerState(prev => ({
        ...prev,
        otherPlayers: [...prev.otherPlayers, data.player]
      }));
    }
  });

  onMessage("question_selected", (data) => {
    setPlayerState(prev => ({
      ...prev,
      currentQuestion: data.question,
      gameStatus: "Question active - Buzz in to answer!",
      hasBuzzed: false,
      buzzRank: 0,
      canAnswer: false,
      answer: "",
    }));
  });

  onMessage("buzz_received", (data) => {
    if (data.playerId === playerState.playerId) {
      setPlayerState(prev => ({
        ...prev,
        hasBuzzed: true,
        buzzRank: data.isFirst ? 1 : prev.buzzRank + 1,
        canAnswer: data.isFirst && prev.currentQuestion?.type === 'specific_answer',
        gameStatus: data.isFirst ? "You buzzed first! " + (prev.currentQuestion?.type === 'specific_answer' ? "Enter your answer." : "Waiting for host...") : `You buzzed in ${prev.buzzRank === 0 ? '2nd' : prev.buzzRank + 1}${prev.buzzRank === 1 ? 'nd' : prev.buzzRank === 2 ? 'rd' : 'th'} place`,
      }));
    } else if (data.isFirst) {
      setPlayerState(prev => ({
        ...prev,
        gameStatus: `${data.playerName} buzzed in first!`,
      }));
    }
  });

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
      hasBuzzed: false,
      buzzRank: 0,
      canAnswer: false,
      answer: "",
    }));
  });

  onMessage("game_ended", () => {
    navigate('/results');
  });

  const handleBuzz = () => {
    if (!playerState.currentQuestion || playerState.hasBuzzed) return;

    sendMessage({
      type: "buzz",
      data: { questionId: playerState.currentQuestion.id }
    });
  };

  const handleSubmitAnswer = () => {
    if (!playerState.currentQuestion || !playerState.answer.trim()) return;

    sendMessage({
      type: "submit_answer",
      data: { 
        questionId: playerState.currentQuestion.id,
        answer: playerState.answer.trim()
      }
    });

    setPlayerState(prev => ({
      ...prev,
      canAnswer: false,
      gameStatus: "Answer submitted, waiting for host..."
    }));
  };

  return (
    <div className="min-h-screen bg-game-dark text-gray-100">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Player Header */}
        <Card className="bg-game-surface border-border-game-gray mb-6 text-center">
          <CardContent className="pt-6">
            <h1 className="font-game text-2xl font-bold text-game-secondary mb-2">
              ROOM: {playerState.roomCode}
            </h1>
            <div className="text-white text-lg font-bold">{playerState.playerName}</div>
            <div className="text-game-accent text-2xl font-game font-bold">
              {formatCurrency(playerState.score)}
            </div>
          </CardContent>
        </Card>

        {/* Game Status */}
        <Card className="bg-game-surface border-border-game-gray mb-6 text-center">
          <CardContent className="pt-6">
            <div className="text-gray-300 text-sm mb-2">Current Status</div>
            {playerState.currentQuestion && (
              <div className="text-white text-lg font-bold mb-2">
                {playerState.currentQuestion.category} - {formatCurrency(playerState.currentQuestion.value)}
              </div>
            )}
            <div className="text-gray-300 text-sm">{playerState.gameStatus}</div>
          </CardContent>
        </Card>

        {/* The Big Buzzer */}
        <div className="mb-8">
          <Button
            onClick={handleBuzz}
            disabled={!playerState.currentQuestion || playerState.hasBuzzed}
            className={`
              w-full h-64 rounded-full text-white font-black text-4xl font-game shadow-2xl border-4
              transition-all duration-100 active:scale-95 flex items-center justify-center
              ${playerState.hasBuzzed 
                ? 'bg-game-accent border-green-400' 
                : playerState.currentQuestion 
                  ? 'bg-gradient-to-b from-game-danger to-red-700 hover:from-red-600 hover:to-red-800 border-red-400 animate-glow' 
                  : 'bg-gray-600 border-gray-500 cursor-not-allowed'
              }
            `}
          >
            <div className="text-center">
              <Hand className="text-6xl mb-4 block mx-auto" />
              <div>{playerState.hasBuzzed ? 'BUZZED!' : 'BUZZ!'}</div>
            </div>
          </Button>
        </div>

        {/* Buzz Feedback */}
        {playerState.hasBuzzed && (
          <Card className="bg-game-primary mb-6 text-center">
            <CardContent className="pt-4">
              <div className="text-white text-lg font-bold">You buzzed in!</div>
              <div className="text-gray-300 text-sm">
                {playerState.buzzRank === 1 ? 'First place!' : `${playerState.buzzRank}${playerState.buzzRank === 2 ? 'nd' : playerState.buzzRank === 3 ? 'rd' : 'th'} place`}
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
