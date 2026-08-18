import { Controller, Get, Query, Request } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('messages')
export class MessagingController {
  constructor(
    private whatsapp: WhatsAppService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  /** Recent outbound customer messages (WhatsApp) for the current restaurant. */
  @Get()
  async findAll(@Request() req, @Query('limit') limit?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.whatsapp.listForRestaurant(rid, limit ? Number(limit) : 50);
  }
}
