# Chat Server

This is a robust and scalable chat server built with Node.js and Express. It provides real-time communication capabilities between users and customer service operators. The application includes features like chat session management, message history, operator status tracking, and intelligent operator assignment.

## Features

*   **Real-time Chat:** WebSocket-based communication for instant message delivery.
*   **Chat Session Management:** Create, assign, and close chat sessions.
*   **Message History:** Retrieve message history for any chat session.
*   **Operator Management:** Track operator status (online, offline, busy) and assign them to sessions.
*   **Intelligent Assignment:** Automatically assign operators to chat sessions based on different strategies (e.g., round-robin, least busy).
*   **RESTful API:** A comprehensive set of API endpoints to manage chats, operators, and sessions.
*   **Scalability:** Utilizes Redis for caching and to manage distributed state.

## Tech Stack

*   **Backend:** Node.js, Express.js
*   **Database:** MySQL with Sequelize ORM
*   **Real-time Communication:** Socket.IO
*   **Caching:** Redis
*   **Testing:** Jest, Supertest
*   **Validation:** express-validator

## Prerequisites

*   Node.js (v14 or later)
*   MySQL
*   Redis

## Getting Started

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd screenServer
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```

2.  Update the `.env` file with your database and Redis credentials:
    ```env
    DB_HOST=your_database_host
    DB_PORT=your_database_port
    DB_NAME=your_database_name
    DB_USER=your_database_user
    DB_PASSWORD=your_database_password

    REDIS_HOST=your_redis_host
    REDIS_PORT=your_redis_port
    REDIS_PASSWORD=your_redis_password
    ```

## Database Setup

You can initialize the database using the following npm scripts:

*   **Initialize the database (creates tables):**
    ```bash
    npm run db:init
    ```

*   **Force recreate all tables:**
    ```bash
    npm run db:init:force
    ```

*   **Seed the database with sample data:**
    ```bash
    npm run db:seed
    ```

*   **Reset the database and seed it with sample data:**
    ```bash
    npm run db:reset
    ```

## Running the Application

*   **Start the server:**
    ```bash
    npm start
    ```

*   **Start the server with pm2:**
    ```bash
    npm run pm2-start
    ```

The server will be running on `http://localhost:3000`.

## Running Tests

*   **Run all tests:**
    ```bash
    npm test
    ```

*   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```

## API Endpoints

Here is a summary of the main API endpoints:

### Chat API (`/api/chat`)

*   `GET /sessions/active`: Get active chat sessions.
*   `GET /sessions/history`: Get all historical chat sessions.
*   `POST /sessions`: Create a new chat session.
*   `PUT /sessions/:sessionId/close`: Close a chat session.
*   `GET /messages/:sessionId`: Get messages for a specific session.

### Operator API (`/api/operators`)

*   `GET /`: Get a list of all operators.
*   `GET /online`: Get a list of online operators.
*   `GET /available`: Get a list of available operators.
*   `PUT /:operatorId/status`: Update the status of an operator.
*   `POST /assign`: Intelligently assign an operator to a session.

## Project Structure

```
screenServer/
├───app.js                      # Express application setup
├───bin/www                     # Entry point for the application
├───config/                     # Configuration files (database, redis)
├───docs/                       # Project documentation
├───middleware/                 # Custom Express middleware
├───models/                     # Sequelize models
├───node_modules/               # Node.js modules
├───public/                     # Publicly served assets (chat UI)
├───routes/                     # API routes
├───scripts/                    # Scripts for database initialization
├───services/                   # Business logic services
├───tests/                      # Jest tests
├───.env.example                # Example environment file
├───package.json                # Project dependencies and scripts
└───README.md                   # This file
```

## Real-time Communication

The application uses Socket.IO for real-time communication. The server listens for WebSocket connections to enable instant messaging between users and operators.

## Environment Variables

*   `DB_HOST`: The hostname of the database server.
*   `DB_PORT`: The port of the database server.
*   `DB_NAME`: The name of the database.
*   `DB_USER`: The username for the database.
*   `DB_PASSWORD`: The password for the database.
*   `REDIS_HOST`: The hostname of the Redis server.
*   `REDIS_PORT`: The port of the Redis server.
*   `REDIS_PASSWORD`: The password for the Redis server.
