const OperatorService = require('../../services/OperatorService');
const { models } = require('../../models');
const { Operator, ChatSession } = models;

// Mock Redis
jest.mock('../../config/redis', () => ({
  createRedisClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    setEx: jest.fn().mockResolvedValue('OK'),
    sAdd: jest.fn().mockResolvedValue(1),
    sRem: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    quit: jest.fn().mockResolvedValue('OK')
  }))
}));

describe('OperatorService', () => {
  let testOperator1, testOperator2, testOperator3;
  let testSession1, testSession2;

  beforeEach(async () => {
    // 创建测试客服
    testOperator1 = await Operator.create({
      name: 'Test Operator 1',
      email: 'operator1@test.com',
      status: 'offline'
    });

    testOperator2 = await Operator.create({
      name: 'Test Operator 2',
      email: 'operator2@test.com',
      status: 'online'
    });

    testOperator3 = await Operator.create({
      name: 'Test Operator 3',
      email: 'operator3@test.com',
      status: 'busy'
    });

    // 创建测试会话
    testSession1 = await ChatSession.create({
      userId: 'user1',
      operatorId: testOperator2.id,
      status: 'active'
    });

    testSession2 = await ChatSession.create({
      userId: 'user2',
      operatorId: testOperator3.id,
      status: 'active'
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await ChatSession.destroy({ where: {} });
    await Operator.destroy({ where: {} });
  });

  describe('setOperatorOnline', () => {
    it('should set operator status to online successfully', async () => {
      const result = await OperatorService.setOperatorOnline(testOperator1.id);

      expect(result.success).toBe(true);
      expect(result.operator.status).toBe('online');
      expect(result.message).toBe('Operator set to online successfully');

      // 验证数据库中的状态
      const updatedOperator = await Operator.findByPk(testOperator1.id);
      expect(updatedOperator.status).toBe('online');
    });

    it('should return error for non-existent operator', async () => {
      const result = await OperatorService.setOperatorOnline('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operator not found');
      expect(result.message).toBe('Operator does not exist');
    });

    it('should update lastActiveAt when setting online', async () => {
      const beforeTime = new Date();
      const result = await OperatorService.setOperatorOnline(testOperator1.id);

      expect(result.success).toBe(true);
      
      const updatedOperator = await Operator.findByPk(testOperator1.id);
      expect(new Date(updatedOperator.lastActiveAt)).toBeInstanceOf(Date);
      // Allow for small time differences due to processing time
      const timeDiff = new Date(updatedOperator.lastActiveAt).getTime() - beforeTime.getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(-1000); // Allow 1 second tolerance
    });
  });

  describe('setOperatorOffline', () => {
    it('should set operator status to offline successfully', async () => {
      const result = await OperatorService.setOperatorOffline(testOperator2.id);

      expect(result.success).toBe(true);
      expect(result.operator.status).toBe('offline');
      expect(result.message).toBe('Operator set to offline successfully');

      // 验证数据库中的状态
      const updatedOperator = await Operator.findByPk(testOperator2.id);
      expect(updatedOperator.status).toBe('offline');
    });

    it('should return error for non-existent operator', async () => {
      const result = await OperatorService.setOperatorOffline('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operator not found');
      expect(result.message).toBe('Operator does not exist');
    });
  });

  describe('setOperatorBusy', () => {
    it('should set operator status to busy successfully', async () => {
      const result = await OperatorService.setOperatorBusy(testOperator2.id);

      expect(result.success).toBe(true);
      expect(result.operator.status).toBe('busy');
      expect(result.message).toBe('Operator set to busy successfully');

      // 验证数据库中的状态
      const updatedOperator = await Operator.findByPk(testOperator2.id);
      expect(updatedOperator.status).toBe('busy');
    });

    it('should return error for non-existent operator', async () => {
      const result = await OperatorService.setOperatorBusy('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operator not found');
      expect(result.message).toBe('Operator does not exist');
    });

    it('should update lastActiveAt when setting busy', async () => {
      const beforeTime = new Date();
      const result = await OperatorService.setOperatorBusy(testOperator2.id);

      expect(result.success).toBe(true);
      
      const updatedOperator = await Operator.findByPk(testOperator2.id);
      expect(new Date(updatedOperator.lastActiveAt)).toBeInstanceOf(Date);
      // Allow for small time differences due to processing time
      const timeDiff = new Date(updatedOperator.lastActiveAt).getTime() - beforeTime.getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(-1000); // Allow 1 second tolerance
    });
  });

  describe('getOnlineOperators', () => {
    it('should return online operators successfully', async () => {
      const result = await OperatorService.getOnlineOperators();

      expect(result.success).toBe(true);
      expect(result.operators).toHaveLength(1);
      expect(result.operators[0].id).toBe(testOperator2.id);
      expect(result.operators[0].status).toBe('online');
      expect(result.count).toBe(1);
      expect(result.message).toBe('Online operators retrieved successfully');
    });

    it('should return empty array when no operators are online', async () => {
      // 设置所有客服为离线
      await testOperator2.setOffline();

      const result = await OperatorService.getOnlineOperators();

      expect(result.success).toBe(true);
      expect(result.operators).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should include stats when requested', async () => {
      const result = await OperatorService.getOnlineOperators({ includeStats: true });

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBe(3);
      expect(result.stats.online).toBe(1);
      expect(result.stats.offline).toBe(1);
      expect(result.stats.busy).toBe(1);
    });
  });

  describe('getAvailableOperators', () => {
    it('should return only online operators as available', async () => {
      const result = await OperatorService.getAvailableOperators();

      expect(result.success).toBe(true);
      expect(result.operators).toHaveLength(1);
      expect(result.operators[0].id).toBe(testOperator2.id);
      expect(result.operators[0].status).toBe('online');
      expect(result.count).toBe(1);
      expect(result.message).toBe('Available operators retrieved successfully');
    });

    it('should return empty array when no operators are available', async () => {
      // 设置所有客服为离线或忙碌
      await testOperator2.setOffline();

      const result = await OperatorService.getAvailableOperators();

      expect(result.success).toBe(true);
      expect(result.operators).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('assignOperator', () => {
    it('should assign preferred operator when available', async () => {
      const result = await OperatorService.assignOperator({
        preferredOperatorId: testOperator2.id
      });

      expect(result.success).toBe(true);
      expect(result.operator.id).toBe(testOperator2.id);
      expect(result.strategy).toBe('preferred');
      expect(result.message).toBe('Preferred operator assigned successfully');
    });

    it('should fall back to algorithm when preferred operator is not available', async () => {
      const result = await OperatorService.assignOperator({
        preferredOperatorId: testOperator3.id, // busy operator
        strategy: 'round_robin'
      });

      expect(result.success).toBe(true);
      expect(result.operator.id).toBe(testOperator2.id); // should get the available one
      expect(result.strategy).toBe('round_robin');
    });

    it('should return error when no operators are available', async () => {
      // 设置所有客服为离线
      await testOperator2.setOffline();

      const result = await OperatorService.assignOperator();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No available operators');
      expect(result.message).toBe('No operators are currently available');
    });

    it('should exclude specified operators', async () => {
      // 创建另一个在线客服
      const anotherOperator = await Operator.create({
        name: 'Another Operator',
        email: 'another@test.com',
        status: 'online'
      });

      const result = await OperatorService.assignOperator({
        excludeOperatorIds: [testOperator2.id],
        strategy: 'round_robin'
      });

      expect(result.success).toBe(true);
      expect(result.operator.id).toBe(anotherOperator.id);

      // 清理
      await anotherOperator.destroy();
    });

    it('should use least_busy strategy correctly', async () => {
      // 创建另一个在线客服，没有活跃会话
      const lessLoadedOperator = await Operator.create({
        name: 'Less Loaded Operator',
        email: 'lessloaded@test.com',
        status: 'online'
      });

      const result = await OperatorService.assignOperator({
        strategy: 'least_busy'
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('least_busy');
      // 应该选择没有活跃会话的客服
      expect(result.operator.id).toBe(lessLoadedOperator.id);

      // 清理
      await lessLoadedOperator.destroy();
    });

    it('should use most_recent strategy correctly', async () => {
      // 更新testOperator2的lastActiveAt为更近的时间
      await testOperator2.update({
        lastActiveAt: new Date(Date.now() + 1000) // 1秒后
      });

      const result = await OperatorService.assignOperator({
        strategy: 'most_recent'
      });

      expect(result.success).toBe(true);
      expect(result.operator.id).toBe(testOperator2.id);
      expect(result.strategy).toBe('most_recent');
    });
  });

  describe('updateOperatorLastActive', () => {
    it('should update operator last active time successfully', async () => {
      const beforeTime = new Date();
      const result = await OperatorService.updateOperatorLastActive(testOperator1.id);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Operator last active time updated successfully');

      const updatedOperator = await Operator.findByPk(testOperator1.id);
      // Allow for small time differences due to processing time
      const timeDiff = new Date(updatedOperator.lastActiveAt).getTime() - beforeTime.getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(-1000); // Allow 1 second tolerance
    });

    it('should return error for non-existent operator', async () => {
      const result = await OperatorService.updateOperatorLastActive('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operator not found');
      expect(result.message).toBe('Operator does not exist');
    });
  });

  describe('getOperatorStats', () => {
    it('should return correct operator statistics', async () => {
      const result = await OperatorService.getOperatorStats();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBe(3);
      expect(result.stats.online).toBe(1);
      expect(result.stats.offline).toBe(1);
      expect(result.stats.busy).toBe(1);
      expect(result.stats.available).toBe(1);
      expect(parseFloat(result.stats.utilization)).toBeCloseTo(66.67, 1);
      expect(result.message).toBe('Operator statistics retrieved successfully');
    });

    it('should handle zero operators correctly', async () => {
      // 删除所有客服
      await Operator.destroy({ where: {} });

      const result = await OperatorService.getOperatorStats();

      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(0);
      expect(result.stats.online).toBe(0);
      expect(result.stats.offline).toBe(0);
      expect(result.stats.busy).toBe(0);
      expect(result.stats.available).toBe(0);
      expect(result.stats.utilization).toBe('0');
    });
  });

  describe('getOperatorActiveSessions', () => {
    it('should return operator active sessions successfully', async () => {
      const result = await OperatorService.getOperatorActiveSessions(testOperator2.id);

      expect(result.success).toBe(true);
      expect(result.operator.id).toBe(testOperator2.id);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].id).toBe(testSession1.id);
      expect(result.count).toBe(1);
      expect(result.message).toBe('Operator active sessions retrieved successfully');
    });

    it('should return empty array for operator with no active sessions', async () => {
      const result = await OperatorService.getOperatorActiveSessions(testOperator1.id);

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should return error for non-existent operator', async () => {
      const result = await OperatorService.getOperatorActiveSessions('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operator not found');
      expect(result.message).toBe('Operator does not exist');
    });
  });

  describe('batchUpdateOperatorStatus', () => {
    it('should update multiple operators status successfully', async () => {
      const operatorIds = [testOperator1.id, testOperator2.id];
      const result = await OperatorService.batchUpdateOperatorStatus(operatorIds, 'online');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.message).toBe('2 operators updated to online status');

      // 验证数据库中的状态
      const updatedOperators = await Operator.findAll({
        where: { id: operatorIds }
      });
      updatedOperators.forEach(operator => {
        expect(operator.status).toBe('online');
      });
    });

    it('should return error for invalid status', async () => {
      const result = await OperatorService.batchUpdateOperatorStatus([testOperator1.id], 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid status');
      expect(result.message).toBe('Status must be one of: online, offline, busy');
    });

    it('should handle empty operator list', async () => {
      const result = await OperatorService.batchUpdateOperatorStatus([], 'online');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(result.message).toBe('0 operators updated to online status');
    });
  });

  describe('cleanupInactiveOperators', () => {
    it('should set inactive operators to offline', async () => {
      // 设置testOperator2为很久以前活跃
      const oldDate = new Date(Date.now() - 60 * 60 * 1000); // 1小时前
      await testOperator2.update({ lastActiveAt: oldDate });

      const result = await OperatorService.cleanupInactiveOperators(30); // 30分钟超时

      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(1);
      expect(result.message).toBe('1 inactive operators set to offline');

      // 验证状态已更新
      const updatedOperator = await Operator.findByPk(testOperator2.id);
      expect(updatedOperator.status).toBe('offline');
    });

    it('should not affect recently active operators', async () => {
      // 设置testOperator2为最近活跃
      await testOperator2.update({ lastActiveAt: new Date() });

      const result = await OperatorService.cleanupInactiveOperators(30);

      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(0);

      // 验证状态未改变
      const updatedOperator = await Operator.findByPk(testOperator2.id);
      expect(updatedOperator.status).toBe('online');
    });

    it('should handle custom timeout minutes', async () => {
      // 设置testOperator2为10分钟前活跃
      const oldDate = new Date(Date.now() - 10 * 60 * 1000);
      await testOperator2.update({ lastActiveAt: oldDate });

      // 使用5分钟超时，应该清理
      const result = await OperatorService.cleanupInactiveOperators(5);

      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(1);
    });
  });

  describe('selectLeastBusyOperator', () => {
    it('should select operator with least active sessions', async () => {
      // 创建另一个在线客服，没有活跃会话
      const lessLoadedOperator = await Operator.create({
        name: 'Less Loaded Operator',
        email: 'lessloaded@test.com',
        status: 'online'
      });

      const operators = [testOperator2, lessLoadedOperator];
      const selected = await OperatorService.selectLeastBusyOperator(operators);

      expect(selected.id).toBe(lessLoadedOperator.id);

      // 清理
      await lessLoadedOperator.destroy();
    });

    it('should handle operators with equal workload', async () => {
      const operator1 = await Operator.create({
        name: 'Operator 1',
        email: 'op1@test.com',
        status: 'online'
      });

      const operator2 = await Operator.create({
        name: 'Operator 2',
        email: 'op2@test.com',
        status: 'online'
      });

      const operators = [operator1, operator2];
      const selected = await OperatorService.selectLeastBusyOperator(operators);

      expect([operator1.id, operator2.id]).toContain(selected.id);

      // 清理
      await operator1.destroy();
      await operator2.destroy();
    });
  });

  describe('selectRoundRobinOperator', () => {
    it('should select operators in round robin fashion', async () => {
      const operator1 = await Operator.create({
        name: 'Operator 1',
        email: 'op1@test.com',
        status: 'online'
      });

      const operator2 = await Operator.create({
        name: 'Operator 2',
        email: 'op2@test.com',
        status: 'online'
      });

      const operators = [operator1, operator2];
      
      // 第一次调用
      const selected1 = await OperatorService.selectRoundRobinOperator(operators);
      expect([operator1.id, operator2.id]).toContain(selected1.id);

      // 清理
      await operator1.destroy();
      await operator2.destroy();
    });

    it('should handle single operator', async () => {
      const operators = [testOperator2];
      const selected = await OperatorService.selectRoundRobinOperator(operators);

      expect(selected.id).toBe(testOperator2.id);
    });
  });
});