const { sequelize } = require('../../config/database');
const { models } = require('../../models');
const Operator = models.Operator;

describe('Operator Model', () => {
  beforeEach(async () => {
    // Ensure clean state for each test
    await Operator.destroy({ where: {}, force: true });
  });

  describe('Model Creation', () => {
    test('should create an Operator with valid data', async () => {
      const operatorData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        status: 'offline'
      };

      const operator = await Operator.create(operatorData);

      expect(operator).toBeDefined();
      expect(operator.id).toBeDefined();
      expect(operator.name).toBe('John Doe');
      expect(operator.email).toBe('john.doe@example.com');
      expect(operator.status).toBe('offline');
      expect(operator.lastActiveAt).toBeDefined();
      expect(operator.createdAt).toBeDefined();
      expect(operator.updatedAt).toBeDefined();
    });

    test('should generate UUID for id field', async () => {
      const operator = await Operator.create({
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      });

      expect(operator.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should set default status to offline', async () => {
      const operator = await Operator.create({
        name: 'Test Operator',
        email: 'test@example.com'
      });

      expect(operator.status).toBe('offline');
    });

    test('should set default lastActiveAt to current time', async () => {
      const beforeCreate = new Date();
      const operator = await Operator.create({
        name: 'Test Operator',
        email: 'test@example.com'
      });
      const afterCreate = new Date();

      expect(operator.lastActiveAt).toBeDefined();
      expect(operator.lastActiveAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(operator.lastActiveAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Validation', () => {
    test('should require name', async () => {
      await expect(Operator.create({
        email: 'test@example.com'
      })).rejects.toThrow();
    });

    test('should not allow empty name', async () => {
      await expect(Operator.create({
        name: '',
        email: 'test@example.com'
      })).rejects.toThrow('Name cannot be empty');
    });

    test('should not allow name longer than 100 characters', async () => {
      const longName = 'a'.repeat(101);
      await expect(Operator.create({
        name: longName,
        email: 'test@example.com'
      })).rejects.toThrow();
    });

    test('should require email', async () => {
      await expect(Operator.create({
        name: 'Test Operator'
      })).rejects.toThrow();
    });

    test('should not allow empty email', async () => {
      await expect(Operator.create({
        name: 'Test Operator',
        email: ''
      })).rejects.toThrow('Email cannot be empty');
    });

    test('should validate email format', async () => {
      await expect(Operator.create({
        name: 'Test Operator',
        email: 'invalid-email'
      })).rejects.toThrow('Must be a valid email address');
    });

    test('should not allow duplicate emails', async () => {
      await Operator.create({
        name: 'First Operator',
        email: 'test@example.com'
      });

      await expect(Operator.create({
        name: 'Second Operator',
        email: 'test@example.com'
      })).rejects.toThrow();
    });

    test('should validate status enum values', async () => {
      await expect(Operator.create({
        name: 'Test Operator',
        email: 'test@example.com',
        status: 'invalid-status'
      })).rejects.toThrow();
    });

    test('should allow valid status values', async () => {
      const validStatuses = ['online', 'offline', 'busy'];
      
      for (let i = 0; i < validStatuses.length; i++) {
        const status = validStatuses[i];
        const operator = await Operator.create({
          name: `Test Operator ${i}`,
          email: `test${i}@example.com`,
          status: status
        });
        expect(operator.status).toBe(status);
      }
    });

    test('should validate lastActiveAt as date', async () => {
      await expect(Operator.create({
        name: 'Test Operator',
        email: 'test@example.com',
        lastActiveAt: 'invalid-date'
      })).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let operator;

    beforeEach(async () => {
      operator = await Operator.create({
        name: 'Test Operator',
        email: 'test@example.com',
        status: 'offline'
      });
    });

    test('setOnline() should set status to online and update lastActiveAt', async () => {
      const beforeUpdate = new Date();
      await operator.setOnline();
      const afterUpdate = new Date();

      expect(operator.status).toBe('online');
      expect(operator.lastActiveAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(operator.lastActiveAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    test('setOffline() should set status to offline', async () => {
      await operator.setOffline();
      expect(operator.status).toBe('offline');
    });

    test('setBusy() should set status to busy and update lastActiveAt', async () => {
      const beforeUpdate = new Date();
      await operator.setBusy();
      const afterUpdate = new Date();

      expect(operator.status).toBe('busy');
      expect(operator.lastActiveAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(operator.lastActiveAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    test('isOnline() should return correct boolean', async () => {
      expect(operator.isOnline()).toBe(false);
      
      await operator.setOnline();
      expect(operator.isOnline()).toBe(true);
    });

    test('isOffline() should return correct boolean', async () => {
      expect(operator.isOffline()).toBe(true);
      
      await operator.setOnline();
      expect(operator.isOffline()).toBe(false);
    });

    test('isBusy() should return correct boolean', async () => {
      expect(operator.isBusy()).toBe(false);
      
      await operator.setBusy();
      expect(operator.isBusy()).toBe(true);
    });

    test('isAvailable() should return true only when online', async () => {
      expect(operator.isAvailable()).toBe(false);
      
      await operator.setOnline();
      expect(operator.isAvailable()).toBe(true);
      
      await operator.setBusy();
      expect(operator.isAvailable()).toBe(false);
    });

    test('updateLastActive() should update lastActiveAt timestamp', async () => {
      const originalLastActive = operator.lastActiveAt;
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await operator.updateLastActive();
      
      expect(operator.lastActiveAt.getTime()).toBeGreaterThan(originalLastActive.getTime());
    });
  });

  describe('Class Methods', () => {
    beforeEach(async () => {
      // Create test data
      await Operator.bulkCreate([
        { name: 'Online Operator 1', email: 'online1@example.com', status: 'online', lastActiveAt: new Date(Date.now() - 1000) },
        { name: 'Online Operator 2', email: 'online2@example.com', status: 'online', lastActiveAt: new Date() },
        { name: 'Offline Operator', email: 'offline@example.com', status: 'offline' },
        { name: 'Busy Operator', email: 'busy@example.com', status: 'busy' }
      ]);
    });

    test('findOnline() should return only online operators ordered by lastActiveAt', async () => {
      const onlineOperators = await Operator.findOnline();
      
      expect(onlineOperators).toHaveLength(2);
      expect(onlineOperators[0].status).toBe('online');
      expect(onlineOperators[1].status).toBe('online');
      // Should be ordered by lastActiveAt DESC (most recent first)
      expect(onlineOperators[0].lastActiveAt.getTime()).toBeGreaterThanOrEqual(onlineOperators[1].lastActiveAt.getTime());
    });

    test('findAvailable() should return only online operators', async () => {
      const availableOperators = await Operator.findAvailable();
      
      expect(availableOperators).toHaveLength(2);
      availableOperators.forEach(operator => {
        expect(operator.status).toBe('online');
      });
    });

    test('findByEmail() should return operator with matching email', async () => {
      const operator = await Operator.findByEmail('online1@example.com');
      
      expect(operator).toBeDefined();
      expect(operator.email).toBe('online1@example.com');
      expect(operator.name).toBe('Online Operator 1');
    });

    test('findByEmail() should be case insensitive', async () => {
      const operator = await Operator.findByEmail('ONLINE1@EXAMPLE.COM');
      
      expect(operator).toBeDefined();
      expect(operator.email).toBe('online1@example.com');
    });

    test('findByEmail() should return null for non-existent email', async () => {
      const operator = await Operator.findByEmail('nonexistent@example.com');
      expect(operator).toBeNull();
    });

    test('countOnline() should return correct count of online operators', async () => {
      const count = await Operator.countOnline();
      expect(count).toBe(2);
    });

    test('countByStatus() should return correct count for each status', async () => {
      const onlineCount = await Operator.countByStatus('online');
      const offlineCount = await Operator.countByStatus('offline');
      const busyCount = await Operator.countByStatus('busy');
      
      expect(onlineCount).toBe(2);
      expect(offlineCount).toBe(1);
      expect(busyCount).toBe(1);
    });

    test('findMostRecentlyActive() should return operators ordered by lastActiveAt', async () => {
      const operators = await Operator.findMostRecentlyActive(3);
      
      expect(operators).toHaveLength(3);
      // Should be ordered by lastActiveAt DESC
      for (let i = 0; i < operators.length - 1; i++) {
        expect(operators[i].lastActiveAt.getTime()).toBeGreaterThanOrEqual(operators[i + 1].lastActiveAt.getTime());
      }
    });

    test('findMostRecentlyActive() should respect limit parameter', async () => {
      const operators = await Operator.findMostRecentlyActive(2);
      expect(operators).toHaveLength(2);
    });
  });

  describe('Hooks', () => {
    test('should normalize email to lowercase on save', async () => {
      const operator = await Operator.create({
        name: 'Test Operator',
        email: 'TEST@EXAMPLE.COM'
      });

      expect(operator.email).toBe('test@example.com');
    });

    test('should trim email whitespace on save', async () => {
      const operator = await Operator.create({
        name: 'Test Operator',
        email: '  test@example.com  '
      });

      expect(operator.email).toBe('test@example.com');
    });

    test('should trim name whitespace on save', async () => {
      const operator = await Operator.create({
        name: '  Test Operator  ',
        email: 'test@example.com'
      });

      expect(operator.name).toBe('Test Operator');
    });

    test('should update lastActiveAt when status changes to online', async () => {
      const operator = await Operator.create({
        name: 'Test Operator',
        email: 'test@example.com',
        status: 'offline'
      });

      const originalLastActive = operator.lastActiveAt;
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      operator.status = 'online';
      await operator.save();

      expect(operator.lastActiveAt.getTime()).toBeGreaterThan(originalLastActive.getTime());
    });

    test('should not update lastActiveAt when status changes to offline', async () => {
      const operator = await Operator.create({
        name: 'Test Operator',
        email: 'test@example.com',
        status: 'online'
      });

      const originalLastActive = operator.lastActiveAt;
      
      // Wait a small amount to ensure we can detect if timestamp changed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      operator.status = 'offline';
      await operator.save();

      expect(operator.lastActiveAt.getTime()).toBe(originalLastActive.getTime());
    });
  });

  describe('Database Indexes', () => {
    test('should create operator and query by email efficiently', async () => {
      await Operator.create({
        name: 'Indexed Operator',
        email: 'indexed@example.com'
      });

      const operator = await Operator.findOne({
        where: { email: 'indexed@example.com' }
      });

      expect(operator).toBeDefined();
      expect(operator.email).toBe('indexed@example.com');
    });

    test('should query by status efficiently', async () => {
      await Operator.bulkCreate([
        { name: 'Online Op 1', email: 'online1@test.com', status: 'online' },
        { name: 'Online Op 2', email: 'online2@test.com', status: 'online' },
        { name: 'Offline Op', email: 'offline@test.com', status: 'offline' }
      ]);

      const onlineOperators = await Operator.findAll({
        where: { status: 'online' }
      });

      expect(onlineOperators).toHaveLength(2);
      onlineOperators.forEach(operator => {
        expect(operator.status).toBe('online');
      });
    });

    test('should enforce unique email constraint', async () => {
      await Operator.create({
        name: 'First Operator',
        email: 'unique@example.com'
      });

      await expect(Operator.create({
        name: 'Second Operator',
        email: 'unique@example.com'
      })).rejects.toThrow();
    });
  });

  describe('Associations', () => {
    test('should have sessions association defined', () => {
      expect(Operator.associations.sessions).toBeDefined();
      expect(Operator.associations.sessions.associationType).toBe('HasMany');
    });
  });
});