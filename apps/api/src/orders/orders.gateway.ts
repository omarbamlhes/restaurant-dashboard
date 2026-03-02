import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { ownerId: payload.sub },
      });

      if (!restaurant) {
        client.disconnect();
        return;
      }

      client.data.restaurantId = restaurant.id;
      client.data.userId = payload.sub;
      client.join(`restaurant:${restaurant.id}`);

      console.log(`[WS] Client connected: ${client.id} -> restaurant:${restaurant.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[WS] Client disconnected: ${client.id}`);
  }

  emitNewOrder(restaurantId: string, order: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('newOrder', order);
  }

  emitOrderStatusChanged(restaurantId: string, order: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('orderStatusChanged', order);
  }
}
