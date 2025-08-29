#!/usr/bin/env node

/**
 * Test script to verify database and Redis connections
 */

const { initializeConnections, gracefulShutdown } = require('./config');

async function testConnections() {
  console.log('Testing database and Redis connections...\n');
  
  try {
    const { sequelize, redisClient } = await initializeConnections();
    
    console.log('\n✅ Connection test completed successfully!');
    console.log('- Database: Connected');
    console.log(`- Redis: ${redisClient ? 'Connected' : 'Not available (optional)'}`);
    
    // Clean shutdown
    await gracefulShutdown(sequelize, redisClient);
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the test
testConnections();