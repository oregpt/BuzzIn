import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Plus, Save, ArrowRight, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  category: string;
  value: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'specific_answer';
  correctAnswer: string;
  options: string[] | null;
}

interface GameSetup {
  gameName: string;
  hostName: string;
  roomCode: string;
  adminCode: string;
  categories: string[];
  questions: Question[];
}

export default function GameSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'basic' | 'codes' | 'categories' | 'questions' | 'complete'>('basic');

  // Load basic info from localStorage if available
  React.useEffect(() => {
    const basicInfo = localStorage.getItem('basicGameInfo');
    if (basicInfo) {
      const parsed = JSON.parse(basicInfo);
      setGameSetup(prev => ({
        ...prev,
        gameName: parsed.gameName,
        hostName: parsed.hostName
      }));
      setStep('basic'); // Start at basic step to show the flow properly
      localStorage.removeItem('basicGameInfo');
    }
  }, []);
  const [gameSetup, setGameSetup] = useState<GameSetup>({
    gameName: "",
    hostName: "",
    roomCode: "",
    adminCode: "",
    categories: ["HISTORY", "SCIENCE", "SPORTS", "MOVIES", "GEOGRAPHY", "LITERATURE"],
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    category: "HISTORY",
    value: 100,
    question: "",
    type: 'specific_answer',
    correctAnswer: "",
    options: null
  });

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
    console.log('Moving to codes step');
    setStep('codes');
  };

  const handleCodes = (e: React.FormEvent) => {
    e.preventDefault();
    setGameSetup(prev => ({
      ...prev,
      roomCode: prev.roomCode || generateCode(4),
      adminCode: prev.adminCode || generateCode(6)
    }));
    console.log('Moving to categories step');
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
    setGameSetup(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
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

    const question: Question = {
      id: `q_${Date.now()}`,
      category: currentQuestion.category!,
      value: currentQuestion.value!,
      question: currentQuestion.question!,
      type: currentQuestion.type!,
      correctAnswer: currentQuestion.correctAnswer!,
      options: currentQuestion.type === 'multiple_choice' ? (currentQuestion.options || []) : null
    };

    setGameSetup(prev => ({
      ...prev,
      questions: [...prev.questions, question]
    }));

    setCurrentQuestion({
      category: currentQuestion.category,
      value: currentQuestion.value,
      question: "",
      type: 'specific_answer',
      correctAnswer: "",
      options: null
    });

    toast({
      title: "Question Added",
      description: `Added question for ${question.category} - $${question.value}`,
    });
  };

  const completeSetup = () => {
    // Save the complete game setup to localStorage for the host page to use
    localStorage.setItem('gameSetup', JSON.stringify(gameSetup));
    
    // Also save individual items for the old WebSocket flow compatibility
    localStorage.setItem('roomCode', gameSetup.roomCode);
    localStorage.setItem('adminCode', gameSetup.adminCode);
    localStorage.setItem('hostName', gameSetup.hostName);
    localStorage.setItem('gameName', gameSetup.gameName);
    
    navigate('/host');
  };

  const values = [100, 200, 300, 400, 500];

  return (
    <div className="min-h-screen bg-game-dark text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="font-game text-4xl font-bold text-game-secondary mb-2">
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
                    ? 'bg-game-primary text-white'
                    : ['basic', 'codes', 'categories', 'questions'].indexOf(step) > index
                    ? 'bg-game-accent text-game-dark'
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
          <Card className="bg-game-surface border-border-game-gray">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Settings className="mr-3" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicInfo} className="space-y-6">
                <div>
                  <Label className="text-gray-300 mb-2 block">Game Name</Label>
                  <Input
                    value={gameSetup.gameName}
                    onChange={(e) => setGameSetup(prev => ({ ...prev, gameName: e.target.value }))}
                    placeholder="Friday Night Trivia"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-game-primary input-white-text"
                    style={{ color: 'white' }}
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Host Name</Label>
                  <Input
                    value={gameSetup.hostName}
                    onChange={(e) => setGameSetup(prev => ({ ...prev, hostName: e.target.value }))}
                    placeholder="Your Name"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-game-primary input-white-text"
                    style={{ color: 'white' }}
                  />
                </div>
                <Button type="submit" className="w-full bg-game-primary hover:bg-blue-700">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Access Codes
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Access Codes */}
        {step === 'codes' && (
          <Card className="bg-game-surface border-border-game-gray">
            <CardHeader>
              <CardTitle className="text-2xl">Access Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCodes} className="space-y-6">
                <div>
                  <Label className="text-gray-300 mb-2 block">Room Code (4 letters for players)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={gameSetup.roomCode}
                      onChange={(e) => setGameSetup(prev => ({ ...prev, roomCode: e.target.value.toUpperCase() }))}
                      placeholder="ABCD"
                      maxLength={4}
                      className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 font-game text-2xl text-center tracking-widest focus:ring-2 focus:ring-game-primary input-white-text"
                      style={{ color: 'white' }}
                    />
                    <Button 
                      type="button" 
                      onClick={() => setGameSetup(prev => ({ ...prev, roomCode: generateCode(4) }))}
                      variant="outline"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Admin Code (6 characters for host control)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={gameSetup.adminCode}
                      onChange={(e) => setGameSetup(prev => ({ ...prev, adminCode: e.target.value.toUpperCase() }))}
                      placeholder="ABC123"
                      maxLength={6}
                      className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 font-mono text-lg text-center tracking-wider focus:ring-2 focus:ring-game-primary input-white-text"
                      style={{ color: 'white' }}
                    />
                    <Button 
                      type="button" 
                      onClick={() => setGameSetup(prev => ({ ...prev, adminCode: generateCode(6) }))}
                      variant="outline"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-game-primary hover:bg-blue-700">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Categories
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Categories */}
        {step === 'categories' && (
          <Card className="bg-game-surface border-border-game-gray">
            <CardHeader>
              <CardTitle className="text-2xl">Game Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gameSetup.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between bg-game-dark p-3 rounded">
                      <span className="text-white">{category}</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeCategory(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <Button onClick={addCategory} variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
                <Button 
                  onClick={() => setStep('questions')} 
                  className="w-full bg-game-primary hover:bg-blue-700"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Questions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Questions */}
        {step === 'questions' && (
          <div className="space-y-6">
            <Card className="bg-game-surface border-border-game-gray">
              <CardHeader>
                <CardTitle className="text-2xl">Add Questions</CardTitle>
                <p className="text-gray-400">
                  Current questions: {gameSetup.questions.length} | 
                  Target: {gameSetup.categories.length * 5} questions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Category</Label>
                      <select
                        value={currentQuestion.category}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full p-3 bg-gray-800 border border-gray-600 text-white rounded focus:ring-2 focus:ring-game-primary"
                      >
                        {gameSetup.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-300 mb-2 block">Point Value</Label>
                      <select
                        value={currentQuestion.value}
                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, value: parseInt(e.target.value) }))}
                        className="w-full p-3 bg-gray-800 border border-gray-600 text-white rounded focus:ring-2 focus:ring-game-primary"
                      >
                        {values.map(val => (
                          <option key={val} value={val}>${val}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 mb-2 block">Question</Label>
                    <Textarea
                      value={currentQuestion.question}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter your question here..."
                      className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-game-primary input-white-text"
                      style={{ color: 'white' }}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Question Type</Label>
                    <select
                      value={currentQuestion.type}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full p-3 bg-gray-800 border border-gray-600 text-white rounded focus:ring-2 focus:ring-game-primary"
                    >
                      <option value="specific_answer">Specific Answer</option>
                      <option value="true_false">True/False</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                  </div>

                  {/* Multiple Choice Options */}
                  {currentQuestion.type === 'multiple_choice' && (
                    <div>
                      <Label className="text-gray-300 mb-2 block">Answer Options</Label>
                      <div className="space-y-3">
                        {['A', 'B', 'C', 'D'].map((letter, index) => (
                          <div key={letter} className="flex items-center gap-3">
                            <span className="text-gray-300 font-bold w-8">{letter}.</span>
                            <Input
                              value={(currentQuestion.options as string[] || ['', '', '', ''])[index] || ''}
                              onChange={(e) => {
                                const newOptions = [...(currentQuestion.options as string[] || ['', '', '', ''])];
                                newOptions[index] = e.target.value;
                                setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                              }}
                              placeholder={`Option ${letter}`}
                              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-game-primary input-white-text"
                              style={{ color: 'white' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-gray-300 mb-2 block">
                      {currentQuestion.type === 'multiple_choice' ? 'Correct Answer (A, B, C, or D)' : 
                       currentQuestion.type === 'true_false' ? 'Correct Answer (true or false)' : 
                       'Correct Answer'}
                    </Label>
                    <Input
                      value={currentQuestion.correctAnswer}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      placeholder={
                        currentQuestion.type === 'multiple_choice' ? 'A, B, C, or D' :
                        currentQuestion.type === 'true_false' ? 'true or false' :
                        'Enter the correct answer'
                      }
                      className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-game-primary input-white-text"
                      style={{ color: 'white' }}
                    />
                  </div>

                  <Button onClick={addQuestion} className="w-full bg-game-accent hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </CardContent>
            </Card>

            {gameSetup.questions.length >= gameSetup.categories.length * 3 && (
              <Card className="bg-game-primary border-border-game-gray">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Start!</h3>
                    <p className="text-gray-200 mb-4">
                      You have {gameSetup.questions.length} questions. You can start the game now or add more questions.
                    </p>
                    <Button onClick={completeSetup} className="bg-white text-game-primary hover:bg-gray-100">
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