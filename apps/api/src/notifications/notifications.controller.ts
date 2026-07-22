import { Controller, Get, Put, Param, Query, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.notificationsService.findAll(req.user.sub, { type, isRead });
  }

  @Put('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }

  @Put(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }
}
