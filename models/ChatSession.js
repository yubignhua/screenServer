const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatSession = sequelize.define('ChatSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      validate: {
        isUUID: 4
      }
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'User ID cannot be empty'
        },
        len: {
          args: [1, 255],
          msg: 'User ID must be between 1 and 255 characters'
        }
      }
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'User name must be between 0 and 100 characters'
        }
      }
    },
    operatorId: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: {
          args: 4,
          msg: 'Operator ID must be a valid UUID'
        }
      }
      // Note: Foreign key reference will be added when Operator model is created
    },
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'completed', 'closed', 'timeout', 'cancelled'),
      defaultValue: 'waiting',
      allowNull: false,
      validate: {
        isIn: {
          args: [['waiting', 'active', 'completed', 'closed', 'timeout', 'cancelled']],
          msg: 'Status must be one of: waiting, active, completed, closed, timeout, cancelled'
        }
      }
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'Closed at must be a valid date'
        },
        isAfterCreation(value) {
          if (value && this.createdAt && value < this.createdAt) {
            throw new Error('Closed at cannot be before creation date');
          }
        }
      }
    }
  }, {
    tableName: 'chat_sessions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['operatorId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeUpdate: (session, options) => {
        // Automatically set closedAt when status changes to closed
        if (session.changed('status') && session.status === 'closed' && !session.closedAt) {
          session.closedAt = new Date();
        }
      }
    }
  });

  // Instance methods
  ChatSession.prototype.close = function() {
    this.status = 'closed';
    this.closedAt = new Date();
    return this.save();
  };

  ChatSession.prototype.activate = function() {
    this.status = 'active';
    return this.save();
  };

  ChatSession.prototype.isActive = function() {
    return this.status === 'active';
  };

  ChatSession.prototype.isClosed = function() {
    return this.status === 'closed';
  };

  ChatSession.prototype.isWaiting = function() {
    return this.status === 'waiting';
  };

  // Class methods
  ChatSession.findActiveByUserId = function(userId) {
    return this.findOne({
      where: {
        userId: userId,
        status: ['waiting', 'active']
      },
      order: [['createdAt', 'DESC']]
    });
  };

  ChatSession.findByOperatorId = function(operatorId) {
    return this.findAll({
      where: {
        operatorId: operatorId,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
  };

  ChatSession.countActiveSessionsByOperator = function(operatorId) {
    return this.count({
      where: {
        operatorId: operatorId,
        status: 'active'
      }
    });
  };

  // Define associations (will be called from models/index.js)
  ChatSession.associate = function(models) {
    ChatSession.hasMany(models.ChatMessage, { 
      foreignKey: 'sessionId',
      as: 'messages'
    });
    ChatSession.belongsTo(models.Operator, { 
      foreignKey: 'operatorId',
      as: 'operator'
    });
  };

  return ChatSession;
};