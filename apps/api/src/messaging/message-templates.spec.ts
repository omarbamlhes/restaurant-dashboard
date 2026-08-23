import {
  buildOrderReadyMessage,
  buildReservationConfirmedMessage,
} from './message-templates';

describe('buildOrderReadyMessage', () => {
  it('addresses the customer by name and includes the order number', () => {
    const msg = buildOrderReadyMessage({
      customerName: 'عمر',
      orderNumber: 'ORD-ABC123',
      restaurantName: 'مطعم الشام',
    });
    expect(msg).toContain('أهلاً عمر،');
    expect(msg).toContain('ORD-ABC123');
    expect(msg).toContain('جاهز');
    expect(msg).toContain('مطعم الشام');
  });

  it('falls back to a neutral greeting when no name', () => {
    const msg = buildOrderReadyMessage({
      customerName: null,
      orderNumber: 'ORD-1',
      restaurantName: 'كافيه',
    });
    expect(msg).toContain('أهلاً،');
    expect(msg).not.toContain('undefined');
  });
});

describe('buildReservationConfirmedMessage', () => {
  it('includes date, time and party size', () => {
    const msg = buildReservationConfirmedMessage({
      customerName: 'سارة',
      restaurantName: 'مطعم البحر',
      date: '2026-08-12',
      time: '20:30',
      partySize: 4,
    });
    expect(msg).toContain('تم تأكيد حجزك');
    expect(msg).toContain('2026-08-12');
    expect(msg).toContain('20:30');
    expect(msg).toContain('4');
  });

  it('omits the party-size line when not provided', () => {
    const msg = buildReservationConfirmedMessage({
      restaurantName: 'مطعم البحر',
      date: '2026-08-12',
      time: '20:30',
      partySize: null,
    });
    expect(msg).not.toContain('عدد الأشخاص');
    expect(msg).not.toContain('undefined');
  });
});
