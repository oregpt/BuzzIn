# Replit MD

## Overview

This is a real-time multiplayer trivia game application built with a React frontend and Express.js backend. The application uses WebSocket connections for real-time communication between players and hosts, featuring a Jeopardy-style game format with buzzer mechanics and scoring.

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