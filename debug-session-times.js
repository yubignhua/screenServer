/**
 * 调试会话时间排序
 */

const { models } = require('./models');
const { ChatSession, ChatMessage } = models;

async function debugSessionTimes() {
  try {
    console.log('🔍 调试会话时间排序...');
    
    // 获取最新的10个会话（包括活跃会话）
    const { Op } = require('sequelize');
    
    console.log('\n📊 最新的10个会话（所有状态）:');
    const allSessions = await ChatSession.findAll({
      order: [['updatedAt', 'DESC']],
      limit: 10
    });
    
    allSessions.forEach((session, index) => {
      const updateTime = new Date(session.updatedAt);
      console.log(`${index + 1}. ${session.id.slice(-8)} - ${session.status} - ${updateTime.toLocaleString()}`);
    });
    
    // 检查有用户消息的会话
    console.log('\n💬 有用户消息的会话:');
    const sessionIdsWithUserMessages = await ChatMessage.findAll({
      attributes: ['sessionId'],
      where: {
        senderType: { [Op.ne]: 'system' }
      },
      group: ['sessionId'],
      raw: true
    });
    
    const sessionIds = sessionIdsWithUserMessages.map(item => item.sessionId);
    console.log(`总共有 ${sessionIds.length} 个会话有用户消息`);
    
    // 检查活跃会话是否在有用户消息的列表中
    const activeSession = allSessions.find(s => s.status === 'active');
    if (activeSession) {
      const hasUserMessages = sessionIds.includes(activeSession.id);
      console.log(`\n⚡ 活跃会话 ${activeSession.id.slice(-8)}:`);
      console.log(`   状态: ${activeSession.status}`);
      console.log(`   更新时间: ${activeSession.updatedAt.toLocaleString()}`);
      console.log(`   有用户消息: ${hasUserMessages ? '是' : '否'}`);
      
      if (hasUserMessages) {
        // 获取用户消息数量
        const userMessageCount = await ChatMessage.count({
          where: {
            sessionId: activeSession.id,
            senderType: { [Op.ne]: 'system' }
          }
        });
        console.log(`   用户消息数: ${userMessageCount}`);
      }
    }
    
    // 测试历史会话查询的实际SQL
    console.log('\n🔍 测试历史会话查询逻辑...');
    
    const whereConditions = {};
    whereConditions.id = { [Op.in]: sessionIds };
    
    const historySessions = await ChatSession.findAll({
      where: whereConditions,
      order: [['updatedAt', 'DESC']],
      limit: 5
    });
    
    console.log('历史会话查询结果:');
    historySessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.id.slice(-8)} - ${session.status} - ${session.updatedAt.toLocaleString()}`);
    });
    
    // 检查活跃会话是否在历史查询结果中
    const activeInHistory = historySessions.find(s => s.status === 'active');
    if (activeInHistory) {
      console.log(`\n✅ 活跃会话在历史查询结果中: ${activeInHistory.id.slice(-8)}`);
    } else {
      console.log('\n❌ 活跃会话不在历史查询结果中');
      
      // 检查为什么不在
      if (activeSession && sessionIds.includes(activeSession.id)) {
        console.log('   - 活跃会话有用户消息，但不在查询结果中');
        console.log('   - 可能是排序或分页问题');
        
        // 检查活跃会话在所有有用户消息的会话中的排名
        const allWithUserMessages = await ChatSession.findAll({
          where: { id: { [Op.in]: sessionIds } },
          order: [['updatedAt', 'DESC']]
        });
        
        const activeIndex = allWithUserMessages.findIndex(s => s.id === activeSession.id);
        console.log(`   - 活跃会话在所有有用户消息的会话中排第 ${activeIndex + 1} 位`);
      }
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

// 运行调试
if (require.main === module) {
  debugSessionTimes().then(() => {
    process.exit(0);
  });
}

module.exports = { debugSessionTimes };