import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Plus, Save, ArrowRight, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CATEGORIES, DEFAULT_QUESTIONS } from "@/lib/game-data";
import type { questions } from "../../../shared/schema";

type Question = typeof questions.$inferSelect;

// Using Question type from shared schema via imported questions table

interface GameSetup {
  gameName: string;
  hostName: string;
  roomCode: string;
  adminCode: string;
  categories: string[];
  questions: Question[];
}

export default function GameSetupSimple() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'basic' | 'codes' | 'categories' | 'questions'>('basic');
  const [gameSetup, setGameSetup] = useState<GameSetup>({
    gameName: "",
    hostName: "",
    roomCode: "",
    adminCode: "",
    categories: DEFAULT_CATEGORIES,
    questions: [...DEFAULT_QUESTIONS]
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    category: "HISTORY",
    value: 100,
    question: "",
    type: 'specific_answer',
    correctAnswer: "",
    options: null
  });

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // No need to load basic info from localStorage since we removed the pre-form

  const generateCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameSetup.gameName.trim() || !gameSetup.hostName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    setStep('codes');
  };

  const handleCodes = (e: React.FormEvent) => {
    e.preventDefault();
    setGameSetup(prev => ({
      ...prev,
      roomCode: prev.roomCode || generateCode(4),
      adminCode: prev.adminCode || generateCode(6)
    }));
    setStep('categories');
  };

  const addCategory = () => {
    const newCategory = prompt("Enter new category name:");
    if (newCategory?.trim()) {
      setGameSetup(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim().toUpperCase()]
      }));
    }
  };

  const removeCategory = (index: number) => {
    const categoryToRemove = gameSetup.categories[index];
    
    setGameSetup(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
      // Also remove any questions from the removed category
      questions: prev.questions.filter(q => q.category !== categoryToRemove)
    }));
    
    toast({
      title: "Category Removed",
      description: `Removed ${categoryToRemove} and all its questions`,
    });
  };

  const addQuestion = () => {
    if (!currentQuestion.question?.trim() || !currentQuestion.correctAnswer?.trim()) {
      toast({
        title: "Error",
        description: "Please fill in question and correct answer",
        variant: "destructive",
      });
      return;
    }

    // Ensure we use the current form values, not just state
    const actualCategory = currentQuestion.category || "HISTORY";
    const actualValue = currentQuestion.value || 100;

    const question: Question = {
      id: `q_${Date.now()}`,
      category: actualCategory,
      value: actualValue,
      question: currentQuestion.question!,
      type: currentQuestion.type!,
      correctAnswer: currentQuestion.correctAnswer!,
      options: currentQuestion.type === 'multiple_choice' ? (currentQuestion.options || []) : null,
      isUsed: false
    };

    console.log('Adding question:', question); // Debug log

    setGameSetup(prev => ({
      ...prev,
      questions: [...prev.questions, question]
    }));

    // Reset form and close modal
    setCurrentQuestion({
      category: "HISTORY",
      value: 100,
      question: "",
      type: 'specific_answer',
      correctAnswer: "",
      options: null
    });
    setShowQuestionForm(false);

    toast({
      title: "Question Added",
      description: `Added question for ${actualCategory} - $${actualValue}`,
    });
  };

  const completeSetup = () => {
    localStorage.setItem('gameSetup', JSON.stringify(gameSetup));
    localStorage.setItem('roomCode', gameSetup.roomCode);
    localStorage.setItem('adminCode', gameSetup.adminCode);
    localStorage.setItem('hostName', gameSetup.hostName);
    localStorage.setItem('gameName', gameSetup.gameName);
    navigate('/host');
  };

  const values = [100, 200, 300, 400, 500];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="font-game text-4xl font-bold text-yellow-400 mb-2">
            Game Setup
          </h1>
          <p className="text-gray-300">Configure your trivia game</p>
          
          {/* Step indicator */}
          <div className="flex justify-center mt-4 space-x-2">
            {['basic', 'codes', 'categories', 'questions'].map((stepName, index) => (
              <div
                key={stepName}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === stepName
                    ? 'bg-blue-600 text-white'
                    : ['basic', 'codes', 'categories', 'questions'].indexOf(step) > index
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          <div className="mt-2 text-sm text-gray-400">
            Step {['basic', 'codes', 'categories', 'questions'].indexOf(step) + 1} of 4: {
              step === 'basic' ? 'Basic Information' :
              step === 'codes' ? 'Access Codes' :
              step === 'categories' ? 'Game Categories' :
              'Add Questions'
            }
          </div>
        </header>

        {/* Step 1: Basic Information */}
        {step === 'basic' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-white">
                <Settings className="mr-3" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicInfo} className="space-y-6">
                <div>
                  <Label className="text-gray-300 mb-2 block">Game Name</Label>
                  <input
                    value={gameSetup.gameName}
                    onChange={(e) => setGameSetup(prev => ({ ...prev, gameName: e.target.value }))}
                    placeholder="Friday Night Trivia"
                    className="w-full p-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Host Name</Label>
                  <input
                    value={gameSetup.hostName}
                    onChange={(e) => setGameSetup(prev => ({ ...prev, hostName: e.target.value }))}
                    placeholder="Your Name"
                    className="w-full p-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Access Codes
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Access Codes */}
        {step === 'codes' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Access Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCodes} className="space-y-6">
                <div>
                  <Label className="text-gray-300 mb-2 block">Room Code (4 letters for players)</Label>
                  <div className="flex gap-2">
                    <input
                      value={gameSetup.roomCode}
                      onChange={(e) => setGameSetup(prev => ({ ...prev, roomCode: e.target.value.toUpperCase() }))}
                      placeholder="ABCD"
                      maxLength={4}
                      className="flex-1 p-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 font-game text-2xl text-center tracking-widest rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Button 
                      type="button" 
                      onClick={() => setGameSetup(prev => ({ ...prev, roomCode: generateCode(4) }))}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Admin Code (6 characters for host control)</Label>
                  <div className="flex gap-2">
                    <input
                      value={gameSetup.adminCode}
                      onChange={(e) => setGameSetup(prev => ({ ...prev, adminCode: e.target.value.toUpperCase() }))}
                      placeholder="ABC123"
                      maxLength={6}
                      className="flex-1 p-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 font-mono text-lg text-center tracking-wider rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Button 
                      type="button" 
                      onClick={() => setGameSetup(prev => ({ ...prev, adminCode: generateCode(6) }))}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Categories
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Categories */}
        {step === 'categories' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Game Categories</CardTitle>
              <p className="text-gray-300 text-sm mt-2">Select which categories to include in your game. You can remove categories you don't want to use.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gameSetup.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                      <span className="text-white">{category}</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeCategory(index)}
                        className="text-red-400 hover:text-white hover:bg-red-600"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                
                {gameSetup.categories.length < 6 && (
                  <Button onClick={addCategory} variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Category
                  </Button>
                )}
                
                <div className="text-center text-gray-400 text-sm">
                  Current categories: {gameSetup.categories.length} (Need at least 6 for the board)
                </div>
                
                <Button 
                  onClick={() => setStep('questions')} 
                  disabled={gameSetup.categories.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Questions ({gameSetup.categories.length}/6 categories)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Questions - Board Interface */}
        {step === 'questions' && (
          <div className="space-y-6">
            {/* Game Board */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-white text-center">Question Board</CardTitle>
                <p className="text-gray-400 text-center">
                  Click on a tile to create a question | {gameSetup.questions.length} questions created
                </p>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${gameSetup.categories.length}, minmax(0, 1fr))` }}>
                  {/* Header row with categories */}
                  {gameSetup.categories.map((category, categoryIndex) => (
                    <div key={category} className="bg-blue-700 text-white p-3 text-center font-bold text-sm rounded">
                      {category}
                    </div>
                  ))}
                  
                  {/* Question tiles */}
                  {values.map((value) => (
                    gameSetup.categories.map((category, categoryIndex) => {
                      const existingQuestion = gameSetup.questions.find(q => q.category === category && q.value === value);
                      const hasQuestion = !!existingQuestion;
                      return (
                        <button
                          key={`${category}-${value}`}
                          onClick={() => {
                            if (existingQuestion) {
                              // Edit existing question
                              setCurrentQuestion({
                                id: existingQuestion.id,
                                category: existingQuestion.category,
                                value: existingQuestion.value,
                                question: existingQuestion.question,
                                type: existingQuestion.type,
                                correctAnswer: existingQuestion.correctAnswer,
                                options: existingQuestion.options
                              });
                              setEditingQuestionId(existingQuestion.id);
                            } else {
                              // Create new question
                              setCurrentQuestion({
                                category: category,
                                value: value,
                                question: "",
                                correctAnswer: "",
                                type: 'specific_answer',
                                options: null
                              });
                              setEditingQuestionId(null);
                            }
                            setShowQuestionForm(true);
                          }}
                          className={`p-4 rounded font-bold text-lg transition-all duration-200 hover:scale-105 ${
                            hasQuestion 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          ${value}
                        </button>
                      );
                    })
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Question Form Modal */}
            {showQuestionForm && (
              <Card className="bg-gray-800 border-gray-700 border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-xl text-white">
                    {editingQuestionId ? 'Edit' : 'Create'} Question: {currentQuestion.category} - ${currentQuestion.value}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Question</Label>
                      <textarea
                        value={currentQuestion.question || ''}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="Enter your question here..."
                        className="w-full p-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Question Type</Label>
                      <select
                        value={currentQuestion.type}
                        onChange={(e) => {
                          setCurrentQuestion(prev => ({ ...prev, type: e.target.value as any }));
                        }}
                        className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="specific_answer">Specific Answer</option>
                        <option value="true_false">True/False</option>
                        <option value="multiple_choice">Multiple Choice</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Correct Answer</Label>
                      <input
                        value={currentQuestion.correctAnswer || ''}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                        placeholder="Enter the correct answer"
                        className="w-full p-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        onClick={addQuestion} 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {editingQuestionId ? 'Update' : 'Save'} Question
                      </Button>
                      <Button 
                        onClick={() => {
                          setShowQuestionForm(false);
                          setEditingQuestionId(null);
                        }}
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {gameSetup.questions.length >= gameSetup.categories.length * 3 && (
              <Card className="bg-blue-800 border-blue-700">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Start!</h3>
                    <p className="text-blue-200 mb-4">
                      You have {gameSetup.questions.length} questions. You can start the game now or add more questions.
                    </p>
                    <Button onClick={completeSetup} className="bg-white text-blue-800 hover:bg-gray-100">
                      <Save className="mr-2 h-4 w-4" />
                      Start Game
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}