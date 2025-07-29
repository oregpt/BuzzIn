import type { Question } from "../../../shared/schema";

export const DEFAULT_CATEGORIES = [
  "HISTORY", "SCIENCE", "SPORTS", "MOVIES", "GEOGRAPHY", "LITERATURE",
  "MUSIC", "FOOD", "TECHNOLOGY", "NATURE", "ART", "GENERAL"
];

export const VALUES = [100, 200, 300, 400, 500];

export const formatCurrency = (amount: number) => `$${amount}`;

export const DEFAULT_QUESTIONS: Question[] = [
  // HISTORY  
  { id: "h1", gameId: "default", category: "HISTORY", value: 100, question: "What year did World War II end?", type: "specific_answer", correctAnswer: "1945", options: null, isUsed: false },
  { id: "h2", gameId: "default", category: "HISTORY", value: 200, question: "Who was the first President of the United States?", type: "specific_answer", correctAnswer: "George Washington", options: null, isUsed: false },
  { id: "h3", gameId: "default", category: "HISTORY", value: 300, question: "The Berlin Wall fell in which year?", type: "specific_answer", correctAnswer: "1989", options: null, isUsed: false },
  { id: "h4", gameId: "default", category: "HISTORY", value: 400, question: "Which empire was ruled by Julius Caesar?", type: "specific_answer", correctAnswer: "Roman Empire", options: null, isUsed: false },
  { id: "h5", gameId: "default", category: "HISTORY", value: 500, question: "What ancient wonder of the world was located in Alexandria?", type: "specific_answer", correctAnswer: "Lighthouse of Alexandria", options: null, isUsed: false },

  // SCIENCE
  { id: "s1", gameId: "default", category: "SCIENCE", value: 100, question: "What is the chemical symbol for water?", type: "specific_answer", correctAnswer: "H2O", options: null, isUsed: false },
  { id: "s2", gameId: "default", category: "SCIENCE", value: 200, question: "How many bones are in the adult human body?", type: "specific_answer", correctAnswer: "206", options: null, isUsed: false },
  { id: "s3", gameId: "default", category: "SCIENCE", value: 300, question: "What planet is known as the Red Planet?", type: "specific_answer", correctAnswer: "Mars", options: null, isUsed: false },
  { id: "s4", gameId: "default", category: "SCIENCE", value: 400, question: "What is the speed of light in a vacuum?", type: "specific_answer", correctAnswer: "299,792,458 meters per second", options: null, isUsed: false },
  { id: "s5", gameId: "default", category: "SCIENCE", value: 500, question: "What scientist developed the theory of evolution by natural selection?", type: "specific_answer", correctAnswer: "Charles Darwin", options: null, isUsed: false },

  // SPORTS
  { id: "sp1", gameId: "default", category: "SPORTS", value: 100, question: "How many players are on a basketball team on the court at once?", type: "specific_answer", correctAnswer: "5", options: null, isUsed: false },
  { id: "sp2", gameId: "default", category: "SPORTS", value: 200, question: "Which sport is known as 'America's Pastime'?", type: "specific_answer", correctAnswer: "Baseball", options: null, isUsed: false },
  { id: "sp3", gameId: "default", category: "SPORTS", value: 300, question: "In which sport would you perform a slam dunk?", type: "specific_answer", correctAnswer: "Basketball", options: null, isUsed: false },
  { id: "sp4", gameId: "default", category: "SPORTS", value: 400, question: "How often are the Summer Olympic Games held?", type: "specific_answer", correctAnswer: "Every 4 years", options: null, isUsed: false },
  { id: "sp5", gameId: "default", category: "SPORTS", value: 500, question: "Which tennis tournament is played on grass courts?", type: "specific_answer", correctAnswer: "Wimbledon", options: null, isUsed: false },
];