import { PrismaClient, OrderType, OrderStatus, PaymentMethod, InventoryAction, NotificationType, TableStatus } from '@prisma/client';
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
          email: 'info@shawarmahouse.sa',
          taxNumber: '300123456700003',
          branches: {
            create: [
              { name: 'Main Branch', nameAr: 'الفرع الرئيسي - الرياض', address: 'طريق الملك فهد، حي العليا', city: 'الرياض', isMain: true, latitude: 24.7136, longitude: 46.6753 },
              { name: 'Jeddah Branch', nameAr: 'فرع جدة', address: 'شارع التحلية، حي الأندلس', city: 'جدة', latitude: 21.5433, longitude: 39.1728 },
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

  // Staff accounts
  console.log('👤 Creating staff accounts...');
  const staffPassword = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      password: staffPassword,
      name: 'سارة المنصور',
      phone: '0559876543',
      role: 'MANAGER',
      restaurantId: restaurant.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@demo.com' },
    update: {},
    create: {
      email: 'staff@demo.com',
      password: staffPassword,
      name: 'عبدالله الشهري',
      phone: '0553216549',
      role: 'STAFF',
      permissions: ['pos', 'kitchen', 'notifications'],
      restaurantId: restaurant.id,
    },
  });

  // Check if data already exists (skip if re-running)
  const existingCategories = await prisma.category.findMany({ where: { restaurantId: restaurant.id } });
  if (existingCategories.length > 0) {
    // Still seed new features (customers) if missing
    const existingCustomers = await prisma.customer.count({ where: { restaurantId: restaurant.id } });
    if (existingCustomers === 0) {
      console.log('👥 Adding customers...');
      const customersData = [
        { name: 'عبدالرحمن السالم', phone: '0551001001', email: 'abdulrahman@gmail.com', totalOrders: 45, totalSpent: 3250, lastOrderAt: new Date(Date.now() - 86400000) },
        { name: 'فاطمة الحربي', phone: '0552002002', email: 'fatima.h@gmail.com', totalOrders: 38, totalSpent: 2890, lastOrderAt: new Date(Date.now() - 172800000) },
        { name: 'خالد المطيري', phone: '0553003003', notes: 'حساسية من المكسرات', totalOrders: 32, totalSpent: 2450, lastOrderAt: new Date(Date.now() - 259200000) },
        { name: 'نورة العتيبي', phone: '0554004004', email: 'noura.o@hotmail.com', totalOrders: 28, totalSpent: 1980, lastOrderAt: new Date(Date.now() - 86400000 * 5) },
        { name: 'سعود الدوسري', phone: '0555005005', totalOrders: 22, totalSpent: 1650, lastOrderAt: new Date(Date.now() - 86400000 * 2) },
        { name: 'ريم القحطاني', phone: '0556006006', email: 'reem.q@gmail.com', notes: 'تفضل الأكل بدون حار', totalOrders: 18, totalSpent: 1340, lastOrderAt: new Date(Date.now() - 86400000 * 7) },
        { name: 'محمد الشمري', phone: '0557007007', totalOrders: 15, totalSpent: 1120, lastOrderAt: new Date(Date.now() - 86400000 * 10) },
        { name: 'هند العنزي', phone: '0558008008', email: 'hind@outlook.com', totalOrders: 12, totalSpent: 890, lastOrderAt: new Date(Date.now() - 86400000 * 3) },
        { name: 'تركي الرشيدي', phone: '0559009009', totalOrders: 8, totalSpent: 620, lastOrderAt: new Date(Date.now() - 86400000 * 15) },
        { name: 'لمى السبيعي', phone: '0550100100', email: 'lama.s@gmail.com', notes: 'عميلة VIP - خصم 10%', totalOrders: 52, totalSpent: 4150, lastOrderAt: new Date() },
        { name: 'يزيد الحارثي', phone: '0550200200', totalOrders: 5, totalSpent: 380, lastOrderAt: new Date(Date.now() - 86400000 * 20) },
        { name: 'أمل الزهراني', phone: '0550300300', email: 'amal.z@gmail.com', totalOrders: 10, totalSpent: 750, lastOrderAt: new Date(Date.now() - 86400000 * 4) },
      ];
      for (const c of customersData) {
        await prisma.customer.create({ data: { ...c, restaurantId: restaurant.id } });
      }
      console.log(`✅ Added ${customersData.length} customers`);
    }

    console.log('⏭️  Data already exists, skipping rest of seed...');
    console.log('📧 Owner:   owner@demo.com / 123456');
    return;
  }

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

  // ============ CUSTOMERS ============
  console.log('👥 Creating customers...');

  const customersData = [
    { name: 'عبدالرحمن السالم', phone: '0551001001', email: 'abdulrahman@gmail.com', totalOrders: 45, totalSpent: 3250, lastOrderAt: new Date(Date.now() - 86400000) },
    { name: 'فاطمة الحربي', phone: '0552002002', email: 'fatima.h@gmail.com', totalOrders: 38, totalSpent: 2890, lastOrderAt: new Date(Date.now() - 172800000) },
    { name: 'خالد المطيري', phone: '0553003003', notes: 'حساسية من المكسرات', totalOrders: 32, totalSpent: 2450, lastOrderAt: new Date(Date.now() - 259200000) },
    { name: 'نورة العتيبي', phone: '0554004004', email: 'noura.o@hotmail.com', totalOrders: 28, totalSpent: 1980, lastOrderAt: new Date(Date.now() - 86400000 * 5) },
    { name: 'سعود الدوسري', phone: '0555005005', totalOrders: 22, totalSpent: 1650, lastOrderAt: new Date(Date.now() - 86400000 * 2) },
    { name: 'ريم القحطاني', phone: '0556006006', email: 'reem.q@gmail.com', notes: 'تفضل الأكل بدون حار', totalOrders: 18, totalSpent: 1340, lastOrderAt: new Date(Date.now() - 86400000 * 7) },
    { name: 'محمد الشمري', phone: '0557007007', totalOrders: 15, totalSpent: 1120, lastOrderAt: new Date(Date.now() - 86400000 * 10) },
    { name: 'هند العنزي', phone: '0558008008', email: 'hind@outlook.com', totalOrders: 12, totalSpent: 890, lastOrderAt: new Date(Date.now() - 86400000 * 3) },
    { name: 'تركي الرشيدي', phone: '0559009009', totalOrders: 8, totalSpent: 620, lastOrderAt: new Date(Date.now() - 86400000 * 15) },
    { name: 'لمى السبيعي', phone: '0550100100', email: 'lama.s@gmail.com', notes: 'عميلة VIP - خصم 10%', totalOrders: 52, totalSpent: 4150, lastOrderAt: new Date() },
    { name: 'يزيد الحارثي', phone: '0550200200', totalOrders: 5, totalSpent: 380, lastOrderAt: new Date(Date.now() - 86400000 * 20) },
    { name: 'أمل الزهراني', phone: '0550300300', email: 'amal.z@gmail.com', totalOrders: 10, totalSpent: 750, lastOrderAt: new Date(Date.now() - 86400000 * 4) },
  ];

  for (const c of customersData) {
    await prisma.customer.create({
      data: { ...c, restaurantId: restaurant.id },
    });
  }

  // ============ TABLES ============
  console.log('🪑 Creating tables...');

  const mainTables = [
    { number: 1, nameAr: 'طاولة العائلة', name: 'Family Table', capacity: 8, status: 'OCCUPIED' as TableStatus },
    { number: 2, nameAr: null, name: null, capacity: 4, status: 'AVAILABLE' as TableStatus },
    { number: 3, nameAr: null, name: null, capacity: 4, status: 'AVAILABLE' as TableStatus },
    { number: 4, nameAr: 'طاولة VIP', name: 'VIP Table', capacity: 6, status: 'RESERVED' as TableStatus },
    { number: 5, nameAr: null, name: null, capacity: 2, status: 'OCCUPIED' as TableStatus },
    { number: 6, nameAr: null, name: null, capacity: 4, status: 'AVAILABLE' as TableStatus },
    { number: 7, nameAr: 'الجلسة الخارجية', name: 'Outdoor', capacity: 6, status: 'AVAILABLE' as TableStatus },
    { number: 8, nameAr: null, name: null, capacity: 2, status: 'AVAILABLE' as TableStatus },
    { number: 9, nameAr: null, name: null, capacity: 4, status: 'OCCUPIED' as TableStatus },
    { number: 10, nameAr: 'الصالة الخاصة', name: 'Private Room', capacity: 12, status: 'RESERVED' as TableStatus },
  ];

  const jeddahTables = [
    { number: 1, nameAr: 'طاولة العائلة', name: 'Family Table', capacity: 8, status: 'AVAILABLE' as TableStatus },
    { number: 2, nameAr: null, name: null, capacity: 4, status: 'OCCUPIED' as TableStatus },
    { number: 3, nameAr: null, name: null, capacity: 4, status: 'AVAILABLE' as TableStatus },
    { number: 4, nameAr: null, name: null, capacity: 2, status: 'AVAILABLE' as TableStatus },
    { number: 5, nameAr: 'طاولة VIP', name: 'VIP Table', capacity: 6, status: 'AVAILABLE' as TableStatus },
    { number: 6, nameAr: null, name: null, capacity: 4, status: 'RESERVED' as TableStatus },
  ];

  const createdTables: any[] = [];
  for (const t of mainTables) {
    const created = await prisma.table.upsert({
      where: { branchId_number: { branchId: mainBranch.id, number: t.number } },
      update: {},
      create: { ...t, branchId: mainBranch.id },
    });
    createdTables.push(created);
  }
  for (const t of jeddahTables) {
    const created = await prisma.table.upsert({
      where: { branchId_number: { branchId: jeddahBranch.id, number: t.number } },
      update: {},
      create: { ...t, branchId: jeddahBranch.id },
    });
    createdTables.push(created);
  }

  // ============ ORDERS (60 days history) ============
  console.log('📦 Generating orders...');
  const types: OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
  const statuses: OrderStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
  const paymentMethods: PaymentMethod[] = ['CASH', 'CASH', 'CARD', 'CARD', 'SPLIT'];

  // Track daily revenue for DailySummary
  const dailyData: Record<string, { orders: number; revenue: number; cost: number; branch: string }> = {};

  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateKey = date.toISOString().split('T')[0];
    // Weekend boost (Thu/Fri in Saudi)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 4 || dayOfWeek === 5;
    const ordersCount = isWeekend
      ? 30 + Math.floor(Math.random() * 20)
      : 15 + Math.floor(Math.random() * 20);

    let dayRevenue = 0;
    let dayCost = 0;

    for (let i = 0; i < ordersCount; i++) {
      // Peak hours: 12-2pm lunch, 7-10pm dinner
      const peakRoll = Math.random();
      let hour: number;
      if (peakRoll < 0.35) hour = 12 + Math.floor(Math.random() * 2); // lunch
      else if (peakRoll < 0.75) hour = 19 + Math.floor(Math.random() * 3); // dinner
      else hour = 10 + Math.floor(Math.random() * 13); // other

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
          notes: Math.random() < 0.15 ? 'بدون بصل' : Math.random() < 0.1 ? 'حار زيادة' : undefined,
        });
      }

      const subtotal = selectedItems.reduce((s, item) => s + item.totalPrice, 0);
      const discount = Math.random() < 0.1 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const tax = Math.round((subtotal - discount) * 0.15 * 100) / 100;
      const total = subtotal - discount + tax;
      const pm = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const orderType = types[Math.floor(Math.random() * types.length)];

      await prisma.order.create({
        data: {
          orderNumber: `ORD-${(60 - dayOffset).toString().padStart(3, '0')}-${(i + 1).toString().padStart(3, '0')}`,
          type: orderType,
          status,
          branchId: branch.id,
          tableId: orderType === 'DINE_IN' && Math.random() > 0.3
            ? createdTables.find(t => t.branchId === branch.id && t.status === 'AVAILABLE')?.id
            : undefined,
          subtotal,
          tax,
          discount,
          total,
          paymentMethod: pm,
          paymentStatus: 'PAID',
          paidAmount: total,
          cashAmount: pm === 'CASH' ? total : pm === 'SPLIT' ? Math.round(total * 0.5 * 100) / 100 : 0,
          cardAmount: pm === 'CARD' ? total : pm === 'SPLIT' ? Math.round(total * 0.5 * 100) / 100 : 0,
          changeAmount: pm === 'CASH' ? Math.ceil(total / 10) * 10 - total : 0,
          createdAt: orderDate,
          items: { create: selectedItems },
        },
      });

      if (status === 'COMPLETED') {
        dayRevenue += total;
        const itemCost = selectedItems.reduce((s, item) => {
          const mi = menuItems.find(m => m.id === item.menuItemId);
          return s + (mi ? Number(mi.cost || 0) * item.quantity : 0);
        }, 0);
        dayCost += itemCost;
      }
    }

    // Save daily summary
    dailyData[dateKey] = { orders: ordersCount, revenue: dayRevenue, cost: dayCost, branch: mainBranch.id };
  }

  // ============ TODAY'S ACTIVE ORDERS (for Kitchen) ============
  console.log('🍳 Creating active orders for kitchen...');

  const activeOrders = [
    { status: 'PENDING' as OrderStatus, type: 'DINE_IN' as OrderType, minutesAgo: 2, items: [0, 4, 14] },
    { status: 'PENDING' as OrderStatus, type: 'TAKEAWAY' as OrderType, minutesAgo: 5, items: [1, 10, 11] },
    { status: 'PREPARING' as OrderStatus, type: 'DINE_IN' as OrderType, minutesAgo: 12, items: [7, 5, 16] },
    { status: 'PREPARING' as OrderStatus, type: 'DELIVERY' as OrderType, minutesAgo: 8, items: [2, 13, 15] },
    { status: 'READY' as OrderStatus, type: 'TAKEAWAY' as OrderType, minutesAgo: 18, items: [3, 6] },
    { status: 'PENDING' as OrderStatus, type: 'DINE_IN' as OrderType, minutesAgo: 1, items: [8, 17, 14] },
  ];

  let activeIdx = 1;
  for (const ao of activeOrders) {
    const orderDate = new Date();
    orderDate.setMinutes(orderDate.getMinutes() - ao.minutesAgo);

    const selectedItems = ao.items.map(idx => {
      const mi = menuItems[idx];
      const qty = 1 + Math.floor(Math.random() * 2);
      return {
        menuItemId: mi.id,
        quantity: qty,
        unitPrice: Number(mi.price),
        totalPrice: Number(mi.price) * qty,
        notes: activeIdx === 1 ? 'بدون حار' : activeIdx === 3 ? 'ناشف الرز' : undefined,
      };
    });

    const subtotal = selectedItems.reduce((s, item) => s + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.15 * 100) / 100;
    const total = subtotal + tax;

    await prisma.order.create({
      data: {
        orderNumber: `ORD-TODAY-${(activeIdx++).toString().padStart(3, '0')}`,
        type: ao.type,
        status: ao.status,
        branchId: mainBranch.id,
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod: 'CASH',
        paymentStatus: ao.status === 'READY' ? 'PAID' : 'UNPAID',
        paidAmount: ao.status === 'READY' ? total : 0,
        createdAt: orderDate,
        items: { create: selectedItems },
      },
    });
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
      messageAr: 'مبيعات اليوم تجاوزت ١٥,٠٠٠ ريال! أداء ممتاز',
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
      messageAr: 'تقرير ملخص الأمس جاهز للمراجعة. إجمالي الطلبات: ٣٥ | الإيرادات: ٨,٤٠٠ ريال',
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

  // ============ DAILY SUMMARIES ============
  console.log('📊 Generating daily summaries...');

  for (const [dateKey, data] of Object.entries(dailyData)) {
    const profit = data.revenue - data.cost;
    await prisma.dailySummary.create({
      data: {
        restaurantId: restaurant.id,
        branchId: mainBranch.id,
        date: new Date(dateKey),
        totalOrders: data.orders,
        totalRevenue: Math.round(data.revenue * 100) / 100,
        totalCost: Math.round(data.cost * 100) / 100,
        totalProfit: Math.round(profit * 100) / 100,
        topItems: menuItems.slice(0, 5).map(m => ({ id: m.id, name: m.nameAr, count: Math.floor(Math.random() * 20) + 5 })),
        wasteAmount: Math.round(Math.random() * 200 * 100) / 100,
      },
    });
  }

  console.log('');
  console.log('✅ Seed complete!');
  console.log('══════════════════════════════════');
  console.log('📧 Owner:   owner@demo.com / 123456');
  console.log('📧 Manager: manager@demo.com / 123456');
  console.log('📧 Staff:   staff@demo.com / 123456');
  console.log('══════════════════════════════════');
  console.log(`🏢 ${2} branches`);
  console.log(`🪑 ${mainTables.length + jeddahTables.length} tables`);
  console.log(`🍽️  ${menuItems.length} menu items`);
  console.log(`👥 ${employees.length} employees`);
  console.log(`📦 ${ingredients.length} ingredients`);
  console.log(`🔔 ${notifications.length} notifications`);
  console.log(`🍳 ${activeOrders.length} active orders (kitchen)`);
  console.log(`📊 ${Object.keys(dailyData).length} days of history`);

  // ============ SUBSCRIPTION & BILLING ============
  console.log('💳 Creating subscription data...');

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setMonth(periodStart.getMonth() - 1);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await prisma.subscription.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: {
      restaurantId: restaurant.id,
      plan: 'PRO',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });

  // Sample invoices
  const invoiceMonths = [3, 2, 1];
  for (const monthsAgo of invoiceMonths) {
    const invStart = new Date(now);
    invStart.setMonth(invStart.getMonth() - monthsAgo);
    const invEnd = new Date(invStart);
    invEnd.setMonth(invEnd.getMonth() + 1);
    const invNum = `INV-${invStart.getFullYear()}${String(invStart.getMonth() + 1).padStart(2, '0')}01-${String(4 - monthsAgo).padStart(3, '0')}`;

    await prisma.invoice.upsert({
      where: { invoiceNumber: invNum },
      update: {},
      create: {
        invoiceNumber: invNum,
        subscriptionId: subscription.id,
        amount: 699,
        tax: 104.85,
        totalAmount: 803.85,
        status: 'PAID',
        paidAt: invStart,
        periodStart: invStart,
        periodEnd: invEnd,
      },
    });
  }

  // Sample payment method
  const existingPM = await prisma.subPaymentMethod.findFirst({
    where: { subscriptionId: subscription.id },
  });
  if (!existingPM) {
    await prisma.subPaymentMethod.create({
      data: {
        subscriptionId: subscription.id,
        type: 'MADA',
        last4: '4532',
        expiry: '12/28',
        isDefault: true,
      },
    });
  }

  console.log(`💳 Subscription: ${subscription.plan} (${subscription.status})`);
  console.log(`📄 ${invoiceMonths.length} invoices created`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
