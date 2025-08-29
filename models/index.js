const { sequelize } = require('../config/database');
const ChatSession = require('./ChatSession');
const ChatMessage = require('./ChatMessage');
const Operator = require('./Operator');

// Initialize models
const models = {
  ChatSession: ChatSession(sequelize),
  ChatMessage: ChatMessage(sequelize),
  Operator: Operator(sequelize)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Sync database (create tables if they don't exist)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

// Initialize database with sample data (for development/testing)
const initializeDatabase = async (options = {}) => {
  const { force = false, seedData = false } = options;
  
  try {
    // Sync database
    await syncDatabase(force);
    
    // Seed with sample data if requested
    if (seedData) {
      await seedSampleData();
    }
    
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Seed sample data for development/testing
const seedSampleData = async () => {
  try {
    // Create sample operators
    const operator1 = await models.Operator.findOrCreate({
      where: { email: 'operator1@example.com' },
      defaults: {
        name: 'Alice Johnson',
        email: 'operator1@example.com',
        status: 'online'
      }
    });

    const operator2 = await models.Operator.findOrCreate({
      where: { email: 'operator2@example.com' },
      defaults: {
        name: 'Bob Smith',
        email: 'operator2@example.com',
        status: 'offline'
      }
    });

    console.log('Sample data seeded successfully.');
  } catch (error) {
    console.error('Error seeding sample data:', error);
    throw error;
  }
};

// Test database connection and associations
const testDatabaseConnection = async () => {
  try {
    // Test basic connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Test model associations by creating related records
    const testOperator = await models.Operator.create({
      name: 'Test Operator',
      email: `test-${Date.now()}@example.com`,
      status: 'online'
    });

    const testSession = await models.ChatSession.create({
      userId: 'test-user-123',
      operatorId: testOperator.id,
      status: 'active'
    });

    const testMessage = await models.ChatMessage.create({
      sessionId: testSession.id,
      senderId: 'test-user-123',
      senderType: 'user',
      messageType: 'text',
      content: 'Test message for association verification'
    });

    // Test associations by fetching related data
    const sessionWithMessages = await models.ChatSession.findByPk(testSession.id, {
      include: [
        { model: models.ChatMessage, as: 'messages' },
        { model: models.Operator, as: 'operator' }
      ]
    });

    const operatorWithSessions = await models.Operator.findByPk(testOperator.id, {
      include: [{ model: models.ChatSession, as: 'sessions' }]
    });

    // Verify associations work
    if (sessionWithMessages.messages.length > 0 && 
        sessionWithMessages.operator && 
        operatorWithSessions.sessions.length > 0) {
      console.log('Database associations verified successfully.');
    } else {
      throw new Error('Database associations verification failed.');
    }

    // Clean up test data
    await testMessage.destroy();
    await testSession.destroy();
    await testOperator.destroy();

    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  models,
  syncDatabase,
  initializeDatabase,
  seedSampleData,
  testDatabaseConnection,
  ...models
};