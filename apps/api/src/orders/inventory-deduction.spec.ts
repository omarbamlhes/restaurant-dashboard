import { computeIngredientUsage } from './inventory-deduction';

const recipes = {
  // شاورما دجاج
  chicken_shawarma: [
    { ingredientId: 'chicken', quantity: 0.2 },
    { ingredientId: 'bread', quantity: 1 },
    { ingredientId: 'garlic', quantity: 0.02 },
  ],
  // فلافل — shares garlic with the shawarma
  falafel: [
    { ingredientId: 'chickpeas', quantity: 0.12 },
    { ingredientId: 'garlic', quantity: 0.02 },
  ],
};

describe('computeIngredientUsage', () => {
  it('multiplies each recipe line by the sold quantity', () => {
    const usage = computeIngredientUsage(
      [{ menuItemId: 'chicken_shawarma', quantity: 3 }],
      recipes,
    );
    expect(usage).toEqual(
      expect.arrayContaining([
        { ingredientId: 'chicken', quantity: 0.6 },
        { ingredientId: 'bread', quantity: 3 },
        { ingredientId: 'garlic', quantity: 0.06 },
      ]),
    );
    expect(usage).toHaveLength(3);
  });

  it('sums a shared ingredient across different items into one row', () => {
    const usage = computeIngredientUsage(
      [
        { menuItemId: 'chicken_shawarma', quantity: 2 }, // garlic 0.04
        { menuItemId: 'falafel', quantity: 5 }, // garlic 0.10
      ],
      recipes,
    );
    const garlic = usage.find((u) => u.ingredientId === 'garlic');
    expect(garlic?.quantity).toBe(0.14);
    // one row per ingredient, not one per line
    expect(usage.filter((u) => u.ingredientId === 'garlic')).toHaveLength(1);
  });

  it('accepts string quantities (Prisma Decimal) and rounds to 4 decimals', () => {
    const usage = computeIngredientUsage(
      [{ menuItemId: 'x', quantity: 3 }],
      { x: [{ ingredientId: 'spice', quantity: '0.0333' }] },
    );
    expect(usage).toEqual([{ ingredientId: 'spice', quantity: 0.0999 }]);
  });

  it('ignores items that have no recipe', () => {
    const usage = computeIngredientUsage(
      [
        { menuItemId: 'chicken_shawarma', quantity: 1 },
        { menuItemId: 'unknown_drink', quantity: 4 },
      ],
      recipes,
    );
    expect(usage.every((u) => u.ingredientId !== 'unknown_drink')).toBe(true);
    expect(usage).toHaveLength(3); // only the shawarma's three ingredients
  });

  it('returns nothing for an empty order', () => {
    expect(computeIngredientUsage([], recipes)).toEqual([]);
  });
});
