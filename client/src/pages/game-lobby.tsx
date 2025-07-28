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

  const [createForm, setCreateForm] = useState({
    gameName: "",
    hostName: "",
  });

  const [joinForm, setJoinForm] = useState({
    roomCode: "",
    playerName: "",
  });

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.gameName.trim() || !createForm.hostName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Store the basic info and navigate to setup page
    localStorage.setItem('basicGameInfo', JSON.stringify(createForm));
    navigate("/setup");
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

        {/* Game Creation/Join Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Create Game */}
          <Card className="bg-game-surface border-border-game-gray shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl font-bold text-white">
                <Gamepad className="text-3xl text-game-accent mr-4" />
                Create Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGame} className="space-y-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Friday Night Quiz"
                    value={createForm.gameName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, gameName: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-game-dark border-border-game-gray text-white focus:ring-2 focus:ring-game-accent focus:border-transparent"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-300 mb-2">
                    Host Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Your Name"
                    value={createForm.hostName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, hostName: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-game-dark border-border-game-gray text-white focus:ring-2 focus:ring-game-accent focus:border-transparent"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-game-accent to-emerald-600 hover:from-emerald-600 hover:to-game-accent text-white font-bold py-4 px-6 transition-all duration-200 transform hover:scale-105"
                >
                  <Gamepad className="mr-2" />
                  Setup New Game
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Join Game */}
          <Card className="bg-game-surface border-border-game-gray shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl font-bold text-white">
                <LogIn className="text-3xl text-game-primary mr-4" />
                Join Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinGame} className="space-y-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Code
                  </Label>
                  <Input
                    type="text"
                    placeholder="ABCD"
                    maxLength={4}
                    value={joinForm.roomCode}
                    onChange={(e) =>
                      setJoinForm({ ...joinForm, roomCode: e.target.value.toUpperCase() })
                    }
                    className="w-full px-4 py-3 bg-game-dark border-border-game-gray text-white text-center text-3xl font-game tracking-widest focus:ring-2 focus:ring-game-primary focus:border-transparent uppercase"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-300 mb-2">
                    Player/Team Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Your Team Name"
                    value={joinForm.playerName}
                    onChange={(e) =>
                      setJoinForm({ ...joinForm, playerName: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-game-dark border-border-game-gray text-white focus:ring-2 focus:ring-game-primary focus:border-transparent"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-game-primary to-blue-600 hover:from-blue-600 hover:to-game-primary text-white font-bold py-4 px-6 transition-all duration-200 transform hover:scale-105"
                >
                  <Users className="mr-2" />
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
