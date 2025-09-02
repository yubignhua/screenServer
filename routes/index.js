var express = require("express");
const { v4: uuidv4 } = require("uuid");
var router = express.Router();
var socketIo = require("socket.io");
var io;
let connectedUsers = [];
let rooms = [];

const ChatService = require('../services/ChatService');
const NotificationService = require('../services/NotificationService');
const OperatorService = require('../services/OperatorService');

// 初始化 notification 服务
const notificationService = new NotificationService();

// 存储活跃的聊天连接
let chatConnections = new Map(); // socketId -> { userId, sessionId, type: 'user'|'operator' }
// Store operator ID mapping: clientOperatorId -> actualOperatorId
let operatorIdMapping = new Map();
//创建路由验证房间是否存在
router.get("/api/room-exists/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.find((room) => room.id === roomId);
  console.log(JSON.stringify(room),'---room')

  let json = {
    code: "000000",
    codeExtra: "000000",
    message: "操作成功",
    object: { roomExists: true, full: true },
  };
  if (room) {
    //房间存在
    if (room.connectedUsers.length > 3) {
      //房间人数已满
      return res.send(json);
    } else {
      //房间可以加入
      json.object.full = false;
      return res.send(json);
    }
  } else {
    //房间不存在
    json.object.roomExists = false;
    return res.send(json);
  }
});

// module.exports = router;
module.exports = {
  indexRouter: router,
  init: function (server) {
    //初始化房间和用户
    // 传递server对象，初始化一个io实例
    const io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    // 服务器监听客户端socketIo连接
    io.on("connection", (socket) => {
      console.log(`用户已实现socket连接${socket.id}`);

      socket.on("create-new-room", (data) => {
        createNewRoomHandler(data, socket);
      });

      socket.on("join-room", (data) => {
        joinRoomHandler(data, socket);
      });

      socket.on("disconnect", () => {
        disconnectHandler(socket);
      });
      //接收客户端发送过来的信令数据并转发
      socket.on("conn-signal", (data) => {
        signalingHandler(data, socket);
      });
      
      //当另一方信令接收完成之后，需要返回给发起方
      socket.on("conn-init", (data) => {
        initializeConnectionHandler(data, socket);
      });
      socket.on("direct-message", (data) => {
        directMessageHandler(data, socket);
      });

      //  聊天事件处理器
      socket.on("user-join-chat", (data) => {
        userJoinChatHandler(data, socket);
      });

      socket.on("user-send-message", (data) => {
        userSendMessageHandler(data, socket);
      });

      socket.on("operator-join-session", (data) => {
        operatorJoinSessionHandler(data, socket);
      });

      socket.on("operator-send-message", (data) => {
        operatorSendMessageHandler(data, socket);
      });

      socket.on("operator-status-change", (data) => {
        operatorStatusChangeHandler(data, socket);
      });

      socket.on("operator-typing", (data) => {
        operatorTypingHandler(data, socket);
      });

      socket.on("operator-stop-typing", (data) => {
        operatorStopTypingHandler(data, socket);
      });

      socket.on("get-message-history", (data) => {
        getMessageHistoryHandler(data, socket);
      });

      socket.on("operator-end-session", (data) => {
        operatorEndSessionHandler(data, socket);
      });

      socket.on("operator-reconnect-session", (data) => {
        operatorReconnectSessionHandler(data, socket);
      });
    });

    // socket.io handler
    const createNewRoomHandler = (data, socket) => {
      console.log("主持人正在创建会议房间...");

      const { identity, onlyAudio } = data;

      const roomId = uuidv4();

      //创建新用户（进入会议的人）
      const newUser = {
        identity,
        id: uuidv4(),
        roomId,
        socketId: socket.id,
        onlyAudio,
      };
      //将新用户添加到已连接的用户数组里面
      connectedUsers = [...connectedUsers, newUser];

      //创建新会议房间
      const newRoom = {
        id: roomId,
        connectedUsers: [newUser],
      };

      //新用户加入会议房间
      socket.join(roomId);
      rooms = [...rooms, newRoom];

      //向客户端发送数据告知会议房间已创建（roomId）
      socket.emit("room-id", { roomId });

      //发送通知告知有新用户加入并更新房间
      socket.emit("room-update", { connectedUsers: newRoom.connectedUsers });
    };

    const joinRoomHandler = (data, socket) => {
      const { roomId, identity, onlyAudio } = data;

      const newUser = {
        identity,
        id: uuidv4(),
        roomId,
        socketId: socket.id,
        onlyAudio,
      };

      //判断传递过来的roomId是否匹配对应会议房间
      const room = rooms.find((room) => room.id === roomId);

      if(!room){
        return
      }
      room.connectedUsers = [...room.connectedUsers, newUser];

      //加入房间
      socket.join(roomId);

      //将新用户添加到已连接的用户数组里面
      connectedUsers = [...connectedUsers, newUser];

      //告知除自己以外的所有已连接用户准备webRTC对等连接
      room.connectedUsers.forEach((user) => {
        //排除自身
        if (user.socketId !== socket.id) {
          //存储发起对等连接方的socketId信息
          const data = {
            connUserSocketId: socket.id,
          };
          io.to(user.socketId).emit("conn-prepare", data);
        }
      });

      //发送通知告知有新用户加入并更新房间
      io.to(roomId).emit("room-update", {
        connectedUsers: room.connectedUsers,
      });
    };

    const disconnectHandler = (socket) => {
      // Handle video conference disconnection
      const user = connectedUsers.find((user) => user.socketId === socket.id);

      if (user) {
        //从会议房间进行删除
        const room = rooms.find((room) => room.id === user.roomId);

        room.connectedUsers = room.connectedUsers.filter(
          (user) => user.socketId !== socket.id
        );

        //离开房间
        socket.leave(user.roomId);

        //当会议房间没有人员的时候要关闭整个会议室（从rooms数组中删除该房间的信息）
        if (room.connectedUsers.length > 0) {
          //用户断开WebRTC连接
          io.to(room.id).emit("user-disconected", { socketId: socket.id });

          //发送通知告知有用户离开并更新房间
          io.to(room.id).emit("room-update", {
            connectedUsers: room.connectedUsers,
          });
        } else {
          //从rooms数组中删除该房间的信息
          rooms = rooms.filter((r) => r.id !== room.id);
        }
      }

      // Handle chat disconnection
      const chatConnection = chatConnections.get(socket.id);
      if (chatConnection) {
        const { sessionId, type, userId, operatorId } = chatConnection;
        
        console.log(`${type} disconnected from chat session ${sessionId}`);

        // Leave chat session room
        if (sessionId) {
          socket.leave(`chat-session-${sessionId}`);
          
          // Notify other participants in the session
          socket.to(`chat-session-${sessionId}`).emit("participant-disconnected", {
            sessionId,
            participantType: type,
            participantId: userId || operatorId,
            timestamp: new Date().toISOString()
          });
        }

        // If operator disconnected, update their status to offline
        if (type === 'operator' && operatorId) {
          OperatorService.updateOperatorStatus(operatorId, 'offline')
            .then((result) => {
              if (result.success) {
                // Broadcast operator offline status
                socket.broadcast.emit("operator-status-changed", {
                  operatorId,
                  status: 'offline',
                  timestamp: new Date().toISOString()
                });
              }
            })
            .catch((error) => {
              console.error("Error updating operator status on disconnect:", error);
            });
        }

        // Remove from chat connections
        chatConnections.delete(socket.id);
      }
    };

    //转发信令
    const signalingHandler = (data, socket) => {
      const { connUserSocketId, signal } = data;

      const signalingData = { signal, connUserSocketId: socket.id };
      io.to(connUserSocketId).emit("conn-signal", signalingData);
    };

    //给发起端发送信令
    const initializeConnectionHandler = (data, socket) => {
      const { connUserSocketId } = data;

      const initData = { connUserSocketId: socket.id };
      io.to(connUserSocketId).emit("conn-init", initData);
    };

    const directMessageHandler = (data, socket) => {
      if (
        connectedUsers.find(
          (connUser) => connUser.socketId === data.receiverSocketId
        )
      ) {
        //信息发送给接收方
        const receiverData = {
          authorSocketId: socket.id,
          messageContent: data.messageContent,
          isAuthor: false,
          identity: data.identity,
        };
        socket.to(data.receiverSocketId).emit("direct-message", receiverData);

        //信息返回给发送方
        const authorData = {
          receiverSocketId: data.receiverSocketId,
          messageContent: data.messageContent,
          isAuthor: true,
          identity: data.identity,
        };
        socket.emit("direct-message", authorData);
      }
    };

    // 用户加入对话处理函数
    const  userJoinChatHandler = async (data, socket) => {
      try {
        const { userId } = data;
        
        // 验证用户ID是否存在
        if (!userId) {
          socket.emit("chat-error", { 
            error: "User ID is required",
            code: "MISSING_USER_ID"
          });
          return;
        }

        console.log(`User ${userId} joining chat with socket ${socket.id}`);

        // 创建或获取现有的聊天会话
        const sessionResult = await ChatService.createChatSession(userId);
        
        // 检查会话创建是否成功
        if (!sessionResult.success) {
          socket.emit("chat-error", { 
            error: sessionResult.message,
            code: "SESSION_CREATION_FAILED"
          });
          return;
        }

        const { session, isNew } = sessionResult;

        // 存储连接信息到内存映射中
        chatConnections.set(socket.id, {
          userId,
          sessionId: session.id,
          type: 'user'
        });

        // 将socket加入到对应的会话房间
        socket.join(`chat-session-${session.id}`);

        // 向用户发送会话信息
        socket.emit("chat-session-created", {
          sessionId: session.id,
          userId,
          status: session.status,
          isNew,
          timestamp: new Date().toISOString()
        });

        // 如果是新会话，发送通知到管理系统和在线客服
        if (isNew) {
          await notificationService.sendNewChatNotification({
            sessionId: session.id,
            userId,
            message: "New chat session started",
            timestamp: new Date()
          });
          
          // 直接向所有在线客服发送新聊天通知
          for (const [socketId, connection] of chatConnections.entries()) {
            if (connection.type === 'operator') {
              io.to(socketId).emit("new-chat-notification", {
                sessionId: session.id,
                userId,
                userName: '访客',
                timestamp: new Date().toISOString(),
                message: '用户发起了聊天请求'
              });
            }
          }
          
          console.log(`New chat session ${session.id} notification sent to all online operators`);
        }

        // 加载并发送消息历史记录
        const historyResult = await ChatService.getMessageHistory(session.id, {
          limit: 50,
          order: 'ASC'
        });

        // 如果成功获取历史记录，发送给用户
        if (historyResult.success) {
          socket.emit("message-history", {
            sessionId: session.id,
            messages: historyResult.messages,
            pagination: historyResult.pagination
          });
        }

        console.log(`User ${userId} successfully joined chat session ${session.id}`);

      } catch (error) {
        // 捕获并处理异常错误
        console.error("Error in userJoinChatHandler:", error);
        socket.emit("chat-error", { 
          error: "Internal server error",
          code: "INTERNAL_ERROR"
        });
      }
    };

    const userSendMessageHandler = async (data, socket) => {
      try {
        const { content, messageType = 'text' } = data;
        const connection = chatConnections.get(socket.id);

        if (!connection) {
          socket.emit("chat-error", { 
            error: "User not connected to chat",
            code: "NOT_CONNECTED"
          });
          return;
        }

        if (!content || content.trim().length === 0) {
          socket.emit("chat-error", { 
            error: "Message content is required",
            code: "EMPTY_MESSAGE"
          });
          return;
        }

        const { userId, sessionId } = connection;

        const messageResult = await ChatService.sendMessage(
          sessionId,
          userId,
          'user',
          content.trim(),
          messageType
        );

        if (!messageResult.success) {
          socket.emit("chat-error", { 
            error: messageResult.message,
            code: "MESSAGE_SEND_FAILED"
          });
          return;
        }

        const { message, session } = messageResult;

        // Broadcast message to all participants in the session
        const messageData = {
          id: message.id,
          sessionId: message.sessionId,
          senderId: message.senderId,
          senderType: message.senderType,
          content: message.content,
          messageType: message.messageType,
          timestamp: message.createdAt.toISOString()
        };

        // Send to all sockets in the session room
        io.to(`chat-session-${sessionId}`).emit("message-received", messageData);

        // 广播新消息通知给所有在线客服
        for (const [socketId, connection] of chatConnections.entries()) {
          if (connection.type === 'operator') {
            io.to(socketId).emit("new-message-notification", {
              sessionId,
              userId,
              userName: session.userName || '访客',
              content: content.trim(),
              timestamp: message.createdAt.toISOString(),
              messageType
            });
            console.log(`消息通知已发送给客服 ${connection.operatorId || socketId}`);
          }
        }

        // Send notification to admin system
        await notificationService.sendMessageNotification({
          sessionId,
          senderId: userId,
          senderType: 'user',
          content: content.trim(),
          timestamp: message.createdAt
        });

        console.log(`Message sent by user ${userId} in session ${sessionId}`);

      } catch (error) {
        console.error("Error in userSendMessageHandler:", error);
        socket.emit("chat-error", { 
          error: "Failed to send message",
          code: "INTERNAL_ERROR"
        });
      }
    };

    const operatorJoinSessionHandler = async (data, socket) => {
      try {
        const { operatorId, sessionId } = data;

        if (!operatorId || !sessionId) {
          socket.emit("chat-error", { 
            error: "Operator ID and Session ID are required",
            code: "MISSING_REQUIRED_FIELDS"
          });
          return;
        }

        // 获取实际的客服ID
        const actualOperatorId = operatorIdMapping.get(operatorId) || operatorId;
        console.log(`Operator ${operatorId} (actual: ${actualOperatorId}) joining session ${sessionId} with socket ${socket.id}`);

        // Assign operator to session
        console.log('Calling ChatService.assignOperatorToSession...');
        const assignResult = await ChatService.assignOperatorToSession(sessionId, actualOperatorId);
        console.log('assignOperatorToSession result:', assignResult);

        if (!assignResult.success) {
          console.log('assignOperatorToSession failed:', assignResult);
          socket.emit("chat-error", { 
            error: assignResult.message,
            code: "OPERATOR_ASSIGNMENT_FAILED"
          });
          return;
        }

        const { session, operator } = assignResult;

        // Store connection info
        chatConnections.set(socket.id, {
          operatorId: actualOperatorId, // 使用实际的客服ID
          sessionId,
          type: 'operator'
        });

        // Join socket room for this session
        socket.join(`chat-session-${sessionId}`);
        
        console.log(`客服 ${operatorId} (实际ID: ${actualOperatorId}) 已加入会话 ${sessionId}，Socket ID: ${socket.id}`);

        // Notify operator of successful join
        socket.emit("operator-session-joined", {
          sessionId,
          operatorId: actualOperatorId,
          operatorName: operator.name,
          sessionStatus: session.status,
          timestamp: new Date().toISOString()
        });

        // Notify user that operator has joined
        socket.to(`chat-session-${sessionId}`).emit("operator-joined", {
          sessionId,
          operatorId: actualOperatorId,
          operatorName: operator.name,
          timestamp: new Date().toISOString()
        });

        // Load and send message history to operator
        const historyResult = await ChatService.getMessageHistory(sessionId, {
          limit: 50,
          order: 'ASC'
        });

        if (historyResult.success) {
          socket.emit("message-history", {
            sessionId,
            messages: historyResult.messages,
            pagination: historyResult.pagination
          });
        }

        console.log(`Operator ${operatorId} successfully joined session ${sessionId}`);

      } catch (error) {
        console.error("Error in operatorJoinSessionHandler:", error);
        socket.emit("chat-error", { 
          error: "Failed to join session",
          code: "INTERNAL_ERROR"
        });
      }
    };

    const operatorSendMessageHandler = async (data, socket) => {
      try {
        const { operatorId, sessionId, content, messageType = 'text' } = data;
        
        console.log('收到客服发送消息请求:', { operatorId, sessionId, content: content?.substring(0, 50) });
        
        // 验证必需参数
        if (!operatorId || !sessionId || !content || content.trim().length === 0) {
          socket.emit("chat-error", { 
            error: "Operator ID, Session ID and message content are required",
            code: "MISSING_REQUIRED_FIELDS"
          });
          return;
        }

        // 检查连接信息
        let connection = chatConnections.get(socket.id);
        
        // 如果连接信息不存在或不匹配，尝试更新连接信息
        if (!connection || connection.type !== 'operator' || connection.sessionId !== sessionId) {
          console.log('更新客服连接信息:', { operatorId, sessionId });
          
          // 更新或创建连接信息
          chatConnections.set(socket.id, {
            operatorId,
            sessionId,
            type: 'operator'
          });
          
          // 确保socket加入会话房间
          socket.join(`chat-session-${sessionId}`);
          
          connection = chatConnections.get(socket.id);
        }

        // 获取实际的客服ID
        const actualOperatorId = operatorIdMapping.get(operatorId) || operatorId;

        // Send message through ChatService
        const messageResult = await ChatService.sendMessage(
          sessionId,
          actualOperatorId,
          'operator',
          content.trim(),
          messageType
        );

        if (!messageResult.success) {
          console.error('发送消息失败:', messageResult.message);
          socket.emit("chat-error", { 
            error: messageResult.message,
            code: "MESSAGE_SEND_FAILED"
          });
          return;
        }

        const { message } = messageResult;

        // Broadcast message to all participants in the session
        const messageData = {
          id: message.id,
          sessionId: message.sessionId,
          senderId: message.senderId,
          senderType: message.senderType,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt.toISOString()
        };

        // Send to all sockets in the session room
        io.to(`chat-session-${sessionId}`).emit("message-received", messageData);

        console.log(`Message sent by operator ${actualOperatorId} in session ${sessionId}`);

      } catch (error) {
        console.error("Error in operatorSendMessageHandler:", error);
        socket.emit("chat-error", { 
          error: "Failed to send message",
          code: "INTERNAL_ERROR"
        });
      }
    };

    const operatorStatusChangeHandler = async (data, socket) => {
      try {
        const { operatorId, status } = data;

        if (!operatorId || !status) {
          socket.emit("chat-error", { 
            error: "Operator ID and status are required",
            code: "MISSING_REQUIRED_FIELDS"
          });
          return;
        }

        console.log(`Operator ${operatorId} changing status to ${status}`);

        // Update operator status
        const statusResult = await OperatorService.updateOperatorStatus(operatorId, status);

        if (!statusResult.success) {
          socket.emit("chat-error", { 
            error: statusResult.message,
            code: "STATUS_UPDATE_FAILED"
          });
          return;
        }

        const { operator, actualOperatorId } = statusResult;
        const realOperatorId = actualOperatorId || operatorId; // 使用实际的客服ID

        // Store operator connection if going online
        if (status === 'online') {
          // Update connection info if exists
          const connection = chatConnections.get(socket.id);
          if (connection) {
            connection.operatorId = realOperatorId;
          } else {
            chatConnections.set(socket.id, {
              operatorId: realOperatorId,
              type: 'operator',
              sessionId: null
            });
          }

          // 当客服上线时，推送现有的等待会话
          try {
            const waitingSessions = await ChatService.getUserSessions(null, {
              status: 'waiting',
              limit: 10,
              offset: 0,
              includeMessages: false
            });

            if (waitingSessions.success && waitingSessions.sessions.length > 0) {
              console.log(`Found ${waitingSessions.sessions.length} waiting sessions for operator ${realOperatorId}`);
              
              // 为每个等待的会话发送通知
              waitingSessions.sessions.forEach(session => {
                socket.emit("new-chat-notification", {
                  sessionId: session.id,
                  userId: session.userId,
                  userName: '访客',
                  timestamp: session.createdAt.toISOString(),
                  lastMessage: '用户等待客服接入'
                });
              });
            }
          } catch (error) {
            console.error('Error fetching waiting sessions:', error);
          }
        }

        // Notify operator of status change
        socket.emit("operator-status-updated", {
          operatorId: realOperatorId, // 返回实际的客服ID
          status: operator.status,
          timestamp: new Date().toISOString()
        });

        // Broadcast status change to all connected clients
        socket.broadcast.emit("operator-status-changed", {
          operatorId: realOperatorId,
          operatorName: operator.name,
          status: operator.status,
          timestamp: new Date().toISOString()
        });

        console.log(`Operator ${realOperatorId} status updated to ${status}`);

      } catch (error) {
        console.error("Error in operatorStatusChangeHandler:", error);
        socket.emit("chat-error", { 
          error: "Failed to update status",
          code: "INTERNAL_ERROR"
        });
      }
    };

    // 客服输入指示器处理
    const operatorTypingHandler = (data, socket) => {
      try {
        const { sessionId, operatorId } = data;
        
        if (!sessionId || !operatorId) {
          return;
        }

        // 广播输入指示器给会话中的其他参与者
        socket.to(`chat-session-${sessionId}`).emit("typing-indicator", {
          sessionId,
          senderType: 'operator',
          operatorId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error("Error in operatorTypingHandler:", error);
      }
    };

    // 客服停止输入处理
    const operatorStopTypingHandler = (data, socket) => {
      try {
        const { sessionId, operatorId } = data;
        
        if (!sessionId || !operatorId) {
          return;
        }

        // 广播停止输入指示器
        socket.to(`chat-session-${sessionId}`).emit("stop-typing-indicator", {
          sessionId,
          senderType: 'operator',
          operatorId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error("Error in operatorStopTypingHandler:", error);
      }
    };

    // 获取消息历史处理
    const getMessageHistoryHandler = async (data, socket) => {
      try {
        const { sessionId, limit = 50, offset = 0 } = data;
        
        if (!sessionId) {
          socket.emit("chat-error", { 
            error: "Session ID is required",
            code: "MISSING_SESSION_ID"
          });
          return;
        }

        // 获取消息历史
        const historyResult = await ChatService.getMessageHistory(sessionId, {
          limit,
          offset,
          order: 'ASC'
        });

        if (!historyResult.success) {
          socket.emit("chat-error", { 
            error: historyResult.message,
            code: "HISTORY_LOAD_FAILED"
          });
          return;
        }

        // 发送历史消息
        socket.emit("message-history", {
          sessionId,
          messages: historyResult.messages,
          pagination: historyResult.pagination
        });

      } catch (error) {
        console.error("Error in getMessageHistoryHandler:", error);
        socket.emit("chat-error", { 
          error: "Failed to load message history",
          code: "INTERNAL_ERROR"
        });
      }
    };

    // 客服结束会话处理
    const operatorEndSessionHandler = async (data, socket) => {
      try {
        const { sessionId, operatorId } = data;
        
        if (!sessionId || !operatorId) {
          socket.emit("chat-error", { 
            error: "Session ID and Operator ID are required",
            code: "MISSING_REQUIRED_FIELDS"
          });
          return;
        }

        // 结束会话
        const endResult = await ChatService.endChatSession(sessionId, operatorId);

        if (!endResult.success) {
          socket.emit("chat-error", { 
            error: endResult.message,
            code: "END_SESSION_FAILED"
          });
          return;
        }

        // 通知会话中的所有参与者
        io.to(`chat-session-${sessionId}`).emit("session-ended", {
          sessionId,
          operatorId,
          timestamp: new Date().toISOString(),
          reason: 'operator_ended'
        });

        // 从连接映射中移除
        const connection = chatConnections.get(socket.id);
        if (connection) {
          connection.sessionId = null;
        }

        console.log(`Operator ${operatorId} ended session ${sessionId}`);

      } catch (error) {
        console.error("Error in operatorEndSessionHandler:", error);
        socket.emit("chat-error", { 
          error: "Failed to end session",
          code: "INTERNAL_ERROR"
        });
      }
    };

    // 客服重连会话处理
    const operatorReconnectSessionHandler = async (data, socket) => {
      try {
        const { operatorId, sessionId } = data;
        
        if (!operatorId || !sessionId) {
          socket.emit("chat-error", { 
            error: "Operator ID and Session ID are required",
            code: "MISSING_REQUIRED_FIELDS"
          });
          return;
        }

        console.log(`客服 ${operatorId} 重连到会话 ${sessionId}`);

        // 获取实际的客服ID
        const actualOperatorId = operatorIdMapping.get(operatorId) || operatorId;

        // 更新连接信息
        chatConnections.set(socket.id, {
          operatorId: actualOperatorId,
          sessionId,
          type: 'operator'
        });

        // 加入会话房间
        socket.join(`chat-session-${sessionId}`);

        // 通知客服重连成功
        socket.emit("operator-session-joined", {
          sessionId,
          operatorId: actualOperatorId,
          timestamp: new Date().toISOString(),
          reconnected: true
        });

        console.log(`客服 ${operatorId} (实际ID: ${actualOperatorId}) 重连会话 ${sessionId} 成功`);

      } catch (error) {
        console.error("Error in operatorReconnectSessionHandler:", error);
        socket.emit("chat-error", { 
          error: "Failed to reconnect to session",
          code: "INTERNAL_ERROR"
        });
      }
    };
    return io;
  },
  getIo: function () {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
