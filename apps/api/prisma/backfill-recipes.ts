/**
 * One-off backfill: attach recipes to the existing demo menu items so the
 * recipe-based food-costing feature has data to show. Idempotent — skips any
 * item that already has recipe lines. Safe to delete after running.
 *
 *   npx ts-node prisma/backfill-recipes.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const recipes: Record<string, [string, number][]> = {
  'شاورما دجاج': [['دجاج', 0.2], ['خبز عربي', 1], ['ثوم', 0.02], ['طحينة', 0.03], ['بصل', 0.03]],
  'شاورما لحم': [['لحم بقر', 0.2], ['خبز عربي', 1], ['ثوم', 0.02], ['طحينة', 0.03], ['بصل', 0.03]],
  'صحن شاورما': [['دجاج', 0.25], ['أرز بسمتي', 0.2], ['طحينة', 0.04], ['بصل', 0.05], ['طماطم', 0.05]],
  'شاورما عربي': [['دجاج', 0.15], ['خبز عربي', 1], ['ثوم', 0.02], ['بصل', 0.02]],
  'مشكل مشويات': [['لحم غنم', 0.25], ['دجاج', 0.2], ['لحم بقر', 0.15], ['بهارات مشكلة', 0.02], ['بصل', 0.05]],
  'تكا دجاج': [['دجاج', 0.35], ['لبن', 0.05], ['بهارات مشكلة', 0.02], ['ثوم', 0.02]],
  'كباب': [['لحم بقر', 0.3], ['بصل', 0.05], ['بهارات مشكلة', 0.02]],
  'كبسة': [['دجاج', 0.3], ['أرز بسمتي', 0.25], ['طماطم', 0.1], ['بصل', 0.05], ['بهارات مشكلة', 0.02]],
  'مندي': [['لحم غنم', 0.3], ['أرز بسمتي', 0.25], ['بهارات مشكلة', 0.02], ['بصل', 0.05]],
  'برياني': [['دجاج', 0.25], ['أرز بسمتي', 0.25], ['لبن', 0.05], ['بهارات مشكلة', 0.02], ['بصل', 0.05]],
  'حمص': [['حمص', 0.15], ['طحينة', 0.05], ['ثوم', 0.01], ['ليمون', 0.02]],
  'فتوش': [['طماطم', 0.1], ['خبز عربي', 1], ['بصل', 0.03], ['ليمون', 0.02]],
  'فلافل': [['حمص', 0.12], ['ثوم', 0.02], ['بصل', 0.03], ['زيت طبخ', 0.05]],
  'متبل': [['طحينة', 0.05], ['ثوم', 0.01], ['ليمون', 0.02], ['زيت طبخ', 0.02]],
  'ليمون طازج': [['ليمون', 0.15], ['سكر', 0.03]],
  'قهوة عربية': [['بن قهوة', 0.015]],
  'شاي': [['سكر', 0.02]],
  'كنافة': [['جبنة', 0.1], ['سكر', 0.05], ['دقيق', 0.05]],
  'بسبوسة': [['دقيق', 0.08], ['سكر', 0.05], ['لبن', 0.03]],
};

async function main() {
  const restaurants = await prisma.restaurant.findMany({ select: { id: true, nameAr: true } });
  let created = 0;
  for (const r of restaurants) {
    const ings = await prisma.ingredient.findMany({ where: { restaurantId: r.id } });
    const items = await prisma.menuItem.findMany({ where: { restaurantId: r.id } });
    const ingByAr = Object.fromEntries(ings.map((i) => [i.nameAr, i]));
    for (const item of items) {
      const lines = recipes[item.nameAr];
      if (!lines) continue;
      const existing = await prisma.menuItemIngredient.count({ where: { menuItemId: item.id } });
      if (existing > 0) continue;
      for (const [ingAr, quantity] of lines) {
        const ing = ingByAr[ingAr];
        if (!ing) continue;
        await prisma.menuItemIngredient.create({
          data: { menuItemId: item.id, ingredientId: ing.id, quantity },
        });
        created++;
      }
    }
    console.log(`  ${r.nameAr}: recipes ensured`);
  }
  console.log(`✅ Created ${created} recipe lines across ${restaurants.length} restaurant(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
