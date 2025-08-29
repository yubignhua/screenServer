# 数据库设置和初始化

如何设置和初始化客服聊天系统的数据库。

## 数据库模型

系统包含三个主要数据模型：

### 1. Operator (客服操作员)
- `id`: UUID 主键
- `name`: 客服姓名
- `email`: 客服邮箱 (唯一)
- `status`: 状态 ('online', 'offline', 'busy')
- `lastActiveAt`: 最后活跃时间

### 2. ChatSession (聊天会话)
- `id`: UUID 主键
- `userId`: 用户ID
- `operatorId`: 客服ID (外键，可为空)
- `status`: 会话状态 ('waiting', 'active', 'closed')
- `closedAt`: 关闭时间

### 3. ChatMessage (聊天消息)
- `id`: UUID 主键
- `sessionId`: 会话ID (外键)
- `senderId`: 发送者ID
- `senderType`: 发送者类型 ('user', 'operator')
- `messageType`: 消息类型 ('text', 'image', 'system')
- `content`: 消息内容
- `isRead`: 是否已读

## 模型关联关系

- **ChatSession** 与 **ChatMessage**: 一对多关系
  - 一个会话可以有多条消息
  - 每条消息属于一个会话

- **Operator** 与 **ChatSession**: 一对多关系
  - 一个客服可以处理多个会话
  - 每个会话可以分配给一个客服（或无客服）

## 数据库初始化命令

### 基本初始化
```bash
# 初始化数据库（创建表结构）
npm run db:init

# 强制重新创建所有表
npm run db:init:force
```

### 种子数据
```bash
# 添加示例数据
npm run db:seed

# 重置数据库并添加示例数据
npm run db:reset
```

### 测试和验证
```bash
# 测试数据库连接和关联关系
npm run db:test
```

## 直接使用脚本

你也可以直接使用初始化脚本：

```bash
# 基本初始化
node scripts/init-database.js

# 强制重新创建表
node scripts/init-database.js --force

# 添加示例数据
node scripts/init-database.js --seed

# 测试连接和关联
node scripts/init-database.js --test

# 组合选项
node scripts/init-database.js --force --seed --test
```

## 示例数据

运行 `npm run db:seed` 会创建以下示例数据：

### 客服操作员
1. **Alice Johnson** (operator1@example.com) - 在线状态
2. **Bob Smith** (operator2@example.com) - 离线状态

## 环境配置

确保你的 `.env` 文件包含正确的数据库配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
```

## 故障排除

### 连接错误
- 检查数据库服务是否运行
- 验证 `.env` 文件中的数据库配置
- 确保数据库用户有足够的权限

### 表创建失败
- 检查数据库用户是否有 CREATE 权限
- 验证数据库名称是否存在
- 查看控制台输出的具体错误信息

### 关联测试失败
- 确保所有表都已正确创建
- 检查外键约束是否正确设置
- 验证模型定义中的关联配置

## 开发建议

1. **开发环境**: 使用 `npm run db:reset` 快速重置数据库
2. **测试环境**: 在运行测试前使用 `npm run db:test` 验证设置
3. **生产环境**: 只使用 `npm run db:init`，不要使用 `--force` 选项

## 数据库迁移

对于生产环境，建议创建专门的迁移脚本而不是使用 `--force` 选项，以保护现有数据。