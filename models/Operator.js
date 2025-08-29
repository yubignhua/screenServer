const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Operator = sequelize.define('Operator', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      validate: {
        isUUID: 4
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Name cannot be empty'
        },
        len: {
          args: [1, 100],
          msg: 'Name must be between 1 and 100 characters'
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address'
        },
        notEmpty: {
          msg: 'Email cannot be empty'
        },
        len: {
          args: [1, 255],
          msg: 'Email must be between 1 and 255 characters'
        }
      }
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'busy'),
      defaultValue: 'offline',
      allowNull: false,
      validate: {
        isIn: {
          args: [['online', 'offline', 'busy']],
          msg: 'Status must be one of: online, offline, busy'
        }
      }
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Last active at must be a valid date'
        }
      }
    }
  }, {
    tableName: 'operators',
    timestamps: true,
    indexes: [
      {
        fields: ['email'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['lastActiveAt']
      },
      {
        fields: ['status', 'lastActiveAt']
      }
    ],
    hooks: {
      beforeValidate: (operator, options) => {
        // Normalize email to lowercase and trim
        if (operator.email) {
          operator.email = operator.email.toLowerCase().trim();
        }
        // Trim name
        if (operator.name) {
          operator.name = operator.name.trim();
        }
      },
      beforeUpdate: (operator, options) => {
        // Update lastActiveAt when status changes to online
        if (operator.changed('status') && operator.status === 'online') {
          operator.lastActiveAt = new Date();
        }
      }
    }
  });

  // Instance methods
  Operator.prototype.setOnline = function() {
    this.status = 'online';
    this.lastActiveAt = new Date();
    return this.save();
  };

  Operator.prototype.setOffline = function() {
    this.status = 'offline';
    return this.save();
  };

  Operator.prototype.setBusy = function() {
    this.status = 'busy';
    this.lastActiveAt = new Date();
    return this.save();
  };

  Operator.prototype.isOnline = function() {
    return this.status === 'online';
  };

  Operator.prototype.isOffline = function() {
    return this.status === 'offline';
  };

  Operator.prototype.isBusy = function() {
    return this.status === 'busy';
  };

  Operator.prototype.isAvailable = function() {
    return this.status === 'online';
  };

  Operator.prototype.updateLastActive = function() {
    this.lastActiveAt = new Date();
    return this.save();
  };

  // Class methods
  Operator.findOnline = function() {
    return this.findAll({
      where: {
        status: 'online'
      },
      order: [['lastActiveAt', 'DESC']]
    });
  };

  Operator.findAvailable = function() {
    return this.findAll({
      where: {
        status: 'online'
      },
      order: [['lastActiveAt', 'DESC']]
    });
  };

  Operator.findByEmail = function(email) {
    return this.findOne({
      where: {
        email: email.toLowerCase().trim()
      }
    });
  };

  Operator.countOnline = function() {
    return this.count({
      where: {
        status: 'online'
      }
    });
  };

  Operator.countByStatus = function(status) {
    return this.count({
      where: {
        status: status
      }
    });
  };

  Operator.findMostRecentlyActive = function(limit = 10) {
    return this.findAll({
      order: [['lastActiveAt', 'DESC']],
      limit: limit
    });
  };

  // Define associations (will be called from models/index.js)
  Operator.associate = function(models) {
    Operator.hasMany(models.ChatSession, {
      foreignKey: 'operatorId',
      as: 'sessions'
    });
  };

  return Operator;
};