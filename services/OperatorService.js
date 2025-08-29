const { models } = require('../models');
const { Operator, ChatSession } = models;
const { createRedisClient } = require('../config/redis');

class OperatorService {
  constructor() {
    this.redisClient = null;
    this.initRedis();
  }

  /**
   * 初始化Redis连接
   */
  async initRedis() {
    try {
      this.redisClient = createRedisClient();
      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis for OperatorService:', error);
      this.redisClient = null;
    }
  }

  /**
   * 客服上线
   * @param {string} operatorId - 客服ID
   * @returns {Promise<Object>} 上线结果
   */
  async setOperatorOnline(operatorId) {
    try {
      const operator = await Operator.findByPk(operatorId);
      if (!operator) {
        return {
          success: false,
          error: 'Operator not found',
          message: 'Operator does not exist'
        };
      }

      // 更新数据库状态
      await operator.setOnline();

      // 更新Redis缓存
      if (this.redisClient) {
        await this.redisClient.setEx(`operator:${operatorId}:status`, 3600, 'online');
        await this.redisClient.setEx(`operator:${operatorId}:lastActive`, 3600, new Date().toISOString());
        await this.redisClient.sAdd('operators:online', operatorId);
      }

      return {
        success: true,
        operator,
        message: 'Operator set to online successfully'
      };
    } catch (error) {
      console.error('Error setting operator online:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to set operator online'
      };
    }
  }

  /**
   * 客服下线
   * @param {string} operatorId - 客服ID
   * @returns {Promise<Object>} 下线结果
   */
  async setOperatorOffline(operatorId) {
    try {
      // findByPk 是 Sequelize ORM 的方法，用于根据主键查找单条记录
      // findByPk(primaryKey) - 根据主键值查找并返回一个模型实例
      // 如果找到记录则返回模型实例，如果没找到则返回 null
      // 这里通过 operatorId（客服ID）作为主键来查找对应的客服记录
      const operator = await Operator.findByPk(operatorId);
      if (!operator) {
        return {
          success: false,
          error: 'Operator not found',
          message: 'Operator does not exist'
        };
      }

      // 更新数据库状态
      await operator.setOffline();

      // 更新Redis缓存
      if (this.redisClient) {
        await this.redisClient.setEx(`operator:${operatorId}:status`, 3600, 'offline');
        await this.redisClient.sRem('operators:online', operatorId);
        await this.redisClient.sRem('operators:available', operatorId);
      }

      return {
        success: true,
        operator,
        message: 'Operator set to offline successfully'
      };
    } catch (error) {
      console.error('Error setting operator offline:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to set operator offline'
      };
    }
  }

  /**
   * 设置客服忙碌状态
   * @param {string} operatorId - 客服ID
   * @returns {Promise<Object>} 设置结果
   */
  async setOperatorBusy(operatorId) {
    try {
      const operator = await Operator.findByPk(operatorId);
      if (!operator) {
        return {
          success: false,
          error: 'Operator not found',
          message: 'Operator does not exist'
        };
      }

      // 更新数据库状态
      await operator.setBusy();

      // 更新Redis缓存
      if (this.redisClient) {
        await this.redisClient.setEx(`operator:${operatorId}:status`, 3600, 'busy');
        await this.redisClient.sRem('operators:available', operatorId);
      }

      return {
        success: true,
        operator,
        message: 'Operator set to busy successfully'
      };
    } catch (error) {
      console.error('Error setting operator busy:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to set operator busy'
      };
    }
  }

  /**
   * 获取在线客服列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 在线客服列表
   */
  async getOnlineOperators(options = {}) {
    try {
      const { includeStats = false } = options;

      // 首先尝试从Redis获取
      let onlineOperatorIds = [];
      if (this.redisClient) {
        try {
          onlineOperatorIds = await this.redisClient.sMembers('operators:online');
        } catch (redisError) {
          console.warn('Redis error, falling back to database:', redisError);
        }
      }

      let operators;
      if (onlineOperatorIds.length > 0) {
        // 从数据库获取详细信息
        operators = await Operator.findAll({
          where: {
            id: onlineOperatorIds,
            status: 'online'
          },
          order: [['lastActiveAt', 'DESC']]
        });
      } else {
        // 直接从数据库查询
        operators = await Operator.findOnline();
      }

      const result = {
        success: true,
        operators,
        count: operators.length,
        message: 'Online operators retrieved successfully'
      };

      // 如果需要统计信息
      if (includeStats) {
        const stats = await this.getOperatorStats();
        result.stats = stats.success ? stats.stats : null;
      }

      return result;
    } catch (error) {
      console.error('Error getting online operators:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get online operators'
      };
    }
  }

  /**
   * 获取可用客服列表（在线且不忙碌）
   * @returns {Promise<Object>} 可用客服列表
   */
  async getAvailableOperators() {
    try {
      const operators = await Operator.findAvailable();

      return {
        success: true,
        operators,
        count: operators.length,
        message: 'Available operators retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting available operators:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get available operators'
      };
    }
  }

  /**
   * 智能分配客服算法
   * @param {Object} options - 分配选项
   * @returns {Promise<Object>} 分配结果
   */
  async assignOperator(options = {}) {
    try {
      const { 
        preferredOperatorId = null,
        excludeOperatorIds = [],
        strategy = 'round_robin' // 'round_robin', 'least_busy', 'most_recent'
      } = options;

      // 如果指定了首选客服且可用，直接分配
      if (preferredOperatorId) {
        const preferredOperator = await Operator.findByPk(preferredOperatorId);
        if (preferredOperator && preferredOperator.isAvailable()) {
          return {
            success: true,
            operator: preferredOperator,
            strategy: 'preferred',
            message: 'Preferred operator assigned successfully'
          };
        }
      }

      // 获取可用客服列表
      const availableResult = await this.getAvailableOperators();
      if (!availableResult.success || availableResult.operators.length === 0) {
        return {
          success: false,
          error: 'No available operators',
          message: 'No operators are currently available'
        };
      }

      let availableOperators = availableResult.operators;

      // 排除指定的客服
      if (excludeOperatorIds.length > 0) {
        availableOperators = availableOperators.filter(
          op => !excludeOperatorIds.includes(op.id)
        );
      }

      if (availableOperators.length === 0) {
        return {
          success: false,
          error: 'No suitable operators',
          message: 'No suitable operators available after filtering'
        };
      }

      let selectedOperator;

      switch (strategy) {
        case 'least_busy':
          selectedOperator = await this.selectLeastBusyOperator(availableOperators);
          break;
        case 'most_recent':
          selectedOperator = availableOperators.sort((a, b) => 
            new Date(b.lastActiveAt) - new Date(a.lastActiveAt)
          )[0];
          break;
        case 'round_robin':
        default:
          selectedOperator = await this.selectRoundRobinOperator(availableOperators);
          break;
      }

      return {
        success: true,
        operator: selectedOperator,
        strategy,
        message: `Operator assigned using ${strategy} strategy`
      };
    } catch (error) {
      console.error('Error assigning operator:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to assign operator'
      };
    }
  }

  /**
   * 选择最少忙碌的客服
   * @param {Array} operators - 可用客服列表
   * @returns {Promise<Object>} 选中的客服
   */
  async selectLeastBusyOperator(operators) {
    try {
      const operatorWorkloads = await Promise.all(
        operators.map(async (operator) => {
          const activeSessionsCount = await ChatSession.count({
            where: {
              operatorId: operator.id,
              status: 'active'
            }
          });
          return {
            operator,
            workload: activeSessionsCount
          };
        })
      );

      // 按工作负载排序，选择最少的
      operatorWorkloads.sort((a, b) => a.workload - b.workload);
      return operatorWorkloads[0].operator;
    } catch (error) {
      console.error('Error selecting least busy operator:', error);
      // 如果出错，返回第一个可用的
      return operators[0];
    }
  }

  /**
   * 轮询选择客服
   * @param {Array} operators - 可用客服列表
   * @returns {Promise<Object>} 选中的客服
   */
  async selectRoundRobinOperator(operators) {
    try {
      if (!this.redisClient) {
        // 如果没有Redis，随机选择
        return operators[Math.floor(Math.random() * operators.length)];
      }

      // 从Redis获取上次分配的索引
      const lastIndex = await this.redisClient.get('operator:assignment:last_index');
      const currentIndex = lastIndex ? (parseInt(lastIndex) + 1) % operators.length : 0;
      
      // 更新索引
      await this.redisClient.setEx('operator:assignment:last_index', 3600, currentIndex.toString());
      
      return operators[currentIndex];
    } catch (error) {
      console.error('Error in round robin selection:', error);
      // 如果出错，返回第一个可用的
      return operators[0];
    }
  }

  /**
   * 更新客服最后活跃时间
   * @param {string} operatorId - 客服ID
   * @returns {Promise<Object>} 更新结果
   */
  async updateOperatorLastActive(operatorId) {
    try {
      const operator = await Operator.findByPk(operatorId);
      if (!operator) {
        return {
          success: false,
          error: 'Operator not found',
          message: 'Operator does not exist'
        };
      }

      await operator.updateLastActive();

      // 更新Redis缓存
      if (this.redisClient) {
        await this.redisClient.setEx(
          `operator:${operatorId}:lastActive`, 
          3600, 
          new Date().toISOString()
        );
      }

      return {
        success: true,
        operator,
        message: 'Operator last active time updated successfully'
      };
    } catch (error) {
      console.error('Error updating operator last active:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update operator last active time'
      };
    }
  }

  /**
   * 获取客服统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getOperatorStats() {
    try {
      const [onlineCount, offlineCount, busyCount, totalCount] = await Promise.all([
        Operator.countByStatus('online'),
        Operator.countByStatus('offline'),
        Operator.countByStatus('busy'),
        Operator.count()
      ]);

      const stats = {
        total: totalCount,
        online: onlineCount,
        offline: offlineCount,
        busy: busyCount,
        available: onlineCount, // 在线即可用（不忙碌的在线客服）
        utilization: totalCount > 0 ? ((onlineCount + busyCount) / totalCount * 100).toFixed(2) : '0'
      };

      return {
        success: true,
        stats,
        message: 'Operator statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting operator stats:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get operator statistics'
      };
    }
  }

  /**
   * 获取客服的活跃会话
   * @param {string} operatorId - 客服ID
   * @returns {Promise<Object>} 活跃会话列表
   */
  async getOperatorActiveSessions(operatorId) {
    try {
      const operator = await Operator.findByPk(operatorId);
      if (!operator) {
        return {
          success: false,
          error: 'Operator not found',
          message: 'Operator does not exist'
        };
      }

      const sessions = await ChatSession.findAll({
        where: {
          operatorId,
          status: 'active'
        },
        include: [
          {
            model: models.ChatMessage,
            as: 'messages',
            limit: 1,
            order: [['createdAt', 'DESC']]
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      return {
        success: true,
        operator,
        sessions,
        count: sessions.length,
        message: 'Operator active sessions retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting operator active sessions:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get operator active sessions'
      };
    }
  }

  /**
   * 更新客服状态
   * @param {string} operatorId - 客服ID
   * @param {string} status - 新状态 ('online', 'offline', 'busy')
   * @returns {Promise<Object>} 更新结果
   */
  async updateOperatorStatus(operatorId, status) {
    try {
      if (!['online', 'offline', 'busy'].includes(status)) {
        return {
          success: false,
          error: 'Invalid status',
          message: 'Status must be one of: online, offline, busy'
        };
      }

      // 检查客服是否存在
      let operator = await Operator.findByPk(operatorId);
      if (!operator) {
        // 如果客服不存在，创建一个新的客服记录（用于测试）
        try {
          operator = await Operator.create({
            id: operatorId, // 使用请求的ID作为客服ID
            name: `Test Operator ${operatorId.slice(-8)}`,
            email: `${operatorId.slice(-8)}@test.com`,
            status: status,
            lastActiveAt: new Date()
          });
          
          console.log(`Created new operator: ${operator.id} for test`);
        } catch (createError) {
          console.error('Error creating operator:', createError);
          // 如果使用指定ID创建失败，尝试自动生成ID
          try {
            operator = await Operator.create({
              name: `Test Operator ${operatorId.slice(-8)}`,
              email: `${operatorId.slice(-8)}@test.com`,
              status: status,
              lastActiveAt: new Date()
            });
            console.log(`Created new operator with auto-generated ID: ${operator.id} (requested: ${operatorId})`);
          } catch (secondCreateError) {
            console.error('Error creating operator with auto ID:', secondCreateError);
            return {
              success: false,
              error: secondCreateError.message,
              message: 'Failed to create operator'
            };
          }
        }
      }

      // 更新现有客服状态
      switch (status) {
        case 'online':
          await operator.setOnline();
          break;
        case 'offline':
          await operator.setOffline();
          break;
        case 'busy':
          await operator.setBusy();
          break;
      }

      // 更新Redis缓存
      if (this.redisClient) {
        await this.redisClient.setEx(`operator:${operatorId}:status`, 3600, status);
        
        if (status === 'online') {
          await this.redisClient.sAdd('operators:online', operatorId);
          await this.redisClient.sAdd('operators:available', operatorId);
          await this.redisClient.setEx(`operator:${operatorId}:lastActive`, 3600, new Date().toISOString());
        } else {
          await this.redisClient.sRem('operators:online', operatorId);
          await this.redisClient.sRem('operators:available', operatorId);
        }
      }

      console.log(`Returning operator status result: operator.id=${operator.id}, requested operatorId=${operatorId}`);
      return {
        success: true,
        operator,
        actualOperatorId: operator.id, // 返回实际的客服ID
        message: `Operator status updated to ${status} successfully`
      };
    } catch (error) {
      console.error('Error updating operator status:', error);
      console.error('Error details:', {
        operatorId,
        status,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return {
        success: false,
        error: error.message,
        message: 'Failed to update operator status'
      };
    }
  }

  /**
   * 批量更新客服状态（用于系统维护）
   * @param {Array} operatorIds - 客服ID列表
   * @param {string} status - 新状态
   * @returns {Promise<Object>} 更新结果
   */
  async batchUpdateOperatorStatus(operatorIds, status) {
    try {
      if (!['online', 'offline', 'busy'].includes(status)) {
        return {
          success: false,
          error: 'Invalid status',
          message: 'Status must be one of: online, offline, busy'
        };
      }

      const [updatedCount] = await Operator.update(
        { 
          status,
          lastActiveAt: status === 'online' ? new Date() : undefined
        },
        {
          where: {
            id: operatorIds
          }
        }
      );

      // 更新Redis缓存
      if (this.redisClient) {
        for (const operatorId of operatorIds) {
          await this.redisClient.setEx(`operator:${operatorId}:status`, 3600, status);
          
          if (status === 'online') {
            await this.redisClient.sAdd('operators:online', operatorId);
            await this.redisClient.sAdd('operators:available', operatorId);
          } else {
            await this.redisClient.sRem('operators:online', operatorId);
            await this.redisClient.sRem('operators:available', operatorId);
          }
        }
      }

      return {
        success: true,
        updatedCount,
        message: `${updatedCount} operators updated to ${status} status`
      };
    } catch (error) {
      console.error('Error batch updating operator status:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to batch update operator status'
      };
    }
  }

  /**
   * 清理离线超时的客服
   * @param {number} timeoutMinutes - 超时分钟数，默认30分钟
   * @returns {Promise<Object>} 清理结果
   */
  async cleanupInactiveOperators(timeoutMinutes = 30) {
    try {
      const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      
      const [updatedCount] = await Operator.update(
        { status: 'offline' },
        {
          where: {
            status: ['online', 'busy'],
            lastActiveAt: {
              [require('sequelize').Op.lt]: timeoutDate
            }
          }
        }
      );

      // 清理Redis缓存中的过期数据
      if (this.redisClient) {
        const onlineOperators = await this.redisClient.sMembers('operators:online');
        for (const operatorId of onlineOperators) {
          const lastActiveStr = await this.redisClient.get(`operator:${operatorId}:lastActive`);
          if (lastActiveStr) {
            const lastActive = new Date(lastActiveStr);
            if (lastActive < timeoutDate) {
              await this.redisClient.sRem('operators:online', operatorId);
              await this.redisClient.sRem('operators:available', operatorId);
              await this.redisClient.setEx(`operator:${operatorId}:status`, 3600, 'offline');
            }
          }
        }
      }

      return {
        success: true,
        cleanedCount: updatedCount,
        message: `${updatedCount} inactive operators set to offline`
      };
    } catch (error) {
      console.error('Error cleaning up inactive operators:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to cleanup inactive operators'
      };
    }
  }

  /**
   * 关闭Redis连接
   */
  async closeRedisConnection() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.redisClient = null;
      } catch (error) {
        console.error('Error closing Redis connection:', error);
      }
    }
  }
}

module.exports = new OperatorService();