# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a robust and scalable chat server built with Node.js and Express. It provides real-time communication capabilities between users and customer service operators. The application includes features like chat session management, message history, operator status tracking, and intelligent operator assignment.

## Architecture

### Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL with Sequelize ORM
- **Real-time Communication**: Socket.IO
- **Caching**: Redis
- **Testing**: Jest, Supertest
- **Validation**: express-validator

### Application Structure
- **Entry Point**: `bin/www` - HTTP server setup and Socket.IO initialization
- **Main Application**: `app.js` - Express configuration, middleware setup, and route registration
- **Database Models**: `models/` - Sequelize models for ChatSession, ChatMessage, and Operator
- **Services**: `services/` - Business logic for chat, notifications, and operator management
- **Routes**: `routes/` - API endpoints for chat and operator operations
- **Configuration**: `config/` - Database and Redis configuration
- **Middleware**: `middleware/` - Custom Express middleware for error handling and response formatting

## Common Development Commands

### Installation
```bash
npm install
```

### Running the Application
```bash
npm start              # Start server on port 3001
npm run pm2-start      # Start with pm2 process manager
```

### Database Operations
```bash
npm run db:init        # Initialize database tables
npm run db:init:force  # Force recreate all tables
npm run db:seed        # Seed database with sample data
npm run db:reset       # Reset and seed database
npm run db:test        # Run database in test mode
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

### Connection Testing
```bash
npm run test-connections  # Test database and Redis connections
```

## Key Components

### Routes Structure
- `routes/index.js` - Main Socket.IO setup and basic routes
- `routes/chat.js` - Chat session and message endpoints
- `routes/operator.js` - Operator management and assignment endpoints
- `routes/users.js` - User-related endpoints

### Services Architecture
- `services/ChatService.js` - Chat session and message business logic
- `services/OperatorService.js` - Operator management and assignment strategies
- `services/NotificationService.js` - Notification handling

### Database Models
- `models/ChatSession.js` - Chat session management
- `models/ChatMessage.js` - Message storage and retrieval
- `models/Operator.js` - Operator status and management

### Configuration
- `config/redis.js` - Redis client configuration with connection handling
- Environment variables for database and Redis connections

## API Endpoints

### Chat API (`/api/chat`)
- `GET /sessions/active` - Get active chat sessions
- `GET /sessions/history` - Get all historical chat sessions
- `POST /sessions` - Create a new chat session
- `PUT /sessions/:sessionId/close` - Close a chat session
- `GET /messages/:sessionId` - Get messages for a specific session

### Operator API (`/api/operators`)
- `GET /` - Get a list of all operators
- `GET /online` - Get a list of online operators
- `GET /available` - Get a list of available operators
- `PUT /:operatorId/status` - Update operator status
- `POST /assign` - Intelligently assign operator to session

## Real-time Communication

The application uses Socket.IO for real-time communication:
- Socket.IO server initialized in `routes/index.js`
- Handles real-time messaging between users and operators
- Supports operator assignment notifications
- Manages session lifecycle events

## Environment Configuration

Required environment variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` - Redis configuration
- `PORT` - Server port (defaults to 3001)

## Database Schema

The system uses three main entities:
- **ChatSession**: Stores chat session information (ID, user info, operator assignment, status)
- **ChatMessage**: Stores individual messages with session association
- **Operator**: Stores operator information and current status

## Middleware Stack

The application uses several custom middleware:
- `middleware/errorHandler.js` - Centralized error handling
- `middleware/responseFormatter.js` - Response formatting, CORS, security headers, request logging

## Development Notes

- The server runs on port 3001 by default
- Redis is used for caching operator status and session management
- The system supports intelligent operator assignment strategies
- All database operations use Sequelize ORM with proper error handling
- Socket.IO is integrated with the HTTP server for real-time features

## Known Issues

- Remote Redis connections may require Redis server configuration changes (bind to 0.0.0.0)
- Ensure proper firewall and security measures when exposing Redis externally