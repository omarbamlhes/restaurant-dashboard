import { PrismaClient, OrderType, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user + restaurant
  const password = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      email: 'owner@demo.com',
      password,
      name: 'محمد العلي',
      phone: '0551234567',
      role: 'OWNER',
      restaurant: {
        create: {
          name: 'Shawarma House',
          nameAr: 'بيت الشاورما',
          phone: '0112345678',
          branches: {
            create: [
              { name: 'Main Branch', nameAr: 'الفرع الرئيسي - الرياض', address: 'طريق الملك فهد، الرياض', city: 'الرياض', isMain: true },
              { name: 'Jeddah Branch', nameAr: 'فرع جدة', address: 'شارع التحلية، جدة', city: 'جدة' },
            ],
          },
        },
      },
    },
    include: { restaurant: { include: { branches: true } } },
  });

  const restaurant = user.restaurant!;
  const mainBranch = restaurant.branches.find((b) => b.isMain)!;
  const jeddahBranch = restaurant.branches.find((b) => !b.isMain)!;

  // Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Shawarma', nameAr: 'شاورما', sortOrder: 1, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Grills', nameAr: 'مشويات', sortOrder: 2, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Rice Dishes', nameAr: 'أطباق رز', sortOrder: 3, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Appetizers', nameAr: 'مقبلات', sortOrder: 4, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Drinks', nameAr: 'مشروبات', sortOrder: 5, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Desserts', nameAr: 'حلويات', sortOrder: 6, restaurantId: restaurant.id } }),
  ]);

  const [shawarma, grills, rice, appetizers, drinks, desserts] = categories;

  // Menu Items with realistic Saudi prices
  const menuItems = await Promise.all([
    // Shawarma
    prisma.menuItem.create({ data: { name: 'Chicken Shawarma', nameAr: 'شاورما دجاج', price: 18, cost: 6, preparationTime: 8, categoryId: shawarma.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Meat Shawarma', nameAr: 'شاورما لحم', price: 22, cost: 9, preparationTime: 8, categoryId: shawarma.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Shawarma Plate', nameAr: 'صحن شاورما', price: 35, cost: 12, preparationTime: 12, categoryId: shawarma.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Shawarma Wrap', nameAr: 'شاورما عربي', price: 15, cost: 5, preparationTime: 6, categoryId: shawarma.id, restaurantId: restaurant.id } }),
    // Grills
    prisma.menuItem.create({ data: { name: 'Mixed Grill', nameAr: 'مشكل مشويات', price: 75, cost: 30, preparationTime: 25, categoryId: grills.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Chicken Tikka', nameAr: 'تكا دجاج', price: 45, cost: 15, preparationTime: 20, categoryId: grills.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Kebab', nameAr: 'كباب', price: 55, cost: 22, preparationTime: 20, categoryId: grills.id, restaurantId: restaurant.id } }),
    // Rice
    prisma.menuItem.create({ data: { name: 'Kabsa', nameAr: 'كبسة', price: 45, cost: 15, preparationTime: 30, categoryId: rice.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Mandi', nameAr: 'مندي', price: 50, cost: 18, preparationTime: 35, categoryId: rice.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Biryani', nameAr: 'برياني', price: 40, cost: 14, preparationTime: 25, categoryId: rice.id, restaurantId: restaurant.id } }),
    // Appetizers
    prisma.menuItem.create({ data: { name: 'Hummus', nameAr: 'حمص', price: 12, cost: 3, preparationTime: 5, categoryId: appetizers.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Fattoush', nameAr: 'فتوش', price: 14, cost: 4, preparationTime: 5, categoryId: appetizers.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Falafel', nameAr: 'فلافل', price: 10, cost: 2.5, preparationTime: 8, categoryId: appetizers.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Mutabbal', nameAr: 'متبل', price: 12, cost: 3, preparationTime: 5, categoryId: appetizers.id, restaurantId: restaurant.id } }),
    // Drinks
    prisma.menuItem.create({ data: { name: 'Fresh Lemon', nameAr: 'ليمون طازج', price: 10, cost: 2, preparationTime: 3, categoryId: drinks.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Arabic Coffee', nameAr: 'قهوة عربية', price: 8, cost: 1.5, preparationTime: 5, categoryId: drinks.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Tea', nameAr: 'شاي', price: 5, cost: 0.5, preparationTime: 3, categoryId: drinks.id, restaurantId: restaurant.id } }),
    // Desserts
    prisma.menuItem.create({ data: { name: 'Kunafa', nameAr: 'كنافة', price: 25, cost: 8, preparationTime: 10, categoryId: desserts.id, restaurantId: restaurant.id } }),
    prisma.menuItem.create({ data: { name: 'Basbousa', nameAr: 'بسبوسة', price: 15, cost: 4, preparationTime: 5, categoryId: desserts.id, restaurantId: restaurant.id } }),
  ]);

  // Generate 60 days of orders
  console.log('📦 Generating orders...');
  const types: OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
  const statuses: OrderStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];

  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const ordersCount = 15 + Math.floor(Math.random() * 25); // 15-40 orders/day

    for (let i = 0; i < ordersCount; i++) {
      const hour = 10 + Math.floor(Math.random() * 13); // 10am-11pm
      const orderDate = new Date(date);
      orderDate.setHours(hour, Math.floor(Math.random() * 60));

      const branch = Math.random() > 0.4 ? mainBranch : jeddahBranch;
      const itemCount = 1 + Math.floor(Math.random() * 4);
      const selectedItems: any[] = [];

      for (let j = 0; j < itemCount; j++) {
        const mi = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        selectedItems.push({
          menuItemId: mi.id,
          quantity: qty,
          unitPrice: Number(mi.price),
          totalPrice: Number(mi.price) * qty,
        });
      }

      const subtotal = selectedItems.reduce((s, i) => s + i.totalPrice, 0);
      const tax = Math.round(subtotal * 0.15 * 100) / 100;
      const total = subtotal + tax;

      await prisma.order.create({
        data: {
          orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}-${dayOffset}-${i}`,
          type: types[Math.floor(Math.random() * types.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          branchId: branch.id,
          subtotal,
          tax,
          discount: 0,
          total,
          createdAt: orderDate,
          items: { create: selectedItems },
        },
      });
    }
  }

  console.log('✅ Seed complete!');
  console.log('📧 Login: owner@demo.com / 123456');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
