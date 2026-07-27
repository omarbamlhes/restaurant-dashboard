import { Controller, Get, Post, Put, Body, Request, HttpCode, Param } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpgradeSubscriptionDto, InitiateCheckoutDto, VerifyPaymentDto } from './dto/create-subscription.dto';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/public.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';
import { SkipSubscriptionCheck } from '../common/subscription.decorator';

// Billing must stay reachable while a subscription is expired, past due, or
// missing — otherwise a locked-out restaurant could never pay to get back in.
@SkipSubscriptionCheck()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get('plans')
  @Public()
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('current')
  @Roles(UserRole.OWNER)
  async getCurrent(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.getCurrentSubscription(rid);
  }

  @Post('subscribe')
  @Roles(UserRole.OWNER)
  async subscribe(@Request() req, @Body() dto: CreateSubscriptionDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.subscribe(rid, dto);
  }

  @Put('upgrade')
  @Roles(UserRole.OWNER)
  async upgrade(@Request() req, @Body() dto: UpgradeSubscriptionDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.upgrade(rid, dto);
  }

  @Post('cancel')
  @Roles(UserRole.OWNER)
  async cancel(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.cancel(rid);
  }

  @Get('usage')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getUsage(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.getUsage(rid);
  }

  @Get('invoices')
  @Roles(UserRole.OWNER)
  async getInvoices(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.getInvoices(rid);
  }

  @Get('invoices/:id')
  @Roles(UserRole.OWNER)
  async getInvoiceDetails(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.getInvoiceDetails(id, rid);
  }

  // ============ MOYASAR PAYMENT ENDPOINTS ============

  @Get('checkout-config')
  @Roles(UserRole.OWNER)
  getCheckoutConfig() {
    return this.subscriptionsService.getCheckoutConfig();
  }

  @Post('initiate-checkout')
  @Roles(UserRole.OWNER)
  async initiateCheckout(@Request() req, @Body() dto: InitiateCheckoutDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.initiateCheckout(rid, dto);
  }

  @Post('verify-payment')
  @Roles(UserRole.OWNER)
  async verifyPayment(@Request() req, @Body() dto: VerifyPaymentDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.subscriptionsService.confirmPayment(rid, dto.paymentId, dto.invoiceId);
  }

  @Post('webhook/moyasar')
  @Public()
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    return this.subscriptionsService.handleWebhook(body);
  }
}
