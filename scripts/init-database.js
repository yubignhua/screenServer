#!/usr/bin/env node

/**
 * Database initialization script
 * Usage: node scripts/init-database.js [options]
 * Options:
 *   --force: Drop and recreate all tables
 *   --seed: Add sample data
 *   --test: Test database connection and associations
 */

const { initializeDatabase, testDatabaseConnection, sequelize } = require('../models');

async function main() {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    seedData: args.includes('--seed'),
    testConnection: args.includes('--test')
  };

  try {
    console.log('Starting database initialization...');
    console.log('Options:', options);

    // Initialize database
    await initializeDatabase({
      force: options.force,
      seedData: options.seedData
    });

    // Test connection and associations if requested
    if (options.testConnection) {
      console.log('Testing database connection and associations...');
      await testDatabaseConnection();
    }

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = main;