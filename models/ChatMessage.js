const { DataTypes } = require('sequelize');
const { validate } = require('uuid');

module.exports = (sequelize) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      validate: {
        isUUID: 4
      }
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        isUUID: {
          args: 4,
          msg: 'Session ID must be a valid UUID'
        }
      },
      references: {
        model: 'chat_sessions',
        key: 'id'
      }
    },
    senderId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Sender ID cannot be empty'
        },
        len: {
          args: [1, 255],
          msg: 'Sender ID must be between 1 and 255 characters'
        }
      }
    },
    senderType: {
      type: DataTypes.ENUM('user', 'operator', 'system'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['user', 'operator', 'system']],
          msg: 'Sender type must be one of: user, operator, system'
        }
      }
    },
    groupName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Group name must be between 0 and 100 characters'
        }
      }
    },
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'system'),
      defaultValue: 'text',
      allowNull: false,
      validate: {
        isIn: {
          args: [['text', 'image', 'system']],
          msg: 'Message type must be one of: text, image, system'
        }
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Message content cannot be empty'
        },
        len: {
          args: [1, 10000],
          msg: 'Message content must be between 1 and 10000 characters'
        }
      }
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      validate: {
        isBoolean: {
          msg: 'isRead must be a boolean value'
        }
      }
    }
  }, {
    tableName: 'chat_messages',
    timestamps: true,
    indexes: [
      {
        fields: ['sessionId']
      },
      {
        fields: ['senderId']
      },
      {
        fields: ['senderType']
      },
      {
        fields: ['messageType']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['isRead']
      },
      {
        fields: ['sessionId', 'createdAt']
      }
    ],
    hooks: {
      beforeValidate: (message, options) => {
        // Trim content whitespace
        if (message.content && typeof message.content === 'string') {
          message.content = message.content.trim();
        }
      }
    }
  });

  // Instance methods
  ChatMessage.prototype.markAsRead = function() {
    this.isRead = true;
    return this.save();
  };

  ChatMessage.prototype.isFromUser = function() {
    return this.senderType === 'user';
  };

  ChatMessage.prototype.isFromOperator = function() {
    return this.senderType === 'operator';
  };

  ChatMessage.prototype.isFromSystem = function() {
    return this.senderType === 'system';
  };

  ChatMessage.prototype.isSystemMessage = function() {
    return this.messageType === 'system';
  };

  ChatMessage.prototype.isTextMessage = function() {
    return this.messageType === 'text';
  };

  ChatMessage.prototype.isImageMessage = function() {
    return this.messageType === 'image';
  };

  // Class methods
  ChatMessage.findBySessionId = function(sessionId, options = {}) {
    const defaultOptions = {
      where: { sessionId },
      order: [['createdAt', 'ASC']]
    };
    return this.findAll({ ...defaultOptions, ...options });
  };

  ChatMessage.findUnreadBySessionId = function(sessionId) {
    return this.findAll({
      where: {
        sessionId: sessionId,
        isRead: false
      },
      order: [['createdAt', 'ASC']]
    });
  };

  ChatMessage.countUnreadBySessionId = function(sessionId) {
    return this.count({
      where: {
        sessionId: sessionId,
        isRead: false
      }
    });
  };

  ChatMessage.findRecentBySessionId = function(sessionId, limit = 50) {
    return this.findAll({
      where: { sessionId },
      order: [['createdAt', 'DESC']],
      limit: limit
    });
  };

  ChatMessage.markAllAsReadBySessionId = function(sessionId) {
    return this.update(
      { isRead: true },
      {
        where: {
          sessionId: sessionId,
          isRead: false
        }
      }
    );
  };

  // Define associations (will be called from models/index.js)
  ChatMessage.associate = function(models) {
    ChatMessage.belongsTo(models.ChatSession, {
      foreignKey: 'sessionId',
      as: 'session'
    });
  };

  return ChatMessage;
};