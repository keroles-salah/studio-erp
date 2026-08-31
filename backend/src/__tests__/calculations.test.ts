import { bookingsService } from '../modules/bookings/bookings.service';

describe('Booking calculations', () => {
  it('should calculate subtotal and total correctly without discount (no tax)', () => {
    const input = {
      services: [
        { quantity: 2, unitPrice: 500, discount: 0 },
        { quantity: 1, unitPrice: 1000, discount: 100 },
      ],
      equipment: [
        { quantity: 2, unitPrice: 200, discount: 0 },
      ],
      discount: 0,
    };

    const result = bookingsService.calculateTotals(input);
    expect(result.subtotal).toBe(2300);
    expect(result.discount).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(2300);
  });

  it('should apply discount on discounted base (no tax)', () => {
    const input = {
      services: [{ quantity: 1, unitPrice: 1000, discount: 0 }],
      equipment: [],
      discount: 200,
    };

    const result = bookingsService.calculateTotals(input);
    expect(result.subtotal).toBe(1000);
    expect(result.discount).toBe(200);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(800);
  });

  it('should not allow discount to exceed subtotal', () => {
    const input = {
      services: [{ quantity: 1, unitPrice: 500, discount: 0 }],
      equipment: [],
      discount: 1000,
    };

    const result = bookingsService.calculateTotals(input);
    expect(result.subtotal).toBe(500);
    expect(result.discount).toBe(500);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });
});
