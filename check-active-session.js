/**
 * 检查活跃会话的消息详情
 */

const { models } = require('./models');
const { ChatSession, ChatMessage } = models;

async function checkActiveSession() {
  try {
    console.log('🔍 检查活跃会话的消息详情...');
    
    // 获取活跃会话
    const { Op } = require('sequelize');
    const activeSessions = await ChatSession.findAll({
      where: {
        status: { [Op.in]: ['waiting', 'active'] }
      },
      order: [['updatedAt', 'DESC']]
    });
    
    console.log(`📊 找到 ${activeSessions.length} 个活跃会话`);
    
    for (const session of activeSessions) {
      console.log(`\n🔍 会话 ${session.id}:`);
      console.log(`   用户: ${session.userId}`);
      console.log(`   状态: ${session.status}`);
      console.log(`   更新时间: ${session.updatedAt}`);
      
      // 获取所有消息
      const allMessages = await ChatMessage.findAll({
        where: { sessionId: session.id },
        order: [['createdAt', 'ASC']]
      });
      
      console.log(`   总消息数: ${allMessages.length}`);
      
      if (allMessages.length > 0) {
        console.log('   消息列表:');
        allMessages.forEach((msg, index) => {
          console.log(`     ${index + 1}. [${msg.senderType}] ${msg.content} (${msg.createdAt})`);
        });
        
        // 统计非系统消息
        const userMessages = allMessages.filter(msg => msg.senderType !== 'system');
        console.log(`   用户消息数: ${userMessages.length}`);
        
        if (userMessages.length > 0) {
          console.log('   ✅ 这个会话应该出现在历史记录中');
        } else {
          console.log('   ❌ 这个会话只有系统消息，不会出现在历史记录中');
        }
      } else {
        console.log('   ❌ 这个会话没有任何消息');
      }
    }
    
    // 测试历史会话查询是否包含活跃会话
    console.log('\n🧪 测试历史会话查询...');
    
    const historySessions = await ChatSession.findAll({
      where: {},
      order: [['updatedAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: ChatMessage,
          as: 'messages',
          attributes: ['id', 'content', 'createdAt', 'senderType'],
          limit: 1,
          order: [['createdAt', 'DESC']],
          required: true // 只查询有消息的会话
        }
      ]
    });
    
    console.log(`📋 历史会话查询结果: ${historySessions.length} 个会话`);
    
    historySessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.id.slice(-8)} - ${session.status} - ${session.userId}`);
    });
    
    // 检查活跃会话是否在历史查询结果中
    const activeInHistory = historySessions.filter(s => ['waiting', 'active'].includes(s.status));
    console.log(`\n⚡ 历史查询中的活跃会话: ${activeInHistory.length} 个`);
    
    if (activeInHistory.length > 0) {
      activeInHistory.forEach(session => {
        console.log(`   ${session.id.slice(-8)} - ${session.status} - ${session.userId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 运行检查
if (require.main === module) {
  checkActiveSession().then(() => {
    process.exit(0);
  });
}

module.exports = { checkActiveSession };