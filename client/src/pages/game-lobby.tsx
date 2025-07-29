import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { Gamepad, Users, LogIn, Calendar, Clock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { Game } from "@shared/schema";

interface GameWithPlayerCount extends Game {
  playerCount: number;
}

export default function GameLobby() {
  const [, navigate] = useLocation();
  const { sendMessage, onMessage, isConnected } = useWebSocket();
  const { toast } = useToast();

  const [joinForm, setJoinForm] = useState({
    roomCode: "",
    playerName: "",
  });

  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameWithPlayerCount | null>(null);
  const [joinType, setJoinType] = useState<'host' | 'player'>('player');
  const [authCode, setAuthCode] = useState('');

  // Fetch open games
  const { data: openGames = [], isLoading: isLoadingGames, refetch: refetchGames } = useQuery<GameWithPlayerCount[]>({
    queryKey: ['/api/open-games'],
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 3000,
  });

  const handleSetupGame = () => {
    // Direct navigation to setup - no form needed
    navigate("/setup");
  };



  const handleJoinOpenGame = (game: GameWithPlayerCount) => {
    setSelectedGame(game);
    setAuthCode('');
    setJoinType('player');
    setShowJoinDialog(true);
  };

  const handleJoinDialogSubmit = () => {
    if (!selectedGame) return;

    // Validate auth code is entered
    if (!authCode.trim()) {
      toast({
        title: "Error",
        description: `Please enter the ${joinType} code`,
        variant: "destructive",
      });
      return;
    }

    if (joinType === 'host') {
      // Send message to verify host code and join as host
      sendMessage({
        type: "join_as_host",
        data: {
          roomCode: selectedGame.roomCode,
          hostCode: authCode.trim()
        },
      });
    } else {
      // Join as player with player code
      if (!joinForm.playerName.trim()) {
        toast({
          title: "Error",
          description: "Please enter your name first",
          variant: "destructive",
        });
        return;
      }

      sendMessage({
        type: "join_game",
        data: {
          roomCode: selectedGame.roomCode,
          playerName: joinForm.playerName,
          playerCode: authCode.trim()
        },
      });
    }
    
    setShowJoinDialog(false);
    setSelectedGame(null);
    setAuthCode('');
  };

  // Handle WebSocket responses
  onMessage("game_created", (data) => {
    console.log('Game created successfully:', data);
    navigate("/host");
  });

  onMessage("game_joined", (data) => {
    console.log('Game joined successfully:', data);
    navigate("/play");
  });

  onMessage("error", (data) => {
    toast({
      title: "Error",
      description: data.message,
      variant: "destructive",
    });
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="font-game text-5xl md:text-7xl font-black text-blue-600 dark:text-yellow-400 mb-4">
            JEOPARDY!
          </h1>
          <p className="text-xl text-gray-400 dark:text-gray-300 font-medium">Multiplayer Quiz Experience</p>
          <div className="mt-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-300' : 'bg-red-300'
              }`}></span>
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </header>

        {/* Setup Game Card */}
        <div className="max-w-md mx-auto mb-12">
          <Card className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 game-card-hover">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                <Gamepad className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-black dark:text-white">Setup New Game</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Create a new trivia game with custom questions</p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSetupGame}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-emerald-600 hover:to-green-600 text-white font-bold py-4 px-6 transition-all duration-200 transform hover:scale-105"
              >
                <Gamepad className="mr-2" />
                Setup Game
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Open Games Section */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-6 text-center">Open Games</h2>
          
          {isLoadingGames ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-yellow-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading open games...</p>
            </div>
          ) : openGames.length === 0 ? (
            <Card className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
              <CardContent className="py-8 text-center">
                <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Open Games</h3>
                <p className="text-gray-500 dark:text-gray-500">Be the first to create a new game!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openGames.map((game) => (
                <Card key={game.id} className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-bold text-black dark:text-white">{game.gameName}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Host: {game.hostName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-game text-blue-600 dark:text-yellow-400">{game.roomCode}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {game.playerCount} players
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {(game.categories as string[]).slice(0, 3).map((category, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded text-gray-700 dark:text-gray-300"
                          >
                            {category}
                          </span>
                        ))}
                        {(game.categories as string[]).length > 3 && (
                          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded text-gray-700 dark:text-gray-300">
                            +{(game.categories as string[]).length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mb-3">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(game.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(game.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinOpenGame(game)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4"
                    >
                      <LogIn className="mr-2 w-4 h-4" />
                      Join Game
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Join Game Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Game: {selectedGame?.gameName}</DialogTitle>
            <DialogDescription>
              Room Code: {selectedGame?.roomCode} | Host: {selectedGame?.hostName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              How would you like to join this game?
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={joinType === 'player' ? 'default' : 'outline'}
                onClick={() => setJoinType('player')}
                className="flex flex-col items-center p-4 h-auto"
              >
                <Users className="w-6 h-6 mb-2" />
                <span className="font-medium">As Player</span>
                <span className="text-xs text-gray-500">Join the game to play</span>
              </Button>
              
              <Button
                variant={joinType === 'host' ? 'default' : 'outline'}
                onClick={() => setJoinType('host')}
                className="flex flex-col items-center p-4 h-auto"
              >
                <Crown className="w-6 h-6 mb-2" />
                <span className="font-medium">As Host</span>
                <span className="text-xs text-gray-500">Control the game</span>
              </Button>
            </div>

            {/* Player Name Input (only for player role) */}
            {joinType === 'player' && (
              <div className="space-y-2">
                <Label htmlFor="dialogPlayerName" className="text-sm font-medium">
                  Your Name
                </Label>
                <Input
                  id="dialogPlayerName"
                  placeholder="Enter your name"
                  value={joinForm.playerName}
                  onChange={(e) => setJoinForm(prev => ({ ...prev, playerName: e.target.value }))}
                  className="w-full bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                />
              </div>
            )}

            {/* Auth Code Input */}
            <div className="space-y-2">
              <Label htmlFor="authCode" className="text-sm font-medium">
                {joinType === 'host' ? 'Host Code' : 'Player Code'}
              </Label>
              <Input
                id="authCode"
                type="password"
                placeholder={`Enter ${joinType} code`}
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {joinType === 'host' 
                  ? 'Enter the host code to control this game' 
                  : 'Enter the player code to join this game'
                }
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoinDialogSubmit}
              disabled={
                !authCode.trim() || 
                (joinType === 'player' && !joinForm.playerName.trim())
              }
            >
              {joinType === 'host' ? 'Join as Host' : 'Join as Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
