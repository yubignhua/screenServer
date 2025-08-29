const express = require('express');
const router = express.Router();
const OperatorService = require('../services/OperatorService');
const { models } = require('../models');
const { Operator } = models;
const { 
  validateOperatorId, 
  validateOperatorStatus, 
  validatePagination, 
  validateBatchOperation, 
  validateOperatorAssignment 
} = require('../middleware/validation');

/**
 * 获取所有客服列表
 * GET /api/operators
 */
router.get('/', validatePagination, async (req, res) => {
  try {
    const { 
      status,
      includeStats = 'false',
      includeActiveSessions = 'false',
      limit = '50',
      offset = '0'
    } = req.query;

    const options = {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };

    // Validate limit and offset
    if (options.limit < 1 || options.limit > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100'
        }
      });
    }

    if (options.offset < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OFFSET',
          message: 'Offset must be non-negative'
        }
      });
    }

    // Build where clause
    const whereClause = {};
    if (status && ['online', 'offline', 'busy'].includes(status)) {
      whereClause.status = status;
    }

    // Build include clause
    const include = [];
    if (includeActiveSessions === 'true') {
      include.push({
        model: models.ChatSession,
        as: 'sessions',
        where: { status: 'active' },
        required: false,
        include: [
          {
            model: models.ChatMessage,
            as: 'messages',
            limit: 1,
            order: [['createdAt', 'DESC']]
          }
        ]
      });
    }

    // Get operators
    const operators = await Operator.findAll({
      where: whereClause,
      include,
      order: [['lastActiveAt', 'DESC']],
      limit: options.limit,
      offset: options.offset
    });

    const totalCount = await Operator.count({
      where: whereClause
    });

    const result = {
      success: true,
      data: {
        operators,
        pagination: {
          total: totalCount,
          limit: options.limit,
          offset: options.offset,
          hasMore: options.offset + operators.length < totalCount
        }
      },
      message: 'Operators retrieved successfully'
    };

    // Add statistics if requested
    if (includeStats === 'true') {
      const statsResult = await OperatorService.getOperatorStats();
      if (statsResult.success) {
        result.data.stats = statsResult.stats;
      }
    }

    res.json(result);

  } catch (error) {
    console.error('Error in GET /operators:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 获取在线客服列表
 * GET /api/operators/online
 */
router.get('/online', async (req, res) => {
  try {
    const { includeStats = 'false' } = req.query;

    const result = await OperatorService.getOnlineOperators({
      includeStats: includeStats === 'true'
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ONLINE_OPERATORS_RETRIEVAL_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        operators: result.operators,
        count: result.count,
        stats: result.stats || null
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in GET /operators/online:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 获取可用客服列表
 * GET /api/operators/available
 */
router.get('/available', async (req, res) => {
  try {
    const result = await OperatorService.getAvailableOperators();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'AVAILABLE_OPERATORS_RETRIEVAL_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        operators: result.operators,
        count: result.count
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in GET /operators/available:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 获取客服统计信息
 * GET /api/operators/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await OperatorService.getOperatorStats();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATS_RETRIEVAL_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        stats: result.stats
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in GET /operators/stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 获取单个客服信息
 * GET /api/operators/:id
 */
router.get('/:id', validateOperatorId, async (req, res) => {
  try {
    const { id } = req.params;
    const { includeActiveSessions = 'false' } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_ID',
          message: 'Operator ID is required'
        }
      });
    }

    // Build include clause
    const include = [];
    if (includeActiveSessions === 'true') {
      include.push({
        model: models.ChatSession,
        as: 'sessions',
        where: { status: 'active' },
        required: false,
        include: [
          {
            model: models.ChatMessage,
            as: 'messages',
            limit: 5,
            order: [['createdAt', 'DESC']]
          }
        ]
      });
    }

    const operator = await Operator.findByPk(id, { include });

    if (!operator) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OPERATOR_NOT_FOUND',
          message: 'Operator not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        operator
      },
      message: 'Operator retrieved successfully'
    });

  } catch (error) {
    console.error('Error in GET /operators/:id:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 更新客服状态
 * PUT /api/operators/:id/status
 */
router.put('/:id/status', validateOperatorId, validateOperatorStatus, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_ID',
          message: 'Operator ID is required'
        }
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_STATUS',
          message: 'Status is required'
        }
      });
    }

    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be one of: online, offline, busy'
        }
      });
    }

    let result;
    switch (status) {
      case 'online':
        result = await OperatorService.setOperatorOnline(id);
        break;
      case 'offline':
        result = await OperatorService.setOperatorOffline(id);
        break;
      case 'busy':
        result = await OperatorService.setOperatorBusy(id);
        break;
    }

    if (!result.success) {
      const statusCode = result.error === 'Operator not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'Operator not found' ? 'OPERATOR_NOT_FOUND' : 'STATUS_UPDATE_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        operator: result.operator
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in PUT /operators/:id/status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 获取客服的活跃会话
 * GET /api/operators/:id/sessions
 */
router.get('/:id/sessions', validateOperatorId, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_ID',
          message: 'Operator ID is required'
        }
      });
    }

    const result = await OperatorService.getOperatorActiveSessions(id);

    if (!result.success) {
      const statusCode = result.error === 'Operator not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'Operator not found' ? 'OPERATOR_NOT_FOUND' : 'SESSIONS_RETRIEVAL_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        operator: result.operator,
        sessions: result.sessions,
        count: result.count
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in GET /operators/:id/sessions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 更新客服最后活跃时间
 * PUT /api/operators/:id/last-active
 */
router.put('/:id/last-active', validateOperatorId, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_ID',
          message: 'Operator ID is required'
        }
      });
    }

    const result = await OperatorService.updateOperatorLastActive(id);

    if (!result.success) {
      const statusCode = result.error === 'Operator not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'Operator not found' ? 'OPERATOR_NOT_FOUND' : 'LAST_ACTIVE_UPDATE_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        operator: result.operator
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in PUT /operators/:id/last-active:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 智能分配客服
 * POST /api/operators/assign
 */
router.post('/assign', validateOperatorAssignment, async (req, res) => {
  try {
    const { 
      preferredOperatorId,
      excludeOperatorIds = [],
      strategy = 'round_robin'
    } = req.body;

    if (!['round_robin', 'least_busy', 'most_recent'].includes(strategy)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STRATEGY',
          message: 'Strategy must be one of: round_robin, least_busy, most_recent'
        }
      });
    }

    const result = await OperatorService.assignOperator({
      preferredOperatorId,
      excludeOperatorIds,
      strategy
    });

    if (!result.success) {
      const statusCode = result.error === 'No available operators' || result.error === 'No suitable operators' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'No available operators' || result.error === 'No suitable operators' ? 'NO_AVAILABLE_OPERATORS' : 'ASSIGNMENT_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        operator: result.operator,
        strategy: result.strategy
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in POST /operators/assign:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * 批量更新客服状态
 * PUT /api/operators/batch/status
 */
router.put('/batch/status', validateBatchOperation, validateOperatorStatus, async (req, res) => {
  try {
    const { operatorIds, status } = req.body;

    if (!operatorIds || !Array.isArray(operatorIds) || operatorIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_IDS',
          message: 'Operator IDs array is required and cannot be empty'
        }
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_STATUS',
          message: 'Status is required'
        }
      });
    }

    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be one of: online, offline, busy'
        }
      });
    }

    const result = await OperatorService.batchUpdateOperatorStatus(operatorIds, status);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_UPDATE_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        updatedCount: result.updatedCount
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in PUT /operators/batch/status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

module.exports = router;