/**
 * Recipe-driven inventory consumption.
 *
 * When an order is placed, each sold item eats into ingredient stock by its
 * recipe. This pure helper rolls a whole order up into one deduction per
 * ingredient (an ingredient shared by several items is summed once), so the
 * caller can apply a handful of stock decrements instead of one per line.
 */

export interface OrderLine {
  menuItemId: string;
  quantity: number;
}

export interface RecipeIngredient {
  ingredientId: string;
  /** Amount used per single menu item (Prisma Decimal serialises as string). */
  quantity: number | string;
}

export interface IngredientUsage {
  ingredientId: string;
  quantity: number;
}

/**
 * Aggregate total ingredient usage for an order.
 *
 * @param orderLines           what was sold, with quantities
 * @param recipeByMenuItem     menuItemId → its recipe lines
 * @returns one row per ingredient with the summed quantity (>0 only),
 *          rounded to 4 decimals to match the stored Decimal(10,4) scale.
 */
export function computeIngredientUsage(
  orderLines: OrderLine[],
  recipeByMenuItem: Record<string, RecipeIngredient[]>,
): IngredientUsage[] {
  const usage = new Map<string, number>();

  for (const line of orderLines) {
    const recipe = recipeByMenuItem[line.menuItemId];
    if (!recipe) continue;
    for (const ing of recipe) {
      const add = Number(ing.quantity) * line.quantity;
      usage.set(ing.ingredientId, (usage.get(ing.ingredientId) ?? 0) + add);
    }
  }

  return [...usage.entries()]
    .map(([ingredientId, quantity]) => ({
      ingredientId,
      quantity: Math.round(quantity * 10000) / 10000,
    }))
    .filter((u) => u.quantity > 0);
}
