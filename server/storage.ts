import { type Game, type InsertGame, type Player, type InsertPlayer, type Question, type InsertQuestion, type Buzz, type InsertBuzz, type GameAnswer, type InsertGameAnswer, games, players, questions, buzzes, gameAnswers } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Game methods
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  getGameByRoomCode(roomCode: string): Promise<Game | undefined>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;

  // Player methods
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayersByGameId(gameId: string): Promise<Player[]>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined>;
  deletePlayer(id: string): Promise<boolean>;

  // Question methods
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: string): Promise<Question | undefined>;
  getAllQuestions(): Promise<Question[]>;
  updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined>;

  // Buzz methods
  createBuzz(buzz: InsertBuzz): Promise<Buzz>;
  getBuzzesByQuestion(questionId: string): Promise<Buzz[]>;
  clearBuzzesForQuestion(questionId: string): Promise<void>;

  // Game Answer methods
  createGameAnswer(answer: InsertGameAnswer): Promise<GameAnswer>;
  getGameAnswersByQuestion(questionId: string): Promise<GameAnswer[]>;

  // Utility methods
  generateRoomCode(): Promise<string>;
}

export class MemStorage implements IStorage {
  private games: Map<string, Game>;
  private players: Map<string, Player>;
  private questions: Map<string, Question>;
  private buzzes: Map<string, Buzz>;
  private gameAnswers: Map<string, GameAnswer>;

  constructor() {
    this.games = new Map();
    this.players = new Map();
    this.questions = new Map();
    this.buzzes = new Map();
    this.gameAnswers = new Map();
    this.initializeQuestions();
  }

  private initializeQuestions() {
    const categories = ["HISTORY", "SCIENCE", "SPORTS", "MOVIES", "GEOGRAPHY", "LITERATURE"];
    const values = [100, 200, 300, 400, 500];

    const questionsData = [
      // HISTORY
      { category: "HISTORY", value: 100, question: "This ancient wonder of the world was located in Alexandria, Egypt.", type: "multiple_choice", correctAnswer: "A", options: ["The Lighthouse of Alexandria", "The Hanging Gardens of Babylon", "The Colossus of Rhodes", "The Great Pyramid of Giza"] },
      { category: "HISTORY", value: 200, question: "The American Civil War ended in this year.", type: "specific_answer", correctAnswer: "1865", options: null },
      { category: "HISTORY", value: 300, question: "Julius Caesar was assassinated on the Ides of March.", type: "true_false", correctAnswer: "true", options: null },
      { category: "HISTORY", value: 400, question: "This French military leader was exiled to the island of Elba.", type: "specific_answer", correctAnswer: "Napoleon", options: null },
      { category: "HISTORY", value: 500, question: "The Treaty of Versailles was signed after which war?", type: "multiple_choice", correctAnswer: "A", options: ["World War I", "World War II", "Franco-Prussian War", "Napoleonic Wars"] },

      // SCIENCE
      { category: "SCIENCE", value: 100, question: "Water boils at 100 degrees Celsius at sea level.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SCIENCE", value: 200, question: "This planet is known as the Red Planet.", type: "specific_answer", correctAnswer: "Mars", options: null },
      { category: "SCIENCE", value: 300, question: "What is the chemical symbol for gold?", type: "multiple_choice", correctAnswer: "B", options: ["Go", "Au", "Gd", "Ag"] },
      { category: "SCIENCE", value: 400, question: "Einstein's theory of relativity includes both special and general relativity.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SCIENCE", value: 500, question: "This scientist developed the periodic table of elements.", type: "specific_answer", correctAnswer: "Mendeleev", options: null },

      // SPORTS
      { category: "SPORTS", value: 100, question: "A basketball team has 5 players on the court at one time.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SPORTS", value: 200, question: "This sport is known as 'the beautiful game'.", type: "specific_answer", correctAnswer: "Soccer", options: null },
      { category: "SPORTS", value: 300, question: "How many holes are there in a standard round of golf?", type: "multiple_choice", correctAnswer: "C", options: ["16", "17", "18", "19"] },
      { category: "SPORTS", value: 400, question: "The Olympics are held every 4 years.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SPORTS", value: 500, question: "This country has won the most FIFA World Cups.", type: "specific_answer", correctAnswer: "Brazil", options: null },

      // MOVIES
      { category: "MOVIES", value: 100, question: "The movie 'Titanic' was released in 1997.", type: "true_false", correctAnswer: "true", options: null },
      { category: "MOVIES", value: 200, question: "This director created the movie 'Jaws'.", type: "specific_answer", correctAnswer: "Spielberg", options: null },
      { category: "MOVIES", value: 300, question: "Which movie won the Academy Award for Best Picture in 2020?", type: "multiple_choice", correctAnswer: "D", options: ["1917", "Joker", "Once Upon a Time in Hollywood", "Parasite"] },
      { category: "MOVIES", value: 400, question: "'The Godfather' was based on a novel by Mario Puzo.", type: "true_false", correctAnswer: "true", options: null },
      { category: "MOVIES", value: 500, question: "This actor played the character of Tony Stark in the Marvel Cinematic Universe.", type: "specific_answer", correctAnswer: "Robert Downey Jr.", options: null },

      // GEOGRAPHY
      { category: "GEOGRAPHY", value: 100, question: "Australia is both a country and a continent.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GEOGRAPHY", value: 200, question: "This is the longest river in the world.", type: "specific_answer", correctAnswer: "Nile", options: null },
      { category: "GEOGRAPHY", value: 300, question: "What is the capital of Canada?", type: "multiple_choice", correctAnswer: "C", options: ["Toronto", "Vancouver", "Ottawa", "Montreal"] },
      { category: "GEOGRAPHY", value: 400, question: "The Sahara Desert is located in Africa.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GEOGRAPHY", value: 500, question: "This mountain range contains Mount Everest.", type: "specific_answer", correctAnswer: "Himalayas", options: null },

      // LITERATURE
      { category: "LITERATURE", value: 100, question: "Shakespeare wrote 'Romeo and Juliet'.", type: "true_false", correctAnswer: "true", options: null },
      { category: "LITERATURE", value: 200, question: "This author wrote 'To Kill a Mockingbird'.", type: "specific_answer", correctAnswer: "Harper Lee", options: null },
      { category: "LITERATURE", value: 300, question: "Which novel begins with 'It was the best of times, it was the worst of times'?", type: "multiple_choice", correctAnswer: "A", options: ["A Tale of Two Cities", "Great Expectations", "Oliver Twist", "David Copperfield"] },
      { category: "LITERATURE", value: 400, question: "George Orwell wrote '1984' as a dystopian novel.", type: "true_false", correctAnswer: "true", options: null },
      { category: "LITERATURE", value: 500, question: "This Russian author wrote 'War and Peace'.", type: "specific_answer", correctAnswer: "Tolstoy", options: null },
    ];

    questionsData.forEach(q => {
      const id = randomUUID();
      const question: Question = {
        id,
        category: q.category,
        value: q.value,
        question: q.question,
        type: q.type,
        correctAnswer: q.correctAnswer,
        options: q.options,
        isUsed: false,
      };
      this.questions.set(id, question);
    });
  }

  async generateRoomCode(): Promise<string> {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 6).toUpperCase();
    } while (Array.from(this.games.values()).some(game => game.roomCode === code));
    return code;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      id,
      roomCode: insertGame.roomCode,
      hostName: insertGame.hostName,
      gameName: insertGame.gameName,
      status: insertGame.status || "waiting",
      currentQuestionId: insertGame.currentQuestionId || null,
      lastCorrectPlayerId: null,
      createdAt: new Date(),
    };
    this.games.set(id, game);
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGameByRoomCode(roomCode: string): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(game => game.roomCode === roomCode);
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...updates };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async deleteGame(id: string): Promise<boolean> {
    return this.games.delete(id);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = {
      id,
      gameId: insertPlayer.gameId,
      name: insertPlayer.name,
      score: insertPlayer.score || 0,
      isHost: insertPlayer.isHost || false,
      socketId: insertPlayer.socketId || null,
      joinedAt: new Date(),
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayersByGameId(gameId: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.gameId === gameId);
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async deletePlayer(id: string): Promise<boolean> {
    return this.players.delete(id);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const question: Question = {
      id,
      category: insertQuestion.category,
      value: insertQuestion.value,
      question: insertQuestion.question,
      type: insertQuestion.type,
      correctAnswer: insertQuestion.correctAnswer,
      options: insertQuestion.options || null,
      isUsed: insertQuestion.isUsed || false,
    };
    this.questions.set(id, question);
    return question;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getAllQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;
    
    const updatedQuestion = { ...question, ...updates };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }

  async createBuzz(insertBuzz: InsertBuzz): Promise<Buzz> {
    const id = randomUUID();
    const buzz: Buzz = {
      id,
      gameId: insertBuzz.gameId,
      playerId: insertBuzz.playerId,
      questionId: insertBuzz.questionId,
      timestamp: new Date(),
      isFirst: insertBuzz.isFirst || false,
      buzzOrder: insertBuzz.buzzOrder || 1,
    };
    this.buzzes.set(id, buzz);
    return buzz;
  }

  async getBuzzesByQuestion(questionId: string): Promise<Buzz[]> {
    return Array.from(this.buzzes.values())
      .filter(buzz => buzz.questionId === questionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async clearBuzzesForQuestion(questionId: string): Promise<void> {
    const entriesToDelete: string[] = [];
    this.buzzes.forEach((buzz, id) => {
      if (buzz.questionId === questionId) {
        entriesToDelete.push(id);
      }
    });
    entriesToDelete.forEach(id => this.buzzes.delete(id));
  }

  async createGameAnswer(insertAnswer: InsertGameAnswer): Promise<GameAnswer> {
    const id = randomUUID();
    const answer: GameAnswer = {
      id,
      gameId: insertAnswer.gameId,
      playerId: insertAnswer.playerId,
      questionId: insertAnswer.questionId,
      answer: insertAnswer.answer,
      isCorrect: insertAnswer.isCorrect || null,
      pointsAwarded: insertAnswer.pointsAwarded || 0,
      submittedAt: new Date(),
    };
    this.gameAnswers.set(id, answer);
    return answer;
  }

  async getGameAnswersByQuestion(questionId: string): Promise<GameAnswer[]> {
    return Array.from(this.gameAnswers.values()).filter(answer => answer.questionId === questionId);
  }
}

export class DatabaseStorage implements IStorage {
  // Game methods
  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async getGameByRoomCode(roomCode: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.roomCode, roomCode));
    return game || undefined;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    const [game] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
    return game || undefined;
  }

  async deleteGame(id: string): Promise<boolean> {
    const result = await db.delete(games).where(eq(games.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Player methods
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async getPlayersByGameId(gameId: string): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.gameId, gameId));
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const [player] = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return player || undefined;
  }

  async deletePlayer(id: string): Promise<boolean> {
    const result = await db.delete(players).where(eq(players.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Question methods
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(insertQuestion).returning();
    return question;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question || undefined;
  }

  async getAllQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined> {
    const [question] = await db.update(questions).set(updates).where(eq(questions.id, id)).returning();
    return question || undefined;
  }

  // Buzz methods
  async createBuzz(insertBuzz: InsertBuzz): Promise<Buzz> {
    const [buzz] = await db.insert(buzzes).values(insertBuzz).returning();
    return buzz;
  }

  async getBuzzesByQuestion(questionId: string): Promise<Buzz[]> {
    return await db.select().from(buzzes).where(eq(buzzes.questionId, questionId));
  }

  async clearBuzzesForQuestion(questionId: string): Promise<void> {
    await db.delete(buzzes).where(eq(buzzes.questionId, questionId));
  }

  // Game Answer methods
  async createGameAnswer(insertAnswer: InsertGameAnswer): Promise<GameAnswer> {
    const [answer] = await db.insert(gameAnswers).values(insertAnswer).returning();
    return answer;
  }

  async getGameAnswersByQuestion(questionId: string): Promise<GameAnswer[]> {
    return await db.select().from(gameAnswers).where(eq(gameAnswers.questionId, questionId));
  }

  // Utility methods
  async generateRoomCode(): Promise<string> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if room code already exists
    const existing = await this.getGameByRoomCode(result);
    if (existing) {
      return this.generateRoomCode(); // Recursively generate new code
    }
    
    return result;
  }
}

export const storage = new DatabaseStorage();
