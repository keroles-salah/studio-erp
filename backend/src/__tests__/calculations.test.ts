import { bookingsService } from '../modules/bookings/bookings.service';

describe('Booking calculations', () => {
  it('should calculate subtotal, tax, and total correctly without discount', () => {
    const input = {
      services: [
        { quantity: 2, unitPrice: 500, discount: 0 },
        { quantity: 1, unitPrice: 1000, discount: 100 },
      ],
      equipment: [
        { quantity: 2, unitPrice: 200, discount: 0 },
      ],
      discount: 0,
      taxRate: 15,
    };

    const result = bookingsService.calculateTotals(input);
    expect(result.subtotal).toBe(2300);
    expect(result.discount).toBe(0);
    expect(result.tax).toBe(345);
    expect(result.total).toBe(2645);
  });

  it('should apply discount and tax on discounted base', () => {
    const input = {
      services: [{ quantity: 1, unitPrice: 1000, discount: 0 }],
      equipment: [],
      discount: 200,
      taxRate: 15,
    };

    const result = bookingsService.calculateTotals(input);
    expect(result.subtotal).toBe(1000);
    expect(result.discount).toBe(200);
    expect(result.tax).toBe(120);
    expect(result.total).toBe(920);
  });

  it('should not allow discount to exceed subtotal', () => {
    const input = {
      services: [{ quantity: 1, unitPrice: 500, discount: 0 }],
      equipment: [],
      discount: 1000,
      taxRate: 15,
    };

    const result = bookingsService.calculateTotals(input);
    expect(result.subtotal).toBe(500);
    expect(result.discount).toBe(500);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });
});
