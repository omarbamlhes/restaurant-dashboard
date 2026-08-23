import { money } from '../orders/order-totals';

/**
 * Recipe-based food costing.
 *
 * A menu item's true cost is the sum of what its ingredients cost, not a
 * number typed by hand that drifts the moment a supplier price changes.
 * These helpers derive cost, profit margin and the food-cost ratio from the
 * item's recipe so the menu screen and reports stay honest automatically.
 */

export interface RecipeLine {
  /** Amount of the ingredient this item consumes, in the ingredient's unit. */
  quantity: number | string;
  /** Cost of one unit of the ingredient. */
  costPerUnit: number | string;
}

/** Total cost of a recipe: Σ (quantity × unit cost), rounded to halalas. */
export function computeRecipeCost(lines: RecipeLine[]): number {
  const total = lines.reduce(
    (sum, l) => sum + Number(l.quantity) * Number(l.costPerUnit),
    0,
  );
  return money(total);
}

/**
 * Gross profit margin as a percentage of the selling price, to one decimal.
 * Returns 0 for a non-positive price (can't divide by it).
 */
export function computeMargin(
  price: number | string,
  cost: number | string,
): number {
  const p = Number(price);
  if (p <= 0) return 0;
  return Math.round(((p - Number(cost)) / p) * 1000) / 10;
}

/**
 * Food-cost ratio (cost ÷ price) as a percentage, to one decimal — the number
 * restaurateurs actually watch (a healthy kitchen sits around 28–35%).
 * Returns null for a non-positive price.
 */
export function computeFoodCostPct(
  price: number | string,
  cost: number | string,
): number | null {
  const p = Number(price);
  if (p <= 0) return null;
  return Math.round((Number(cost) / p) * 1000) / 10;
}

export interface CostingInput {
  price: number | string;
  /** Hand-entered fallback cost, used only when the item has no recipe. */
  cost?: number | string | null;
  recipe: RecipeLine[];
}

export interface Costing {
  /** Cost derived from the recipe, or null when the item has no recipe. */
  recipeCost: number | null;
  /** recipeCost when a recipe exists, otherwise the hand-entered cost. */
  effectiveCost: number | null;
  margin: number | null;
  foodCostPct: number | null;
}

/** Resolve an item's cost/margin/food-cost from its recipe, with fallback. */
export function computeItemCosting(input: CostingInput): Costing {
  const recipeCost = input.recipe.length
    ? computeRecipeCost(input.recipe)
    : null;
  const effectiveCost =
    recipeCost ?? (input.cost != null ? money(Number(input.cost)) : null);

  if (effectiveCost == null) {
    return { recipeCost, effectiveCost: null, margin: null, foodCostPct: null };
  }
  return {
    recipeCost,
    effectiveCost,
    margin: computeMargin(input.price, effectiveCost),
    foodCostPct: computeFoodCostPct(input.price, effectiveCost),
  };
}
