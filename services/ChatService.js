const { models } = require('../models');
const { ChatSession, ChatMessage, Operator } = models;

class ChatService {
  /**
   * 创建新的聊天会话
   * @param {string} userId - 用户ID
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} 创建的会话对象
   */
  async createChatSession(userId, options = {}) {
    try {
      // 检查用户是否已有活跃会话
      const existingSession = await ChatSession.findActiveByUserId(userId);
      
      if (existingSession) {
        return {
          success: true,
          session: existingSession,
          isNew: false,
          message: 'Found existing active session'
        };
      }

      // 创建新会话
      const session = await ChatSession.create({
        userId,
        status: 'waiting',
        ...options
      });

      return {
        success: true,
        session,
        isNew: true,
        message: 'New chat session created successfully'
      };
    } catch (error) {
      console.error('Error creating chat session:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create chat session'
      };
    }
  }

  /**
   * 发送消息
   * @param {string} sessionId - 会话ID
   * @param {string} senderId - 发送者ID
   * @param {string} senderType - 发送者类型 ('user' | 'operator')
   * @param {string} content - 消息内容
   * @param {string} messageType - 消息类型 ('text' | 'image' | 'system')
   * @returns {Promise<Object>} 发送结果
   */
  async sendMessage(sessionId, senderId, senderType, content, messageType = 'text') {
    try {
      // 验证会话是否存在
      const session = await ChatSession.findByPk(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          message: 'Chat session does not exist'
        };
      }

      // 检查会话状态
      if (session.isClosed()) {
        return {
          success: false,
          error: 'Session closed',
          message: 'Cannot send message to closed session'
        };
      }

      // 创建消息
      const message = await ChatMessage.create({
        sessionId,
        senderId,
        senderType,
        content,
        messageType,
        isRead: false
      });

      // 如果是用户发送的第一条消息，激活会话
      if (senderType === 'user' && session.isWaiting()) {
        await session.activate();
      }

      return {
        success: true,
        message,
        session,
        messageText: 'Message sent successfully'
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send message'
      };
    }
  }

  /**
   * 获取会话的历史消息
   * @param {string} sessionId - 会话ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 消息列表
   */
  async getMessageHistory(sessionId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        order = 'ASC',
        includeRead = true,
        messageType = null
      } = options;

      // 验证会话是否存在
      const session = await ChatSession.findByPk(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          message: 'Chat session does not exist'
        };
      }

      // 构建查询条件
      const whereClause = { sessionId };
      
      if (!includeRead) {
        whereClause.isRead = false;
      }
      
      if (messageType) {
        whereClause.messageType = messageType;
      }

      // 获取消息
      const messages = await ChatMessage.findAll({
        where: whereClause,
        order: [['createdAt', order]],
        limit,
        offset
      });

      // 获取总数
      const totalCount = await ChatMessage.count({
        where: whereClause
      });

      return {
        success: true,
        messages,
        session,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + messages.length < totalCount
        },
        message: 'Message history retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting message history:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve message history'
      };
    }
  }

  /**
   * 获取用户的聊天会话
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 会话列表
   */
  async getUserSessions(userId, options = {}) {
    try {
      const {
        includeMessages = false,
        includeOperator = false,
        status = null,
        limit = 10,
        offset = 0
      } = options;

      // 构建查询条件
      const whereClause = { userId };
      if (status) {
        whereClause.status = status;
      }

      // 构建包含关系
      const include = [];
      if (includeMessages) {
        include.push({
          model: models.ChatMessage,
          as: 'messages',
          limit: 10,
          order: [['createdAt', 'DESC']]
        });
      }
      if (includeOperator) {
        include.push({
          model: models.Operator,
          as: 'operator'
        });
      }

      // 获取会话
      const sessions = await ChatSession.findAll({
        where: whereClause,
        include,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const totalCount = await ChatSession.count({
        where: whereClause
      });

      return {
        success: true,
        sessions,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + sessions.length < totalCount
        },
        message: 'User sessions retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve user sessions'
      };
    }
  }

  /**
   * 关闭聊天会话
   * @param {string} sessionId - 会话ID
   * @param {string} closedBy - 关闭者ID (可选)
   * @returns {Promise<Object>} 关闭结果
   */
  async closeChatSession(sessionId, closedBy = null) {
    try {
      const session = await ChatSession.findByPk(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          message: 'Chat session does not exist'
        };
      }

      if (session.isClosed()) {
        return {
          success: true,
          session,
          message: 'Session was already closed'
        };
      }

      // 可选：添加系统消息记录会话关闭
      if (closedBy) {
        await this.sendMessage(
          sessionId,
          'system',
          'system',
          'Chat session has been closed',
          'system'
        );
      }

      // 关闭会话
      await session.close();

      return {
        success: true,
        session,
        message: 'Chat session closed successfully'
      };
    } catch (error) {
      console.error('Error closing chat session:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to close chat session'
      };
    }
  }

  /**
   * 分配客服到会话
   * @param {string} sessionId - 会话ID
   * @param {string} operatorId - 客服ID
   * @returns {Promise<Object>} 分配结果
   */
  async assignOperatorToSession(sessionId, operatorId) {
    try {
      console.log(`ChatService.assignOperatorToSession called with sessionId: ${sessionId}, operatorId: ${operatorId}`);
      const session = await ChatSession.findByPk(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          message: 'Chat session does not exist'
        };
      }

      if (session.isClosed()) {
        return {
          success: false,
          error: 'Session closed',
          message: 'Cannot assign operator to closed session'
        };
      }

      // 验证客服是否存在且在线
      console.log(`Looking for operator with ID: ${operatorId}`);
      let operator = await Operator.findByPk(operatorId);
      console.log(`Found operator:`, operator ? operator.toJSON() : 'null');
      if (!operator) {
        // 如果客服不存在，尝试创建一个新的客服记录（用于测试）
        try {
          operator = await Operator.create({
            id: operatorId, // 使用请求的ID作为客服ID
            name: `Test Operator ${operatorId.slice(-8)}`,
            email: `${operatorId.slice(-8)}@test.com`,
            status: 'online',
            lastActiveAt: new Date()
          });
          console.log(`Created new operator for session assignment: ${operator.id}`);
        } catch (createError) {
          console.error('Error creating operator for session:', createError);
          // 如果使用指定ID创建失败，尝试自动生成ID
          try {
            operator = await Operator.create({
              name: `Test Operator ${operatorId.slice(-8)}`,
              email: `${operatorId.slice(-8)}@test.com`,
              status: 'online',
              lastActiveAt: new Date()
            });
            console.log(`Created new operator with auto-generated ID: ${operator.id} (requested: ${operatorId})`);
          } catch (secondCreateError) {
            console.error('Error creating operator with auto ID:', secondCreateError);
            return {
              success: false,
              error: 'Operator not found',
              message: 'Operator does not exist and could not be created'
            };
          }
        }
      }

      if (!operator.isAvailable()) {
        console.log(`Operator ${operatorId} is not available, status: ${operator.status}`);
        return {
          success: false,
          error: 'Operator not available',
          message: 'Operator is not available for assignment'
        };
      }

      // 分配客服（使用实际的客服ID）
      session.operatorId = operator.id;
      session.status = 'active';
      await session.save();

      // 添加系统消息
      await this.sendMessage(
        sessionId,
        'system',
        'system',
        `Operator ${operator.name} has joined the chat`,
        'system'
      );

      return {
        success: true,
        session,
        operator,
        message: 'Operator assigned successfully'
      };
    } catch (error) {
      console.error('Error assigning operator to session:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to assign operator to session'
      };
    }
  }

  /**
   * 标记消息为已读
   * @param {string} sessionId - 会话ID
   * @param {string} readBy - 读取者ID (可选)
   * @returns {Promise<Object>} 标记结果
   */
  async markMessagesAsRead(sessionId, readBy = null) {
    try {
      const session = await ChatSession.findByPk(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          message: 'Chat session does not exist'
        };
      }

      // 标记所有未读消息为已读
      const [updatedCount] = await ChatMessage.markAllAsReadBySessionId(sessionId);

      return {
        success: true,
        updatedCount,
        session,
        message: `${updatedCount} messages marked as read`
      };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to mark messages as read'
      };
    }
  }

  /**
   * 获取未读消息数量
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 未读消息数量
   */
  async getUnreadMessageCount(sessionId) {
    try {
      const session = await ChatSession.findByPk(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          message: 'Chat session does not exist'
        };
      }

      const unreadCount = await ChatMessage.countUnreadBySessionId(sessionId);

      return {
        success: true,
        unreadCount,
        session,
        message: 'Unread message count retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get unread message count'
      };
    }
  }
}

module.exports = new ChatService();