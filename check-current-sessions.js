/**
 * 检查当前会话状态
 */

const { models } = require('./models');
const { ChatSession, ChatMessage } = models;

async function checkCurrentSessions() {
  try {
    console.log('🔍 检查当前会话状态...');
    
    // 获取所有会话的状态统计
    const { Op } = require('sequelize');
    
    const allSessions = await ChatSession.findAll({
      attributes: ['id', 'userId', 'status', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 20
    });
    
    console.log(`\n📊 最近的 ${allSessions.length} 个会话:`);
    
    for (const session of allSessions) {
      // 获取消息数量
      const messageCount = await ChatMessage.count({
        where: { sessionId: session.id }
      });
      
      const userMessageCount = await ChatMessage.count({
        where: { 
          sessionId: session.id,
          senderType: { [Op.ne]: 'system' }
        }
      });
      
      console.log(`${session.id.slice(-8)} - ${session.status} - ${session.userId} - 消息:${messageCount}(用户:${userMessageCount}) - ${session.updatedAt}`);
    }
    
    // 统计各状态的会话数量
    console.log('\n📈 会话状态统计:');
    const statusStats = await ChatSession.findAll({
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    statusStats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat.count} 个`);
    });
    
    // 统计有消息的会话
    console.log('\n💬 消息统计:');
    const sessionsWithMessages = await ChatSession.count({
      include: [
        {
          model: ChatMessage,
          as: 'messages',
          required: true
        }
      ]
    });
    
    const sessionsWithUserMessages = await ChatSession.count({
      include: [
        {
          model: ChatMessage,
          as: 'messages',
          where: {
            senderType: { [Op.ne]: 'system' }
          },
          required: true
        }
      ]
    });
    
    console.log(`   有消息的会话: ${sessionsWithMessages} 个`);
    console.log(`   有用户消息的会话: ${sessionsWithUserMessages} 个`);
    
    // 检查最新的活跃会话
    console.log('\n⚡ 当前活跃会话:');
    const activeSessions = await ChatSession.findAll({
      where: {
        status: { [Op.in]: ['waiting', 'active'] }
      },
      order: [['updatedAt', 'DESC']],
      limit: 5
    });
    
    if (activeSessions.length > 0) {
      for (const session of activeSessions) {
        const messageCount = await ChatMessage.count({
          where: { 
            sessionId: session.id,
            senderType: { [Op.ne]: 'system' }
          }
        });
        
        const timeDiff = Date.now() - new Date(session.updatedAt).getTime();
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        
        console.log(`   ${session.id.slice(-8)} - ${session.status} - ${session.userId} - ${messageCount}条消息 - ${minutesAgo}分钟前`);
      }
    } else {
      console.log('   无活跃会话');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 运行检查
if (require.main === module) {
  checkCurrentSessions().then(() => {
    process.exit(0);
  });
}

module.exports = { checkCurrentSessions };