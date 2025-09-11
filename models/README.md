# 数据库模型文档

本目录包含了实时客服聊天系统的所有 Sequelize 数据库模型，提供完整的数据持久化和关系映射功能。

## 目录结构

```
models/
├── index.js         # 模型初始化和数据库管理
├── ChatSession.js   # 聊天会话模型
├── ChatMessage.js   # 聊天消息模型
└── Operator.js      # 客服人员模型
```

## 1. index.js - 模型初始化和数据库管理

这是核心的模型初始化文件，负责所有模型的加载、关联关系建立和数据库管理功能。

### 主要功能

- **模型初始化**: 加载所有 Sequelize 模型并建立关联关系
- **数据库同步**: 提供数据库表创建和同步功能
- **数据种子**: 提供示例数据初始化功能
- **连接测试**: 数据库连接和模型关联关系验证

### 核心函数

#### 数据库初始化
```javascript
// 同步数据库（创建表）
await syncDatabase(force = false);

// 完整初始化（同步 + 种子数据）
await initializeDatabase({ force: false, seedData: false });
```

#### 数据库连接测试
```javascript
// 测试数据库连接和模型关联
await testDatabaseConnection();
```

#### 示例数据种子
```javascript
// 创建示例客服数据
await seedSampleData();
```

### 导出的模块

```javascript
module.exports = {
  sequelize,           // Sequelize 实例
  models,              // 所有模型对象
  syncDatabase,        // 数据库同步函数
  initializeDatabase,  // 数据库初始化函数
  seedSampleData,      // 数据种子函数
  testDatabaseConnection, // 连接测试函数
  ChatSession,         // 聊天会话模型
  ChatMessage,         // 聊天消息模型
  Operator            // 客服人员模型
};
```

## 2. ChatSession.js - 聊天会话模型

管理用户与客服之间的聊天会话数据。

### 数据字段

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| id | UUID | 主键, 非空 | 会话唯一标识符 |
| userId | STRING(255) | 非空 | 用户ID |
| operatorId | UUID | 可空 | 客服ID |
| status | ENUM | 非空, 默认 'waiting' | 会话状态 |
| closedAt | DATE | 可空 | 关闭时间 |

### 会话状态枚举

- `waiting` - 等待客服接入
- `active` - 活跃聊天中
- `completed` - 已完成
- `closed` - 已关闭
- `timeout` - 超时
- `cancelled` - 已取消

### 实例方法

#### 会话状态管理
```javascript
// 关闭会话
await session.close();

// 激活会话
await session.activate();

// 检查会话状态
session.isActive();    // 是否活跃
session.isClosed();    // 是否已关闭
session.isWaiting();   // 是否等待中
```

### 类方法

#### 会话查询
```javascript
// 查找用户的活跃会话
const session = await ChatSession.findActiveByUserId(userId);

// 查找客服的会话列表
const sessions = await ChatSession.findByOperatorId(operatorId);

// 统计客服活跃会话数
const count = await ChatSession.countActiveSessionsByOperator(operatorId);
```

### 模型关联

```javascript
// 一个会话有多条消息
ChatSession.hasMany(ChatMessage, {
  foreignKey: 'sessionId',
  as: 'messages'
});

// 一个会话属于一个客服
ChatSession.belongsTo(Operator, {
  foreignKey: 'operatorId',
  as: 'operator'
});
```

### 数据库索引

- `userId` - 用户查询索引
- `operatorId` - 客服查询索引
- `status` - 状态过滤索引
- `createdAt` - 时间排序索引

### 自动化钩子

- **beforeUpdate**: 当状态变为 'closed' 时自动设置 closedAt 时间

## 3. ChatMessage.js - 聊天消息模型

存储聊天会话中的所有消息数据。

### 数据字段

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| id | UUID | 主键, 非空 | 消息唯一标识符 |
| sessionId | UUID | 外键, 非空 | 所属会话ID |
| senderId | STRING(255) | 非空 | 发送者ID |
| senderType | ENUM | 非空 | 发送者类型 |
| messageType | ENUM | 非空, 默认 'text' | 消息类型 |
| content | TEXT | 非空 | 消息内容 |
| isRead | BOOLEAN | 默认 false | 是否已读 |

### 发送者类型枚举

- `user` - 普通用户
- `operator` - 客服人员
- `system` - 系统消息

### 消息类型枚举

- `text` - 文本消息
- `image` - 图片消息
- `system` - 系统消息

### 实例方法

#### 消息状态检查
```javascript
// 标记为已读
await message.markAsRead();

// 检查消息来源
message.isFromUser();      // 是否来自用户
message.isFromOperator();  // 是否来自客服
message.isFromSystem();    // 是否来自系统

// 检查消息类型
message.isTextMessage();   // 是否为文本消息
message.isImageMessage();  // 是否为图片消息
message.isSystemMessage(); // 是否为系统消息
```

### 类方法

#### 消息查询
```javascript
// 获取会话的所有消息
const messages = await ChatMessage.findBySessionId(sessionId);

// 获取会话的未读消息
const unread = await ChatMessage.findUnreadBySessionId(sessionId);

// 统计未读消息数量
const count = await ChatMessage.countUnreadBySessionId(sessionId);

// 获取最近消息
const recent = await ChatMessage.findRecentBySessionId(sessionId, 50);

// 标记所有消息为已读
await ChatMessage.markAllAsReadBySessionId(sessionId);
```

### 查询选项

```javascript
// 支持的查询参数
const options = {
  limit: 50,           // 消息数量限制 (默认: 50, 最大: 100)
  offset: 0,           // 偏移量 (默认: 0)
  order: 'ASC',        // 排序方式 (ASC/DESC, 默认: ASC)
  includeRead: true,   // 是否包含已读消息 (默认: true)
  messageType: 'text'  // 消息类型过滤
};
```

### 模型关联

```javascript
// 一条消息属于一个会话
ChatMessage.belongsTo(ChatSession, {
  foreignKey: 'sessionId',
  as: 'session'
});
```

### 数据库索引

- `sessionId` - 会话查询索引
- `senderId` - 发送者查询索引
- `senderType` - 发送者类型索引
- `messageType` - 消息类型索引
- `createdAt` - 时间排序索引
- `isRead` - 已读状态索引
- `sessionId + createdAt` - 复合索引用于优化查询

### 自动化钩子

- **beforeValidate**: 自动修剪消息内容的空白字符

## 4. Operator.js - 客服人员模型

管理客服人员的信息和状态。

### 数据字段

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| id | UUID | 主键, 非空 | 客服唯一标识符 |
| name | STRING(100) | 非空 | 客服姓名 |
| email | STRING(255) | 非空, 唯一 | 邮箱地址 |
| status | ENUM | 非空, 默认 'offline' | 客服状态 |
| lastActiveAt | DATE | 非空, 默认 NOW | 最后活跃时间 |

### 客服状态枚举

- `online` - 在线
- `offline` - 离线
- `busy` - 忙碌

### 实例方法

#### 状态管理
```javascript
// 设置在线状态
await operator.setOnline();

// 设置离线状态
await operator.setOffline();

// 设置忙碌状态
await operator.setBusy();

// 更新最后活跃时间
await operator.updateLastActive();

// 状态检查
operator.isOnline();    // 是否在线
operator.isOffline();   // 是否离线
operator.isBusy();      // 是否忙碌
operator.isAvailable(); // 是否可用（在线）
```

### 类方法

#### 客服查询
```javascript
// 查找在线客服
const onlineOperators = await Operator.findOnline();

// 查找可用客服
const availableOperators = await Operator.findAvailable();

// 通过邮箱查找客服
const operator = await Operator.findByEmail(email);

// 统计在线客服数量
const count = await Operator.countOnline();

// 按状态统计客服数量
const count = await Operator.countByStatus('online');

// 查找最近活跃的客服
const recent = await Operator.findMostRecentlyActive(10);
```

### 模型关联

```javascript
// 一个客服有多个会话
Operator.hasMany(ChatSession, {
  foreignKey: 'operatorId',
  as: 'sessions'
});
```

### 数据库索引

- `email` - 唯一索引
- `status` - 状态过滤索引
- `lastActiveAt` - 活跃时间索引
- `status + lastActiveAt` - 复合索引用于优化查询

### 自动化钩子

- **beforeValidate**: 
  - 邮箱地址转为小写并修剪
  - 姓名修剪空白字符
- **beforeUpdate**: 状态变为 'online' 时自动更新 lastActiveAt

## 数据库关系图

```
Operator (1) ←→ (N) ChatSession (1) ←→ (N) ChatMessage
    ↑                   ↑                    ↑
    │                   │                    │
  hasMany            belongsTo            belongsTo
    │                   │                    │
    └───────── sessions ─┘                    └── messages ─┘
```

### 关系说明

1. **Operator → ChatSession**: 一对多关系
   - 一个客服可以处理多个会话
   - 一个会话只属于一个客服

2. **ChatSession → ChatMessage**: 一对多关系
   - 一个会话包含多条消息
   - 一条消息只属于一个会话

## 数据库初始化流程

### 1. 创建数据库和表
```javascript
// 强制重新创建表
await syncDatabase(true);

// 只创建不存在的表
await syncDatabase(false);
```

### 2. 种子数据初始化
```javascript
// 创建示例客服数据
await seedSampleData();

// 示例数据包括：
// - operator1@example.com (Alice Johnson, online)
// - operator2@example.com (Bob Smith, offline)
```

### 3. 完整初始化流程
```javascript
// 完整初始化（同步 + 种子数据）
await initializeDatabase({
  force: false,      // 是否强制重建表
  seedData: true     // 是否创建种子数据
});
```

## 使用示例

### 创建客服和会话
```javascript
// 创建客服
const operator = await Operator.create({
  name: 'Alice Johnson',
  email: 'alice@example.com',
  status: 'online'
});

// 创建会话
const session = await ChatSession.create({
  userId: 'user123',
  operatorId: operator.id,
  status: 'active'
});

// 发送消息
const message = await ChatMessage.create({
  sessionId: session.id,
  senderId: 'user123',
  senderType: 'user',
  messageType: 'text',
  content: 'Hello, I need help!'
});
```

### 查询会话历史
```javascript
// 获取用户的所有会话
const sessions = await ChatSession.findAll({
  where: { userId: 'user123' },
  include: [
    { model: Operator, as: 'operator' },
    { model: ChatMessage, as: 'messages' }
  ],
  order: [['createdAt', 'DESC']]
});

// 获取会话的消息历史
const messages = await ChatMessage.findBySessionId(sessionId, {
  limit: 50,
  order: 'ASC'
});
```

### 客服状态管理
```javascript
// 获取所有在线客服
const onlineOperators = await Operator.findOnline();

// 更新客服状态
await operator.setOnline();
await operator.setBusy();

// 查找可用客服进行分配
const availableOperators = await Operator.findAvailable();
```

## 数据库优化

### 索引策略
- 所有外键字段都建立了索引
- 常用查询字段（status, createdAt）建立了索引
- 复合索引优化了常见查询模式

### 查询优化
- 使用 `include` 进行关联查询避免 N+1 问题
- 分页查询限制返回数据量
- 适当的字段选择减少数据传输

### 数据一致性
- 使用 Sequelize 的事务支持确保数据一致性
- 外键约束确保关联数据的完整性
- 验证规则确保数据质量

## 注意事项

1. **UUID 主键**: 所有模型使用 UUID 作为主键，避免 ID 冲突
2. **软删除**: 模型支持软删除，数据不会真正从数据库中删除
3. **时间戳**: 所有模型自动维护 createdAt 和 updatedAt 时间戳
4. **验证规则**: 严格的字段验证确保数据质量
5. **关联关系**: 完整的关联关系定义便于数据查询
6. **状态管理**: 完善的状态管理机制支持业务逻辑
7. **性能优化**: 合理的索引和查询优化确保系统性能