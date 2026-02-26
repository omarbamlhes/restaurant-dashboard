<div align="center">

# رستق — لوحة المطاعم الذكية

**Smart Restaurant Dashboard**

منصة متكاملة لإدارة وتحليل أداء المطاعم والمقاهي في السعودية

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## المميزات

- **لوحة تحكم ذكية** — إحصائيات فورية للإيرادات والطلبات والأرباح مع رسوم بيانية تفاعلية
- **نقطة بيع (POS)** — واجهة سريعة لتسجيل الطلبات مع دعم أنواع الطلبات (محلي، سفري، توصيل)
- **شاشة المطبخ (KDS)** — عرض كانبان ثلاثي الأعمدة مع تنبيهات صوتية للطلبات الجديدة
- **إدارة القائمة** — أصناف وفئات مع تتبع التكلفة وهامش الربح
- **إدارة المخزون** — تتبع المكونات مع تنبيهات الحد الأدنى وسجل الحركات
- **إدارة الفروع** — دعم متعدد الفروع مع إحصائيات لكل فرع
- **إدارة الموظفين** — أدوار وظيفية وربط بالفروع
- **تحليلات متقدمة** — مبيعات، أرباح، ساعات الذروة، أداء الأصناف
- **تقارير قابلة للطباعة** — تقارير مفصلة مع دعم الطباعة المباشرة
- **إشعارات ذكية** — تنبيهات مخزون، مبيعات، وتقارير يومية
- **Dark / Light Mode** — تبديل بين الوضعين مع حفظ التفضيل
- **تصميم عربي بالكامل** — واجهة RTL مع خط IBM Plex Sans Arabic

---

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| **الواجهة** | Next.js 14 (App Router) · React 18 · Tailwind CSS · Zustand · Recharts |
| **الباكند** | NestJS 10 · Prisma ORM · JWT Auth · Class Validator |
| **قاعدة البيانات** | PostgreSQL 16 · Redis 7 |
| **البنية** | pnpm Workspaces · Docker Compose · TypeScript |

---

## التشغيل السريع

### المتطلبات

- **Node.js** >= 18
- **pnpm** >= 8
- **Docker** و Docker Compose

### 1. استنساخ المشروع

```bash
git clone <repo-url> restaurant-dashboard
cd restaurant-dashboard
```

### 2. تثبيت الحزم

```bash
pnpm install
```

### 3. تشغيل قاعدة البيانات

```bash
docker compose up -d
```

### 4. إعداد ملف البيئة

```bash
cp apps/api/.env.example apps/api/.env
```

### 5. إنشاء الجداول وبيانات تجريبية

```bash
pnpm db:migrate
pnpm db:seed
```

### 6. تشغيل المشروع

```bash
pnpm dev
```

| الخدمة | الرابط |
|--------|--------|
| الواجهة | [http://localhost:3000](http://localhost:3000) |
| الباكند | [http://localhost:3001](http://localhost:3001) |
| Prisma Studio | `pnpm db:studio` |

### حساب تجريبي

```
البريد:    owner@demo.com
كلمة المرور: 123456
```

---

## هيكل المشروع

```
restaurant-dashboard/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Demo data seeder
│   │   └── src/
│   │       ├── auth/           # JWT authentication
│   │       ├── orders/         # Orders management
│   │       ├── menu/           # Menu & categories
│   │       ├── analytics/      # Charts & reports
│   │       ├── branches/       # Multi-branch
│   │       ├── employees/      # Staff management
│   │       ├── inventory/      # Stock tracking
│   │       └── notifications/  # Alert system
│   │
│   └── web/                    # Next.js Frontend
│       ├── app/
│       │   ├── (auth)/         # Login & register
│       │   ├── (dashboard)/    # Main dashboard pages
│       │   └── (pos)/          # POS & kitchen
│       ├── components/
│       │   ├── dashboard/      # Sidebar, Topbar
│       │   ├── charts/         # Recharts wrappers
│       │   └── shared/         # Skeleton, LoadingSpinner
│       ├── stores/             # Zustand (auth, theme, notifications)
│       └── lib/                # API client, utilities
│
├── docker-compose.yml          # PostgreSQL + Redis
└── package.json                # Workspace scripts
```

---

## الأوامر

| الأمر | الوصف |
|-------|-------|
| `pnpm dev` | تشغيل الواجهة والباكند معاً |
| `pnpm dev:web` | تشغيل الواجهة فقط |
| `pnpm dev:api` | تشغيل الباكند فقط |
| `pnpm build` | بناء المشروع للإنتاج |
| `pnpm db:migrate` | تشغيل migrations قاعدة البيانات |
| `pnpm db:seed` | تعبئة بيانات تجريبية |
| `pnpm db:studio` | فتح Prisma Studio |

---

## الصفحات

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| الرئيسية | `/` | صفحة الهبوط |
| تسجيل الدخول | `/login` | مصادقة JWT |
| لوحة التحكم | `/dashboard` | إحصائيات ورسوم بيانية |
| الطلبات | `/orders` | إدارة الطلبات مع فلاتر |
| القائمة | `/menu` | أصناف وفئات |
| التحليلات | `/analytics` | مبيعات وأرباح |
| المخزون | `/inventory` | تتبع المكونات |
| الفروع | `/branches` | إدارة متعدد الفروع |
| الموظفين | `/employees` | إدارة فريق العمل |
| التقارير | `/reports` | تقارير قابلة للطباعة |
| الإشعارات | `/notifications` | تنبيهات ذكية |
| الإعدادات | `/settings` | ملف شخصي وأمان |
| نقطة البيع | `/pos` | واجهة تسجيل الطلبات |
| المطبخ | `/kitchen` | شاشة العرض للمطبخ |

---

## لقطات الشاشة

<div align="center">

> شغّل المشروع وافتح `http://localhost:3000` لمشاهدة الواجهة كاملة

</div>

---

## الرخصة

هذا المشروع ملكية خاصة. جميع الحقوق محفوظة.
