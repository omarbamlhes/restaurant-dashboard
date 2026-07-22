import { Global, Module } from '@nestjs/common';
import { RestaurantHelper } from './restaurant.helper';

@Global()
@Module({
  providers: [RestaurantHelper],
  exports: [RestaurantHelper],
})
export class CommonModule {}
