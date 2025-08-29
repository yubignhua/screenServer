const request = require('supertest');
const express = require('express');
const operatorsRouter = require('../../routes/operators');
const OperatorService = require('../../services/OperatorService');
const { models } = require('../../models');

// Mock OperatorService and models
jest.mock('../../services/OperatorService');
jest.mock('../../models');

const app = express();
app.use(express.json());
app.use('/api/operators', operatorsRouter);

describe('Operators Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/operators', () => {
    it('should get all operators successfully', async () => {
      const mockOperators = [
        {
          id: 'op-1',
          name: 'John Doe',
          email: 'john@example.com',
          status: 'online',
          lastActiveAt: new Date()
        }
      ];

      models.Operator.findAll.mockResolvedValue(mockOperators);
      models.Operator.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/operators')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operators).toHaveLength(1);
      expect(response.body.data.operators[0]).toMatchObject({
        id: 'op-1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'online'
      });
      expect(typeof response.body.data.operators[0].lastActiveAt).toBe('string');
      expect(response.body.data.pagination.total).toBe(1);
    });

    it('should filter operators by status', async () => {
      const mockOperators = [
        {
          id: 'op-1',
          name: 'John Doe',
          status: 'online'
        }
      ];

      models.Operator.findAll.mockResolvedValue(mockOperators);
      models.Operator.count.mockResolvedValue(1);

      await request(app)
        .get('/api/operators?status=online')
        .expect(200);

      expect(models.Operator.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'online' }
        })
      );
    });

    it('should include statistics when requested', async () => {
      const mockStats = {
        total: 10,
        online: 5,
        offline: 3,
        busy: 2
      };

      models.Operator.findAll.mockResolvedValue([]);
      models.Operator.count.mockResolvedValue(0);
      OperatorService.getOperatorStats.mockResolvedValue({
        success: true,
        stats: mockStats
      });

      const response = await request(app)
        .get('/api/operators?includeStats=true')
        .expect(200);

      expect(response.body.data.stats).toEqual(mockStats);
      expect(OperatorService.getOperatorStats).toHaveBeenCalled();
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/operators?limit=150')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_LIMIT');
    });

    it('should validate offset parameter', async () => {
      const response = await request(app)
        .get('/api/operators?offset=-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_OFFSET');
    });
  });

  describe('GET /api/operators/online', () => {
    it('should get online operators successfully', async () => {
      const mockOperators = [
        {
          id: 'op-1',
          name: 'John Doe',
          status: 'online'
        }
      ];

      OperatorService.getOnlineOperators.mockResolvedValue({
        success: true,
        operators: mockOperators,
        count: 1,
        message: 'Online operators retrieved successfully'
      });

      const response = await request(app)
        .get('/api/operators/online')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operators).toEqual(mockOperators);
      expect(response.body.data.count).toBe(1);
    });

    it('should include stats when requested', async () => {
      const mockStats = { online: 5, total: 10 };

      OperatorService.getOnlineOperators.mockResolvedValue({
        success: true,
        operators: [],
        count: 0,
        stats: mockStats,
        message: 'Online operators retrieved successfully'
      });

      const response = await request(app)
        .get('/api/operators/online?includeStats=true')
        .expect(200);

      expect(response.body.data.stats).toEqual(mockStats);
      expect(OperatorService.getOnlineOperators).toHaveBeenCalledWith({
        includeStats: true
      });
    });

    it('should handle service error', async () => {
      OperatorService.getOnlineOperators.mockResolvedValue({
        success: false,
        error: 'Database error',
        message: 'Failed to get online operators'
      });

      const response = await request(app)
        .get('/api/operators/online')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ONLINE_OPERATORS_RETRIEVAL_FAILED');
    });
  });

  describe('GET /api/operators/available', () => {
    it('should get available operators successfully', async () => {
      const mockOperators = [
        {
          id: 'op-1',
          name: 'John Doe',
          status: 'online'
        }
      ];

      OperatorService.getAvailableOperators.mockResolvedValue({
        success: true,
        operators: mockOperators,
        count: 1,
        message: 'Available operators retrieved successfully'
      });

      const response = await request(app)
        .get('/api/operators/available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operators).toEqual(mockOperators);
      expect(response.body.data.count).toBe(1);
    });
  });

  describe('GET /api/operators/stats', () => {
    it('should get operator statistics successfully', async () => {
      const mockStats = {
        total: 10,
        online: 5,
        offline: 3,
        busy: 2,
        available: 5,
        utilization: '70.00'
      };

      OperatorService.getOperatorStats.mockResolvedValue({
        success: true,
        stats: mockStats,
        message: 'Operator statistics retrieved successfully'
      });

      const response = await request(app)
        .get('/api/operators/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
    });
  });

  describe('GET /api/operators/:id', () => {
    it('should get single operator successfully', async () => {
      const mockOperator = {
        id: 'op-1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'online'
      };

      models.Operator.findByPk.mockResolvedValue(mockOperator);

      const response = await request(app)
        .get('/api/operators/op-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operator).toEqual(mockOperator);
      expect(models.Operator.findByPk).toHaveBeenCalledWith('op-1', { include: [] });
    });

    it('should handle operator not found', async () => {
      models.Operator.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/operators/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OPERATOR_NOT_FOUND');
    });

    it('should include active sessions when requested', async () => {
      const mockOperator = {
        id: 'op-1',
        name: 'John Doe',
        sessions: []
      };

      models.Operator.findByPk.mockResolvedValue(mockOperator);

      await request(app)
        .get('/api/operators/op-1?includeActiveSessions=true')
        .expect(200);

      expect(models.Operator.findByPk).toHaveBeenCalledWith('op-1', 
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              model: models.ChatSession,
              as: 'sessions'
            })
          ])
        })
      );
    });
  });

  describe('PUT /api/operators/:id/status', () => {
    it('should update operator status to online', async () => {
      const mockOperator = {
        id: 'op-1',
        name: 'John Doe',
        status: 'online'
      };

      OperatorService.setOperatorOnline.mockResolvedValue({
        success: true,
        operator: mockOperator,
        message: 'Operator set to online successfully'
      });

      const response = await request(app)
        .put('/api/operators/op-1/status')
        .send({ status: 'online' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operator).toEqual(mockOperator);
      expect(OperatorService.setOperatorOnline).toHaveBeenCalledWith('op-1');
    });

    it('should update operator status to offline', async () => {
      const mockOperator = {
        id: 'op-1',
        name: 'John Doe',
        status: 'offline'
      };

      OperatorService.setOperatorOffline.mockResolvedValue({
        success: true,
        operator: mockOperator,
        message: 'Operator set to offline successfully'
      });

      const response = await request(app)
        .put('/api/operators/op-1/status')
        .send({ status: 'offline' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(OperatorService.setOperatorOffline).toHaveBeenCalledWith('op-1');
    });

    it('should update operator status to busy', async () => {
      const mockOperator = {
        id: 'op-1',
        name: 'John Doe',
        status: 'busy'
      };

      OperatorService.setOperatorBusy.mockResolvedValue({
        success: true,
        operator: mockOperator,
        message: 'Operator set to busy successfully'
      });

      const response = await request(app)
        .put('/api/operators/op-1/status')
        .send({ status: 'busy' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(OperatorService.setOperatorBusy).toHaveBeenCalledWith('op-1');
    });

    it('should handle missing status', async () => {
      const response = await request(app)
        .put('/api/operators/op-1/status')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_STATUS');
    });

    it('should handle invalid status', async () => {
      const response = await request(app)
        .put('/api/operators/op-1/status')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });

    it('should handle operator not found', async () => {
      OperatorService.setOperatorOnline.mockResolvedValue({
        success: false,
        error: 'Operator not found',
        message: 'Operator does not exist'
      });

      const response = await request(app)
        .put('/api/operators/nonexistent/status')
        .send({ status: 'online' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OPERATOR_NOT_FOUND');
    });
  });

  describe('GET /api/operators/:id/sessions', () => {
    it('should get operator active sessions successfully', async () => {
      const mockOperator = { id: 'op-1', name: 'John Doe' };
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          operatorId: 'op-1',
          status: 'active'
        }
      ];

      OperatorService.getOperatorActiveSessions.mockResolvedValue({
        success: true,
        operator: mockOperator,
        sessions: mockSessions,
        count: 1,
        message: 'Operator active sessions retrieved successfully'
      });

      const response = await request(app)
        .get('/api/operators/op-1/sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operator).toEqual(mockOperator);
      expect(response.body.data.sessions).toEqual(mockSessions);
      expect(response.body.data.count).toBe(1);
    });

    it('should handle operator not found', async () => {
      OperatorService.getOperatorActiveSessions.mockResolvedValue({
        success: false,
        error: 'Operator not found',
        message: 'Operator does not exist'
      });

      const response = await request(app)
        .get('/api/operators/nonexistent/sessions')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OPERATOR_NOT_FOUND');
    });
  });

  describe('PUT /api/operators/:id/last-active', () => {
    it('should update operator last active time successfully', async () => {
      const mockOperator = {
        id: 'op-1',
        name: 'John Doe',
        lastActiveAt: new Date()
      };

      OperatorService.updateOperatorLastActive.mockResolvedValue({
        success: true,
        operator: mockOperator,
        message: 'Operator last active time updated successfully'
      });

      const response = await request(app)
        .put('/api/operators/op-1/last-active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operator).toMatchObject({
        id: 'op-1',
        name: 'John Doe'
      });
      expect(typeof response.body.data.operator.lastActiveAt).toBe('string');
      expect(OperatorService.updateOperatorLastActive).toHaveBeenCalledWith('op-1');
    });
  });

  describe('POST /api/operators/assign', () => {
    it('should assign operator using round robin strategy', async () => {
      const mockOperator = {
        id: 'op-1',
        name: 'John Doe',
        status: 'online'
      };

      OperatorService.assignOperator.mockResolvedValue({
        success: true,
        operator: mockOperator,
        strategy: 'round_robin',
        message: 'Operator assigned using round_robin strategy'
      });

      const response = await request(app)
        .post('/api/operators/assign')
        .send({ strategy: 'round_robin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operator).toEqual(mockOperator);
      expect(response.body.data.strategy).toBe('round_robin');
    });

    it('should handle invalid strategy', async () => {
      const response = await request(app)
        .post('/api/operators/assign')
        .send({ strategy: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STRATEGY');
    });

    it('should handle no available operators', async () => {
      OperatorService.assignOperator.mockResolvedValue({
        success: false,
        error: 'No available operators',
        message: 'No operators are currently available'
      });

      const response = await request(app)
        .post('/api/operators/assign')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_AVAILABLE_OPERATORS');
    });
  });

  describe('PUT /api/operators/batch/status', () => {
    it('should batch update operator status successfully', async () => {
      OperatorService.batchUpdateOperatorStatus.mockResolvedValue({
        success: true,
        updatedCount: 3,
        message: '3 operators updated to online status'
      });

      const response = await request(app)
        .put('/api/operators/batch/status')
        .send({
          operatorIds: ['op-1', 'op-2', 'op-3'],
          status: 'online'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);
      expect(OperatorService.batchUpdateOperatorStatus).toHaveBeenCalledWith(
        ['op-1', 'op-2', 'op-3'],
        'online'
      );
    });

    it('should handle missing operator IDs', async () => {
      const response = await request(app)
        .put('/api/operators/batch/status')
        .send({ status: 'online' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_OPERATOR_IDS');
    });

    it('should handle empty operator IDs array', async () => {
      const response = await request(app)
        .put('/api/operators/batch/status')
        .send({
          operatorIds: [],
          status: 'online'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_OPERATOR_IDS');
    });

    it('should handle invalid status', async () => {
      const response = await request(app)
        .put('/api/operators/batch/status')
        .send({
          operatorIds: ['op-1'],
          status: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors', async () => {
      models.Operator.findAll.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/operators')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});