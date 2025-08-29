const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * NotificationService - 处理向后台管理系统发送通知
 * 支持重试机制和队列管理
 */
class NotificationService {
  constructor(options = {}) {
    this.notificationUrl = process.env.ADMIN_NOTIFICATION_URL;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1秒
    this.queue = [];
    this.processing = false;
    this.autoProcess = options.autoProcess !== false; // Default to true
    
    if (!this.notificationUrl) {
      console.warn('ADMIN_NOTIFICATION_URL not configured, notifications will be disabled');
    }
  }

  /**
   * 发送新聊天通知到后台管理系统
   * @param {Object} chatData - 聊天数据
   * @param {string} chatData.sessionId - 会话ID
   * @param {string} chatData.userId - 用户ID
   * @param {string} chatData.message - 消息内容
   * @param {Date} chatData.timestamp - 时间戳
   * @returns {Promise<boolean>} 发送是否成功
   */
  async sendNewChatNotification(chatData) {
    const notification = {
      type: 'new_chat',
      sessionId: chatData.sessionId,
      userId: chatData.userId,
      message: chatData.message,
      timestamp: chatData.timestamp ? chatData.timestamp.toISOString() : new Date().toISOString()
    };

    return this.addToQueue(notification);
  }

  /**
   * 发送消息通知到后台管理系统
   * @param {Object} messageData - 消息数据
   * @param {string} messageData.sessionId - 会话ID
   * @param {string} messageData.senderId - 发送者ID
   * @param {string} messageData.senderType - 发送者类型 (user/operator)
   * @param {string} messageData.content - 消息内容
   * @param {Date} messageData.timestamp - 时间戳
   * @returns {Promise<boolean>} 发送是否成功
   */
  async sendMessageNotification(messageData) {
    const notification = {
      type: 'new_message',
      sessionId: messageData.sessionId,
      senderId: messageData.senderId,
      senderType: messageData.senderType,
      content: messageData.content,
      timestamp: messageData.timestamp ? messageData.timestamp.toISOString() : new Date().toISOString()
    };

    return this.addToQueue(notification);
  }

  /**
   * 添加通知到队列
   * @param {Object} notification - 通知数据
   * @returns {Promise<boolean>} 是否成功添加到队列
   */
  async addToQueue(notification) {
    if (!this.notificationUrl) {
      console.warn('Notification URL not configured, skipping notification');
      return false;
    }

    this.queue.push({
      ...notification,
      attempts: 0,
      id: this.generateNotificationId()
    });

    // 如果队列没有在处理且自动处理开启，开始处理
    if (!this.processing && this.autoProcess) {
      // Don't await here to avoid blocking the caller
      setImmediate(() => this.processQueue());
    }

    return true;
  }

  /**
   * 处理通知队列
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      
      try {
        const success = await this.sendHttpNotification(notification);
        
        if (!success) {
          // 如果发送失败且还有重试次数，重新加入队列
          if (notification.attempts < this.retryAttempts) {
            notification.attempts++;
            this.queue.push(notification);
            
            // 等待重试延迟
            await this.delay(this.retryDelay * notification.attempts);
          } else {
            console.error(`Notification failed after ${this.retryAttempts} attempts:`, notification.id);
          }
        }
      } catch (error) {
        console.error('Error processing notification:', error);
        
        // 重试逻辑
        if (notification.attempts < this.retryAttempts) {
          notification.attempts++;
          this.queue.push(notification);
          await this.delay(this.retryDelay * notification.attempts);
        }
      }
    }

    this.processing = false;
  }

  /**
   * 发送HTTP通知
   * @param {Object} notification - 通知数据
   * @returns {Promise<boolean>} 发送是否成功
   */
  async sendHttpNotification(notification) {
    return new Promise((resolve) => {
      if (!this.notificationUrl) {
        resolve(false);
        return;
      }

      try {
        const url = new URL(this.notificationUrl);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const postData = JSON.stringify(notification);
        
        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'CustomerServiceChat/1.0'
          },
          timeout: 10000 // 10秒超时
        };

        const req = client.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`Notification sent successfully: ${notification.id}`);
              resolve(true);
            } else {
              console.error(`Notification failed with status ${res.statusCode}: ${notification.id}`);
              resolve(false);
            }
          });
        });

        req.on('error', (error) => {
          console.error(`Notification request error: ${error.message}`);
          resolve(false);
        });

        req.on('timeout', () => {
          console.error(`Notification request timeout: ${notification.id}`);
          req.destroy();
          resolve(false);
        });

        req.write(postData);
        req.end();

      } catch (error) {
        console.error(`Error creating notification request: ${error.message}`);
        resolve(false);
      }
    });
  }

  /**
   * 生成通知ID
   * @returns {string} 唯一通知ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取队列状态
   * @returns {Object} 队列状态信息
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      configured: !!this.notificationUrl
    };
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.queue = [];
    this.processing = false;
  }
}

module.exports = NotificationService;