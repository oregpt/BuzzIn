import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Copy, Plus, Users, Wifi, WifiOff, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { formatCurrency } from "@/lib/game-data";
import type { Player } from "@shared/schema";

interface PlayerManagementProps {
  players: Player[];
  roomCode: string;
  onClose: () => void;
}

export default function PlayerManagement({ players, roomCode, onClose }: PlayerManagementProps) {
  const [showCreatePlayer, setShowCreatePlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [createdPlayerCodes, setCreatedPlayerCodes] = useState<Array<{ name: string; code: string }>>([]);
  const { sendMessage, onMessage } = useWebSocket();
  const { toast } = useToast();

  // Handle player creation response
  onMessage("player_created", (data) => {
    setCreatedPlayerCodes(prev => {
      // Check if this player code already exists to prevent duplicates
      const exists = prev.some(p => p.code === data.playerCode);
      if (exists) return prev;
      return [...prev, { name: data.player.name, code: data.playerCode }];
    });
    toast({
      title: "Player Created",
      description: `${data.player.name} can join with code: ${data.playerCode}`,
    });
    setNewPlayerName("");
    setShowCreatePlayer(false);
  });

  // Handle player removal response
  onMessage("player_removed", (data) => {
    toast({
      title: "Player Removed",
      description: "Player has been successfully removed from the game",
    });
  });

  // Handle players cleared response
  onMessage("players_cleared", (data) => {
    setCreatedPlayerCodes([]);
    toast({
      title: "All Players Cleared",
      description: "All non-host players have been removed from the game",
    });
  });

  const handleCreatePlayer = () => {
    if (!newPlayerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a player name",
        variant: "destructive"
      });
      return;
    }

    sendMessage({
      type: "create_player",
      data: { playerName: newPlayerName.trim() }
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const removePlayer = (playerId: string) => {
    sendMessage({
      type: "remove_player",
      data: { playerId }
    });
  };

  const regularPlayers = players.filter(p => !p.isHost);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Player Management - Room {roomCode}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Player Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Player</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Player name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()}
                />
                <Button onClick={handleCreatePlayer} className="whitespace-nowrap">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Player
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recently Created Players */}
          {createdPlayerCodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Newly Created Player Codes
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCreatedPlayerCodes([])}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {createdPlayerCodes.map((player, index) => (
                    <div key={`${player.code}-${index}`} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Join with code: <span className="font-mono font-bold">{player.code}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(
                          `Room: ${roomCode}\nPlayer Code: ${player.code}`,
                          "Player details"
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Players ({regularPlayers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {regularPlayers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No players have joined yet. Create players above to get started.
                </div>
              ) : (
                <div className="grid gap-3">
                  {regularPlayers.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          player.isConnected 
                            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                          {player.isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {player.isConnected ? 'Connected' : 'Disconnected'}
                            {player.playerCode && (
                              <span className="ml-2">
                                • Code: <span className="font-mono">{player.playerCode}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-sm font-medium ${
                          player.score >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {formatCurrency(player.score)}
                        </div>
                        {player.playerCode && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(
                              `Room: ${roomCode}\nPlayer Code: ${player.playerCode}`,
                              `${player.name}'s details`
                            )}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removePlayer(player.id)}
                          title="Remove Player"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How Players Join</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium mb-2">For new players you create:</div>
                  <div>1. Give them the Room Code: <span className="font-mono font-bold">{roomCode}</span></div>
                  <div>2. Give them their Player Code (shown above)</div>
                  <div>3. They enter both codes on the join page</div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="font-medium mb-2 text-yellow-800 dark:text-yellow-200">Important:</div>
                  <div className="text-yellow-700 dark:text-yellow-300">All players must be pre-created by you. No walk-in players are allowed.</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    This ensures you have complete control over who participates in your game.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}