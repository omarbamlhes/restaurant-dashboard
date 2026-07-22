import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { PublicReservationsController } from './public-reservations.controller';
import { ReservationsService } from './reservations.service';
import { CommonModule } from '../common/common.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [CommonModule, OrdersModule],
  controllers: [ReservationsController, PublicReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
