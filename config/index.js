const { sequelize, testConnection } = require('./database');
const { createRedisClient, testRedisConnection } = require('./redis');
require('dotenv').config();

// Initialize database and Redis connections
const initializeConnections = async () => {
  console.log('Initializing database and Redis connections...');
  
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  // Create and test Redis connection
  const redisClient = createRedisClient();
  const redisConnected = await testRedisConnection(redisClient);
  if (!redisConnected) {
    console.warn('Failed to connect to Redis - continuing without cache');
  }

  return {
    sequelize,
    redisClient: redisConnected ? redisClient : null
  };
};

// Graceful shutdown
const gracefulShutdown = async (sequelize, redisClient) => {
  console.log('Shutting down gracefully...');
  
  try {
    if (sequelize) {
      await sequelize.close();
      console.log('Database connection closed.');
    }
    
    if (redisClient) {
      await redisClient.quit();
      console.log('Redis connection closed.');
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  process.exit(0);
};

module.exports = {
  initializeConnections,
  gracefulShutdown
};