const express = require('express');
const router = express.Router();
const ChatService = require('../services/ChatService');
const { 
  validateChatSession, 
  validateMessage, 
  validateSessionId, 
  validateUserId, 
  validatePagination, 
  validateMessageQuery 
} = require('../middleware/validation');

/**
 * 获取用户的聊天会话列表
 * GET /api/chat/sessions/:userId
 */
router.get('/sessions/:userId', validateUserId, validatePagination, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      includeMessages = 'false', 
      includeOperator = 'false',
      status,
      limit = '10',
      offset = '0'
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required'
        }
      });
    }

    const options = {
      includeMessages: includeMessages === 'true',
      includeOperator: includeOperator === 'true',
      status: status || null,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };

    const result = await ChatService.getUserSessions(userId, options);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_RETRIEVAL_FAILED',
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
    console.error('Error in GET /sessions/:userId:', error);
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
 * 创建新的聊天会话
 * POST /api/chat/sessions
 */
router.post('/sessions', validateChatSession, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required'
        }
      });
    }

    const result = await ChatService.createChatSession(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_CREATION_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    const statusCode = result.isNew ? 201 : 200;

    res.status(statusCode).json({
      success: true,
      data: {
        session: result.session,
        isNew: result.isNew
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in POST /sessions:', error);
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
 * 关闭聊天会话
 * PUT /api/chat/sessions/:sessionId/close
 */
router.put('/sessions/:sessionId/close', validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { closedBy } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required'
        }
      });
    }

    const result = await ChatService.closeChatSession(sessionId, closedBy);

    if (!result.success) {
      const statusCode = result.error === 'Session not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'Session not found' ? 'SESSION_NOT_FOUND' : 'SESSION_CLOSE_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        session: result.session
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in PUT /sessions/:sessionId/close:', error);
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
 * 获取会话的消息历史
 * GET /api/chat/messages/:sessionId
 */
router.get('/messages/:sessionId', validateSessionId, validatePagination, validateMessageQuery, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { 
      limit = '50',
      offset = '0',
      order = 'ASC',
      includeRead = 'true',
      messageType
    } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required'
        }
      });
    }

    const options = {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      includeRead: includeRead === 'true',
      messageType: messageType || null
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

    const result = await ChatService.getMessageHistory(sessionId, options);

    if (!result.success) {
      const statusCode = result.error === 'Session not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'Session not found' ? 'SESSION_NOT_FOUND' : 'MESSAGE_RETRIEVAL_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        messages: result.messages,
        session: result.session,
        pagination: result.pagination
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in GET /messages/:sessionId:', error);
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
 * 标记会话消息为已读
 * PUT /api/chat/messages/:sessionId/read
 */
router.put('/messages/:sessionId/read', validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { readBy } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required'
        }
      });
    }

    const result = await ChatService.markMessagesAsRead(sessionId, readBy);

    if (!result.success) {
      const statusCode = result.error === 'Session not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'Session not found' ? 'SESSION_NOT_FOUND' : 'MARK_READ_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        updatedCount: result.updatedCount,
        session: result.session
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in PUT /messages/:sessionId/read:', error);
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
 * 获取会话未读消息数量
 * GET /api/chat/messages/:sessionId/unread-count
 */
router.get('/messages/:sessionId/unread-count', validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required'
        }
      });
    }

    const result = await ChatService.getUnreadMessageCount(sessionId);

    if (!result.success) {
      const statusCode = result.error === 'Session not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.error === 'Session not found' ? 'SESSION_NOT_FOUND' : 'UNREAD_COUNT_FAILED',
          message: result.message,
          details: result.error
        }
      });
    }

    res.json({
      success: true,
      data: {
        unreadCount: result.unreadCount,
        session: result.session
      },
      message: result.message
    });

  } catch (error) {
    console.error('Error in GET /messages/:sessionId/unread-count:', error);
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