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

  // MOVIES
  { id: "m1", gameId: "default", category: "MOVIES", value: 100, question: "Who directed the movie 'Jaws'?", type: "specific_answer", correctAnswer: "Steven Spielberg", options: null, isUsed: false },
  { id: "m2", gameId: "default", category: "MOVIES", value: 200, question: "What movie features the quote 'May the Force be with you'?", type: "specific_answer", correctAnswer: "Star Wars", options: null, isUsed: false },
  { id: "m3", gameId: "default", category: "MOVIES", value: 300, question: "Which film won the Academy Award for Best Picture in 2020?", type: "specific_answer", correctAnswer: "Parasite", options: null, isUsed: false },
  { id: "m4", gameId: "default", category: "MOVIES", value: 400, question: "Who played the character of Tony Stark in the Marvel movies?", type: "specific_answer", correctAnswer: "Robert Downey Jr.", options: null, isUsed: false },
  { id: "m5", gameId: "default", category: "MOVIES", value: 500, question: "What movie is based on the novel by Mario Puzo?", type: "specific_answer", correctAnswer: "The Godfather", options: null, isUsed: false },

  // GEOGRAPHY
  { id: "g1", gameId: "default", category: "GEOGRAPHY", value: 100, question: "What is the capital of France?", type: "specific_answer", correctAnswer: "Paris", options: null, isUsed: false },
  { id: "g2", gameId: "default", category: "GEOGRAPHY", value: 200, question: "Which is the longest river in the world?", type: "specific_answer", correctAnswer: "Nile", options: null, isUsed: false },
  { id: "g3", gameId: "default", category: "GEOGRAPHY", value: 300, question: "What is the capital of Canada?", type: "specific_answer", correctAnswer: "Ottawa", options: null, isUsed: false },
  { id: "g4", gameId: "default", category: "GEOGRAPHY", value: 400, question: "Which mountain range contains Mount Everest?", type: "specific_answer", correctAnswer: "Himalayas", options: null, isUsed: false },
  { id: "g5", gameId: "default", category: "GEOGRAPHY", value: 500, question: "What is the smallest country in the world?", type: "specific_answer", correctAnswer: "Vatican City", options: null, isUsed: false },

  // LITERATURE
  { id: "l1", gameId: "default", category: "LITERATURE", value: 100, question: "Who wrote 'Romeo and Juliet'?", type: "specific_answer", correctAnswer: "William Shakespeare", options: null, isUsed: false },
  { id: "l2", gameId: "default", category: "LITERATURE", value: 200, question: "Who wrote 'To Kill a Mockingbird'?", type: "specific_answer", correctAnswer: "Harper Lee", options: null, isUsed: false },
  { id: "l3", gameId: "default", category: "LITERATURE", value: 300, question: "Which novel begins with 'It was the best of times, it was the worst of times'?", type: "specific_answer", correctAnswer: "A Tale of Two Cities", options: null, isUsed: false },
  { id: "l4", gameId: "default", category: "LITERATURE", value: 400, question: "Who wrote the dystopian novel '1984'?", type: "specific_answer", correctAnswer: "George Orwell", options: null, isUsed: false },
  { id: "l5", gameId: "default", category: "LITERATURE", value: 500, question: "Which Russian author wrote 'War and Peace'?", type: "specific_answer", correctAnswer: "Leo Tolstoy", options: null, isUsed: false },

  // MUSIC
  { id: "mu1", gameId: "default", category: "MUSIC", value: 100, question: "How many strings does a standard guitar have?", type: "specific_answer", correctAnswer: "6", options: null, isUsed: false },
  { id: "mu2", gameId: "default", category: "MUSIC", value: 200, question: "Who composed 'The Four Seasons'?", type: "specific_answer", correctAnswer: "Antonio Vivaldi", options: null, isUsed: false },
  { id: "mu3", gameId: "default", category: "MUSIC", value: 300, question: "What band released the album 'Abbey Road'?", type: "specific_answer", correctAnswer: "The Beatles", options: null, isUsed: false },
  { id: "mu4", gameId: "default", category: "MUSIC", value: 400, question: "Which instrument did Mozart primarily compose for?", type: "specific_answer", correctAnswer: "Piano", options: null, isUsed: false },
  { id: "mu5", gameId: "default", category: "MUSIC", value: 500, question: "Who wrote the opera 'The Magic Flute'?", type: "specific_answer", correctAnswer: "Wolfgang Amadeus Mozart", options: null, isUsed: false },

  // FOOD
  { id: "f1", gameId: "default", category: "FOOD", value: 100, question: "What spice is derived from the Crocus flower?", type: "specific_answer", correctAnswer: "Saffron", options: null, isUsed: false },
  { id: "f2", gameId: "default", category: "FOOD", value: 200, question: "What is the main ingredient in guacamole?", type: "specific_answer", correctAnswer: "Avocado", options: null, isUsed: false },
  { id: "f3", gameId: "default", category: "FOOD", value: 300, question: "Which country is famous for inventing pizza?", type: "specific_answer", correctAnswer: "Italy", options: null, isUsed: false },
  { id: "f4", gameId: "default", category: "FOOD", value: 400, question: "What type of pastry is used to make profiteroles?", type: "specific_answer", correctAnswer: "Choux pastry", options: null, isUsed: false },
  { id: "f5", gameId: "default", category: "FOOD", value: 500, question: "What is the most expensive spice in the world by weight?", type: "specific_answer", correctAnswer: "Saffron", options: null, isUsed: false },

  // TECHNOLOGY
  { id: "t1", gameId: "default", category: "TECHNOLOGY", value: 100, question: "What does 'WWW' stand for?", type: "specific_answer", correctAnswer: "World Wide Web", options: null, isUsed: false },
  { id: "t2", gameId: "default", category: "TECHNOLOGY", value: 200, question: "Who founded Microsoft?", type: "specific_answer", correctAnswer: "Bill Gates", options: null, isUsed: false },
  { id: "t3", gameId: "default", category: "TECHNOLOGY", value: 300, question: "What does 'CPU' stand for?", type: "specific_answer", correctAnswer: "Central Processing Unit", options: null, isUsed: false },
  { id: "t4", gameId: "default", category: "TECHNOLOGY", value: 400, question: "In what year was the first iPhone released?", type: "specific_answer", correctAnswer: "2007", options: null, isUsed: false },
  { id: "t5", gameId: "default", category: "TECHNOLOGY", value: 500, question: "What programming language was created by Guido van Rossum?", type: "specific_answer", correctAnswer: "Python", options: null, isUsed: false },

  // NATURE
  { id: "n1", gameId: "default", category: "NATURE", value: 100, question: "What is the fastest land animal?", type: "specific_answer", correctAnswer: "Cheetah", options: null, isUsed: false },
  { id: "n2", gameId: "default", category: "NATURE", value: 200, question: "How many chambers does a human heart have?", type: "specific_answer", correctAnswer: "4", options: null, isUsed: false },
  { id: "n3", gameId: "default", category: "NATURE", value: 300, question: "What is the largest mammal in the world?", type: "specific_answer", correctAnswer: "Blue whale", options: null, isUsed: false },
  { id: "n4", gameId: "default", category: "NATURE", value: 400, question: "What gas do plants absorb from the atmosphere during photosynthesis?", type: "specific_answer", correctAnswer: "Carbon dioxide", options: null, isUsed: false },
  { id: "n5", gameId: "default", category: "NATURE", value: 500, question: "What is the study of earthquakes called?", type: "specific_answer", correctAnswer: "Seismology", options: null, isUsed: false },

  // ART
  { id: "a1", gameId: "default", category: "ART", value: 100, question: "Who painted the Mona Lisa?", type: "specific_answer", correctAnswer: "Leonardo da Vinci", options: null, isUsed: false },
  { id: "a2", gameId: "default", category: "ART", value: 200, question: "Which artist cut off his own ear?", type: "specific_answer", correctAnswer: "Vincent van Gogh", options: null, isUsed: false },
  { id: "a3", gameId: "default", category: "ART", value: 300, question: "What art movement was Pablo Picasso associated with?", type: "specific_answer", correctAnswer: "Cubism", options: null, isUsed: false },
  { id: "a4", gameId: "default", category: "ART", value: 400, question: "Which museum houses the painting 'Starry Night'?", type: "specific_answer", correctAnswer: "Museum of Modern Art", options: null, isUsed: false },
  { id: "a5", gameId: "default", category: "ART", value: 500, question: "Who sculpted 'The Thinker'?", type: "specific_answer", correctAnswer: "Auguste Rodin", options: null, isUsed: false },

  // GENERAL
  { id: "ge1", gameId: "default", category: "GENERAL", value: 100, question: "How many days are there in a leap year?", type: "specific_answer", correctAnswer: "366", options: null, isUsed: false },
  { id: "ge2", gameId: "default", category: "GENERAL", value: 200, question: "What is the currency of Japan?", type: "specific_answer", correctAnswer: "Yen", options: null, isUsed: false },
  { id: "ge3", gameId: "default", category: "GENERAL", value: 300, question: "How many sides does a hexagon have?", type: "specific_answer", correctAnswer: "6", options: null, isUsed: false },
  { id: "ge4", gameId: "default", category: "GENERAL", value: 400, question: "What is the largest ocean on Earth?", type: "specific_answer", correctAnswer: "Pacific Ocean", options: null, isUsed: false },
  { id: "ge5", gameId: "default", category: "GENERAL", value: 500, question: "In Greek mythology, who is the king of the gods?", type: "specific_answer", correctAnswer: "Zeus", options: null, isUsed: false },
];