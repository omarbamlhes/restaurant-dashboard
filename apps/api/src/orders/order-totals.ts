import { BadRequestException } from '@nestjs/common';
import { pointsValue, LOYALTY_MIN_REDEEM } from '../customers/loyalty.config';

/** VAT rate applied to the order subtotal (15% — KSA standard rate). */
export const ORDER_VAT_RATE = 0.15;

/** Round a monetary amount to 2 decimals (halalas). */
export function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface OrderLine {
  unitPrice: number;
  quantity: number;
}

export interface OrderTotalsInput {
  items: OrderLine[];
  /** Manual discount in SAR (before loyalty). */
  manualDiscount?: number;
  /** Raw points the customer asked to redeem (may be fractional / negative). */
  redeemPoints?: number;
  /** Whether the order is tied to a customer (required to redeem). */
  hasCustomer: boolean;
  /**
   * The customer's current loyalty balance, or null when no customer row was
   * found. Only consulted when redeemPoints > 0.
   */
  customerLoyaltyPoints?: number | null;
  paymentMethod: string;
  paidAmount: number;
  cashAmount?: number;
  cardAmount?: number;
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  loyaltyDiscount: number;
  discount: number;
  total: number;
  /** Normalised (floored, non-negative) points to actually deduct. */
  redeemPoints: number;
  cashAmount: number;
  cardAmount: number;
  changeAmount: number;
}

/**
 * Pure money math for a point-of-sale order: subtotal, VAT, manual + loyalty
 * discounts, total, and the cash/card/change split. Throws BadRequestException
 * with the same Arabic messages the API surfaces to the POS. Kept free of any
 * database or I/O so it can be exhaustively unit-tested.
 */
export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax = money(subtotal * ORDER_VAT_RATE);
  const manualDiscount = input.manualDiscount || 0;

  const redeemPoints = Math.max(0, Math.floor(input.redeemPoints || 0));
  let loyaltyDiscount = 0;
  if (redeemPoints > 0) {
    if (!input.hasCustomer) {
      throw new BadRequestException('لا يمكن استبدال النقاط بدون عميل');
    }
    if (redeemPoints < LOYALTY_MIN_REDEEM) {
      throw new BadRequestException(`الحد الأدنى للاستبدال ${LOYALTY_MIN_REDEEM} نقطة`);
    }
    if (input.customerLoyaltyPoints == null) {
      throw new BadRequestException('العميل غير موجود');
    }
    if (input.customerLoyaltyPoints < redeemPoints) {
      throw new BadRequestException('نقاط الولاء غير كافية');
    }
    loyaltyDiscount = pointsValue(redeemPoints);
    if (loyaltyDiscount > subtotal + tax - manualDiscount) {
      throw new BadRequestException('قيمة النقاط المستبدلة أكبر من إجمالي الطلب');
    }
  }

  const discount = money(manualDiscount + loyaltyDiscount);
  const total = money(subtotal + tax - discount);

  const paidAmount = input.paidAmount;
  if (paidAmount < total) {
    throw new BadRequestException('المبلغ المدفوع لا يغطي الإجمالي');
  }

  let cashAmount = 0;
  let cardAmount = 0;
  let changeAmount = 0;

  if (input.paymentMethod === 'CASH') {
    cashAmount = paidAmount;
    changeAmount = money(paidAmount - total);
  } else if (input.paymentMethod === 'SPLIT') {
    cashAmount = input.cashAmount || 0;
    cardAmount = input.cardAmount || 0;
    if (Math.round((cashAmount + cardAmount) * 100) < Math.round(total * 100)) {
      throw new BadRequestException('مجموع الدفع المقسم لا يغطي الإجمالي');
    }
    changeAmount = money(cashAmount + cardAmount - total);
  } else {
    // Card, Mada, STC Pay, Apple Pay, Tabby, Tamara — cashless, paid in full.
    cardAmount = total;
  }

  return {
    subtotal,
    tax,
    loyaltyDiscount,
    discount,
    total,
    redeemPoints,
    cashAmount,
    cardAmount,
    changeAmount,
  };
}
