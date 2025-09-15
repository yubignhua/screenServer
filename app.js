var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var {indexRouter} = require('./routes/index');
var usersRouter = require('./routes/users');

// 导入路由
var chatRouter = require('./routes/chat');
var operatorRouter = require('./routes/operator');

// 导入 database and Redis configuration
const { testDatabaseConnection, initializeDatabase } = require('./models');
const { createRedisClient, testRedisConnection } = require('./config/redis');

// 导入中间件
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
app.use(cors());
app.use(requestLogger);
app.use(responseFormatter);

// 标准的express 中间件
// CORS (Cross-Origin Resource Sharing) - 允许跨域请求 (handled by corsConfig middleware above)
// Morgan logger - 记录HTTP请求日志，'dev'模式提供彩色输出
app.use(logger('dev'));
// JSON解析器 - 解析请求体中的JSON数据，限制大小为10MB
app.use(express.json({ limit: '10mb' }));
// URL编码解析器 - 解析表单数据，extended:false使用querystring库，限制大小为10MB
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
// Cookie解析器 - 解析请求中的Cookie数据
app.use(cookieParser());
// 静态文件服务 - 提供public目录下的静态文件访问
app.use(express.static(path.join(__dirname, 'public')));

// 配置 router 
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/operators', operatorRouter);
app.post('/api/notifications', (req, res) => { 
  console.log('Received notification:', req.body);
  res.json({ success: true, message: 'Notification received' });
});
app.use('/test', express.static(path.join(__dirname, '../chatBox')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// 自定义的错误处理方法
app.use(errorHandler);

// 导出 Redis 客户端以供其他模块使用 Export Redis client for use in other modules 
app.locals.redisClient = redisClient;

// 优雅的关闭处理
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
