# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time customer service chat system with two main components:

1. **screenServer**: Node.js backend with Express, Socket.IO, MySQL, and Redis
2. **chatBox**: Vue.js 2 frontend client with Element UI
3. **tests**: there are a lots of test file to help to test function

## Architecture

### Backend (screenServer/)
- **Tech Stack**: Node.js, Express.js, Socket.IO, MySQL (Sequelize ORM), Redis
- **Main Entry Point**: `app.js` - Express application setup and initialization
- **Database**: MySQL with Sequelize ORM, connection management in `models/`
- **Real-time**: Socket.IO for WebSocket communication
- **Caching**: Redis for session management and operator status
- **API Structure**: RESTful endpoints in `routes/` with business logic in `services/`

### Frontend (chatBox/)
- **Tech Stack**: Vue.js 2.7.14, Vuex, Vue Router, Element UI, Socket.IO Client
- **Main Entry Point**: `src/main.js` - Vue instance creation with router and store
- **State Management**: Vuex with modular stores in `src/store/modules/`
- **Routing**: Vue Router configuration in `src/router/index.js`
- **Real-time**: Socket.IO client service in `src/services/SocketService.js`
- **Build Tool**: Webpack 5 with Babel

## Common Development Commands

### Backend (screenServer/)
```bash
cd screenServer

# Install dependencies
npm install

# Start development server
npm start

# Start with pm2 for production
npm run pm2-start

# Database operations
npm run db:init        # Initialize database tables
npm run db:init:force  # Force recreate tables
npm run db:seed        # Seed database with sample data
npm run db:reset       # Reset and seed database

# Testing
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode

# Test database connections
npm run test-connections
```

### Frontend (chatBox/)
```bash
cd chatBox

# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev
```

## Project Structure

### Backend Key Directories
- `routes/` - API endpoints (chat, operator, users)
- `services/` - Business logic services
- `models/` - Sequelize database models
- `middleware/` - Express middleware (error handling, formatting)
- `config/` - Database and Redis configuration
- `scripts/` - Database initialization scripts
- `tests/` - Jest test files

### Frontend Key Directories
- `src/components/` - Vue components
- `src/store/modules/` - Vuex store modules
- `src/services/` - API and Socket.IO services
- `src/router/` - Vue Router configuration

## Environment Configuration

### Backend (.env)
- Database credentials (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- Redis configuration (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)

### Frontend (.env)
- API endpoint configuration
- Socket.IO server URL

## Database Schema
The system uses MySQL with the following main entities:
- Chat sessions
- Messages
- Operators
- Users

## Real-time Communication
- Socket.IO is used for real-time messaging between client and server
- Operators can be assigned to chat sessions
- Message history is stored and retrievable

## Testing
- Backend: Jest with Supertest for API testing
- Frontend: No specific test framework configured
- Database connection testing available via npm script

## Development Notes
- The backend uses Express with middleware for CORS, error handling, and response formatting
- The frontend follows Vue.js 2 conventions with Element UI components
- Both components are designed to work together as a complete chat system
- The system supports operator assignment and session management