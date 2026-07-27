import { Module } from '@nestjs/common';
import { KitchenStationsController } from './kitchen-stations.controller';
import { KitchenStationsService } from './kitchen-stations.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [KitchenStationsController],
  providers: [KitchenStationsService],
  exports: [KitchenStationsService],
})
export class KitchenStationsModule {}
