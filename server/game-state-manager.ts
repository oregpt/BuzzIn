import { CompleteGameState, Game, Player, Question, Buzz, GameAnswer } from "@shared/schema";
import { IStorage } from "./storage";

export class GameStateManager {
  private storage: IStorage;
  private gameStates: Map<string, CompleteGameState> = new Map();
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async getCompleteGameState(gameId: string): Promise<CompleteGameState | null> {
    // Check if we have cached state
    if (this.gameStates.has(gameId)) {
      return this.gameStates.get(gameId)!;
    }

    // Load from storage and build complete state
    const game = await this.storage.getGame(gameId);
    if (!game) return null;

    const players = await this.storage.getPlayersByGameId(gameId);
    const questions = await this.storage.getQuestionsByGameId(gameId);
    
    // Build complete state
    const completeState: CompleteGameState = {
      gameId: game.id,
      roomCode: game.roomCode,
      gameName: game.gameName,
      hostName: game.hostName,
      hostCode: game.hostCode,
      status: game.status as 'waiting' | 'active' | 'completed',
      categories: game.categories as string[],
      players,
      questions,
      currentQuestion: null,
      questionStartTime: null,
      timeRemaining: 0,
      questionState: 'none',
      buzzes: [],
      answers: [],
      nextPicker: null,
      lastScoreChange: null
    };

    // If there's a current question, load its related data
    if (game.currentQuestionId) {
      const currentQuestion = questions.find(q => q.id === game.currentQuestionId);
      if (currentQuestion) {
        completeState.currentQuestion = currentQuestion;
        completeState.questionState = 'active';
        
        // Load buzzes
        const buzzes = await this.storage.getBuzzesByQuestion(game.currentQuestionId);
        completeState.buzzes = buzzes.map(buzz => ({
          ...buzz,
          playerName: players.find(p => p.id === buzz.playerId)?.name || 'Unknown'
        }));
        
        // Load answers
        completeState.answers = await this.storage.getAnswersByQuestion(game.currentQuestionId);
      }
    }

    // Set next picker
    if (game.lastCorrectPlayerId) {
      const lastCorrectPlayer = players.find(p => p.id === game.lastCorrectPlayerId);
      if (lastCorrectPlayer) {
        completeState.nextPicker = {
          playerId: lastCorrectPlayer.id,
          playerName: lastCorrectPlayer.name
        };
      }
    }

    // Cache the state
    this.gameStates.set(gameId, completeState);
    return completeState;
  }

  async updateGameState(gameId: string): Promise<void> {
    // Clear cached state to force refresh
    this.gameStates.delete(gameId);
    // This will rebuild state from storage on next access
  }

  async selectQuestion(gameId: string, category: string, value: number, selectedBy?: string): Promise<CompleteGameState | null> {
    const state = await this.getCompleteGameState(gameId);
    if (!state) return null;

    // Find the question
    const question = state.questions.find(q => q.category === category && q.value === value && !q.isUsed);
    if (!question) return null;

    // Capture before scores for later score summary
    const beforeScores = state.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      score: p.score
    }));

    // Update state
    state.currentQuestion = question;
    state.questionStartTime = Date.now();
    state.timeRemaining = 30; // 30 seconds as requested
    state.questionState = 'active';
    state.buzzes = [];
    state.answers = [];
    
    // Store before scores for score summary
    state.lastScoreChange = {
      beforeScores,
      changes: state.players.map(p => ({ playerId: p.id, playerName: p.name, change: 0 })),
      afterScores: beforeScores // Will be updated when question closes
    };

    // Update database
    await this.storage.updateGame(gameId, { 
      currentQuestionId: question.id,
      status: 'active'
    });

    // Clear buzzes for this question (in case of reset)
    await this.storage.clearBuzzesForQuestion(question.id);

    this.gameStates.set(gameId, state);
    return state;
  }

  async buzzIn(gameId: string, playerId: string, questionId: string): Promise<CompleteGameState | null> {
    const state = await this.getCompleteGameState(gameId);
    if (!state || !state.currentQuestion || state.currentQuestion.id !== questionId) return null;

    // Check if player already buzzed
    const alreadyBuzzed = state.buzzes.find(b => b.playerId === playerId);
    if (alreadyBuzzed) return state;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    // Create buzz
    const buzzOrder = state.buzzes.length + 1;
    const buzz = await this.storage.createBuzz({
      gameId,
      playerId,
      questionId,
      isFirst: buzzOrder === 1,
      buzzOrder
    });

    // Add to state with player name
    state.buzzes.push({
      ...buzz,
      playerName: player.name
    });

    // Update question state
    if (buzzOrder === 1) {
      state.questionState = 'buzzing_closed'; // First buzz closes buzzing
    }

    this.gameStates.set(gameId, state);
    return state;
  }

  async markAnswer(gameId: string, playerId: string, isCorrect: boolean | null): Promise<CompleteGameState | null> {
    const state = await this.getCompleteGameState(gameId);
    if (!state || !state.currentQuestion) return null;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    const questionValue = state.currentQuestion.value;
    let scoreChange = 0;

    if (isCorrect === true) {
      scoreChange = questionValue;
      
      // Update next picker
      state.nextPicker = {
        playerId: player.id,
        playerName: player.name
      };
      
      // Update in database
      await this.storage.updateGame(gameId, { lastCorrectPlayerId: playerId });
      
    } else if (isCorrect === false) {
      scoreChange = -questionValue;
    }

    // Update player score
    const newScore = player.score + scoreChange;
    await this.storage.updatePlayer(playerId, { score: newScore });
    
    // Update in state
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex >= 0) {
      state.players[playerIndex].score = newScore;
    }

    // Update score changes for summary
    if (state.lastScoreChange) {
      const changeIndex = state.lastScoreChange.changes.findIndex(c => c.playerId === playerId);
      if (changeIndex >= 0) {
        state.lastScoreChange.changes[changeIndex].change += scoreChange;
      }
    }

    // Create game answer record
    const gameAnswer = await this.storage.createGameAnswer({
      gameId,
      playerId,
      questionId: state.currentQuestion.id,
      answer: '', // We don't track the actual answer text in this flow
      isCorrect,
      pointsAwarded: scoreChange,
      submissionOrder: 1,
      submissionTime: state.questionStartTime ? (Date.now() - state.questionStartTime) / 1000 : 0
    });

    state.answers.push(gameAnswer);
    state.questionState = 'answering';

    this.gameStates.set(gameId, state);
    return state;
  }

  async closeQuestion(gameId: string): Promise<CompleteGameState | null> {
    const state = await this.getCompleteGameState(gameId);
    if (!state || !state.currentQuestion) return null;

    // Mark question as used
    await this.storage.updateQuestion(state.currentQuestion.id, { isUsed: true });
    
    // Update question in state
    const questionIndex = state.questions.findIndex(q => q.id === state.currentQuestion!.id);
    if (questionIndex >= 0) {
      state.questions[questionIndex].isUsed = true;
    }

    // Finalize score summary
    if (state.lastScoreChange) {
      state.lastScoreChange.afterScores = state.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        score: p.score
      }));
    }

    // Clear current question state
    state.currentQuestion = null;
    state.questionStartTime = null;
    state.timeRemaining = 0;
    state.questionState = 'completed';
    state.buzzes = [];
    state.answers = [];

    // Update database
    await this.storage.updateGame(gameId, { 
      currentQuestionId: null,
      status: 'waiting'
    });

    this.gameStates.set(gameId, state);
    return state;
  }

  async resetGame(gameId: string): Promise<CompleteGameState | null> {
    const state = await this.getCompleteGameState(gameId);
    if (!state) return null;

    // Reset all players' scores
    for (const player of state.players) {
      await this.storage.updatePlayer(player.id, { score: 0 });
      player.score = 0;
    }

    // Reset all questions to unused
    for (const question of state.questions) {
      await this.storage.updateQuestion(question.id, { isUsed: false });
      question.isUsed = false;
    }

    // Clear game state
    state.currentQuestion = null;
    state.questionStartTime = null;
    state.timeRemaining = 0;
    state.questionState = 'none';
    state.buzzes = [];
    state.answers = [];
    state.nextPicker = null;
    state.lastScoreChange = null;
    state.status = 'waiting';

    // Update database
    await this.storage.updateGame(gameId, { 
      currentQuestionId: null,
      lastCorrectPlayerId: null,
      status: 'waiting'
    });

    this.gameStates.set(gameId, state);
    return state;
  }

  // Clear cached state when game is deleted
  clearGameState(gameId: string): void {
    this.gameStates.delete(gameId);
  }

  // Force refresh state from database
  async refreshGameState(gameId: string): Promise<CompleteGameState | null> {
    this.gameStates.delete(gameId);
    return await this.getCompleteGameState(gameId);
  }
}