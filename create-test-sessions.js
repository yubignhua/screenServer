/**
 * 创建测试会话数据
 */

const { models } = require('./models');
const { ChatSession, ChatMessage, Operator } = models;
const { v4: uuidv4 } = require('uuid');

async function createTestSessions() {
  try {
    console.log('🔧 创建测试会话数据...');
    
    // 生成有效的UUID
    const operatorId1 = uuidv4();
    const operatorId2 = uuidv4();
    
    // 先创建操作员记录
    await Operator.create({
      id: operatorId1,
      name: '客服001',
      email: 'operator001@example.com',
      status: 'online'
    });
    
    await Operator.create({
      id: operatorId2,
      name: '客服002',
      email: 'operator002@example.com', 
      status: 'online'
    });
    
    console.log('✅ 创建操作员记录完成');
    
    // 创建一些历史会话
    const testSessions = [
      {
        userId: 'user_001',
        status: 'completed',
        operatorId: operatorId1
      },
      {
        userId: 'user_002', 
        status: 'closed',
        operatorId: operatorId2
      },
      {
        userId: 'user_003',
        status: 'timeout',
        operatorId: null
      },
      {
        userId: 'user_004',
        status: 'cancelled',
        operatorId: null
      },
      {
        userId: 'user_005',
        status: 'completed',
        operatorId: operatorId1
      }
    ];
    
    // 创建会话
    for (let i = 0; i < testSessions.length; i++) {
      const sessionData = testSessions[i];
      const createdAt = new Date(Date.now() - (i + 5) * 60 * 60 * 1000); // 至少5小时前创建
      const closedAt = new Date(createdAt.getTime() + 30 * 60 * 1000); // 创建后30分钟关闭
      
      const session = await ChatSession.create({
        ...sessionData,
        createdAt: createdAt,
        updatedAt: closedAt,
        closedAt: closedAt
      });
      
      // 为每个会话创建一些测试消息
      const messages = [
        {
          sessionId: session.id,
          senderId: sessionData.userId,
          senderType: 'user',
          content: `你好，我是用户 ${sessionData.userId}，需要帮助`,
          messageType: 'text',
          createdAt: session.createdAt
        },
        {
          sessionId: session.id,
          senderId: sessionData.operatorId || 'system',
          senderType: sessionData.operatorId ? 'operator' : 'system',
          content: sessionData.operatorId ? '您好，我是客服，有什么可以帮助您的吗？' : '系统消息：会话已自动处理',
          messageType: 'text',
          createdAt: new Date(session.createdAt.getTime() + 60000) // 1分钟后
        },
        {
          sessionId: session.id,
          senderId: sessionData.userId,
          senderType: 'user',
          content: '谢谢您的帮助！',
          messageType: 'text',
          createdAt: new Date(session.createdAt.getTime() + 120000) // 2分钟后
        }
      ];
      
      for (const messageData of messages) {
        await ChatMessage.create(messageData);
      }
      
      console.log(`✅ 创建会话 ${session.id} (状态: ${session.status})`);
    }
    
    // 创建一些活跃会话用于对比
    const activeSessions = [
      {
        userId: 'user_active_001',
        status: 'waiting'
      },
      {
        userId: 'user_active_002', 
        status: 'active',
        operatorId: operatorId1
      }
    ];
    
    for (const sessionData of activeSessions) {
      const session = await ChatSession.create(sessionData);
      
      await ChatMessage.create({
        sessionId: session.id,
        senderId: sessionData.userId,
        senderType: 'user',
        content: `你好，我需要帮助`,
        messageType: 'text'
      });
      
      console.log(`✅ 创建活跃会话 ${session.id} (状态: ${session.status})`);
    }
    
    console.log('\n🎉 测试数据创建完成！');
    console.log(`- 历史会话: ${testSessions.length} 个`);
    console.log(`- 活跃会话: ${activeSessions.length} 个`);
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  }
}

// 运行脚本
if (require.main === module) {
  createTestSessions().then(() => {
    process.exit(0);
  });
}

module.exports = { createTestSessions };