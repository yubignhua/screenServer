const { models } = require('../../models');
const ChatSession = models.ChatSession;
const ChatMessage = models.ChatMessage;

describe('ChatMessage Model', () => {
  let testSession;

  beforeEach(async () => {
    // Clean up existing data
    await ChatMessage.destroy({ where: {}, force: true });
    await ChatSession.destroy({ where: {}, force: true });

    // Create a test session for message tests
    testSession = await ChatSession.create({
      userId: 'test-user-123',
      status: 'active'
    });
  });

  describe('Model Creation', () => {
    test('should create a ChatMessage with valid data', async () => {
      const messageData = {
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        messageType: 'text',
        content: 'Hello, I need help!'
      };

      const message = await ChatMessage.create(messageData);

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.sessionId).toBe(testSession.id);
      expect(message.senderId).toBe('test-user-123');
      expect(message.senderType).toBe('user');
      expect(message.messageType).toBe('text');
      expect(message.content).toBe('Hello, I need help!');
      expect(message.isRead).toBe(false);
      expect(message.createdAt).toBeDefined();
      expect(message.updatedAt).toBeDefined();
    });

    test('should generate UUID for id field', async () => {
      const message = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: 'Test message'
      });

      expect(message.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should set default messageType to text', async () => {
      const message = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: 'Test message'
      });

      expect(message.messageType).toBe('text');
    });

    test('should set default isRead to false', async () => {
      const message = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: 'Test message'
      });

      expect(message.isRead).toBe(false);
    });
  });

  describe('Validation', () => {
    test('should require sessionId', async () => {
      await expect(ChatMessage.create({
        senderId: 'test-user-123',
        senderType: 'user',
        content: 'Test message'
      })).rejects.toThrow();
    });

    test('should validate sessionId as UUID', async () => {
      await expect(ChatMessage.create({
        sessionId: 'invalid-uuid',
        senderId: 'test-user-123',
        senderType: 'user',
        content: 'Test message'
      })).rejects.toThrow('Session ID must be a valid UUID');
    });

    test('should require senderId', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderType: 'user',
        content: 'Test message'
      })).rejects.toThrow();
    });

    test('should not allow empty senderId', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: '',
        senderType: 'user',
        content: 'Test message'
      })).rejects.toThrow('Sender ID cannot be empty');
    });

    test('should not allow senderId longer than 255 characters', async () => {
      const longSenderId = 'a'.repeat(256);
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: longSenderId,
        senderType: 'user',
        content: 'Test message'
      })).rejects.toThrow();
    });

    test('should require senderType', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        content: 'Test message'
      })).rejects.toThrow();
    });

    test('should validate senderType enum values', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'invalid-type',
        content: 'Test message'
      })).rejects.toThrow('Sender type must be either user or operator');
    });

    test('should allow valid senderType values', async () => {
      const validSenderTypes = ['user', 'operator'];
      
      for (const senderType of validSenderTypes) {
        const message = await ChatMessage.create({
          sessionId: testSession.id,
          senderId: `test-${senderType}-123`,
          senderType: senderType,
          content: `Test message from ${senderType}`
        });
        expect(message.senderType).toBe(senderType);
      }
    });

    test('should validate messageType enum values', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        messageType: 'invalid-type',
        content: 'Test message'
      })).rejects.toThrow('Message type must be one of: text, image, system');
    });

    test('should allow valid messageType values', async () => {
      const validMessageTypes = ['text', 'image', 'system'];
      
      for (const messageType of validMessageTypes) {
        const message = await ChatMessage.create({
          sessionId: testSession.id,
          senderId: 'test-user-123',
          senderType: 'user',
          messageType: messageType,
          content: `Test ${messageType} message`
        });
        expect(message.messageType).toBe(messageType);
      }
    });

    test('should require content', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user'
      })).rejects.toThrow();
    });

    test('should not allow empty content', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: ''
      })).rejects.toThrow('Message content cannot be empty');
    });

    test('should not allow content longer than 10000 characters', async () => {
      const longContent = 'a'.repeat(10001);
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: longContent
      })).rejects.toThrow();
    });

    test('should validate isRead as boolean', async () => {
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: 'Test message',
        isRead: 'not-a-boolean'
      })).rejects.toThrow();
    });
  });

  describe('Hooks', () => {
    test('should trim content whitespace before validation', async () => {
      const message = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: '  Hello, I need help!  '
      });

      expect(message.content).toBe('Hello, I need help!');
    });

    test('should handle null content gracefully in hook', async () => {
      // This should fail validation, but hook shouldn't crash
      await expect(ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: null
      })).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let message;

    beforeEach(async () => {
      message = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        messageType: 'text',
        content: 'Test message',
        isRead: false
      });
    });

    test('markAsRead() should set isRead to true', async () => {
      expect(message.isRead).toBe(false);
      
      await message.markAsRead();
      
      expect(message.isRead).toBe(true);
    });

    test('isFromUser() should return correct boolean', async () => {
      expect(message.isFromUser()).toBe(true);
      
      const operatorMessage = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'operator-123',
        senderType: 'operator',
        content: 'Operator response'
      });
      
      expect(operatorMessage.isFromUser()).toBe(false);
    });

    test('isFromOperator() should return correct boolean', async () => {
      expect(message.isFromOperator()).toBe(false);
      
      const operatorMessage = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'operator-123',
        senderType: 'operator',
        content: 'Operator response'
      });
      
      expect(operatorMessage.isFromOperator()).toBe(true);
    });

    test('isSystemMessage() should return correct boolean', async () => {
      expect(message.isSystemMessage()).toBe(false);
      
      const systemMessage = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'system',
        senderType: 'operator',
        messageType: 'system',
        content: 'User joined the chat'
      });
      
      expect(systemMessage.isSystemMessage()).toBe(true);
    });

    test('isTextMessage() should return correct boolean', async () => {
      expect(message.isTextMessage()).toBe(true);
      
      const imageMessage = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        messageType: 'image',
        content: 'image-url.jpg'
      });
      
      expect(imageMessage.isTextMessage()).toBe(false);
    });

    test('isImageMessage() should return correct boolean', async () => {
      expect(message.isImageMessage()).toBe(false);
      
      const imageMessage = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        messageType: 'image',
        content: 'image-url.jpg'
      });
      
      expect(imageMessage.isImageMessage()).toBe(true);
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      // Create test messages with explicit timestamps to ensure order
      const now = new Date();
      const messages = [
        {
          sessionId: testSession.id,
          senderId: 'user-123',
          senderType: 'user',
          content: 'First message',
          isRead: false,
          createdAt: new Date(now.getTime() - 2000), // 2 seconds ago
          updatedAt: new Date(now.getTime() - 2000)
        },
        {
          sessionId: testSession.id,
          senderId: 'operator-123',
          senderType: 'operator',
          content: 'Operator response',
          isRead: true,
          createdAt: new Date(now.getTime() - 1000), // 1 second ago
          updatedAt: new Date(now.getTime() - 1000)
        },
        {
          sessionId: testSession.id,
          senderId: 'user-123',
          senderType: 'user',
          content: 'Second message',
          isRead: false,
          createdAt: now, // now
          updatedAt: now
        }
      ];

      await ChatMessage.bulkCreate(messages);
    });

    test('findBySessionId() should return messages for session in chronological order', async () => {
      const messages = await ChatMessage.findBySessionId(testSession.id);
      
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Operator response');
      expect(messages[2].content).toBe('Second message');
    });

    test('findBySessionId() should accept additional options', async () => {
      const messages = await ChatMessage.findBySessionId(testSession.id, {
        limit: 2
      });
      
      expect(messages).toHaveLength(2);
    });

    test('findUnreadBySessionId() should return only unread messages', async () => {
      const unreadMessages = await ChatMessage.findUnreadBySessionId(testSession.id);
      
      expect(unreadMessages).toHaveLength(2);
      expect(unreadMessages.every(msg => !msg.isRead)).toBe(true);
    });

    test('countUnreadBySessionId() should return correct count', async () => {
      const count = await ChatMessage.countUnreadBySessionId(testSession.id);
      
      expect(count).toBe(2);
    });

    test('findRecentBySessionId() should return messages in reverse chronological order', async () => {
      const recentMessages = await ChatMessage.findRecentBySessionId(testSession.id, 2);
      
      expect(recentMessages).toHaveLength(2);
      expect(recentMessages[0].content).toBe('Second message');
      expect(recentMessages[1].content).toBe('Operator response');
    });

    test('findRecentBySessionId() should use default limit of 50', async () => {
      const recentMessages = await ChatMessage.findRecentBySessionId(testSession.id);
      
      expect(recentMessages).toHaveLength(3);
    });

    test('markAllAsReadBySessionId() should mark all unread messages as read', async () => {
      const initialUnreadCount = await ChatMessage.countUnreadBySessionId(testSession.id);
      expect(initialUnreadCount).toBe(2);
      
      const updatedCount = await ChatMessage.markAllAsReadBySessionId(testSession.id);
      expect(updatedCount[0]).toBe(2); // Number of affected rows
      
      const finalUnreadCount = await ChatMessage.countUnreadBySessionId(testSession.id);
      expect(finalUnreadCount).toBe(0);
    });
  });

  describe('Associations', () => {
    test('should belong to ChatSession', async () => {
      const message = await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'test-user-123',
        senderType: 'user',
        content: 'Test message'
      });

      const messageWithSession = await ChatMessage.findByPk(message.id, {
        include: [{ model: ChatSession, as: 'session' }]
      });

      expect(messageWithSession.session).toBeDefined();
      expect(messageWithSession.session.id).toBe(testSession.id);
      expect(messageWithSession.session.userId).toBe(testSession.userId);
    });

    test('ChatSession should have many ChatMessages', async () => {
      const now = new Date();
      await ChatMessage.bulkCreate([
        {
          sessionId: testSession.id,
          senderId: 'user-123',
          senderType: 'user',
          content: 'Message 1',
          createdAt: new Date(now.getTime() - 1000),
          updatedAt: new Date(now.getTime() - 1000)
        },
        {
          sessionId: testSession.id,
          senderId: 'user-123',
          senderType: 'user',
          content: 'Message 2',
          createdAt: now,
          updatedAt: now
        }
      ]);

      const sessionWithMessages = await ChatSession.findByPk(testSession.id, {
        include: [{ 
          model: ChatMessage, 
          as: 'messages'
        }],
        order: [[{ model: ChatMessage, as: 'messages' }, 'createdAt', 'ASC']]
      });

      expect(sessionWithMessages.messages).toBeDefined();
      expect(sessionWithMessages.messages).toHaveLength(2);
      expect(sessionWithMessages.messages[0].content).toBe('Message 1');
      expect(sessionWithMessages.messages[1].content).toBe('Message 2');
    });
  });

  describe('Database Indexes', () => {
    test('should query by sessionId efficiently', async () => {
      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'indexed-user-123',
        senderType: 'user',
        content: 'Indexed message'
      });

      const messages = await ChatMessage.findAll({
        where: { sessionId: testSession.id }
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Indexed message');
    });

    test('should query by senderId efficiently', async () => {
      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'indexed-sender-123',
        senderType: 'user',
        content: 'Message from indexed sender'
      });

      const messages = await ChatMessage.findAll({
        where: { senderId: 'indexed-sender-123' }
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].senderId).toBe('indexed-sender-123');
    });

    test('should query by senderType efficiently', async () => {
      await ChatMessage.bulkCreate([
        {
          sessionId: testSession.id,
          senderId: 'user-123',
          senderType: 'user',
          content: 'User message'
        },
        {
          sessionId: testSession.id,
          senderId: 'operator-123',
          senderType: 'operator',
          content: 'Operator message'
        }
      ]);

      const userMessages = await ChatMessage.findAll({
        where: { senderType: 'user' }
      });

      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].senderType).toBe('user');
    });

    test('should query by composite index (sessionId, createdAt) efficiently', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'user-123',
        senderType: 'user',
        content: 'Recent message',
        createdAt: now
      });

      const recentMessages = await ChatMessage.findAll({
        where: {
          sessionId: testSession.id,
          createdAt: {
            [require('sequelize').Op.gte]: oneHourAgo
          }
        }
      });

      expect(recentMessages).toHaveLength(1);
      expect(recentMessages[0].content).toBe('Recent message');
    });
  });
});