import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { gameAnswers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { z } from "zod";
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
    const connectionId = Math.random().toString(36).substr(2, 9);
    console.log('WebSocket connection established, ID:', connectionId);
    (ws as any).connectionId = connectionId;
    
    ws.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        console.log('Received message:', message.type, message.data, 'from playerId:', ws.playerId, 'gameId:', ws.gameId, 'connectionId:', (ws as any).connectionId);

        switch (message.type) {
          case 'create_game': {
            console.log('Processing create_game message:', message.data);
            const { gameName, hostName, categories, gameSetup: gameSetupStr } = message.data;
            
            // Extract codes from gameSetup if provided
            let roomCode: string;
            let hostCode: string;
            
            if (gameSetupStr) {
              try {
                const gameSetup = JSON.parse(gameSetupStr);
                roomCode = gameSetup.roomCode || await storage.generateRoomCode();
                hostCode = gameSetup.adminCode || storage.generateAuthCode();

                console.log('Using codes from setup - Room:', roomCode, 'Host:', hostCode);
              } catch (e) {
                console.log('Failed to parse gameSetup, generating new codes');
                roomCode = await storage.generateRoomCode();
                hostCode = storage.generateAuthCode();
              }
            } else {
              roomCode = await storage.generateRoomCode();
              hostCode = storage.generateAuthCode();
            }
            
            const game = await storage.createGame({
              roomCode,
              hostName,
              gameName,
              categories: categories || ["HISTORY", "SCIENCE", "SPORTS", "MOVIES", "GEOGRAPHY", "LITERATURE"],
              status: "waiting",
              currentQuestionId: null,
              hostCode,
            });
            console.log('Created game:', game);

            // Check if we have custom questions from setup
            if (gameSetupStr) {
              try {
                const gameSetup = JSON.parse(gameSetupStr);
                if (gameSetup.questions && gameSetup.questions.length > 0) {
                  // Create custom questions from the setup
                  for (const q of gameSetup.questions) {
                    await storage.createQuestion({
                      gameId: game.id,
                      category: q.category,
                      value: q.value,
                      question: q.question,
                      type: q.type,
                      correctAnswer: q.correctAnswer,
                      options: q.options,
                      isUsed: false
                    });
                  }
                } else {
                  // Initialize default questions for this game
                  await storage.initializeDefaultQuestions(game.id, game.categories as string[]);
                }
              } catch (e) {
                // If setup parsing fails, use default questions
                await storage.initializeDefaultQuestions(game.id, game.categories as string[]);
              }
            } else {
              // Initialize default questions for this game
              await storage.initializeDefaultQuestions(game.id, game.categories as string[]);
            }

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

            console.log('Sending game_created response to host:', host.id);
            const response: WSResponse = {
              type: "game_created",
              data: { 
                roomCode, 
                gameId: game.id,
                hostCode: game.hostCode,

              }
            };
            console.log('Response being sent:', response);
            sendToPlayer(host.id, response);
            break;
          }

          case 'join_game': {
            const { roomCode, playerName, isHost, hostCode, hostName, playerCode } = message.data;
            
            // If this is a host joining, redirect to host logic
            if (isHost) {
              // Handle as host join
              const game = await storage.getGameByRoomCode(roomCode);
              
              if (!game) {
                ws.send(JSON.stringify({
                  type: "error",
                  data: { message: "Game not found" }
                }));
                break;
              }

              // Validate host code
              if (hostCode !== game.hostCode) {
                ws.send(JSON.stringify({
                  type: "error",
                  data: { message: "Invalid host code" }
                }));
                break;
              }

              // Create or update host player entry
              const existingPlayers = await storage.getPlayersByGameId(game.id);
              let hostPlayer = existingPlayers.find(p => p.isHost);

              if (!hostPlayer) {
                hostPlayer = await storage.createPlayer({
                  gameId: game.id,
                  name: hostName || game.hostName,
                  score: 0,
                  isHost: true,
                  socketId: null,
                });
              }

              ws.playerId = hostPlayer.id;
              ws.gameId = game.id;
              connections.set(hostPlayer.id, ws);
              
              if (!gameConnections.has(game.id)) {
                gameConnections.set(game.id, new Set());
              }
              gameConnections.get(game.id)!.add(hostPlayer.id);

              const allPlayers = await storage.getPlayersByGameId(game.id);
              const allQuestions = await storage.getQuestionsByGameId(game.id);

              ws.send(JSON.stringify({
                type: "game_joined",
                data: { 
                  playerId: hostPlayer.id, 
                  gameId: game.id, 
                  players: allPlayers, 
                  roomCode: game.roomCode,
                  categories: game.categories,
                  questions: allQuestions
                }
              }));

              broadcastToGame(game.id, {
                type: "host_joined",
                data: { player: hostPlayer }
              });
              break;
            }

            // Regular player join logic
            const game = await storage.getGameByRoomCode(roomCode);
            
            if (!game) {
              sendToPlayer(ws.playerId || '', {
                type: "error",
                data: { message: "Game not found" }
              });
              break;
            }

            let player: Player;

            // All players must have a valid player code - no walk-ins allowed
            if (!playerCode) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Player code required. Contact the host to get your player code." }
              }));
              break;
            }

            const existingPlayer = await storage.getPlayerByCode(playerCode, game.id);
            if (!existingPlayer) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Invalid player code. Contact the host for the correct code." }
              }));
              break;
            }

            // Connect or reconnect the pre-created player
            player = await storage.updatePlayer(existingPlayer.id, {
              isConnected: true,
              socketId: null
            }) || existingPlayer;

            ws.playerId = player.id;
            ws.gameId = game.id;
            connections.set(player.id, ws);
            
            if (!gameConnections.has(game.id)) {
              gameConnections.set(game.id, new Set());
            }
            gameConnections.get(game.id)!.add(player.id);

            const allPlayers = await storage.getPlayersByGameId(game.id);

            const joinResponse: WSResponse = {
              type: "game_joined",
              data: { playerId: player.id, gameId: game.id, players: allPlayers, roomCode: game.roomCode }
            };
            console.log('Sending game_joined response to reconnected player:', player.id);
            ws.send(JSON.stringify(joinResponse));

            broadcastToGame(game.id, {
              type: "player_joined",
              data: { player }
            });
            break;
          }

          case 'create_player': {
            if (!ws.gameId) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Host must be in a game to create players" }
              }));
              break;
            }

            const { playerName } = message.data;
            const playerCode = storage.generateAuthCode();

            const player = await storage.createPlayer({
              gameId: ws.gameId,
              name: playerName,
              score: 0,
              isHost: false,
              socketId: null,
              playerCode,
              isConnected: false, // Not connected until they join
            });

            ws.send(JSON.stringify({
              type: "player_created",
              data: { player, playerCode }
            }));

            // Broadcast to all players that a new player slot was created
            broadcastToGame(ws.gameId, {
              type: "player_joined",
              data: { player }
            });
            break;
          }

          case 'join_as_host': {
            const { roomCode, hostCode } = message.data;
            console.log('Join as host request:', { roomCode, hostCode });
            const game = await storage.getGameByRoomCode(roomCode);
            
            if (!game) {
              console.log('Game not found for room code:', roomCode);
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Game not found" }
              }));
              break;
            }

            // Validate host code
            if (hostCode !== game.hostCode) {
              console.log('Invalid host code. Expected:', game.hostCode, 'Received:', hostCode);
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Invalid host code" }
              }));
              break;
            }

            // Create or update host player entry
            const existingPlayers = await storage.getPlayersByGameId(game.id);
            let hostPlayer = existingPlayers.find(p => p.isHost);
            
            if (!hostPlayer) {
              hostPlayer = await storage.createPlayer({
                gameId: game.id,
                name: game.hostName,
                score: 0,
                isHost: true,
                socketId: null,
              });
            }

            ws.playerId = hostPlayer.id;
            ws.gameId = game.id;
            connections.set(hostPlayer.id, ws);
            
            if (!gameConnections.has(game.id)) {
              gameConnections.set(game.id, new Set());
            }
            gameConnections.get(game.id)!.add(hostPlayer.id);

            const allPlayers = await storage.getPlayersByGameId(game.id);

            const joinResponse: WSResponse = {
              type: "game_joined",
              data: { playerId: hostPlayer.id, gameId: game.id, players: allPlayers, roomCode: game.roomCode, categories: game.categories }
            };
            console.log('Sending game_joined response to host:', hostPlayer.id);
            ws.send(JSON.stringify(joinResponse));
            
            console.log('Host WebSocket connection established:', { playerId: hostPlayer.id, gameId: game.id, connectionId: (ws as any).connectionId });

            broadcastToGame(game.id, {
              type: "host_joined",
              data: { player: hostPlayer }
            });
            break;
          }

          case 'get_game_state': {
            const { gameId } = message.data;
            if (!gameId) break;

            // Get game questions and used status
            const questions = await storage.getQuestionsByGameId(gameId);
            const game = await storage.getGame(gameId);
            
            if (!game) {
              sendToPlayer(ws.playerId || '', {
                type: "error", 
                data: { message: "Game not found" }
              });
              break;
            }

            sendToPlayer(ws.playerId || '', {
              type: "game_state_loaded",
              data: { 
                questions,
                game,
                categories: (game.categories as string[]) || []
              }
            });
            break;
          }

          case 'select_question': {
            const { category, value, selectedBy } = message.data;
            console.log('Processing select_question:', { category, value, gameId: ws.gameId, playerId: ws.playerId });
            if (!ws.gameId) {
              console.log('No gameId found for this WebSocket connection');
              break;
            }

            const questions = await storage.getQuestionsByGameId(ws.gameId);
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

            // Don't mark as used here - only when explicitly requested
            await storage.updateGame(ws.gameId, { 
              currentQuestionId: question.id,
              status: "active"
            });

            // Clear any existing buzzes and answers for this question
            await storage.clearBuzzesForQuestion(question.id);
            // Clear any existing answers for the new gameplay model
            const existingAnswers = await storage.getAnswersByQuestion(question.id);
            for (const answer of existingAnswers) {
              await db.delete(gameAnswers).where(eq(gameAnswers.id, answer.id));
            }

            let selectedByName = "Host";
            if (selectedBy) {
              const selectorPlayer = await storage.getPlayer(selectedBy);
              if (selectorPlayer) {
                selectedByName = selectorPlayer.name;
              }
            }

            broadcastToGame(ws.gameId, {
              type: "question_selected",
              data: { question, selectedBy: selectedByName }
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
            const buzzOrder = existingBuzzes.length + 1;

            const buzz = await storage.createBuzz({
              gameId: ws.gameId,
              playerId: ws.playerId,
              questionId,
              isFirst,
              buzzOrder,
            });

            // Get all buzzes for this question with player names
            const allBuzzes = await storage.getBuzzesByQuestion(questionId);
            const buzzeswithPlayerNames = await Promise.all(
              allBuzzes.map(async (b) => {
                const p = await storage.getPlayer(b.playerId);
                return {
                  playerId: b.playerId,
                  playerName: p?.name || 'Unknown',
                  timestamp: b.timestamp.getTime(),
                  buzzOrder: b.buzzOrder,
                  isFirst: b.isFirst
                };
              })
            );

            broadcastToGame(ws.gameId, {
              type: "buzz_received",
              data: {
                playerId: ws.playerId,
                playerName: player.name,
                timestamp: buzz.timestamp.getTime(),
                isFirst,
                buzzOrder
              }
            });

            // Send complete buzz order update
            broadcastToGame(ws.gameId, {
              type: "buzz_order_update",
              data: { buzzes: buzzeswithPlayerNames }
            });
            break;
          }

          case 'submit_answer': {
            const { questionId, answer, submissionTime } = message.data;
            if (!ws.playerId || !ws.gameId) break;

            const player = await storage.getPlayer(ws.playerId);
            if (!player) break;

            // Check if this player has already submitted an answer for this question
            const existingAnswers = await storage.getAnswersByQuestion(questionId);
            const playerHasAnswered = existingAnswers.some(a => a.playerId === ws.playerId);
            
            if (playerHasAnswered) {
              // Player already submitted, ignore duplicate
              console.log(`Player ${player.name} tried to submit duplicate answer - ignoring`);
              break;
            }

            // Get submission order
            const submissionOrder = existingAnswers.length + 1;

            // Store the submitted answer (no auto-evaluation, host will decide)
            await storage.createGameAnswer({
              gameId: ws.gameId,
              playerId: ws.playerId,
              questionId,
              answer,
              isCorrect: null, // Host will mark as correct/incorrect/neutral
              pointsAwarded: 0, // Host will set points
              submissionOrder,
              submissionTime,
            });

            // Broadcast to all players that an answer was submitted
            broadcastToGame(ws.gameId, {
              type: "answer_submitted",
              data: { 
                playerId: ws.playerId, 
                playerName: player.name, 
                answer, 
                submissionOrder,
                submissionTime 
              }
            });

            // Check if all players have submitted answers
            const allPlayers = await storage.getPlayersByGameId(ws.gameId);
            const nonHostPlayers = allPlayers.filter(p => !p.isHost);
            const allAnswersNow = await storage.getAnswersByQuestion(questionId);
            
            if (allAnswersNow.length >= nonHostPlayers.length) {
              // All players have submitted - send to host for evaluation
              const answersForHost = await Promise.all(
                allAnswersNow.map(async (answer) => {
                  const answerPlayer = await storage.getPlayer(answer.playerId);
                  return {
                    playerId: answer.playerId,
                    playerName: answerPlayer!.name,
                    answer: answer.answer,
                    submissionOrder: answer.submissionOrder,
                    submissionTime: answer.submissionTime,
                    isCorrect: null, // Host will decide
                    pointsAwarded: 0  // Host will decide
                  };
                })
              );

              // Send all answers to host for review
              broadcastToGame(ws.gameId, {
                type: "all_answers_collected",
                data: { answers: answersForHost }
              });
            }
            break;
          }

          case 'mark_answer': {
            const { playerId, isCorrect } = message.data;
            console.log('Processing mark_answer:', { playerId, isCorrect, gameId: ws.gameId });
            if (!ws.gameId) {
              console.log('No gameId found for mark_answer');
              break;
            }

            const game = await storage.getGame(ws.gameId);
            const player = await storage.getPlayer(playerId);
            const question = game?.currentQuestionId ? await storage.getQuestion(game.currentQuestionId) : null;

            if (!game || !player || !question) break;

            // Host decides: checkmark = correct (+points), X = wrong (-points), no click = neutral (0 points)
            let pointsAwarded = 0;
            if (isCorrect === true) {
              pointsAwarded = question.value; // Checkmark clicked = correct
            } else if (isCorrect === false) {
              pointsAwarded = -question.value; // X clicked = wrong
            }
            // If isCorrect is null/undefined = no click = neutral (0 points)

            const newScore = player.score + pointsAwarded;
            console.log(`Updating player ${playerId} score from ${player.score} to ${newScore} (awarded: ${pointsAwarded})`);
            
            const updatedPlayer = await storage.updatePlayer(playerId, { score: newScore });
            console.log('Player updated successfully:', updatedPlayer);

            // If answer was marked correct, this player gets to pick next
            if (isCorrect === true) {
              await storage.updateGame(ws.gameId, { lastCorrectPlayerId: playerId });
            }

            // Get all updated players to broadcast
            const allUpdatedPlayers = await storage.getPlayersByGameId(ws.gameId);
            console.log('Broadcasting updated scores for all players:', allUpdatedPlayers);

            broadcastToGame(ws.gameId, {
              type: "answer_marked",
              data: {
                playerId,
                isCorrect: isCorrect === true,
                pointsAwarded,
                newScore,
                canPickNext: isCorrect === true
              }
            });

            // Also broadcast scores_updated with all current player scores
            broadcastToGame(ws.gameId, {
              type: "scores_updated", 
              data: { players: allUpdatedPlayers }
            });
            break;
          }

          case 'close_question': {
            if (!ws.gameId) break;

            const game = await storage.getGame(ws.gameId);
            let nextPicker = undefined;

            if (game?.lastCorrectPlayerId) {
              const nextPickerPlayer = await storage.getPlayer(game.lastCorrectPlayerId);
              if (nextPickerPlayer) {
                nextPicker = {
                  playerId: nextPickerPlayer.id,
                  playerName: nextPickerPlayer.name
                };
              }
            }

            await storage.updateGame(ws.gameId, { 
              currentQuestionId: null,
              status: "waiting"
            });

            broadcastToGame(ws.gameId, {
              type: "question_closed",
              data: { nextPicker }
            });
            break;
          }

          case 'mark_question_used': {
            const { questionId } = message.data;
            if (!ws.gameId) break;

            await storage.updateQuestion(questionId, { isUsed: true });
            
            // Notify all players that question is now used
            broadcastToGame(ws.gameId, {
              type: "question_marked_used",
              data: { questionId }
            });
            break;
          }

          case 'end_game': {
            console.log('Processing end_game:', { gameId: ws.gameId, playerId: ws.playerId });
            if (!ws.gameId) {
              console.log('No gameId found for end_game');
              break;
            }

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

          case 'reset_game': {
            console.log('Processing reset_game:', { gameId: ws.gameId, playerId: ws.playerId });
            if (!ws.gameId) {
              console.log('No gameId found for reset_game');
              break;
            }

            const success = await storage.resetGame(ws.gameId);
            
            if (success) {
              // Get updated player data
              const players = await storage.getPlayersByGameId(ws.gameId);
              
              // Get updated questions
              const questions = await storage.getQuestionsByGameId(ws.gameId);
              
              // Broadcast reset notification to all players
              broadcastToGame(ws.gameId, {
                type: "game_reset",
                data: { 
                  players: players,
                  questions: questions
                }
              });

              sendToPlayer(ws.playerId || '', {
                type: "reset_success",
                data: { message: "Game reset successfully" }
              });
            } else {
              sendToPlayer(ws.playerId || '', {
                type: "error",
                data: { message: "Failed to reset game" }
              });
            }
            break;
          }

          case 'clear_players': {
            console.log('Processing clear_players:', { gameId: ws.gameId, playerId: ws.playerId });
            if (!ws.gameId) {
              console.log('No gameId found for clear_players');
              break;
            }

            // Clear all non-host players using proper database deletion
            await storage.clearNonHostPlayers(ws.gameId);
            
            // Get remaining players (should only be host)
            const remainingPlayers = await storage.getPlayersByGameId(ws.gameId);
            
            // Disconnect all non-host player websockets
              const gamePlayerIds = gameConnections.get(ws.gameId);
              if (gamePlayerIds) {
                // Create array of player IDs to remove (avoid concurrent modification)
                const playersToRemove = Array.from(gamePlayerIds).filter(playerId => {
                  const playerData = remainingPlayers.find(p => p.id === playerId);
                  return !playerData?.isHost;
                });
                
                // Remove non-host players from connections
                playersToRemove.forEach(playerId => {
                  const playerWs = connections.get(playerId);
                  if (playerWs && playerWs.readyState === WebSocket.OPEN) {
                    playerWs.send(JSON.stringify({
                      type: "players_cleared",
                      data: { message: "All players have been cleared by the host" }
                    }));
                    playerWs.close();
                  }
                  connections.delete(playerId);
                  gamePlayerIds.delete(playerId);
                });
              }
              
              // Broadcast to remaining players (host)
              broadcastToGame(ws.gameId, {
                type: "players_cleared",
                data: { 
                  players: remainingPlayers,
                  message: "All players have been cleared"
                }
              });

            sendToPlayer(ws.playerId || '', {
              type: "clear_players_success", 
              data: { message: "Players cleared successfully" }
            });
            break;
          }

          case 'remove_player': {
            if (!ws.gameId) break;
            
            const { playerId } = message.data;
            console.log('Processing remove_player:', { gameId: ws.gameId, playerId });
            
            try {
              // Delete the specific player
              await storage.deletePlayer(playerId);
              
              // Get updated player list
              const updatedPlayers = await storage.getPlayersByGameId(ws.gameId);
              
              // Disconnect the removed player if they're connected
              const removedPlayerWs = connections.get(playerId);
              if (removedPlayerWs && removedPlayerWs.readyState === WebSocket.OPEN) {
                removedPlayerWs.send(JSON.stringify({
                  type: "player_removed",
                  data: { message: "You have been removed from the game by the host" }
                }));
                removedPlayerWs.close();
              }
              connections.delete(playerId);
              
              // Remove from game connections
              const gamePlayerIds = gameConnections.get(ws.gameId);
              if (gamePlayerIds) {
                gamePlayerIds.delete(playerId);
              }
              
              // Broadcast the updated player list
              broadcastToGame(ws.gameId, {
                type: "player_removed",
                data: { playerId, players: updatedPlayers }
              });
            } catch (error) {
              console.error('Error removing player:', error);
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Failed to remove player" }
              }));
            }
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        console.error('Error stack:', (error as Error)?.stack);
        sendToPlayer(ws.playerId || '', {
          type: "error",
          data: { message: "Server error: " + (error as Error)?.message || "Unknown error" }
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

  // REST API endpoint for getting open games
  app.get('/api/open-games', async (req, res) => {
    try {
      const openGames = await storage.getOpenGames();
      // Include player count for each game
      const gamesWithPlayerCounts = await Promise.all(
        openGames.map(async (game) => {
          const players = await storage.getPlayersByGameId(game.id);
          return {
            ...game,
            playerCount: players.length
          };
        })
      );
      res.json(gamesWithPlayerCounts);
    } catch (error) {
      console.error('Error fetching open games:', error);
      res.status(500).json({ error: 'Failed to fetch open games' });
    }
  });

  // Get questions for a specific game
  app.get('/api/games/:gameId/questions', async (req, res) => {
    try {
      const { gameId } = req.params;
      const questions = await storage.getQuestionsByGameId(gameId);
      res.json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

  // Delete game endpoint
  app.delete('/api/games/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Game ID is required' });
      }

      const success = await storage.deleteGame(id);
      
      if (success) {
        res.json({ message: 'Game deleted successfully' });
      } else {
        res.status(404).json({ error: 'Game not found' });
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      res.status(500).json({ error: 'Failed to delete game' });
    }
  });

  // Reset game endpoint
  app.post('/api/games/:id/reset', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Game ID is required' });
      }

      const success = await storage.resetGame(id);
      
      if (success) {
        res.json({ message: 'Game reset successfully' });
      } else {
        res.status(404).json({ error: 'Game not found' });
      }
    } catch (error) {
      console.error('Error resetting game:', error);
      res.status(500).json({ error: 'Failed to reset game' });
    }
  });

  // Clear all players endpoint
  app.post('/api/games/:id/clear-players', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Game ID is required' });
      }

      const success = await storage.clearAllPlayers(id);
      
      if (success) {
        res.json({ message: 'Players cleared successfully' });
      } else {
        res.status(404).json({ error: 'Game not found' });
      }
    } catch (error) {
      console.error('Error clearing players:', error);
      res.status(500).json({ error: 'Failed to clear players' });
    }
  });

  // REST API endpoint for updating questions
  app.put('/api/questions/:id', async (req, res) => {
    try {
      const questionId = req.params.id;
      const updates = req.body;
      
      // Validate the updates using Zod
      const updateSchema = z.object({
        question: z.string().optional(),
        correctAnswer: z.string().optional(),
        category: z.string().optional(),
        value: z.number().optional(),
        type: z.enum(['multiple_choice', 'true_false', 'specific_answer']).optional(),
        options: z.array(z.string()).nullable().optional(),
      });
      
      const validatedUpdates = updateSchema.parse(updates);
      
      const updatedQuestion = await storage.updateQuestion(questionId, validatedUpdates);
      
      if (!updatedQuestion) {
        return res.status(404).json({ error: 'Question not found' });
      }
      
      res.json(updatedQuestion);
    } catch (error) {
      console.error('Error updating question:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update question' });
    }
  });

  return httpServer;
}
