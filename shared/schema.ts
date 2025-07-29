import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, json, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomCode: varchar("room_code", { length: 4 }).notNull().unique(),
  hostName: text("host_name").notNull(),
  gameName: text("game_name").notNull(),
  categories: json("categories").notNull(), // Array of category names
  status: text("status").notNull().default("waiting"), // "waiting", "active", "completed"
  currentQuestionId: varchar("current_question_id"),
  lastCorrectPlayerId: varchar("last_correct_player_id"), // Who gets to pick next
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  score: integer("score").notNull().default(0),
  isHost: boolean("is_host").notNull().default(false),
  socketId: text("socket_id"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  value: integer("value").notNull(),
  question: text("question").notNull(),
  type: text("type").notNull(), // "multiple_choice", "true_false", "specific_answer"
  correctAnswer: text("correct_answer").notNull(),
  options: json("options"), // For multiple choice questions
  isUsed: boolean("is_used").notNull().default(false),
});

export const buzzes = pgTable("buzzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isFirst: boolean("is_first").notNull().default(false),
  buzzOrder: integer("buzz_order").notNull().default(1), // 1st, 2nd, 3rd, etc.
});

export const gameAnswers = pgTable("game_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

// Insert schemas
export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  joinedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export const insertBuzzSchema = createInsertSchema(buzzes).omit({
  id: true,
  timestamp: true,
});

export const insertGameAnswerSchema = createInsertSchema(gameAnswers).omit({
  id: true,
  submittedAt: true,
});

// Types
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertBuzz = z.infer<typeof insertBuzzSchema>;
export type Buzz = typeof buzzes.$inferSelect;

export type InsertGameAnswer = z.infer<typeof insertGameAnswerSchema>;
export type GameAnswer = typeof gameAnswers.$inferSelect;

// WebSocket message types
export type WSMessage = 
  | { type: "join_game"; data: { roomCode: string; playerName: string } }
  | { type: "create_game"; data: { gameName: string; hostName: string; categories?: string[] } }
  | { type: "select_question"; data: { category: string; value: number; selectedBy?: string } }
  | { type: "buzz"; data: { questionId: string } }
  | { type: "submit_answer"; data: { questionId: string; answer: string } }
  | { type: "mark_answer"; data: { playerId: string; isCorrect: boolean; acceptClose?: boolean } }
  | { type: "close_question"; data: {} }
  | { type: "end_game"; data: {} };

export type WSResponse = 
  | { type: "game_created"; data: { roomCode: string; gameId: string } }
  | { type: "game_joined"; data: { playerId: string; gameId: string; players: Player[] } }
  | { type: "player_joined"; data: { player: Player } }
  | { type: "question_selected"; data: { question: Question; selectedBy?: string } }
  | { type: "buzz_received"; data: { playerId: string; playerName: string; timestamp: number; isFirst: boolean; buzzOrder: number } }
  | { type: "answer_submitted"; data: { playerId: string; playerName: string; answer: string } }
  | { type: "answer_marked"; data: { playerId: string; isCorrect: boolean; pointsAwarded: number; newScore: number; canPickNext: boolean } }
  | { type: "question_closed"; data: { nextPicker?: { playerId: string; playerName: string } } }
  | { type: "game_ended"; data: { finalStandings: Array<Player & { rank: number }> } }
  | { type: "game_updated"; data: { game: Game; players: Player[] } }
  | { type: "buzz_order_update"; data: { buzzes: Array<{ playerId: string; playerName: string; timestamp: number; buzzOrder: number; isFirst: boolean }> } }
  | { type: "error"; data: { message: string } };
