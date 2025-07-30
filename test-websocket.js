// Simple WebSocket test script
import WebSocket from 'ws';

async function testGameplay() {
    console.log('Starting WebSocket test...');
    
    // Create host connection
    const hostWs = new WebSocket('ws://localhost:5000/ws');
    
    hostWs.on('open', () => {
        console.log('Host WebSocket connected');
        
        // First, let host join existing game with room code 4444
        hostWs.send(JSON.stringify({
            type: 'join_game_as_host',
            data: {
                roomCode: '4444',
                hostCode: '444444'
            }
        }));
    });

    hostWs.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('Host received:', message.type, message.data);
        
        if (message.type === 'game_joined') {
            console.log('Host joined successfully, testing question selection...');
            
            // Test selecting a $100 Science question
            setTimeout(() => {
                console.log('Selecting $100 Science question...');
                hostWs.send(JSON.stringify({
                    type: 'select_question',
                    data: {
                        gameId: message.data.gameId,
                        category: 'SCIENCE',
                        value: 100
                    }
                }));
            }, 1000);
        }
        
        if (message.type === 'question_selected') {
            console.log('✓ Question selection works!');
            console.log('Question:', message.data.question.question);
            console.log('Correct Answer:', message.data.question.correctAnswer);
            
            // Now test player answering
            testPlayerAnswer(message.data.question);
        }
        
        if (message.type === 'answer_submitted') {
            console.log('✓ Answer submission works!');
            console.log('Player answered:', message.data.answer);
            console.log('Submission order:', message.data.submissionOrder);
        }
        
        if (message.type === 'all_answers_collected') {
            console.log('✓ Auto-evaluation works!');
            message.data.answers.forEach(answer => {
                console.log(`Player ${answer.playerName}: "${answer.answer}" - ${answer.isCorrect ? 'CORRECT' : 'INCORRECT'} (${answer.pointsAwarded} points)`);
            });
            
            console.log('\n🎉 Test completed successfully!');
            process.exit(0);
        }
    });

    function testPlayerAnswer(question) {
        // Create player connection
        const playerWs = new WebSocket('ws://localhost:5000/ws');
        
        playerWs.on('open', () => {
            console.log('Player WebSocket connected');
            
            // Player joins the game
            playerWs.send(JSON.stringify({
                type: 'join_game',
                data: {
                    roomCode: '4444',
                    playerName: 'TestPlayer'
                }
            }));
        });

        playerWs.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('Player received:', message.type);
            
            if (message.type === 'game_joined') {
                console.log('Player joined successfully');
            }
            
            if (message.type === 'question_selected') {
                console.log('Player sees question, submitting answer...');
                
                // Submit correct answer after 2 seconds
                setTimeout(() => {
                    playerWs.send(JSON.stringify({
                        type: 'submit_answer',
                        data: {
                            gameId: message.data.question.gameId,
                            questionId: message.data.question.id,
                            answer: question.correctAnswer // Submit the correct answer
                        }
                    }));
                }, 2000);
            }
        });
    }

    hostWs.on('error', (error) => {
        console.error('Host WebSocket error:', error.message);
    });
}

testGameplay().catch(console.error);