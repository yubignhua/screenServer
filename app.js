var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var {indexRouter} = require('./routes/index');
var usersRouter = require('./routes/users');

// Import chat and operator routes
var chatRouter = require('./routes/chat');
var operatorsRouter = require('./routes/operators');

// Import database and Redis configuration
const { testDatabaseConnection, initializeDatabase } = require('./models');
const { createRedisClient, testRedisConnection } = require('./config/redis');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { responseFormatter, requestLogger, corsConfig, securityHeaders } = require('./middleware/responseFormatter');

var app = express();

// Initialize database and Redis connections
let redisClient = null;

const initializeConnections = async () => {
  try {
    // Test and initialize database
    console.log('Initializing database connection...');
    const dbConnected = await testDatabaseConnection();
    if (dbConnected) {
      await initializeDatabase({ force: false, seedData: false });
      console.log('Database initialized successfully');
    } else {
      console.error('Failed to connect to database');
    }

    // Initialize Redis connection
    console.log('Initializing Redis connection...');
    redisClient = createRedisClient();
    const redisConnected = await testRedisConnection(redisClient);
    if (redisConnected) {
      console.log('Redis initialized successfully');
    } else {
      console.error('Failed to connect to Redis');
    }
  } catch (error) {
    console.error('Error initializing connections:', error);
  }
};

// Initialize connections
initializeConnections();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Apply security and formatting middleware
app.use(securityHeaders);
app.use(corsConfig);
app.use(requestLogger);
app.use(responseFormatter);

// Standard Express middleware
app.use(cors());
app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Add chat and operator API routes
app.use('/api/chat', chatRouter);
app.use('/api/operators', operatorsRouter);

// Add simple notification endpoint for testing
app.post('/api/notifications', (req, res) => {
  console.log('Received notification:', req.body);
  res.json({ success: true, message: 'Notification received' });
});

// Serve test files for development
app.use('/test', express.static(path.join(__dirname, '../chatBox')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Use custom error handler
app.use(errorHandler);

// Export Redis client for use in other modules
app.locals.redisClient = redisClient;

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
  process.exit(0);
});

module.exports = app;
