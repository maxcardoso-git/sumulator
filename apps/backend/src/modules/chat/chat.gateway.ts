import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../../common/redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private redisService: RedisService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    await client.join(room);
    console.log(`Client ${client.id} joined room ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage('leave_session')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    await client.leave(room);
    console.log(`Client ${client.id} left room ${room}`);
    return { success: true };
  }

  async notifyNewMessage(sessionId: string, message: Record<string, unknown>) {
    const room = `session:${sessionId}`;
    this.server.to(room).emit('new_message', message);
  }

  async notifySessionUpdate(sessionId: string, data: Record<string, unknown>) {
    const room = `session:${sessionId}`;
    this.server.to(room).emit('session_update', data);
  }
}
