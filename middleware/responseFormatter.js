/**
 * API响应格式标准化中间件
 * 提供统一的响应格式和辅助方法
 */

/**
 * 响应格式化中间件
 * 为res对象添加标准化的响应方法
 */
const responseFormatter = (req, res, next) => {
  /**
   * 成功响应
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   * @param {number} statusCode - HTTP状态码
   */
  res.success = (data = null, message = 'Success', statusCode = 200) => {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  };

  /**
   * 错误响应
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   * @param {number} statusCode - HTTP状态码
   * @param {*} details - 错误详情
   */
  res.error = (message = 'Error', code = 'UNKNOWN_ERROR', statusCode = 500, details = null) => {
    const response = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    };

    if (details !== null) {
      response.error.details = details;
    }

    return res.status(statusCode).json(response);
  };

  /**
   * 分页响应
   * @param {Array} items - 数据项
   * @param {Object} pagination - 分页信息
   * @param {string} message - 响应消息
   */
  res.paginated = (items = [], pagination = {}, message = 'Success') => {
    const response = {
      success: true,
      message,
      data: {
        items,
        pagination: {
          total: pagination.total || 0,
          limit: pagination.limit || 10,
          offset: pagination.offset || 0,
          hasMore: pagination.hasMore || false,
          ...pagination
        }
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);
  };

  /**
   * 创建响应
   * @param {*} data - 创建的数据
   * @param {string} message - 响应消息
   */
  res.created = (data = null, message = 'Created successfully') => {
    return res.success(data, message, 201);
  };

  /**
   * 无内容响应
   * @param {string} message - 响应消息
   */
  res.noContent = (message = 'No content') => {
    return res.status(204).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * 未找到响应
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  res.notFound = (message = 'Resource not found', code = 'NOT_FOUND') => {
    return res.error(message, code, 404);
  };

  /**
   * 验证错误响应
   * @param {string} message - 错误消息
   * @param {*} details - 验证错误详情
   */
  res.validationError = (message = 'Validation failed', details = null) => {
    return res.error(message, 'VALIDATION_ERROR', 400, details);
  };

  /**
   * 未授权响应
   * @param {string} message - 错误消息
   */
  res.unauthorized = (message = 'Unauthorized') => {
    return res.error(message, 'UNAUTHORIZED', 401);
  };

  /**
   * 禁止访问响应
   * @param {string} message - 错误消息
   */
  res.forbidden = (message = 'Forbidden') => {
    return res.error(message, 'FORBIDDEN', 403);
  };

  /**
   * 冲突响应
   * @param {string} message - 错误消息
   */
  res.conflict = (message = 'Conflict') => {
    return res.error(message, 'CONFLICT', 409);
  };

  /**
   * 服务器错误响应
   * @param {string} message - 错误消息
   * @param {*} details - 错误详情
   */
  res.serverError = (message = 'Internal server error', details = null) => {
    return res.error(message, 'INTERNAL_ERROR', 500, details);
  };

  next();
};

/**
 * 请求日志中间件
 * 记录API请求的基本信息
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求开始
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);
  
  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red for errors, green for success
    const resetColor = '\x1b[0m';
    
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${statusColor}${res.statusCode}${resetColor} - ${duration}ms`
    );
  });
  
  next();
};

/**
 * CORS配置中间件
 */
const corsConfig = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

/**
 * 安全头中间件
 */
const securityHeaders = (req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

module.exports = {
  responseFormatter,
  requestLogger,
  corsConfig,
  securityHeaders
};