# Routes API 文档

本目录包含了实时客服聊天系统的所有路由处理器，提供完整的 RESTful API 和 WebSocket 实时通信功能。

## 目录结构

```
routes/
├── index.js         # 主路由 + Socket.IO 实时通信
├── chat.js          # 聊天会话和消息管理
├── operator.js      # 客服管理（旧版本）
├── operators.js     # 客服管理（新版本，推荐使用）
└── users.js         # 用户管理（基础实现）
```

## 1. index.js - 主路由和实时通信

这是系统的核心路由文件，集成了 Socket.IO 实时通信和基本的 HTTP 路由。

### 主要功能
- **WebSocket 实时通信**: 使用 Socket.IO 处理实时聊天事件
- **视频会议支持**: WebRTC 信令处理和房间管理
- **聊天会话管理**: 用户和客服的实时交互
- **通知系统**: 新消息、客服状态变更等实时通知

### Socket.IO 事件处理器

#### 视频会议相关事件
- `create-new-room` - 创建新的会议房间
- `join-room` - 加入现有会议房间
- `conn-signal` - WebRTC 信令转发
- `conn-init` - 初始化对等连接
- `direct-message` - 直接消息发送

#### 聊天相关事件
- `user-join-chat` - 用户加入聊天
- `user-send-message` - 用户发送消息
- `operator-join-session` - 客服加入会话
- `operator-send-message` - 客服发送消息
- `operator-status-change` - 客服状态变更
- `operator-typing` - 客服输入指示器
- `operator-stop-typing` - 客服停止输入
- `get-message-history` - 获取消息历史
- `operator-end-session` - 客服结束会话
- `operator-reconnect-session` - 客服重连会话

### HTTP 路由
```http
GET /api/room-exists/:roomId - 检查房间是否存在
```

## 2. chat.js - 聊天管理 API

提供完整的聊天会话和消息管理功能。

### 会话管理 API

#### 获取活跃会话列表
```http
GET /api/chat/sessions/active
```
**查询参数:**
- `limit` - 返回数量限制 (默认: 50)
- `offset` - 偏移量 (默认: 0)

**响应示例:**
```json
{
  "success": true,
  "data": {
    "sessions": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50,
      "offset": 0
    }
  }
}
```

#### 获取历史会话列表
```http
GET /api/chat/sessions/history
```
**查询参数:**
- `page` - 页码 (默认: 1)
- `limit` - 每页数量 (默认: 100)
- `keyword` - 搜索关键词
- `status` - 会话状态过滤
- `startDate` - 开始日期
- `endDate` - 结束日期
- `includeMessages` - 是否包含消息 (默认: false)

#### 获取用户会话列表
```http
GET /api/chat/sessions/:userId
```
**查询参数:**
- `includeMessages` - 是否包含消息
- `includeOperator` - 是否包含客服信息
- `status` - 会话状态过滤
- `limit` - 限制数量
- `offset` - 偏移量

#### 创建聊天会话
```http
POST /api/chat/sessions
```
**请求体:**
```json
{
  "userId": "user123"
}
```

#### 关闭聊天会话
```http
PUT /api/chat/sessions/:sessionId/close
```
**请求体:**
```json
{
  "closedBy": "operator123"
}
```

### 消息管理 API

#### 获取会话消息历史
```http
GET /api/chat/messages/:sessionId
```
**查询参数:**
- `limit` - 消息数量限制 (默认: 50, 最大: 100)
- `offset` - 偏移量 (默认: 0)
- `order` - 排序方式 (ASC/DESC, 默认: ASC)
- `includeRead` - 是否包含已读消息 (默认: true)
- `messageType` - 消息类型过滤

#### 标记消息为已读
```http
PUT /api/chat/messages/:sessionId/read
```
**请求体:**
```json
{
  "readBy": "operator123"
}
```

#### 获取未读消息数量
```http
GET /api/chat/messages/:sessionId/unread-count
```

## 3. operators.js - 客服管理 API (推荐使用)

提供完整的客服管理功能，包括状态管理、会话分配、统计信息等。

### 客服查询 API

#### 获取所有客服列表
```http
GET /api/operators
```
**查询参数:**
- `status` - 客服状态过滤 (online/offline/busy)
- `includeStats` - 是否包含统计信息 (默认: false)
- `includeActiveSessions` - 是否包含活跃会话 (默认: false)
- `limit` - 限制数量 (默认: 50, 最大: 100)
- `offset` - 偏移量 (默认: 0)

#### 获取在线客服列表
```http
GET /api/operators/online
```
**查询参数:**
- `includeStats` - 是否包含统计信息

#### 获取可用客服列表
```http
GET /api/operators/available
```

#### 获取单个客服信息
```http
GET /api/operators/:id
```
**查询参数:**
- `includeActiveSessions` - 是否包含活跃会话

#### 获取客服统计信息
```http
GET /api/operators/stats
```

### 客服状态管理 API

#### 更新客服状态
```http
PUT /api/operators/:id/status
```
**请求体:**
```json
{
  "status": "online" // online/offline/busy
}
```

#### 更新客服最后活跃时间
```http
PUT /api/operators/:id/last-active
```

#### 批量更新客服状态
```http
PUT /api/operators/batch/status
```
**请求体:**
```json
{
  "operatorIds": ["op1", "op2", "op3"],
  "status": "online"
}
```

### 客服会话管理 API

#### 获取客服的活跃会话
```http
GET /api/operators/:id/sessions
```

#### 分配客服到会话
```http
POST /api/operators/:id/assign-session
```
**请求体:**
```json
{
  "sessionId": "session123"
}
```

#### 智能分配客服
```http
POST /api/operators/assign
```
**请求体:**
```json
{
  "preferredOperatorId": "op1", // 可选，偏好客服
  "excludeOperatorIds": ["op2", "op3"], // 可选，排除的客服
  "strategy": "round_robin" // 分配策略: round_robin/least_busy/most_recent
}
```

## 4. operator.js - 客服管理 API (旧版本)

这是旧版本的客服管理 API，建议使用 `operators.js`。

### 主要功能
- 获取在线/可用客服列表
- 客服状态更新
- 客服会话管理
- 智能分配客服
- 客服统计信息

### 主要 API 端点
```http
GET /api/operators/online
GET /api/operators/available
GET /api/operators/:operatorId/status
PUT /api/operators/:operatorId/status
GET /api/operators/:operatorId/sessions
POST /api/operators/:operatorId/assign-session
GET /api/operators/pending-sessions
GET /api/operators/active-sessions
GET /api/operators/stats
POST /api/operators/assign
PUT /api/operators/batch-status
```

## 5. users.js - 用户管理 API

提供基础的用户管理功能。

### API 端点
```http
GET /api/users - 获取用户列表
```

## 数据模型

### 聊天会话状态
- `waiting` - 等待客服接入
- `active` - 活跃聊天中
- `completed` - 已完成
- `closed` - 已关闭
- `timeout` - 超时
- `cancelled` - 已取消

### 客服状态
- `online` - 在线
- `offline` - 离线
- `busy` - 忙碌

### 消息类型
- `text` - 文本消息
- `image` - 图片消息
- `system` - 系统消息

## 错误处理

所有 API 都遵循统一的错误响应格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细信息"
  }
}
```

### 常见错误码
- `MISSING_USER_ID` - 缺少用户ID
- `MISSING_SESSION_ID` - 缺少会话ID
- `MISSING_OPERATOR_ID` - 缺少客服ID
- `SESSION_NOT_FOUND` - 会话不存在
- `OPERATOR_NOT_FOUND` - 客服不存在
- `INTERNAL_ERROR` - 内部服务器错误
- `INVALID_LIMIT` - 无效的限制参数
- `INVALID_OFFSET` - 无效的偏移参数

## 实时事件

### 客服相关事件
- `operator-status-changed` - 客服状态变更
- `operator-joined` - 客服加入会话
- `operator-session-joined` - 客服成功加入会话
- `new-chat-notification` - 新聊天通知
- `new-message-notification` - 新消息通知

### 会话相关事件
- `chat-session-created` - 聊天会话创建
- `message-received` - 消息接收
- `message-history` - 消息历史
- `session-ended` - 会话结束
- `participant-disconnected` - 参与者断开连接

### 输入指示器事件
- `typing-indicator` - 输入指示器
- `stop-typing-indicator` - 停止输入指示器

## 中间件

路由使用了以下中间件进行验证和格式化：

- `validateChatSession` - 聊天会话验证
- `validateMessage` - 消息验证
- `validateSessionId` - 会话ID验证
- `validateUserId` - 用户ID验证
- `validatePagination` - 分页参数验证
- `validateMessageQuery` - 消息查询验证
- `validateOperatorId` - 客服ID验证
- `validateOperatorStatus` - 客服状态验证
- `validateBatchOperation` - 批量操作验证
- `validateOperatorAssignment` - 客服分配验证

## 使用示例

### 创建聊天会话
```javascript
// 创建会话
const response = await fetch('/api/chat/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user123' })
});

const data = await response.json();
if (data.success) {
  console.log('会话创建成功:', data.data.session);
}
```

### 获取在线客服
```javascript
// 获取在线客服列表
const response = await fetch('/api/operators/online?includeStats=true');
const data = await response.json();
if (data.success) {
  console.log('在线客服:', data.data.operators);
}
```

### 智能分配客服
```javascript
// 智能分配客服
const response = await fetch('/api/operators/assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategy: 'least_busy',
    excludeOperatorIds: ['op1', 'op2']
  })
});

const data = await response.json();
if (data.success) {
  console.log('分配的客服:', data.data.operator);
}
```

## 注意事项

1. **API 版本**: `operators.js` 是新版本，功能更完整，建议优先使用
2. **实时通信**: 所有实时功能都通过 Socket.IO 事件处理
3. **错误处理**: 所有 API 都包含完整的错误处理和状态码
4. **数据验证**: 使用中间件进行输入验证，确保数据安全性
5. **分页支持**: 列表查询都支持分页，避免大量数据传输
6. **状态管理**: 客服和会话都有完整的状态管理机制