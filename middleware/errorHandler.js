/**
 * 统一错误处理中间件
 * 处理应用程序中的所有错误并返回标准化的错误响应
 */

const errorHandler = (err, req, res, next) => {
  // 设置默认错误状态码和消息
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // 处理特定类型的错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    message = 'Database validation failed';
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Duplicate entry found';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    code = 'FOREIGN_KEY_CONSTRAINT';
    message = 'Foreign key constraint violation';
  } else if (err.name === 'SequelizeConnectionError') {
    statusCode = 503;
    code = 'DATABASE_CONNECTION_ERROR';
    message = 'Database connection failed';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  }

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  };

  // 在开发环境中包含错误堆栈
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details || null;
  }

  // 记录错误日志
  console.error(`Error ${statusCode}: ${message}`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: err.stack
  });

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;