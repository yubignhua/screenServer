/**
 * 关闭活跃会话，将其转为历史记录
 */

const { models } = require('./models');
const { ChatSession, ChatMessage } = models;

async function closeActiveSessions() {
  try {
    console.log('🔄 开始关闭活跃会话...');
    
    // 获取所有活跃会话
    const { Op } = require('sequelize');
    const activeSessions = await ChatSession.findAll({
      where: {
        status: {
          [Op.in]: ['waiting', 'active']
        }
      },
      order: [['updatedAt', 'ASC']] // 按更新时间升序，先关闭最旧的
    });
    
    console.log(`📊 找到 ${activeSessions.length} 个活跃会话`);
    
    if (activeSessions.length === 0) {
      console.log('✅ 没有需要关闭的活跃会话');
      return;
    }
    
    // 关闭超过5分钟没有更新的会话
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let closedCount = 0;
    
    for (const session of activeSessions) {
      const shouldClose = new Date(session.updatedAt) < fiveMinutesAgo;
      
      if (shouldClose) {
        // 检查会话是否有消息交互
        const messageCount = await ChatMessage.count({
          where: { sessionId: session.id }
        });
        
        let newStatus;
        if (messageCount > 1) {
          // 有消息交互，标记为已完成
          newStatus = 'completed';
        } else {
          // 没有消息交互，标记为超时
          newStatus = 'timeout';
        }
        
        // 更新会话状态
        await session.update({
          status: newStatus,
          closedAt: new Date()
        });
        
        // 添加系统消息记录会话关闭
        await ChatMessage.create({
          sessionId: session.id,
          senderId: 'system',
          senderType: 'system',
          content: `Chat session ended - ${newStatus}`,
          messageType: 'system',
          isRead: true
        });
        
        console.log(`✅ 关闭会话 ${session.id} (${session.userId}) - 状态: ${newStatus}`);
        closedCount++;
      } else {
        const minutesAgo = Math.floor((Date.now() - new Date(session.updatedAt).getTime()) / (1000 * 60));
        console.log(`⏳ 保持会话 ${session.id} (${session.userId}) - ${minutesAgo}分钟前更新`);
      }
    }
    
    console.log(`\n🎉 成功关闭 ${closedCount} 个会话`);
    
    // 显示更新后的统计
    console.log('\n📈 更新后的会话状态统计:');
    const statusCounts = await ChatSession.findAll({
      attributes: [
        'status',
        [models.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    statusCounts.forEach(stat => {
      console.log(`   ${stat.status}: ${stat.count} 个`);
    });
    
    // 验证历史会话查询
    console.log('\n🔍 验证历史会话查询...');
    const historySessions = await ChatSession.findAll({
      where: {
        status: {
          [Op.in]: ['completed', 'closed', 'timeout', 'cancelled']
        }
      },
      order: [['updatedAt', 'DESC']],
      limit: 5
    });
    
    console.log(`📋 现在有 ${historySessions.length} 个历史会话可以显示`);
    
    if (historySessions.length > 0) {
      console.log('\n最新的历史会话:');
      historySessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.id} - ${session.status} - ${session.updatedAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 关闭会话失败:', error);
  }
}

// 运行脚本
if (require.main === module) {
  closeActiveSessions().then(() => {
    process.exit(0);
  });
}

module.exports = { closeActiveSessions };