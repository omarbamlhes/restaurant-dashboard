import {
  computeRecipeCost,
  computeMargin,
  computeFoodCostPct,
  computeItemCosting,
} from './recipe-cost';

describe('computeRecipeCost', () => {
  it('sums quantity × unit cost across lines', () => {
    // 0.2kg chicken @18 = 3.60, 1 bread @0.5 = 0.50, 0.05kg garlic @15 = 0.75
    expect(
      computeRecipeCost([
        { quantity: 0.2, costPerUnit: 18 },
        { quantity: 1, costPerUnit: 0.5 },
        { quantity: 0.05, costPerUnit: 15 },
      ]),
    ).toBe(4.85);
  });

  it('rounds to halalas (2 decimals)', () => {
    expect(computeRecipeCost([{ quantity: 0.333, costPerUnit: 10 }])).toBe(3.33);
  });

  it('accepts string decimals (Prisma Decimal serialises as string)', () => {
    expect(
      computeRecipeCost([{ quantity: '0.25', costPerUnit: '30' }]),
    ).toBe(7.5);
  });

  it('is 0 for an empty recipe', () => {
    expect(computeRecipeCost([])).toBe(0);
  });
});

describe('computeMargin', () => {
  it('returns profit as a percentage of price, to one decimal', () => {
    expect(computeMargin(18, 4.85)).toBe(73.1);
    expect(computeMargin(10, 5)).toBe(50);
  });

  it('goes negative when cost exceeds price', () => {
    expect(computeMargin(10, 12)).toBe(-20);
  });

  it('returns 0 for a non-positive price', () => {
    expect(computeMargin(0, 5)).toBe(0);
  });
});

describe('computeFoodCostPct', () => {
  it('returns cost ÷ price as a percentage', () => {
    expect(computeFoodCostPct(18, 4.85)).toBe(26.9);
    expect(computeFoodCostPct(10, 3)).toBe(30);
  });

  it('returns null for a non-positive price', () => {
    expect(computeFoodCostPct(0, 5)).toBeNull();
  });
});

describe('computeItemCosting', () => {
  it('derives everything from the recipe when present', () => {
    const c = computeItemCosting({
      price: 18,
      cost: 6, // hand-entered value is ignored in favour of the recipe
      recipe: [
        { quantity: 0.2, costPerUnit: 18 },
        { quantity: 1, costPerUnit: 0.5 },
        { quantity: 0.05, costPerUnit: 15 },
      ],
    });
    expect(c.recipeCost).toBe(4.85);
    expect(c.effectiveCost).toBe(4.85);
    expect(c.margin).toBe(73.1);
    expect(c.foodCostPct).toBe(26.9);
  });

  it('falls back to the hand-entered cost when there is no recipe', () => {
    const c = computeItemCosting({ price: 18, cost: 6, recipe: [] });
    expect(c.recipeCost).toBeNull();
    expect(c.effectiveCost).toBe(6);
    expect(c.margin).toBe(66.7);
    expect(c.foodCostPct).toBe(33.3);
  });

  it('leaves everything null when there is neither recipe nor cost', () => {
    const c = computeItemCosting({ price: 18, cost: null, recipe: [] });
    expect(c).toEqual({
      recipeCost: null,
      effectiveCost: null,
      margin: null,
      foodCostPct: null,
    });
  });
});
