const redis = require('redis');
require('dotenv').config();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true
};

// Create Redis client
const createRedisClient = () => {
  const client = redis.createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port
    },
    password: redisConfig.password,
    database: redisConfig.db
  });

  // Error handling
  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  client.on('ready', () => {
    console.log('Redis Client Ready');
  });

  client.on('end', () => {
    console.log('Redis Client Connection Ended');
  });

  return client;
};

// Test Redis connection
const testRedisConnection = async (client) => {
  try {
    await client.connect();
    await client.ping();
    console.log('Redis connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to Redis:', error);
    return false;
  }
};

module.exports = {
  createRedisClient,
  testRedisConnection,
  redisConfig
};