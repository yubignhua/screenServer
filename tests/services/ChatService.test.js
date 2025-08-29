const ChatService = require('../../services/ChatService');
const { models, sequelize } = require('../../models');
const { ChatSession, ChatMessage, Operator } = models;

describe('ChatService', () => {
  let testOperator;
  let testSession;
  let testUserId;

  beforeAll(async () => {
    // Ensure database is synced
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clean up database before each test
    await ChatMessage.destroy({ where: {} });
    await ChatSession.destroy({ where: {} });
    await Operator.destroy({ where: {} });

    // Create test data
    testUserId = 'test-user-123';
    
    testOperator = await Operator.create({
      name: 'Test Operator',
      email: 'test@example.com',
      status: 'online'
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await ChatMessage.destroy({ where: {} });
    await ChatSession.destroy({ where: {} });
    await Operator.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('createChatSession', () => {
    it('should create a new chat session successfully', async () => {
      const result = await ChatService.createChatSession(testUserId);

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe(testUserId);
      expect(result.session.status).toBe('waiting');
      expect(result.message).toBe('New chat session created successfully');
    });

    it('should return existing active session if one exists', async () => {
      // Create an existing session
      const existingSession = await ChatSession.create({
        userId: testUserId,
        status: 'waiting'
      });

      const result = await ChatService.createChatSession(testUserId);

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(false);
      expect(result.session.id).toBe(existingSession.id);
      expect(result.message).toBe('Found existing active session');
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const originalCreate = ChatSession.create;
      ChatSession.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await ChatService.createChatSession(testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.message).toBe('Failed to create chat session');

      // Restore original method
      ChatSession.create = originalCreate;
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      testSession = await ChatSession.create({
        userId: testUserId,
        status: 'waiting'
      });
    });

    it('should send a message successfully', async () => {
      const content = 'Hello, I need help!';
      const result = await ChatService.sendMessage(
        testSession.id,
        testUserId,
        'user',
        content
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.content).toBe(content);
      expect(result.message.senderType).toBe('user');
      expect(result.message.messageType).toBe('text');
      expect(result.messageText).toBe('Message sent successfully');
    });

    it('should activate session when user sends first message', async () => {
      const result = await ChatService.sendMessage(
        testSession.id,
        testUserId,
        'user',
        'First message'
      );

      expect(result.success).toBe(true);
      
      // Reload session to check status
      await testSession.reload();
      expect(testSession.status).toBe('active');
    });

    it('should not send message to non-existent session', async () => {
      const fakeSessionId = 'fake-session-id';
      const result = await ChatService.sendMessage(
        fakeSessionId,
        testUserId,
        'user',
        'Hello'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
      expect(result.message).toBe('Chat session does not exist');
    });

    it('should not send message to closed session', async () => {
      await testSession.close();

      const result = await ChatService.sendMessage(
        testSession.id,
        testUserId,
        'user',
        'Hello'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session closed');
      expect(result.message).toBe('Cannot send message to closed session');
    });

    it('should handle different message types', async () => {
      const result = await ChatService.sendMessage(
        testSession.id,
        'system',
        'system',
        'System message',
        'system'
      );

      expect(result.success).toBe(true);
      expect(result.message.messageType).toBe('system');
      expect(result.message.senderType).toBe('system');
    });
  });

  describe('getMessageHistory', () => {
    beforeEach(async () => {
      testSession = await ChatSession.create({
        userId: testUserId,
        status: 'active'
      });

      // Create test messages with explicit timestamps
      const firstMessageTime = new Date();
      const secondMessageTime = new Date(firstMessageTime.getTime() + 1000); // 1 second later

      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testUserId,
        senderType: 'user',
        content: 'First message',
        messageType: 'text',
        createdAt: firstMessageTime
      });

      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testOperator.id,
        senderType: 'operator',
        content: 'Operator response',
        messageType: 'text',
        createdAt: secondMessageTime
      });
    });

    it('should retrieve message history successfully', async () => {
      const result = await ChatService.getMessageHistory(testSession.id);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('First message');
      expect(result.messages[1].content).toBe('Operator response');
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(2);
    });

    it('should handle pagination correctly', async () => {
      const result = await ChatService.getMessageHistory(testSession.id, {
        limit: 1,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by message type', async () => {
      // Add a system message
      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: 'system',
        senderType: 'system',
        content: 'System message',
        messageType: 'system'
      });

      const result = await ChatService.getMessageHistory(testSession.id, {
        messageType: 'system'
      });

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].messageType).toBe('system');
    });

    it('should not retrieve history for non-existent session', async () => {
      const result = await ChatService.getMessageHistory('fake-session-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('getUserSessions', () => {
    beforeEach(async () => {
      // Create multiple sessions for the user
      testSession = await ChatSession.create({
        userId: testUserId,
        status: 'active'
      });

      await ChatSession.create({
        userId: testUserId,
        status: 'closed'
      });

      await ChatSession.create({
        userId: 'other-user',
        status: 'waiting'
      });
    });

    it('should retrieve user sessions successfully', async () => {
      const result = await ChatService.getUserSessions(testUserId);

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.every(s => s.userId === testUserId)).toBe(true);
    });

    it('should filter sessions by status', async () => {
      const result = await ChatService.getUserSessions(testUserId, {
        status: 'active'
      });

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].status).toBe('active');
    });

    it('should include messages when requested', async () => {
      // Add a message to the session
      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testUserId,
        senderType: 'user',
        content: 'Test message',
        messageType: 'text'
      });

      const result = await ChatService.getUserSessions(testUserId, {
        includeMessages: true
      });

      expect(result.success).toBe(true);
      
      // Find the session with messages
      const sessionWithMessages = result.sessions.find(s => s.messages && s.messages.length > 0);
      expect(sessionWithMessages).toBeDefined();
      expect(sessionWithMessages.messages).toHaveLength(1);
    });
  });

  describe('closeChatSession', () => {
    beforeEach(async () => {
      testSession = await ChatSession.create({
        userId: testUserId,
        status: 'active'
      });
    });

    it('should close session successfully', async () => {
      const result = await ChatService.closeChatSession(testSession.id);

      expect(result.success).toBe(true);
      expect(result.session.status).toBe('closed');
      expect(result.session.closedAt).toBeDefined();
      expect(result.message).toBe('Chat session closed successfully');
    });

    it('should handle already closed session', async () => {
      await testSession.close();

      const result = await ChatService.closeChatSession(testSession.id);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Session was already closed');
    });

    it('should add system message when closedBy is provided', async () => {
      const result = await ChatService.closeChatSession(testSession.id, testOperator.id);

      expect(result.success).toBe(true);

      // Check if system message was added
      const messages = await ChatMessage.findBySessionId(testSession.id);
      const systemMessage = messages.find(m => m.messageType === 'system' && m.senderType === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toBe('Chat session has been closed');
    });

    it('should not close non-existent session', async () => {
      const result = await ChatService.closeChatSession('fake-session-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('assignOperatorToSession', () => {
    beforeEach(async () => {
      testSession = await ChatSession.create({
        userId: testUserId,
        status: 'waiting'
      });
    });

    it('should assign operator to session successfully', async () => {
      const result = await ChatService.assignOperatorToSession(
        testSession.id,
        testOperator.id
      );

      expect(result.success).toBe(true);
      expect(result.session.operatorId).toBe(testOperator.id);
      expect(result.session.status).toBe('active');
      expect(result.operator.id).toBe(testOperator.id);

      // Check if system message was added
      const messages = await ChatMessage.findBySessionId(testSession.id);
      const systemMessage = messages.find(m => m.messageType === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('has joined the chat');
    });

    it('should not assign to non-existent session', async () => {
      const result = await ChatService.assignOperatorToSession(
        'fake-session-id',
        testOperator.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should not assign non-existent operator', async () => {
      const result = await ChatService.assignOperatorToSession(
        testSession.id,
        'fake-operator-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operator not found');
    });

    it('should not assign unavailable operator', async () => {
      await testOperator.setOffline();

      const result = await ChatService.assignOperatorToSession(
        testSession.id,
        testOperator.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operator not available');
    });

    it('should not assign to closed session', async () => {
      await testSession.close();

      const result = await ChatService.assignOperatorToSession(
        testSession.id,
        testOperator.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session closed');
    });
  });

  describe('markMessagesAsRead', () => {
    beforeEach(async () => {
      testSession = await ChatSession.create({
        userId: testUserId,
        status: 'active'
      });

      // Create unread messages
      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testUserId,
        senderType: 'user',
        content: 'Unread message 1',
        isRead: false
      });

      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testUserId,
        senderType: 'user',
        content: 'Unread message 2',
        isRead: false
      });
    });

    it('should mark messages as read successfully', async () => {
      const result = await ChatService.markMessagesAsRead(testSession.id);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.message).toBe('2 messages marked as read');

      // Verify messages are marked as read
      const messages = await ChatMessage.findBySessionId(testSession.id);
      expect(messages.every(m => m.isRead)).toBe(true);
    });

    it('should handle non-existent session', async () => {
      const result = await ChatService.markMessagesAsRead('fake-session-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('getUnreadMessageCount', () => {
    beforeEach(async () => {
      testSession = await ChatSession.create({
        userId: testUserId,
        status: 'active'
      });

      // Create mix of read and unread messages
      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testUserId,
        senderType: 'user',
        content: 'Read message',
        isRead: true
      });

      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testUserId,
        senderType: 'user',
        content: 'Unread message 1',
        isRead: false
      });

      await ChatMessage.create({
        sessionId: testSession.id,
        senderId: testUserId,
        senderType: 'user',
        content: 'Unread message 2',
        isRead: false
      });
    });

    it('should get unread message count successfully', async () => {
      const result = await ChatService.getUnreadMessageCount(testSession.id);

      expect(result.success).toBe(true);
      expect(result.unreadCount).toBe(2);
      expect(result.message).toBe('Unread message count retrieved successfully');
    });

    it('should handle non-existent session', async () => {
      const result = await ChatService.getUnreadMessageCount('fake-session-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });
});