const request = require('supertest');
const express = require('express');
const chatRouter = require('../../routes/chat');
const ChatService = require('../../services/ChatService');

// Mock ChatService
jest.mock('../../services/ChatService');

const app = express();
app.use(express.json());
app.use('/api/chat', chatRouter);

describe('Chat Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/chat/sessions/:userId', () => {
    it('should get user sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          status: 'active',
          createdAt: new Date()
        }
      ];

      ChatService.getUserSessions.mockResolvedValue({
        success: true,
        sessions: mockSessions,
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
        message: 'Sessions retrieved successfully'
      });

      const response = await request(app)
        .get('/api/chat/sessions/user-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.sessions[0]).toMatchObject({
        id: 'session-1',
        userId: 'user-1',
        status: 'active'
      });
      expect(typeof response.body.data.sessions[0].createdAt).toBe('string');
      expect(ChatService.getUserSessions).toHaveBeenCalledWith('user-1', {
        includeMessages: false,
        includeOperator: false,
        status: null,
        limit: 10,
        offset: 0
      });
    });

    it('should handle missing userId', async () => {
      const response = await request(app)
        .get('/api/chat/sessions/')
        .expect(404);

      expect(ChatService.getUserSessions).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      ChatService.getUserSessions.mockResolvedValue({
        success: false,
        error: 'Database error',
        message: 'Failed to retrieve sessions'
      });

      const response = await request(app)
        .get('/api/chat/sessions/user-1')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_RETRIEVAL_FAILED');
    });

    it('should handle query parameters correctly', async () => {
      ChatService.getUserSessions.mockResolvedValue({
        success: true,
        sessions: [],
        pagination: { total: 0, limit: 5, offset: 10, hasMore: false },
        message: 'Sessions retrieved successfully'
      });

      await request(app)
        .get('/api/chat/sessions/user-1?includeMessages=true&includeOperator=true&status=active&limit=5&offset=10')
        .expect(200);

      expect(ChatService.getUserSessions).toHaveBeenCalledWith('user-1', {
        includeMessages: true,
        includeOperator: true,
        status: 'active',
        limit: 5,
        offset: 10
      });
    });
  });

  describe('POST /api/chat/sessions', () => {
    it('should create new session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'waiting',
        createdAt: new Date()
      };

      ChatService.createChatSession.mockResolvedValue({
        success: true,
        session: mockSession,
        isNew: true,
        message: 'New chat session created successfully'
      });

      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ userId: 'user-1' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toMatchObject({
        id: 'session-1',
        userId: 'user-1',
        status: 'waiting'
      });
      expect(typeof response.body.data.session.createdAt).toBe('string');
      expect(response.body.data.isNew).toBe(true);
      expect(ChatService.createChatSession).toHaveBeenCalledWith('user-1');
    });

    it('should return existing session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'active',
        createdAt: new Date()
      };

      ChatService.createChatSession.mockResolvedValue({
        success: true,
        session: mockSession,
        isNew: false,
        message: 'Found existing active session'
      });

      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ userId: 'user-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isNew).toBe(false);
    });

    it('should handle missing userId', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_USER_ID');
      expect(ChatService.createChatSession).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      ChatService.createChatSession.mockResolvedValue({
        success: false,
        error: 'Database error',
        message: 'Failed to create chat session'
      });

      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ userId: 'user-1' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_CREATION_FAILED');
    });
  });

  describe('PUT /api/chat/sessions/:sessionId/close', () => {
    it('should close session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'closed',
        closedAt: new Date()
      };

      ChatService.closeChatSession.mockResolvedValue({
        success: true,
        session: mockSession,
        message: 'Chat session closed successfully'
      });

      const response = await request(app)
        .put('/api/chat/sessions/session-1/close')
        .send({ closedBy: 'user-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toMatchObject({
        id: 'session-1',
        userId: 'user-1',
        status: 'closed'
      });
      expect(typeof response.body.data.session.closedAt).toBe('string');
      expect(ChatService.closeChatSession).toHaveBeenCalledWith('session-1', 'user-1');
    });

    it('should handle session not found', async () => {
      ChatService.closeChatSession.mockResolvedValue({
        success: false,
        error: 'Session not found',
        message: 'Chat session does not exist'
      });

      const response = await request(app)
        .put('/api/chat/sessions/nonexistent/close')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('should handle service error', async () => {
      ChatService.closeChatSession.mockResolvedValue({
        success: false,
        error: 'Database error',
        message: 'Failed to close chat session'
      });

      const response = await request(app)
        .put('/api/chat/sessions/session-1/close')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_CLOSE_FAILED');
    });
  });

  describe('GET /api/chat/messages/:sessionId', () => {
    it('should get message history successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          senderId: 'user-1',
          senderType: 'user',
          content: 'Hello',
          createdAt: new Date()
        }
      ];

      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'active'
      };

      ChatService.getMessageHistory.mockResolvedValue({
        success: true,
        messages: mockMessages,
        session: mockSession,
        pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
        message: 'Message history retrieved successfully'
      });

      const response = await request(app)
        .get('/api/chat/messages/session-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(1);
      expect(response.body.data.messages[0]).toMatchObject({
        id: 'msg-1',
        sessionId: 'session-1',
        senderId: 'user-1',
        senderType: 'user',
        content: 'Hello'
      });
      expect(typeof response.body.data.messages[0].createdAt).toBe('string');
      expect(response.body.data.session).toEqual(mockSession);
      expect(ChatService.getMessageHistory).toHaveBeenCalledWith('session-1', {
        limit: 50,
        offset: 0,
        order: 'ASC',
        includeRead: true,
        messageType: null
      });
    });

    it('should handle query parameters correctly', async () => {
      ChatService.getMessageHistory.mockResolvedValue({
        success: true,
        messages: [],
        session: {},
        pagination: { total: 0, limit: 20, offset: 10, hasMore: false },
        message: 'Message history retrieved successfully'
      });

      await request(app)
        .get('/api/chat/messages/session-1?limit=20&offset=10&order=DESC&includeRead=false&messageType=text')
        .expect(200);

      expect(ChatService.getMessageHistory).toHaveBeenCalledWith('session-1', {
        limit: 20,
        offset: 10,
        order: 'DESC',
        includeRead: false,
        messageType: 'text'
      });
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/chat/messages/session-1?limit=150')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_LIMIT');
      expect(ChatService.getMessageHistory).not.toHaveBeenCalled();
    });

    it('should validate offset parameter', async () => {
      const response = await request(app)
        .get('/api/chat/messages/session-1?offset=-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_OFFSET');
      expect(ChatService.getMessageHistory).not.toHaveBeenCalled();
    });

    it('should handle session not found', async () => {
      ChatService.getMessageHistory.mockResolvedValue({
        success: false,
        error: 'Session not found',
        message: 'Chat session does not exist'
      });

      const response = await request(app)
        .get('/api/chat/messages/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('PUT /api/chat/messages/:sessionId/read', () => {
    it('should mark messages as read successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'active'
      };

      ChatService.markMessagesAsRead.mockResolvedValue({
        success: true,
        updatedCount: 3,
        session: mockSession,
        message: '3 messages marked as read'
      });

      const response = await request(app)
        .put('/api/chat/messages/session-1/read')
        .send({ readBy: 'user-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);
      expect(response.body.data.session).toEqual(mockSession);
      expect(ChatService.markMessagesAsRead).toHaveBeenCalledWith('session-1', 'user-1');
    });

    it('should handle session not found', async () => {
      ChatService.markMessagesAsRead.mockResolvedValue({
        success: false,
        error: 'Session not found',
        message: 'Chat session does not exist'
      });

      const response = await request(app)
        .put('/api/chat/messages/nonexistent/read')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('GET /api/chat/messages/:sessionId/unread-count', () => {
    it('should get unread count successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        status: 'active'
      };

      ChatService.getUnreadMessageCount.mockResolvedValue({
        success: true,
        unreadCount: 5,
        session: mockSession,
        message: 'Unread message count retrieved successfully'
      });

      const response = await request(app)
        .get('/api/chat/messages/session-1/unread-count')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.unreadCount).toBe(5);
      expect(response.body.data.session).toEqual(mockSession);
      expect(ChatService.getUnreadMessageCount).toHaveBeenCalledWith('session-1');
    });

    it('should handle session not found', async () => {
      ChatService.getUnreadMessageCount.mockResolvedValue({
        success: false,
        error: 'Session not found',
        message: 'Chat session does not exist'
      });

      const response = await request(app)
        .get('/api/chat/messages/nonexistent/unread-count')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors', async () => {
      ChatService.getUserSessions.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/chat/sessions/user-1')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});