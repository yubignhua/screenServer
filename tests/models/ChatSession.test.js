const { sequelize } = require('../../config/database');
const { models } = require('../../models');
const ChatSession = models.ChatSession;

describe('ChatSession Model', () => {
  beforeEach(async () => {
    // Ensure clean state for each test
    await ChatSession.destroy({ where: {}, force: true });
  });

  describe('Model Creation', () => {
    test('should create a ChatSession with valid data', async () => {
      const sessionData = {
        userId: 'test-user-123',
        status: 'waiting'
      };

      const session = await ChatSession.create(sessionData);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('test-user-123');
      expect(session.status).toBe('waiting');
      expect(session.operatorId == null).toBe(true);
      expect(session.closedAt == null).toBe(true);
      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });

    test('should generate UUID for id field', async () => {
      const session = await ChatSession.create({
        userId: 'test-user-123'
      });

      expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should set default status to waiting', async () => {
      const session = await ChatSession.create({
        userId: 'test-user-123'
      });

      expect(session.status).toBe('waiting');
    });
  });

  describe('Validation', () => {
    test('should require userId', async () => {
      await expect(ChatSession.create({})).rejects.toThrow();
    });

    test('should not allow empty userId', async () => {
      await expect(ChatSession.create({ userId: '' })).rejects.toThrow('User ID cannot be empty');
    });

    test('should not allow userId longer than 255 characters', async () => {
      const longUserId = 'a'.repeat(256);
      await expect(ChatSession.create({ userId: longUserId })).rejects.toThrow();
    });

    test('should validate status enum values', async () => {
      await expect(ChatSession.create({
        userId: 'test-user-123',
        status: 'invalid-status'
      })).rejects.toThrow();
    });

    test('should allow valid status values', async () => {
      const validStatuses = ['waiting', 'active', 'closed'];
      
      for (const status of validStatuses) {
        const session = await ChatSession.create({
          userId: `test-user-${status}`,
          status: status
        });
        expect(session.status).toBe(status);
      }
    });

    test('should validate operatorId as UUID when provided', async () => {
      await expect(ChatSession.create({
        userId: 'test-user-123',
        operatorId: 'invalid-uuid'
      })).rejects.toThrow();
    });

    test('should accept valid UUID for operatorId', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const session = await ChatSession.create({
        userId: 'test-user-123',
        operatorId: validUUID
      });

      expect(session.operatorId).toBe(validUUID);
    });

    test('should validate closedAt is after createdAt', async () => {
      const session = await ChatSession.create({
        userId: 'test-user-123'
      });

      // Try to set closedAt to before createdAt
      const pastDate = new Date(session.createdAt.getTime() - 1000);
      session.closedAt = pastDate;

      await expect(session.save()).rejects.toThrow('Closed at cannot be before creation date');
    });
  });

  describe('Instance Methods', () => {
    let session;

    beforeEach(async () => {
      session = await ChatSession.create({
        userId: 'test-user-123',
        status: 'waiting'
      });
    });

    test('close() should set status to closed and set closedAt', async () => {
      await session.close();

      expect(session.status).toBe('closed');
      expect(session.closedAt).toBeDefined();
      expect(session.closedAt).toBeInstanceOf(Date);
    });

    test('activate() should set status to active', async () => {
      await session.activate();

      expect(session.status).toBe('active');
    });

    test('isActive() should return correct boolean', async () => {
      expect(session.isActive()).toBe(false);
      
      await session.activate();
      expect(session.isActive()).toBe(true);
    });

    test('isClosed() should return correct boolean', async () => {
      expect(session.isClosed()).toBe(false);
      
      await session.close();
      expect(session.isClosed()).toBe(true);
    });

    test('isWaiting() should return correct boolean', async () => {
      expect(session.isWaiting()).toBe(true);
      
      await session.activate();
      expect(session.isWaiting()).toBe(false);
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      // Create test data
      await ChatSession.bulkCreate([
        { userId: 'user1', status: 'waiting' },
        { userId: 'user1', status: 'closed' },
        { userId: 'user2', status: 'active' },
        { userId: 'user3', status: 'waiting', operatorId: '550e8400-e29b-41d4-a716-446655440000' },
        { userId: 'user3', status: 'active', operatorId: '550e8400-e29b-41d4-a716-446655440000' }
      ]);
    });

    test('findActiveByUserId() should return most recent active or waiting session', async () => {
      const session = await ChatSession.findActiveByUserId('user1');
      
      expect(session).toBeDefined();
      expect(session.userId).toBe('user1');
      expect(session.status).toBe('waiting');
    });

    test('findActiveByUserId() should return null for user with only closed sessions', async () => {
      // Close all sessions for user1
      await ChatSession.update(
        { status: 'closed' },
        { where: { userId: 'user1' } }
      );

      const session = await ChatSession.findActiveByUserId('user1');
      expect(session).toBeNull();
    });

    test('findByOperatorId() should return active sessions for operator', async () => {
      const operatorId = '550e8400-e29b-41d4-a716-446655440000';
      const sessions = await ChatSession.findByOperatorId(operatorId);
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].operatorId).toBe(operatorId);
      expect(sessions[0].status).toBe('active');
    });

    test('countActiveSessionsByOperator() should return correct count', async () => {
      const operatorId = '550e8400-e29b-41d4-a716-446655440000';
      const count = await ChatSession.countActiveSessionsByOperator(operatorId);
      
      expect(count).toBe(1);
    });
  });

  describe('Hooks', () => {
    test('should automatically set closedAt when status changes to closed', async () => {
      const session = await ChatSession.create({
        userId: 'test-user-123',
        status: 'waiting'
      });

      expect(session.closedAt == null).toBe(true);

      // Update status to closed
      session.status = 'closed';
      await session.save();

      expect(session.closedAt).toBeDefined();
      expect(session.closedAt).toBeInstanceOf(Date);
    });

    test('should not override existing closedAt when updating to closed', async () => {
      const session = await ChatSession.create({
        userId: 'test-user-123',
        status: 'waiting'
      });

      // Set a custom closedAt that's after the creation date
      const customClosedAt = new Date(session.createdAt.getTime() + 1000);
      session.status = 'closed';
      session.closedAt = customClosedAt;
      await session.save();

      expect(session.closedAt.getTime()).toBe(customClosedAt.getTime());
    });
  });

  describe('Database Indexes', () => {
    test('should create session and query by userId efficiently', async () => {
      await ChatSession.create({
        userId: 'indexed-user-123'
      });

      const session = await ChatSession.findOne({
        where: { userId: 'indexed-user-123' }
      });

      expect(session).toBeDefined();
      expect(session.userId).toBe('indexed-user-123');
    });

    test('should query by status efficiently', async () => {
      await ChatSession.bulkCreate([
        { userId: 'user1', status: 'waiting' },
        { userId: 'user2', status: 'active' },
        { userId: 'user3', status: 'closed' }
      ]);

      const activeSessions = await ChatSession.findAll({
        where: { status: 'active' }
      });

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].status).toBe('active');
    });
  });
});