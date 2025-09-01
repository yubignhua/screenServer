/**
 * 迁移ChatSession状态枚举
 */

const { sequelize } = require('./models');

async function migrateStatusEnum() {
  try {
    console.log('🔧 开始迁移ChatSession状态枚举...');
    
    // 修改status字段的枚举值
    await sequelize.query(`
      ALTER TABLE chat_sessions 
      MODIFY COLUMN status ENUM('waiting', 'active', 'completed', 'closed', 'timeout', 'cancelled') 
      DEFAULT 'waiting' NOT NULL
    `);
    
    console.log('✅ 状态枚举迁移完成');
    
    // 验证迁移结果
    const [results] = await sequelize.query(`
      SHOW COLUMNS FROM chat_sessions WHERE Field = 'status'
    `);
    
    console.log('📋 当前status字段定义:', results[0]);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 运行迁移
if (require.main === module) {
  migrateStatusEnum();
}

module.exports = { migrateStatusEnum };