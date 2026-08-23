import { BadRequestException } from '@nestjs/common';
import { computeOrderTotals, money, ORDER_VAT_RATE } from './order-totals';

const base = {
  items: [{ unitPrice: 100, quantity: 1 }],
  hasCustomer: false,
  paymentMethod: 'CARD',
  paidAmount: 115,
};

describe('money()', () => {
  it('rounds to 2 decimals (halalas)', () => {
    expect(money(0.1 + 0.2)).toBe(0.3);
    expect(money(115)).toBe(115);
    expect(money(12.156)).toBe(12.16);
    expect(money(4.9995)).toBe(5); // VAT of 33.33 rounds up cleanly
  });
});

describe('computeOrderTotals — VAT & subtotal', () => {
  it('applies 15% VAT on the subtotal', () => {
    const t = computeOrderTotals({ ...base, items: [{ unitPrice: 100, quantity: 1 }] });
    expect(ORDER_VAT_RATE).toBe(0.15);
    expect(t.subtotal).toBe(100);
    expect(t.tax).toBe(15);
    expect(t.total).toBe(115);
  });

  it('sums multiple lines and quantities', () => {
    const t = computeOrderTotals({
      ...base,
      items: [
        { unitPrice: 25.5, quantity: 2 }, // 51
        { unitPrice: 10, quantity: 3 }, //   30
      ],
      paidAmount: 1000,
    });
    expect(t.subtotal).toBe(81);
    expect(t.tax).toBe(money(81 * 0.15)); // 12.15
    expect(t.total).toBe(money(81 + 12.15));
  });

  it('rounds VAT to 2 decimals', () => {
    const t = computeOrderTotals({ ...base, items: [{ unitPrice: 33.33, quantity: 1 }], paidAmount: 100 });
    expect(t.tax).toBe(5); // 33.33 * 0.15 = 4.9995 → 5.00
  });
});

describe('computeOrderTotals — manual discount', () => {
  it('subtracts a manual discount from the total', () => {
    const t = computeOrderTotals({ ...base, manualDiscount: 15, paidAmount: 100 });
    expect(t.discount).toBe(15);
    expect(t.total).toBe(100); // 100 + 15 - 15
  });
});

describe('computeOrderTotals — loyalty redemption', () => {
  const withCustomer = {
    ...base,
    hasCustomer: true,
    items: [{ unitPrice: 100, quantity: 1 }],
  };

  it('converts redeemed points into a SAR discount (100 pts = 5 SAR)', () => {
    const t = computeOrderTotals({
      ...withCustomer,
      redeemPoints: 100,
      customerLoyaltyPoints: 500,
      paidAmount: 110,
    });
    expect(t.loyaltyDiscount).toBe(5);
    expect(t.discount).toBe(5);
    expect(t.total).toBe(110); // 115 - 5
    expect(t.redeemPoints).toBe(100);
  });

  it('floors fractional redeem points', () => {
    const t = computeOrderTotals({
      ...withCustomer,
      redeemPoints: 150.9,
      customerLoyaltyPoints: 500,
      paidAmount: 200,
    });
    expect(t.redeemPoints).toBe(150);
  });

  it('rejects redemption without a customer', () => {
    expect(() =>
      computeOrderTotals({ ...base, hasCustomer: false, redeemPoints: 100, paidAmount: 200 }),
    ).toThrow('لا يمكن استبدال النقاط بدون عميل');
  });

  it('rejects redemption below the minimum', () => {
    expect(() =>
      computeOrderTotals({ ...withCustomer, redeemPoints: 50, customerLoyaltyPoints: 500 }),
    ).toThrow(BadRequestException);
  });

  it('rejects when the customer row was not found', () => {
    expect(() =>
      computeOrderTotals({ ...withCustomer, redeemPoints: 100, customerLoyaltyPoints: null }),
    ).toThrow('العميل غير موجود');
  });

  it('rejects when the balance is insufficient', () => {
    expect(() =>
      computeOrderTotals({ ...withCustomer, redeemPoints: 100, customerLoyaltyPoints: 40 }),
    ).toThrow('نقاط الولاء غير كافية');
  });

  it('rejects when redeemed value exceeds the order total', () => {
    // 10000 pts = 500 SAR, order is only 115 SAR
    expect(() =>
      computeOrderTotals({ ...withCustomer, redeemPoints: 10000, customerLoyaltyPoints: 99999 }),
    ).toThrow('قيمة النقاط المستبدلة أكبر من إجمالي الطلب');
  });

  it('does not redeem when redeemPoints is 0 or negative', () => {
    const t = computeOrderTotals({ ...withCustomer, redeemPoints: -5, customerLoyaltyPoints: 500, paidAmount: 200 });
    expect(t.redeemPoints).toBe(0);
    expect(t.loyaltyDiscount).toBe(0);
  });
});

describe('computeOrderTotals — payment & change', () => {
  it('rejects underpayment', () => {
    expect(() => computeOrderTotals({ ...base, paymentMethod: 'CASH', paidAmount: 100 })).toThrow(
      'المبلغ المدفوع لا يغطي الإجمالي',
    );
  });

  it('computes cash change', () => {
    const t = computeOrderTotals({ ...base, paymentMethod: 'CASH', paidAmount: 200 });
    expect(t.cashAmount).toBe(200);
    expect(t.cardAmount).toBe(0);
    expect(t.changeAmount).toBe(85); // 200 - 115
  });

  it('treats cashless methods as paid in full with no change', () => {
    for (const method of ['CARD', 'MADA', 'STC_PAY', 'APPLE_PAY', 'TABBY', 'TAMARA']) {
      const t = computeOrderTotals({ ...base, paymentMethod: method, paidAmount: 115 });
      expect(t.cardAmount).toBe(115);
      expect(t.cashAmount).toBe(0);
      expect(t.changeAmount).toBe(0);
    }
  });

  it('accepts an exact split payment', () => {
    const t = computeOrderTotals({
      ...base,
      paymentMethod: 'SPLIT',
      paidAmount: 115,
      cashAmount: 15,
      cardAmount: 100,
    });
    expect(t.changeAmount).toBe(0);
  });

  it('computes change on an over-tendered split', () => {
    const t = computeOrderTotals({
      ...base,
      paymentMethod: 'SPLIT',
      paidAmount: 115,
      cashAmount: 20,
      cardAmount: 100,
    });
    expect(t.changeAmount).toBe(5);
  });

  it('rejects a split that does not cover the total', () => {
    expect(() =>
      computeOrderTotals({
        ...base,
        paymentMethod: 'SPLIT',
        paidAmount: 115,
        cashAmount: 10,
        cardAmount: 100,
      }),
    ).toThrow('مجموع الدفع المقسم لا يغطي الإجمالي');
  });
});
