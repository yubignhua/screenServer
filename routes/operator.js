const express = require('express');
const router = express.Router();
const OperatorService = require('../services/OperatorService');
const ChatService = require('../services/ChatService');

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
          code: 'OPERATORS_RETRIEVAL_FAILED',
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
          code: 'OPERATORS_RETRIEVAL_FAILED',
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
 * 获取客服状态
 * GET /api/operators/:operatorId/status
 */
router.get('/:operatorId/status', async (req, res) => {
  try {
    const { operatorId } = req.params;

    if (!operatorId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_ID',
          message: 'Operator ID is required'
        }
      });
    }

    // 这里可以添加获取单个客服状态的逻辑
    // 暂时返回基本信息
    res.json({
      success: true,
      data: {
        operatorId,
        status: 'unknown'
      },
      message: 'Operator status retrieved'
    });

  } catch (error) {
    console.error('Error in GET /operators/:operatorId/status:', error);
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
 * PUT /api/operators/:operatorId/status
 */
router.put('/:operatorId/status', async (req, res) => {
  try {
    const { operatorId } = req.params;
    const { status } = req.body;

    if (!operatorId) {
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

    const result = await OperatorService.updateOperatorStatus(operatorId, status);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_UPDATE_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        operator: result.operator,
        actualOperatorId: result.actualOperatorId
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in PUT /operators/:operatorId/status:', error);
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
 * GET /api/operators/:operatorId/sessions
 */
router.get('/:operatorId/sessions', async (req, res) => {
  try {
    const { operatorId } = req.params;
    const { status = 'active' } = req.query;

    if (!operatorId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_ID',
          message: 'Operator ID is required'
        }
      });
    }

    const result = await OperatorService.getOperatorActiveSessions(operatorId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SESSIONS_RETRIEVAL_FAILED',
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
    console.error('Error in GET /operators/:operatorId/sessions:', error);
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
 * 分配客服到会话
 * POST /api/operators/:operatorId/assign-session
 */
router.post('/:operatorId/assign-session', async (req, res) => {
  try {
    const { operatorId } = req.params;
    const { sessionId } = req.body;

    if (!operatorId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_ID',
          message: 'Operator ID is required'
        }
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required'
        }
      });
    }

    const result = await ChatService.assignOperatorToSession(sessionId, operatorId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        session: result.session,
        operator: result.operator
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in POST /operators/:operatorId/assign-session:', error);
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
 * 获取待处理会话列表
 * GET /api/operators/pending-sessions
 */
router.get('/pending-sessions', async (req, res) => {
  try {
    const { limit = '10', offset = '0' } = req.query;

    // 获取等待状态的会话
    const result = await ChatService.getUserSessions(null, {
      status: 'waiting',
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      includeMessages: true
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PENDING_SESSIONS_RETRIEVAL_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        sessions: result.sessions,
        pagination: result.pagination
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in GET /operators/pending-sessions:', error);
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
 * 智能分配客服
 * POST /api/operators/assign
 */
router.post('/assign', async (req, res) => {
  try {
    const { 
      preferredOperatorId, 
      excludeOperatorIds = [], 
      strategy = 'round_robin' 
    } = req.body;

    const result = await OperatorService.assignOperator({
      preferredOperatorId,
      excludeOperatorIds,
      strategy
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'OPERATOR_ASSIGNMENT_FAILED',
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
 * PUT /api/operators/batch-status
 */
router.put('/batch-status', async (req, res) => {
  try {
    const { operatorIds, status } = req.body;

    if (!operatorIds || !Array.isArray(operatorIds) || operatorIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_OPERATOR_IDS',
          message: 'Operator IDs array is required'
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
    console.error('Error in PUT /operators/batch-status:', error);
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