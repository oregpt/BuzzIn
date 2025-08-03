Trivia Game

A multiplayer Jeopardy-style trivia game built with React, Express.js, and WebSocket for real-time communication.

## Features

- **Real-time Multiplayer**: WebSocket-powered live game sessions
- **Host Interface**: Complete game management with question editing
- **Player Authentication**: Memorable word-based player codes (HAPPY, BIRTHDAY, CELEBRATE, etc.)
- **Custom Categories**: 6 custom categories with personalized questions
- **Visual Feedback**: Interactive scoring buttons with clicked state indicators
- **Answer Review**: Host can view all submitted answers before scoring
- **Mobile-Friendly**: Responsive design optimized for mobile gameplay
- **Persistent Storage**: PostgreSQL database with Drizzle ORM

## Game Flow

1. **Host creates game** with custom categories and questions
2. **Players join** using room code and their assigned player codes
3. **Host manages questions** - select, display, and score answers
4. **Real-time updates** keep all participants synchronized
5. **Visual feedback** shows scoring decisions clearly

## Technical Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Shadcn/ui component library
- TanStack Query for state management
- Wouter for routing

### Backend
- Express.js with TypeScript
- WebSocket server (ws library)
- PostgreSQL with Neon Database
- Drizzle ORM for database operations

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Neon Database account)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/oregpt/Jeopardygame.git
cd Jeopardygame
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file with:
DATABASE_URL=your_postgresql_connection_string
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser to `http://localhost:5000`

## Game Setup

1. **Create Game**: Host enters game name and selects categories
2. **Add Players**: Host pre-creates players with memorable word codes
3. **Start Playing**: Players join using room code and player codes
4. **Manage Game**: Host controls question flow and scoring

## Custom Features

- **Word-based Authentication**: 30 rotating celebration-themed words
- **Visual Scoring Feedback**: Buttons show "Score!", "Loss!", or "None" when clicked
- **Answer Display**: Toggle to show/hide all submitted answers
- **Buzz Order Tracking**: Complete first-to-buzz ordering system
- **Mobile Optimization**: Large touch-friendly buttons and responsive layout

## Recent Updates

- Fixed scoring system with proper database integration
- Added visual feedback for host scoring actions
- Improved answer display and review system
- Enhanced mobile interface with better button styling
- Fixed dialog close functionality

## Architecture

The application uses a client-server architecture with:
- **Frontend**: Stateless React application
- **Backend**: Express server managing game state
- **Database**: PostgreSQL for persistent storage
- **Real-time**: WebSocket connections for live updates

## Contributing

This is a custom birthday game project. Feel free to fork and adapt for your own celebrations!