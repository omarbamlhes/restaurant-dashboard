import { PrismaClient, OrderType, OrderStatus, InventoryAction, NotificationType } from '@prisma/client';
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

  // ============ EMPLOYEES ============
  console.log('👥 Generating employees...');

  const employees = [
    { name: 'Ahmed Al-Rashidi', nameAr: 'أحمد الرشيدي', phone: '0551112233', role: 'مدير فرع', salary: 12000, branchId: mainBranch.id },
    { name: 'Khalid Al-Otaibi', nameAr: 'خالد العتيبي', phone: '0559998877', role: 'طباخ', salary: 6000, branchId: mainBranch.id },
    { name: 'Fahad Al-Dossari', nameAr: 'فهد الدوسري', phone: '0553334455', role: 'كاشير', salary: 5000, branchId: mainBranch.id },
    { name: 'Omar Hassan', nameAr: 'عمر حسن', phone: '0557776655', role: 'نادل', salary: 4500, branchId: mainBranch.id },
    { name: 'Saad Al-Malki', nameAr: 'سعد المالكي', phone: '0552221144', role: 'عامل توصيل', salary: 4000, branchId: mainBranch.id },
    { name: 'Yousef Al-Harbi', nameAr: 'يوسف الحربي', phone: '0556667788', role: 'طباخ', salary: 5500, branchId: mainBranch.id },
    { name: 'Ali Al-Qahtani', nameAr: 'علي القحطاني', phone: '0558889900', role: 'مدير فرع', salary: 11000, branchId: jeddahBranch.id },
    { name: 'Nasser Al-Shamri', nameAr: 'ناصر الشمري', phone: '0554443322', role: 'كاشير', salary: 5000, branchId: jeddahBranch.id },
    { name: 'Tariq Ibrahim', nameAr: 'طارق إبراهيم', phone: '0551117799', role: 'طباخ', salary: 6000, branchId: jeddahBranch.id },
    { name: 'Majed Al-Anzi', nameAr: 'ماجد العنزي', phone: '0559991122', role: 'نادل', salary: 4500, branchId: jeddahBranch.id },
    { name: 'Sultan Al-Mutairi', nameAr: 'سلطان المطيري', phone: '0553336677', role: 'عامل توصيل', salary: 4000, branchId: jeddahBranch.id },
    { name: 'Ibrahim Saleh', nameAr: 'إبراهيم صالح', phone: '0557772233', role: 'محاسب', salary: 7000, branchId: mainBranch.id },
  ];

  for (const emp of employees) {
    await prisma.employee.create({ data: emp });
  }

  // ============ INGREDIENTS / INVENTORY ============
  console.log('📦 Generating inventory...');

  const ingredients = [
    { name: 'Chicken', nameAr: 'دجاج', unit: 'كجم', costPerUnit: 18, currentStock: 120, minStock: 30 },
    { name: 'Beef', nameAr: 'لحم بقر', unit: 'كجم', costPerUnit: 55, currentStock: 45, minStock: 20 },
    { name: 'Lamb', nameAr: 'لحم غنم', unit: 'كجم', costPerUnit: 65, currentStock: 25, minStock: 15 },
    { name: 'Rice', nameAr: 'أرز بسمتي', unit: 'كجم', costPerUnit: 8, currentStock: 200, minStock: 50 },
    { name: 'Flour', nameAr: 'دقيق', unit: 'كجم', costPerUnit: 4, currentStock: 80, minStock: 25 },
    { name: 'Cooking Oil', nameAr: 'زيت طبخ', unit: 'لتر', costPerUnit: 9, currentStock: 60, minStock: 20 },
    { name: 'Tahini', nameAr: 'طحينة', unit: 'كجم', costPerUnit: 25, currentStock: 12, minStock: 8 },
    { name: 'Chickpeas', nameAr: 'حمص', unit: 'كجم', costPerUnit: 10, currentStock: 30, minStock: 10 },
    { name: 'Tomatoes', nameAr: 'طماطم', unit: 'كجم', costPerUnit: 5, currentStock: 40, minStock: 15 },
    { name: 'Onions', nameAr: 'بصل', unit: 'كجم', costPerUnit: 3, currentStock: 50, minStock: 15 },
    { name: 'Garlic', nameAr: 'ثوم', unit: 'كجم', costPerUnit: 15, currentStock: 8, minStock: 5 },
    { name: 'Lemons', nameAr: 'ليمون', unit: 'كجم', costPerUnit: 7, currentStock: 5, minStock: 10 },
    { name: 'Arabic Bread', nameAr: 'خبز عربي', unit: 'حبة', costPerUnit: 0.5, currentStock: 300, minStock: 100 },
    { name: 'Spice Mix', nameAr: 'بهارات مشكلة', unit: 'كجم', costPerUnit: 40, currentStock: 6, minStock: 5 },
    { name: 'Coffee Beans', nameAr: 'بن قهوة', unit: 'كجم', costPerUnit: 80, currentStock: 3, minStock: 5 },
    { name: 'Sugar', nameAr: 'سكر', unit: 'كجم', costPerUnit: 5, currentStock: 35, minStock: 10 },
    { name: 'Cheese', nameAr: 'جبنة', unit: 'كجم', costPerUnit: 30, currentStock: 10, minStock: 8 },
    { name: 'Yogurt', nameAr: 'لبن', unit: 'لتر', costPerUnit: 6, currentStock: 20, minStock: 10 },
  ];

  const createdIngredients: any[] = [];
  for (const ing of ingredients) {
    const created = await prisma.ingredient.create({
      data: { ...ing, restaurantId: restaurant.id },
    });
    createdIngredients.push(created);
  }

  // Inventory logs
  const logTypes: InventoryAction[] = ['PURCHASE', 'CONSUMED', 'WASTED'];
  for (const ing of createdIngredients) {
    for (let d = 0; d < 10; d++) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - Math.floor(Math.random() * 30));
      await prisma.inventoryLog.create({
        data: {
          ingredientId: ing.id,
          branchId: Math.random() > 0.4 ? mainBranch.id : jeddahBranch.id,
          type: logTypes[Math.floor(Math.random() * logTypes.length)],
          quantity: 5 + Math.floor(Math.random() * 30),
          note: d === 0 ? 'مشتريات أسبوعية' : undefined,
          createdAt: logDate,
        },
      });
    }
  }

  // ============ NOTIFICATIONS ============
  console.log('🔔 Generating notifications...');

  const lowStockIngredients = createdIngredients.filter(
    (i) => Number(i.currentStock) <= Number(i.minStock),
  );

  const notifications: any[] = [
    // Low stock alerts
    ...lowStockIngredients.map((i) => ({
      userId: user.id,
      title: `Low Stock: ${i.name}`,
      titleAr: `مخزون منخفض: ${i.nameAr}`,
      message: `${i.name} stock is below minimum (${i.currentStock} ${i.unit})`,
      messageAr: `مخزون ${i.nameAr} أقل من الحد الأدنى (${i.currentStock} ${i.unit})`,
      type: 'LOW_STOCK' as NotificationType,
      isRead: false,
      createdAt: new Date(Date.now() - Math.random() * 3600000 * 2),
    })),
    // Sales alerts
    {
      userId: user.id,
      title: 'Daily Sales Record',
      titleAr: 'رقم قياسي في المبيعات اليومية',
      message: 'Today\'s sales exceeded 15,000 SAR!',
      messageAr: 'مبيعات اليوم تجاوزت ١٥,٠٠٠ \u{E900}! أداء ممتاز',
      type: 'SALES_ALERT' as NotificationType,
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 5),
    },
    {
      userId: user.id,
      title: 'Weekly Sales Summary',
      titleAr: 'ملخص المبيعات الأسبوعي',
      message: 'Weekly revenue increased by 12% compared to last week',
      messageAr: 'ارتفاع الإيرادات الأسبوعية بنسبة ١٢٪ مقارنة بالأسبوع الماضي',
      type: 'SALES_ALERT' as NotificationType,
      isRead: true,
      createdAt: new Date(Date.now() - 3600000 * 24),
    },
    // Daily report
    {
      userId: user.id,
      title: 'Daily Report Ready',
      titleAr: 'التقرير اليومي جاهز',
      message: 'Yesterday\'s daily summary report is now available',
      messageAr: 'تقرير ملخص الأمس جاهز للمراجعة. إجمالي الطلبات: ٣٥ | الإيرادات: ٨,٤٠٠ \u{E900}',
      type: 'DAILY_REPORT' as NotificationType,
      isRead: true,
      createdAt: new Date(Date.now() - 3600000 * 12),
    },
    // AI recommendation
    {
      userId: user.id,
      title: 'Menu Optimization Suggestion',
      titleAr: 'توصية لتحسين القائمة',
      message: 'AI analysis suggests promoting Chicken Shawarma Plate',
      messageAr: 'تحليل الذكاء الاصطناعي يقترح الترويج لصحن شاورما الدجاج - هامش ربح مرتفع مع طلب متزايد',
      type: 'AI_RECOMMENDATION' as NotificationType,
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 8),
    },
    // Waste alert
    {
      userId: user.id,
      title: 'High Waste Detected',
      titleAr: 'نسبة هدر مرتفعة',
      message: 'Tomato waste increased by 25% this week',
      messageAr: 'ارتفاع هدر الطماطم بنسبة ٢٥٪ هذا الأسبوع. يُنصح بمراجعة الكميات المطلوبة',
      type: 'HIGH_WASTE' as NotificationType,
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 3),
    },
    // System
    {
      userId: user.id,
      title: 'System Update',
      titleAr: 'تحديث النظام',
      message: 'New reporting features have been added',
      messageAr: 'تم إضافة ميزات جديدة للتقارير وتحليل الأداء. اكتشفها الآن!',
      type: 'SYSTEM' as NotificationType,
      isRead: true,
      createdAt: new Date(Date.now() - 3600000 * 48),
    },
    // Payment due
    {
      userId: user.id,
      title: 'Subscription Renewal',
      titleAr: 'تجديد الاشتراك',
      message: 'Your subscription will be renewed in 5 days',
      messageAr: 'سيتم تجديد اشتراكك خلال ٥ أيام. تأكد من وجود رصيد كافٍ',
      type: 'PAYMENT_DUE' as NotificationType,
      isRead: false,
      createdAt: new Date(Date.now() - 3600000),
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  console.log('✅ Seed complete!');
  console.log('📧 Login: owner@demo.com / 123456');
  console.log(`👥 ${employees.length} employees created`);
  console.log(`📦 ${ingredients.length} ingredients created`);
  console.log(`🔔 ${notifications.length} notifications created`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
