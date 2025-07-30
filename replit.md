# Replit MD

## Overview

This is a real-time multiplayer trivia game application built with a React frontend and Express.js backend. The application uses WebSocket connections for real-time communication between players and hosts, featuring a Jeopardy-style game format with enhanced buzzer mechanics, complete buzz order tracking, team selection functionality, and administrator oversight capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks with local component state
- **Real-time Communication**: Custom WebSocket hook for bidirectional communication
- **HTTP Client**: TanStack Query for data fetching and caching
- **Routing**: Wouter for client-side routing

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Real-time Communication**: WebSocket server using 'ws' library
- **Data Layer**: In-memory storage with interface for future database integration
- **Development**: Vite middleware integration for hot module replacement

### Key Components

#### Frontend Pages
- **Game Lobby**: Entry point for creating or joining games
- **Game Host**: Host interface for managing games and questions
- **Game Player**: Player interface for answering questions and buzzing in

#### Backend Services
- **WebSocket Handler**: Manages real-time game events (create/join game, buzz, answer)
- **Storage Interface**: Abstracted data layer supporting in-memory storage with future database expansion
- **Game Logic**: Handles buzzer timing, scoring, and game state management

#### Shared Schema
- **Type Definitions**: Shared TypeScript interfaces for games, players, questions, and WebSocket messages
- **Database Schema**: Drizzle ORM schema definitions for PostgreSQL (configured but not yet implemented)

## Data Flow

### Game Creation Flow
1. Host creates game through lobby interface
2. WebSocket message sent to server
3. Server generates unique room code and creates game record
4. Host receives game details and navigates to host interface

### Player Join Flow
1. Player enters room code and name in lobby
2. WebSocket message sent to server
3. Server validates room code and adds player to game
4. All participants receive updated player list
5. Player navigates to game interface

### Question Flow
1. Host selects question from predefined categories/values
2. Question broadcast to all players
3. Players can buzz in (first-come-first-served)
4. Host sees buzz order and can accept/reject answers
5. Scores updated and broadcast to all participants

## External Dependencies

### Frontend Dependencies
- **UI Components**: Extensive Radix UI component library for accessible UI primitives
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Dependencies
- **Database**: Drizzle ORM configured for PostgreSQL with Neon Database serverless
- **WebSockets**: 'ws' library for WebSocket server implementation
- **Development**: Various development tools including ESBuild for production builds

### Shared Dependencies
- **Validation**: Zod for runtime type validation
- **Utilities**: Various utility libraries for date formatting, class name merging

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React application to static files
- **Backend**: ESBuild bundles Express server for Node.js deployment
- **Database**: Drizzle migrations system for schema management

### Environment Configuration
- **Development**: Vite dev server with Express API and WebSocket server
- **Production**: Static frontend serving with Express backend and WebSocket support
- **Database**: PostgreSQL connection via environment variable

### Key Considerations
- WebSocket connections require sticky sessions or proper load balancer configuration
- Database migrations need to be run before deployment
- Environment variables required for database connection and other configuration
- Static assets served from Express in production build

The application is structured for easy development with hot reloading and clear separation between frontend and backend concerns, while maintaining shared type safety through the common schema definitions.

## Recent Enhancements (January 2025)

### Simplified Authentication System (July 30, 2025)
- **Players**: Only need name and room code to join games - no authentication codes required
- **Hosts**: Require 6-character host code for game control and administration  
- Room codes (4-letter) identify games for easy discovery
- Host codes displayed in notifications for secure sharing
- Database persistence of host authentication codes per game

### Simplified Lobby Interface (July 29, 2025)
- Removed separate "Join as Host" and "Join by Code" cards from main lobby
- Removed global name input from top of lobby
- Single "Setup New Game" button as primary action
- Open games selection as main entry point for joining
- Authentication dialog handles both host and player joining with appropriate code fields
- Name input only appears for player role in join dialog

### Enhanced Buzz Order Tracking
- Complete buzz order tracking (1st, 2nd, 3rd, etc.) for all players
- Real-time buzz order display on both host and player interfaces
- Visual indicators showing exact timing and placement of each buzz
- Persistent buzz history throughout the question lifecycle

### Team Selection Functionality
- Winner of previous question gets to pick the next question
- Host can override team selection at any time
- Clear visual indicators showing which team gets to select next
- Automatic tracking of last correct answer for seamless game flow

### Administrator Controls
- Enhanced admin oversight with ability to approve close answers
- Complete control over question flow and team selection
- Real-time monitoring of all player interactions
- Professional game show experience with big screen display support

### Mobile-Optimized Interface  
- Large, responsive buzzer button for mobile devices
- Touch-friendly interface designed for phone gameplay
- Real-time feedback and status updates
- Optimized for teams playing on individual mobile devices while watching a main display

These enhancements transform the application into a professional-grade trivia experience suitable for both casual games and organized events, with the host managing the main display while teams participate via their mobile devices.