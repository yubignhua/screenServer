const NotificationService = require('../../services/NotificationService');
const http = require('http');
const https = require('https');

// Mock http and https modules
jest.mock('http');
jest.mock('https');

describe('NotificationService', () => {
  let notificationService;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset environment variables
    process.env.ADMIN_NOTIFICATION_URL = 'http://localhost:3001/api/notifications';
    
    // Create fresh instance with autoProcess disabled for testing
    notificationService = new NotificationService({ autoProcess: false });
    
    // Mock request object
    mockRequest = {
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn()
    };
    
    // Mock response object
    mockResponse = {
      statusCode: 200,
      on: jest.fn()
    };
    
    // Mock http.request
    http.request = jest.fn().mockReturnValue(mockRequest);
    https.request = jest.fn().mockReturnValue(mockRequest);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    notificationService.clearQueue();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(notificationService.notificationUrl).toBe('http://localhost:3001/api/notifications');
      expect(notificationService.retryAttempts).toBe(3);
      expect(notificationService.retryDelay).toBe(1000);
      expect(notificationService.queue).toEqual([]);
      expect(notificationService.processing).toBe(false);
    });

    it('should warn when ADMIN_NOTIFICATION_URL is not configured', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.ADMIN_NOTIFICATION_URL;
      
      const service = new NotificationService({ autoProcess: false });
      
      expect(consoleSpy).toHaveBeenCalledWith('ADMIN_NOTIFICATION_URL not configured, notifications will be disabled');
      expect(service.notificationUrl).toBeUndefined();
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendNewChatNotification', () => {
    it('should add new chat notification to queue', async () => {
      const chatData = {
        sessionId: 'session-123',
        userId: 'user-456',
        message: 'Hello, I need help',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const result = await notificationService.sendNewChatNotification(chatData);

      expect(result).toBe(true);
      expect(notificationService.queue).toHaveLength(1);
      expect(notificationService.queue[0]).toMatchObject({
        type: 'new_chat',
        sessionId: 'session-123',
        userId: 'user-456',
        message: 'Hello, I need help',
        timestamp: '2024-01-01T10:00:00.000Z',
        attempts: 0
      });
      expect(notificationService.queue[0].id).toBeDefined();
    });

    it('should use current timestamp if not provided', async () => {
      const chatData = {
        sessionId: 'session-123',
        userId: 'user-456',
        message: 'Hello, I need help'
      };

      await notificationService.sendNewChatNotification(chatData);

      expect(notificationService.queue[0].timestamp).toBeDefined();
      expect(new Date(notificationService.queue[0].timestamp)).toBeInstanceOf(Date);
    });

    it('should return false when notification URL is not configured', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      notificationService.notificationUrl = null;

      const chatData = {
        sessionId: 'session-123',
        userId: 'user-456',
        message: 'Hello, I need help'
      };

      const result = await notificationService.sendNewChatNotification(chatData);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Notification URL not configured, skipping notification');
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendMessageNotification', () => {
    it('should add message notification to queue', async () => {
      const messageData = {
        sessionId: 'session-123',
        senderId: 'user-456',
        senderType: 'user',
        content: 'This is a test message',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const result = await notificationService.sendMessageNotification(messageData);

      expect(result).toBe(true);
      expect(notificationService.queue).toHaveLength(1);
      expect(notificationService.queue[0]).toMatchObject({
        type: 'new_message',
        sessionId: 'session-123',
        senderId: 'user-456',
        senderType: 'user',
        content: 'This is a test message',
        timestamp: '2024-01-01T10:00:00.000Z',
        attempts: 0
      });
    });
  });

  describe('sendHttpNotification', () => {
    it('should send HTTP notification successfully', async () => {
      const notification = {
        type: 'new_chat',
        sessionId: 'session-123',
        userId: 'user-456',
        id: 'notif-123'
      };

      // Mock successful response
      mockRequest.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          // Store error callback but don't call it
        } else if (event === 'timeout') {
          // Store timeout callback but don't call it
        }
      });

      http.request.mockImplementation((options, callback) => {
        // Simulate successful response
        setTimeout(() => {
          mockResponse.on.mockImplementation((event, callback) => {
            if (event === 'data') {
              callback('{"success": true}');
            } else if (event === 'end') {
              callback();
            }
          });
          callback(mockResponse);
        }, 0);
        return mockRequest;
      });

      const result = await notificationService.sendHttpNotification(notification);

      expect(result).toBe(true);
      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'localhost',
          port: '3001',
          path: '/api/notifications',
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'CustomerServiceChat/1.0'
          })
        }),
        expect.any(Function)
      );
    });

    it('should handle HTTP error responses', async () => {
      const notification = {
        type: 'new_chat',
        sessionId: 'session-123',
        id: 'notif-123'
      };

      mockResponse.statusCode = 500;

      http.request.mockImplementation((options, callback) => {
        setTimeout(() => {
          mockResponse.on.mockImplementation((event, callback) => {
            if (event === 'data') {
              callback('{"error": "Internal Server Error"}');
            } else if (event === 'end') {
              callback();
            }
          });
          callback(mockResponse);
        }, 0);
        return mockRequest;
      });

      const result = await notificationService.sendHttpNotification(notification);

      expect(result).toBe(false);
    });

    it('should handle request errors', async () => {
      const notification = {
        type: 'new_chat',
        sessionId: 'session-123',
        id: 'notif-123'
      };

      mockRequest.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection failed')), 0);
        }
      });

      const result = await notificationService.sendHttpNotification(notification);

      expect(result).toBe(false);
    });

    it('should handle request timeout', async () => {
      const notification = {
        type: 'new_chat',
        sessionId: 'session-123',
        id: 'notif-123'
      };

      mockRequest.on.mockImplementation((event, callback) => {
        if (event === 'timeout') {
          setTimeout(() => callback(), 0);
        }
      });

      const result = await notificationService.sendHttpNotification(notification);

      expect(result).toBe(false);
      expect(mockRequest.destroy).toHaveBeenCalled();
    });

    it('should use HTTPS for HTTPS URLs', async () => {
      process.env.ADMIN_NOTIFICATION_URL = 'https://secure.example.com/api/notifications';
      const service = new NotificationService({ autoProcess: false });

      const notification = {
        type: 'new_chat',
        sessionId: 'session-123',
        id: 'notif-123'
      };

      https.request.mockImplementation((options, callback) => {
        setTimeout(() => {
          mockResponse.on.mockImplementation((event, callback) => {
            if (event === 'data') callback('{}');
            else if (event === 'end') callback();
          });
          callback(mockResponse);
        }, 0);
        return mockRequest;
      });

      await service.sendHttpNotification(notification);

      expect(https.request).toHaveBeenCalled();
      expect(http.request).not.toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    it('should process queue items sequentially', async () => {
      // Mock successful HTTP requests
      http.request.mockImplementation((options, callback) => {
        setTimeout(() => {
          mockResponse.on.mockImplementation((event, callback) => {
            if (event === 'data') callback('{}');
            else if (event === 'end') callback();
          });
          callback(mockResponse);
        }, 0);
        return mockRequest;
      });

      // Add multiple notifications
      await notificationService.sendNewChatNotification({
        sessionId: 'session-1',
        userId: 'user-1',
        message: 'Message 1'
      });

      await notificationService.sendMessageNotification({
        sessionId: 'session-2',
        senderId: 'user-2',
        senderType: 'user',
        content: 'Message 2'
      });

      // Manually trigger processing since autoProcess is disabled
      await notificationService.processQueue();

      expect(notificationService.queue).toHaveLength(0);
      expect(notificationService.processing).toBe(false);
    });

    it('should retry failed notifications', async () => {
      let callCount = 0;
      
      http.request.mockImplementation((options, callback) => {
        callCount++;
        setTimeout(() => {
          if (callCount < 3) {
            // Fail first 2 attempts
            mockResponse.statusCode = 500;
          } else {
            // Succeed on 3rd attempt
            mockResponse.statusCode = 200;
          }
          
          mockResponse.on.mockImplementation((event, callback) => {
            if (event === 'data') callback('{}');
            else if (event === 'end') callback();
          });
          callback(mockResponse);
        }, 10); // Small delay to allow for retry logic
        return mockRequest;
      });

      // Manually add to queue and process to have more control
      await notificationService.addToQueue({
        type: 'new_chat',
        sessionId: 'session-1',
        userId: 'user-1',
        message: 'Message 1'
      });

      // Manually trigger processing
      await notificationService.processQueue();

      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('utility methods', () => {
    it('should generate unique notification IDs', () => {
      const id1 = notificationService.generateNotificationId();
      const id2 = notificationService.generateNotificationId();

      expect(id1).toMatch(/^notif_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^notif_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should return correct queue status', () => {
      const status = notificationService.getQueueStatus();

      expect(status).toEqual({
        queueLength: 0,
        processing: false,
        configured: true
      });
    });

    it('should clear queue', () => {
      notificationService.queue = [{ id: 'test' }];
      notificationService.processing = true;

      notificationService.clearQueue();

      expect(notificationService.queue).toEqual([]);
      expect(notificationService.processing).toBe(false);
    });

    it('should delay execution', async () => {
      const start = Date.now();
      await notificationService.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});