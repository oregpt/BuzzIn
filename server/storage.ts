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
  getOpenGames(): Promise<Game[]>;

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
  getQuestionsByGameId(gameId: string): Promise<Question[]>;
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
  generateAuthCode(): string;
  initializeDefaultQuestions(gameId: string, categories: string[]): Promise<void>;
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
        gameId: "default", // MemStorage uses a default game ID
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

  generateAuthCode(): string {
    // Generate 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      id,
      roomCode: insertGame.roomCode,
      hostName: insertGame.hostName,
      gameName: insertGame.gameName,
      categories: insertGame.categories || ["HISTORY", "SCIENCE", "SPORTS", "MOVIES", "GEOGRAPHY", "LITERATURE"],
      status: insertGame.status || "waiting",
      currentQuestionId: insertGame.currentQuestionId || null,
      lastCorrectPlayerId: null,
      hostCode: insertGame.hostCode || this.generateAuthCode(),

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

  async getOpenGames(): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.status === "waiting");
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
      gameId: insertQuestion.gameId,
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

  async getQuestionsByGameId(gameId: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(q => q.gameId === gameId);
  }

  async initializeDefaultQuestions(gameId: string, categories: string[]): Promise<void> {
    // Create default questions for the specified categories and values
    const values = [100, 200, 300, 400, 500];
    
    for (const category of categories) {
      for (const value of values) {
        await this.createQuestion({
          gameId,
          category,
          value,
          question: `Sample ${category} question for $${value}`,
          type: 'specific_answer',
          correctAnswer: 'Sample answer',
          options: null,
          isUsed: false
        });
      }
    }
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

  async getOpenGames(): Promise<Game[]> {
    return await db.select().from(games).where(eq(games.status, "waiting"));
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

  async getQuestionsByGameId(gameId: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.gameId, gameId));
  }

  async initializeDefaultQuestions(gameId: string, categories: string[]): Promise<void> {
    // Default questions data
    const defaultQuestionsData = [
      // HISTORY
      { category: "HISTORY", value: 100, question: "What year did World War II end?", type: "specific_answer", correctAnswer: "1945", options: null },
      { category: "HISTORY", value: 200, question: "Who was the first President of the United States?", type: "specific_answer", correctAnswer: "George Washington", options: null },
      { category: "HISTORY", value: 300, question: "The Berlin Wall fell in which year?", type: "specific_answer", correctAnswer: "1989", options: null },
      { category: "HISTORY", value: 400, question: "Which empire was ruled by Julius Caesar?", type: "specific_answer", correctAnswer: "Roman Empire", options: null },
      { category: "HISTORY", value: 500, question: "What ancient wonder of the world was located in Alexandria?", type: "specific_answer", correctAnswer: "Lighthouse of Alexandria", options: null },

      // SCIENCE
      { category: "SCIENCE", value: 100, question: "Water boils at 100 degrees Celsius at sea level.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SCIENCE", value: 200, question: "This planet is known as the Red Planet.", type: "specific_answer", correctAnswer: "Mars", options: null },
      { category: "SCIENCE", value: 300, question: "What is the chemical symbol for gold?", type: "multiple_choice", correctAnswer: "B", options: ["Go", "Au", "Gd", "Ag"] },
      { category: "SCIENCE", value: 400, question: "Einstein's theory of relativity includes both special and general relativity.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SCIENCE", value: 500, question: "This scientist developed the periodic table of elements.", type: "specific_answer", correctAnswer: "Mendeleev", options: null },

      // SPORTS
      { category: "SPORTS", value: 100, question: "A basketball team has 5 players on the court at one time.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SPORTS", value: 200, question: "This sport is known as 'the beautiful game'.", type: "specific_answer", correctAnswer: "Soccer", options: null },
      { category: "SPORTS", value: 300, question: "How many holes are there in a standard round of golf?", type: "multiple_choice", correctAnswer: "B", options: ["16", "18", "20", "22"] },
      { category: "SPORTS", value: 400, question: "The Olympics are held every 4 years.", type: "true_false", correctAnswer: "true", options: null },
      { category: "SPORTS", value: 500, question: "This boxer was known as 'The Greatest'.", type: "specific_answer", correctAnswer: "Muhammad Ali", options: null },

      // MOVIES
      { category: "MOVIES", value: 100, question: "The movie 'Titanic' won the Academy Award for Best Picture.", type: "true_false", correctAnswer: "true", options: null },
      { category: "MOVIES", value: 200, question: "This director created the 'Star Wars' saga.", type: "specific_answer", correctAnswer: "George Lucas", options: null },
      { category: "MOVIES", value: 300, question: "Which movie features the quote 'Here's looking at you, kid'?", type: "multiple_choice", correctAnswer: "A", options: ["Casablanca", "Gone with the Wind", "The Maltese Falcon", "Citizen Kane"] },
      { category: "MOVIES", value: 400, question: "The first movie ever made was in color.", type: "true_false", correctAnswer: "false", options: null },
      { category: "MOVIES", value: 500, question: "This actor played the Joker in 'The Dark Knight'.", type: "specific_answer", correctAnswer: "Heath Ledger", options: null },

      // GEOGRAPHY
      { category: "GEOGRAPHY", value: 100, question: "The Amazon River is the longest river in the world.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GEOGRAPHY", value: 200, question: "This is the capital of Australia.", type: "specific_answer", correctAnswer: "Canberra", options: null },
      { category: "GEOGRAPHY", value: 300, question: "Which continent has the most countries?", type: "multiple_choice", correctAnswer: "A", options: ["Africa", "Asia", "Europe", "South America"] },
      { category: "GEOGRAPHY", value: 400, question: "Mount Everest is located on the border of Nepal and Tibet.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GEOGRAPHY", value: 500, question: "This desert is the largest hot desert in the world.", type: "specific_answer", correctAnswer: "Sahara", options: null },

      // LITERATURE
      { category: "LITERATURE", value: 100, question: "Shakespeare wrote 'Romeo and Juliet'.", type: "true_false", correctAnswer: "true", options: null },
      { category: "LITERATURE", value: 200, question: "This author wrote '1984' and 'Animal Farm'.", type: "specific_answer", correctAnswer: "George Orwell", options: null },
      { category: "LITERATURE", value: 300, question: "Which novel begins with 'It was the best of times, it was the worst of times'?", type: "multiple_choice", correctAnswer: "C", options: ["Great Expectations", "Oliver Twist", "A Tale of Two Cities", "David Copperfield"] },
      { category: "LITERATURE", value: 400, question: "The 'Harry Potter' series consists of 7 books.", type: "true_false", correctAnswer: "true", options: null },
      { category: "LITERATURE", value: 500, question: "This American author wrote 'The Great Gatsby'.", type: "specific_answer", correctAnswer: "F. Scott Fitzgerald", options: null },

      // MUSIC
      { category: "MUSIC", value: 100, question: "A standard piano has 88 keys.", type: "true_false", correctAnswer: "true", options: null },
      { category: "MUSIC", value: 200, question: "This composer wrote 'The Four Seasons'.", type: "specific_answer", correctAnswer: "Vivaldi", options: null },
      { category: "MUSIC", value: 300, question: "Which instrument does Yo-Yo Ma famously play?", type: "multiple_choice", correctAnswer: "B", options: ["Violin", "Cello", "Piano", "Viola"] },
      { category: "MUSIC", value: 400, question: "The Beatles were from Liverpool, England.", type: "true_false", correctAnswer: "true", options: null },
      { category: "MUSIC", value: 500, question: "This jazz musician was known as 'Satchmo'.", type: "specific_answer", correctAnswer: "Louis Armstrong", options: null },

      // FOOD
      { category: "FOOD", value: 100, question: "Tomatoes are technically a fruit.", type: "true_false", correctAnswer: "true", options: null },
      { category: "FOOD", value: 200, question: "This spice is derived from the Crocus flower.", type: "specific_answer", correctAnswer: "Saffron", options: null },
      { category: "FOOD", value: 300, question: "Which country is credited with inventing pizza?", type: "multiple_choice", correctAnswer: "B", options: ["Greece", "Italy", "France", "Spain"] },
      { category: "FOOD", value: 400, question: "Chocolate comes from cacao beans.", type: "true_false", correctAnswer: "true", options: null },
      { category: "FOOD", value: 500, question: "This French cooking technique involves cooking food slowly in its own fat.", type: "specific_answer", correctAnswer: "Confit", options: null },

      // TECHNOLOGY
      { category: "TECHNOLOGY", value: 100, question: "WWW stands for World Wide Web.", type: "true_false", correctAnswer: "true", options: null },
      { category: "TECHNOLOGY", value: 200, question: "This company created the iPhone.", type: "specific_answer", correctAnswer: "Apple", options: null },
      { category: "TECHNOLOGY", value: 300, question: "What does 'AI' stand for in technology?", type: "multiple_choice", correctAnswer: "A", options: ["Artificial Intelligence", "Automated Integration", "Advanced Interface", "Application Infrastructure"] },
      { category: "TECHNOLOGY", value: 400, question: "The first computer bug was actually a real insect.", type: "true_false", correctAnswer: "true", options: null },
      { category: "TECHNOLOGY", value: 500, question: "This programming language was created by Guido van Rossum.", type: "specific_answer", correctAnswer: "Python", options: null },

      // NATURE
      { category: "NATURE", value: 100, question: "Penguins can fly.", type: "true_false", correctAnswer: "false", options: null },
      { category: "NATURE", value: 200, question: "This is the largest mammal in the world.", type: "specific_answer", correctAnswer: "Blue Whale", options: null },
      { category: "NATURE", value: 300, question: "How many chambers does a human heart have?", type: "multiple_choice", correctAnswer: "C", options: ["2", "3", "4", "5"] },
      { category: "NATURE", value: 400, question: "Sharks are mammals.", type: "true_false", correctAnswer: "false", options: null },
      { category: "NATURE", value: 500, question: "This flower is known as the 'king of flowers'.", type: "specific_answer", correctAnswer: "Peony", options: null },

      // ART
      { category: "ART", value: 100, question: "Leonardo da Vinci painted the Mona Lisa.", type: "true_false", correctAnswer: "true", options: null },
      { category: "ART", value: 200, question: "This artist cut off his own ear.", type: "specific_answer", correctAnswer: "Van Gogh", options: null },
      { category: "ART", value: 300, question: "Which museum houses the Mona Lisa?", type: "multiple_choice", correctAnswer: "B", options: ["Metropolitan Museum", "Louvre", "British Museum", "Uffizi"] },
      { category: "ART", value: 400, question: "Pablo Picasso co-founded the Cubist movement.", type: "true_false", correctAnswer: "true", options: null },
      { category: "ART", value: 500, question: "This sculpture by Michelangelo depicts the biblical David.", type: "specific_answer", correctAnswer: "David", options: null },

      // GENERAL
      { category: "GENERAL", value: 100, question: "There are 365 days in a regular year.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GENERAL", value: 200, question: "This invention allows us to see our own reflection.", type: "specific_answer", correctAnswer: "Mirror", options: null },
      { category: "GENERAL", value: 300, question: "What is the most spoken language in the world?", type: "multiple_choice", correctAnswer: "A", options: ["Mandarin Chinese", "English", "Spanish", "Hindi"] },
      { category: "GENERAL", value: 400, question: "The human body has 206 bones.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GENERAL", value: 500, question: "This gas makes up about 78% of Earth's atmosphere.", type: "specific_answer", correctAnswer: "Nitrogen", options: null },
      { category: "TECHNOLOGY", value: 400, question: "The first computer bug was actually a real insect.", type: "true_false", correctAnswer: "true", options: null },
      { category: "TECHNOLOGY", value: 500, question: "This programming language was created by Guido van Rossum.", type: "specific_answer", correctAnswer: "Python", options: null },

      // NATURE
      { category: "NATURE", value: 100, question: "Penguins can fly.", type: "true_false", correctAnswer: "false", options: null },
      { category: "NATURE", value: 200, question: "This is the largest mammal in the world.", type: "specific_answer", correctAnswer: "Blue Whale", options: null },
      { category: "NATURE", value: 300, question: "How many chambers does a human heart have?", type: "multiple_choice", correctAnswer: "C", options: ["2", "3", "4", "5"] },
      { category: "NATURE", value: 400, question: "Sharks are mammals.", type: "true_false", correctAnswer: "false", options: null },
      { category: "NATURE", value: 500, question: "This flower is known as the 'king of flowers'.", type: "specific_answer", correctAnswer: "Peony", options: null },

      // ART
      { category: "ART", value: 100, question: "Leonardo da Vinci painted the Mona Lisa.", type: "true_false", correctAnswer: "true", options: null },
      { category: "ART", value: 200, question: "This artist cut off his own ear.", type: "specific_answer", correctAnswer: "Van Gogh", options: null },
      { category: "ART", value: 300, question: "Which museum houses the Mona Lisa?", type: "multiple_choice", correctAnswer: "B", options: ["Metropolitan Museum", "Louvre", "British Museum", "Uffizi"] },
      { category: "ART", value: 400, question: "Pablo Picasso co-founded the Cubist movement.", type: "true_false", correctAnswer: "true", options: null },
      { category: "ART", value: 500, question: "This sculpture by Michelangelo depicts the biblical David.", type: "specific_answer", correctAnswer: "David", options: null },

      // GENERAL
      { category: "GENERAL", value: 100, question: "There are 365 days in a regular year.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GENERAL", value: 200, question: "This invention allows us to see our own reflection.", type: "specific_answer", correctAnswer: "Mirror", options: null },
      { category: "GENERAL", value: 300, question: "What is the most spoken language in the world?", type: "multiple_choice", correctAnswer: "A", options: ["Mandarin Chinese", "English", "Spanish", "Hindi"] },
      { category: "GENERAL", value: 400, question: "The human body has 206 bones.", type: "true_false", correctAnswer: "true", options: null },
      { category: "GENERAL", value: 500, question: "This gas makes up about 78% of Earth's atmosphere.", type: "specific_answer", correctAnswer: "Nitrogen", options: null },
    ];

    const values = [100, 200, 300, 400, 500];

    // Create questions for each category
    for (const category of categories) {
      for (const value of values) {
        // Find default question for this category and value
        const defaultQuestion = defaultQuestionsData.find(q => q.category === category && q.value === value);
        
        if (defaultQuestion) {
          await this.createQuestion({
            gameId,
            category: defaultQuestion.category,
            value: defaultQuestion.value,
            question: defaultQuestion.question,
            type: defaultQuestion.type as "multiple_choice" | "true_false" | "specific_answer",
            correctAnswer: defaultQuestion.correctAnswer,
            options: defaultQuestion.options,
            isUsed: false,
          });
        } else {
          // Create placeholder question if no default exists
          await this.createQuestion({
            gameId,
            category,
            value,
            question: `${category} question for $${value}`,
            type: "specific_answer",
            correctAnswer: "Answer",
            options: null,
            isUsed: false,
          });
        }
      }
    }
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

  generateAuthCode(): string {
    // Generate a 6-character authentication code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

export const storage = new DatabaseStorage();
