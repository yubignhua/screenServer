/**
 * 请求验证中间件
 * 提供通用的请求参数验证功能
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * 处理验证结果的中间件
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errorDetails,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

/**
 * 聊天会话验证规则
 */
const validateChatSession = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('User ID must be between 1 and 255 characters'),
  handleValidationErrors
];

/**
 * 消息发送验证规则
 */
const validateMessage = [
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isString()
    .withMessage('Message content must be a string')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'system'])
    .withMessage('Message type must be one of: text, image, system'),
  handleValidationErrors
];

/**
 * 会话ID验证规则
 */
const validateSessionId = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isUUID()
    .withMessage('Session ID must be a valid UUID'),
  handleValidationErrors
];

/**
 * 用户ID验证规则
 */
const validateUserId = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('User ID must be between 1 and 255 characters'),
  handleValidationErrors
];

/**
 * 客服ID验证规则
 */
const validateOperatorId = [
  param('id')
    .notEmpty()
    .withMessage('Operator ID is required')
    .isUUID()
    .withMessage('Operator ID must be a valid UUID'),
  handleValidationErrors
];

/**
 * 客服状态验证规则
 */
const validateOperatorStatus = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['online', 'offline', 'busy'])
    .withMessage('Status must be one of: online, offline, busy'),
  handleValidationErrors
];

/**
 * 分页参数验证规则
 */
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  handleValidationErrors
];

/**
 * 消息查询参数验证规则
 */
const validateMessageQuery = [
  query('order')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Order must be ASC or DESC'),
  query('includeRead')
    .optional()
    .isBoolean()
    .withMessage('includeRead must be a boolean'),
  query('messageType')
    .optional()
    .isIn(['text', 'image', 'system'])
    .withMessage('Message type must be one of: text, image, system'),
  handleValidationErrors
];

/**
 * 批量操作验证规则
 */
const validateBatchOperation = [
  body('operatorIds')
    .isArray({ min: 1 })
    .withMessage('Operator IDs must be a non-empty array'),
  body('operatorIds.*')
    .isUUID()
    .withMessage('Each operator ID must be a valid UUID'),
  handleValidationErrors
];

/**
 * 客服分配验证规则
 */
const validateOperatorAssignment = [
  body('preferredOperatorId')
    .optional()
    .isUUID()
    .withMessage('Preferred operator ID must be a valid UUID'),
  body('excludeOperatorIds')
    .optional()
    .isArray()
    .withMessage('Exclude operator IDs must be an array'),
  body('excludeOperatorIds.*')
    .isUUID()
    .withMessage('Each excluded operator ID must be a valid UUID'),
  body('strategy')
    .optional()
    .isIn(['round_robin', 'least_busy', 'most_recent'])
    .withMessage('Strategy must be one of: round_robin, least_busy, most_recent'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateChatSession,
  validateMessage,
  validateSessionId,
  validateUserId,
  validateOperatorId,
  validateOperatorStatus,
  validatePagination,
  validateMessageQuery,
  validateBatchOperation,
  validateOperatorAssignment
};