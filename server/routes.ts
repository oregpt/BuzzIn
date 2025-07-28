import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { WSMessage, WSResponse, Player, Game, Question } from "@shared/schema";

interface ExtendedWebSocket extends WebSocket {
  playerId?: string;
  gameId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store WebSocket connections
  const connections = new Map<string, ExtendedWebSocket>();
  const gameConnections = new Map<string, Set<string>>();

  // Broadcast to all players in a game
  function broadcastToGame(gameId: string, message: WSResponse) {
    const gamePlayerIds = gameConnections.get(gameId);
    if (gamePlayerIds) {
      gamePlayerIds.forEach(playerId => {
        const ws = connections.get(playerId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  // Send message to specific player
  function sendToPlayer(playerId: string, message: WSResponse) {
    const ws = connections.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'create_game': {
            const { gameName, hostName } = message.data;
            const roomCode = await storage.generateRoomCode();
            
            const game = await storage.createGame({
              roomCode,
              hostName,
              gameName,
              status: "waiting",
              currentQuestionId: null,
            });

            const host = await storage.createPlayer({
              gameId: game.id,
              name: hostName,
              score: 0,
              isHost: true,
              socketId: null,
            });

            ws.playerId = host.id;
            ws.gameId = game.id;
            connections.set(host.id, ws);
            
            if (!gameConnections.has(game.id)) {
              gameConnections.set(game.id, new Set());
            }
            gameConnections.get(game.id)!.add(host.id);

            sendToPlayer(host.id, {
              type: "game_created",
              data: { roomCode, gameId: game.id }
            });
            break;
          }

          case 'join_game': {
            const { roomCode, playerName } = message.data;
            const game = await storage.getGameByRoomCode(roomCode);
            
            if (!game) {
              sendToPlayer(ws.playerId || '', {
                type: "error",
                data: { message: "Game not found" }
              });
              break;
            }

            const player = await storage.createPlayer({
              gameId: game.id,
              name: playerName,
              score: 0,
              isHost: false,
              socketId: null,
            });

            ws.playerId = player.id;
            ws.gameId = game.id;
            connections.set(player.id, ws);
            
            if (!gameConnections.has(game.id)) {
              gameConnections.set(game.id, new Set());
            }
            gameConnections.get(game.id)!.add(player.id);

            const allPlayers = await storage.getPlayersByGameId(game.id);

            sendToPlayer(player.id, {
              type: "game_joined",
              data: { playerId: player.id, gameId: game.id, players: allPlayers }
            });

            broadcastToGame(game.id, {
              type: "player_joined",
              data: { player }
            });
            break;
          }

          case 'select_question': {
            const { category, value } = message.data;
            if (!ws.gameId) break;

            const questions = await storage.getAllQuestions();
            const question = questions.find(q => 
              q.category === category && 
              q.value === value && 
              !q.isUsed
            );

            if (!question) {
              sendToPlayer(ws.playerId || '', {
                type: "error",
                data: { message: "Question not found or already used" }
              });
              break;
            }

            await storage.updateQuestion(question.id, { isUsed: true });
            await storage.updateGame(ws.gameId, { 
              currentQuestionId: question.id,
              status: "active"
            });

            // Clear any existing buzzes for this question
            await storage.clearBuzzesForQuestion(question.id);

            broadcastToGame(ws.gameId, {
              type: "question_selected",
              data: { question }
            });
            break;
          }

          case 'buzz': {
            const { questionId } = message.data;
            if (!ws.playerId || !ws.gameId) break;

            const player = await storage.getPlayer(ws.playerId);
            if (!player) break;

            const existingBuzzes = await storage.getBuzzesByQuestion(questionId);
            const isFirst = existingBuzzes.length === 0;

            const buzz = await storage.createBuzz({
              gameId: ws.gameId,
              playerId: ws.playerId,
              questionId,
              isFirst,
            });

            broadcastToGame(ws.gameId, {
              type: "buzz_received",
              data: {
                playerId: ws.playerId,
                playerName: player.name,
                timestamp: buzz.timestamp.getTime(),
                isFirst
              }
            });
            break;
          }

          case 'submit_answer': {
            const { questionId, answer } = message.data;
            if (!ws.playerId || !ws.gameId) break;

            const player = await storage.getPlayer(ws.playerId);
            if (!player) break;

            await storage.createGameAnswer({
              gameId: ws.gameId,
              playerId: ws.playerId,
              questionId,
              answer,
              isCorrect: null,
              pointsAwarded: 0,
            });

            broadcastToGame(ws.gameId, {
              type: "answer_submitted",
              data: {
                playerId: ws.playerId,
                playerName: player.name,
                answer
              }
            });
            break;
          }

          case 'mark_answer': {
            const { playerId, isCorrect, acceptClose } = message.data;
            if (!ws.gameId) break;

            const game = await storage.getGame(ws.gameId);
            const player = await storage.getPlayer(playerId);
            const question = game?.currentQuestionId ? await storage.getQuestion(game.currentQuestionId) : null;

            if (!game || !player || !question) break;

            const pointsAwarded = isCorrect || acceptClose ? question.value : -question.value;
            const newScore = player.score + pointsAwarded;

            await storage.updatePlayer(playerId, { score: newScore });

            broadcastToGame(ws.gameId, {
              type: "answer_marked",
              data: {
                playerId,
                isCorrect: isCorrect || !!acceptClose,
                pointsAwarded,
                newScore
              }
            });
            break;
          }

          case 'close_question': {
            if (!ws.gameId) break;

            await storage.updateGame(ws.gameId, { 
              currentQuestionId: null,
              status: "waiting"
            });

            broadcastToGame(ws.gameId, {
              type: "question_closed",
              data: {}
            });
            break;
          }

          case 'end_game': {
            if (!ws.gameId) break;

            const players = await storage.getPlayersByGameId(ws.gameId);
            const sortedPlayers = players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => ({ ...player, rank: index + 1 }));

            await storage.updateGame(ws.gameId, { status: "completed" });

            broadcastToGame(ws.gameId, {
              type: "game_ended",
              data: { finalStandings: sortedPlayers }
            });
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        sendToPlayer(ws.playerId || '', {
          type: "error",
          data: { message: "Invalid message format" }
        });
      }
    });

    ws.on('close', () => {
      if (ws.playerId) {
        connections.delete(ws.playerId);
        
        if (ws.gameId) {
          const gamePlayerIds = gameConnections.get(ws.gameId);
          if (gamePlayerIds) {
            gamePlayerIds.delete(ws.playerId);
            if (gamePlayerIds.size === 0) {
              gameConnections.delete(ws.gameId);
            }
          }
        }
      }
    });
  });

  return httpServer;
}
