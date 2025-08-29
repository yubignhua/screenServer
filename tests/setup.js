const { sequelize } = require('../config/database');
const { models } = require('../models');

// Setup test database
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Test database connection established.');
    
    // Sync database for tests (create tables)
    await sequelize.sync({ force: true });
    console.log('Test database synchronized.');
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    // Close database connection
    await sequelize.close();
    console.log('Test database connection closed.');
  } catch (error) {
    console.error('Error closing test database:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clear all tables
    const models = sequelize.models;
    for (const modelName of Object.keys(models)) {
      await models[modelName].destroy({ where: {}, force: true });
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});