import WebSocket from 'ws';

console.log('Testing question selection and answer submission...');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
    console.log('✓ Connected to WebSocket server');
    
    // Test 1: Join as host
    console.log('Test 1: Joining as host...');
    ws.send(JSON.stringify({
        type: 'join_game_as_host',
        data: {
            roomCode: '4444',
            hostCode: '444444'
        }
    }));
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log(`Received: ${message.type}`);
    
    if (message.type === 'game_joined') {
        console.log('✓ Host joined game successfully');
        console.log(`Game ID: ${message.data.gameId}`);
        
        // Test 2: Select $100 question
        console.log('Test 2: Selecting $100 SCIENCE question...');
        setTimeout(() => {
            ws.send(JSON.stringify({
                type: 'select_question',
                data: {
                    gameId: message.data.gameId,
                    category: 'SCIENCE',
                    value: 100
                }
            }));
        }, 500);
    }
    
    if (message.type === 'question_selected') {
        console.log('✓ Question selected successfully!');
        console.log(`Question: ${message.data.question.question}`);
        console.log(`Answer: ${message.data.question.correctAnswer}`);
        console.log(`Type: ${message.data.question.type}`);
        
        console.log('🎉 Question selection test PASSED!');
        
        // Now test player answer submission
        testPlayerSubmission(message.data.question);
    }
    
    if (message.type === 'answer_submitted') {
        console.log('✓ Answer submission received!');
        console.log(`Player: ${message.data.playerName}`);
        console.log(`Answer: ${message.data.answer}`);
        console.log(`Order: #${message.data.submissionOrder}`);
        console.log(`Time: ${message.data.submissionTime}s`);
    }
    
    if (message.type === 'all_answers_collected') {
        console.log('✓ Auto-evaluation completed!');
        message.data.answers.forEach(answer => {
            console.log(`${answer.playerName}: "${answer.answer}" - ${answer.isCorrect ? 'CORRECT' : 'INCORRECT'} (${answer.pointsAwarded} pts)`);
        });
        
        console.log('\n🎉 ALL TESTS PASSED! System working correctly.');
        ws.close();
        process.exit(0);
    }
});

function testPlayerSubmission(question) {
    console.log('Test 3: Simulating player answer...');
    
    const playerWs = new WebSocket('ws://localhost:5000/ws');
    
    playerWs.on('open', () => {
        // Join as player
        playerWs.send(JSON.stringify({
            type: 'join_game',
            data: {
                roomCode: '4444',
                playerName: 'TestBot'
            }
        }));
    });
    
    playerWs.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'game_joined') {
            console.log('✓ Player joined successfully');
        }
        
        if (message.type === 'question_selected') {
            console.log('✓ Player received question');
            
            // Submit answer after 1 second
            setTimeout(() => {
                console.log('Submitting answer...');
                playerWs.send(JSON.stringify({
                    type: 'submit_answer',
                    data: {
                        gameId: question.gameId,
                        questionId: question.id,
                        answer: question.correctAnswer
                    }
                }));
            }, 1000);
        }
    });
}

ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('Test timeout - something might be wrong');
    process.exit(1);
}, 10000);