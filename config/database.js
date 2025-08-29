const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const config = {
  development: {
    username: process.env.DB_USER || 'reat_express_yubh',
    password: process.env.DB_PASSWORD || 'Yu1988001@123',
    database: process.env.DB_NAME || 'familyDB',
    host: process.env.DB_HOST || '149.88.88.205',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log,
    dialectOptions: {
      charset: 'utf8mb4',
      connectTimeout: 60000
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USER || 'reat_express_yubh',
    password: process.env.DB_PASSWORD || 'Yu1988001@123',
    database: process.env.DB_NAME_TEST || 'familyDB',
    host: process.env.DB_HOST || '149.88.88.205',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      charset: 'utf8mb4',
      connectTimeout: 60000
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.DB_USER || 'reat_express_yubh',
    password: process.env.DB_PASSWORD || 'Yu1988001@123',
    database: process.env.DB_NAME || 'familyDB',
    host: process.env.DB_HOST || '149.88.88.205',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      charset: 'utf8mb4',
      connectTimeout: 60000
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions,
    pool: dbConfig.pool,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  config
};