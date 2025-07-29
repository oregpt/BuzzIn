import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocation } from "wouter";
import { Gamepad, Users, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GameLobby() {
  const [, navigate] = useLocation();
  const { sendMessage, onMessage, isConnected } = useWebSocket();
  const { toast } = useToast();

  const [joinForm, setJoinForm] = useState({
    roomCode: "",
    playerName: "",
  });

  const handleSetupGame = () => {
    // Direct navigation to setup - no form needed
    navigate("/setup");
  };

  const handleJoinAsHost = () => {
    // Navigate to host page (for existing games)
    navigate("/host");
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinForm.roomCode.trim() || !joinForm.playerName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    sendMessage({
      type: "join_game",
      data: {
        roomCode: joinForm.roomCode.toUpperCase(),
        playerName: joinForm.playerName,
      },
    });
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
    <div className="min-h-screen bg-game-dark text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="font-game text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-game-secondary to-yellow-400 mb-4">
            JEOPARDY!
          </h1>
          <p className="text-xl text-gray-300 font-medium">Multiplayer Quiz Experience</p>
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

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {/* Setup New Game */}
          <Card className="bg-game-surface border-border-game-gray game-card-hover">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-game-accent to-emerald-600 rounded-full flex items-center justify-center">
                <Gamepad className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Setup Game</CardTitle>
              <p className="text-gray-400 text-sm">Create a new trivia game with custom questions</p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSetupGame}
                className="w-full bg-gradient-to-r from-game-accent to-emerald-600 hover:from-emerald-600 hover:to-game-accent text-white font-bold py-4 px-6 transition-all duration-200 transform hover:scale-105"
              >
                <Gamepad className="mr-2" />
                Setup Game
              </Button>
            </CardContent>
          </Card>

          {/* Join as Host */}
          <Card className="bg-game-surface border-border-game-gray game-card-hover">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-game-primary to-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Join as Host</CardTitle>
              <p className="text-gray-400 text-sm">Host an existing game session</p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleJoinAsHost}
                className="w-full bg-gradient-to-r from-game-primary to-blue-600 hover:from-blue-600 hover:to-game-primary text-white font-bold py-4 px-6 transition-all duration-200 transform hover:scale-105"
              >
                <Users className="mr-2" />
                Join as Host
              </Button>
            </CardContent>
          </Card>

          {/* Join as Participant */}
          <Card className="bg-game-surface border-border-game-gray game-card-hover">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-game-secondary to-yellow-500 rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-white">Join as Participant</CardTitle>
              <p className="text-gray-400 text-sm">Enter a room code to join a game</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinGame} className="space-y-4">
                <Input
                  type="text"
                  placeholder="ABCD"
                  maxLength={4}
                  value={joinForm.roomCode}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, roomCode: e.target.value.toUpperCase() })
                  }
                  className="w-full px-4 py-3 bg-game-dark border-border-game-gray text-white text-center text-2xl font-game tracking-widest focus:ring-2 focus:ring-game-secondary focus:border-transparent uppercase"
                />
                <Input
                  type="text"
                  placeholder="Your Team Name"
                  value={joinForm.playerName}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, playerName: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-game-dark border-border-game-gray text-white focus:ring-2 focus:ring-game-secondary focus:border-transparent"
                />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-game-secondary to-yellow-500 hover:from-yellow-500 hover:to-game-secondary text-game-dark font-bold py-4 px-6 transition-all duration-200 transform hover:scale-105"
                >
                  <LogIn className="mr-2" />
                  Join Game
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
