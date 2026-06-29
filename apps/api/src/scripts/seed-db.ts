import { assertNotProduction } from "./_guard";
assertNotProduction();

import { db, pool } from '../config/db'
import { settings, expenseCategories, korShippingTiers, roles, rolePermissions } from '@mira/db'
import { eq, sql } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Starting database seeding...')

  // 1. Settings (Singleton)
  const [existingSettings] = await db.select().from(settings).limit(1)
  if (!existingSettings) {
    await db.insert(settings).values({
      paymentTimeoutMinutes: 30,
      lowStockThreshold: 10,
      uzbCargoUsdPerKg: 10,
      minOrderKorKrw: 0,
      minOrderUzbUzs: 0,
      lockColumn: 'X',
    })
    console.log('✅ Settings seeded')
  } else {
    console.log('ℹ️ Settings already exist, skipping')
  }

  // 2. Expense Categories (System)
  const categoriesToSeed = [
    { name: 'Yuk tashish', slug: 'cargo', icon: 'truck', isSystem: true, sortOrder: 1 },
    { name: 'Qadoq', slug: 'packaging', icon: 'package', isSystem: true, sortOrder: 2 },
    { name: 'Bojxona', slug: 'customs', icon: 'landmark', isSystem: true, sortOrder: 3 },
    { name: 'Reklama', slug: 'marketing', icon: 'megaphone', isSystem: true, sortOrder: 4 },
    { name: 'Soliq', slug: 'tax', icon: 'receipt', isSystem: true, sortOrder: 5 },
    { name: 'Boshqa', slug: 'other', icon: 'more-horizontal', isSystem: true, sortOrder: 6 },
  ]

  let catCount = 0
  for (const cat of categoriesToSeed) {
    const [existing] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.slug, cat.slug))
      .limit(1)
    if (!existing) {
      await db.insert(expenseCategories).values(cat)
      catCount++
    }
  }
  console.log(`✅ ${catCount} expense categories seeded`)

  // 3. KOR Shipping Tiers
  const tiersToSeed = [
    {
      label: '₩50,000 dan kam',
      maxOrderKrw: 50000n,
      cargoFeeKrw: 3000n,
      sortOrder: 1,
      isActive: true,
    },
    {
      label: "₩50,000 va undan ko'p",
      maxOrderKrw: null,
      cargoFeeKrw: 0n,
      sortOrder: 2,
      isActive: true,
    },
  ]

  let tierCount = 0
  for (const tier of tiersToSeed) {
    const [existing] = await db
      .select()
      .from(korShippingTiers)
      .where(eq(korShippingTiers.label, tier.label))
      .limit(1)
    if (!existing) {
      await db.insert(korShippingTiers).values(tier)
      tierCount++
    }
  }
  console.log(`✅ ${tierCount} KOR shipping tiers seeded`)

  // 4. Roles
  const rolesToSeed = [
    {
      name: 'MANAGER',
      description: 'Buyurtmalar va mahsulotlarni boshqarish',
      isActive: true,
      permissions: [
        { resource: 'products', action: 'read' },
        { resource: 'products', action: 'write' },
        { resource: 'orders', action: 'read' },
        { resource: 'orders', action: 'write' },
        { resource: 'inventory', action: 'read' },
        { resource: 'inventory', action: 'write' },
        { resource: 'customers', action: 'read' },
        { resource: 'coupons', action: 'read' },
        { resource: 'coupons', action: 'write' },
        { resource: 'analytics', action: 'read' },
      ],
    },
    {
      name: 'VIEWER',
      description: "Faqat ko'rish huquqi",
      isActive: true,
      permissions: [
        { resource: 'products', action: 'read' },
        { resource: 'orders', action: 'read' },
        { resource: 'inventory', action: 'read' },
        { resource: 'customers', action: 'read' },
        { resource: 'analytics', action: 'read' },
        { resource: 'coupons', action: 'read' },
      ],
    },
  ]

  let roleCount = 0
  for (const roleData of rolesToSeed) {
    const [existing] = await db.select().from(roles).where(eq(roles.name, roleData.name)).limit(1)

    if (!existing) {
      await db.transaction(async (tx) => {
        const [newRole] = await tx
          .insert(roles)
          .values({
            name: roleData.name,
            description: roleData.description,
            isActive: roleData.isActive,
          })
          .returning()

        await tx.insert(rolePermissions).values(
          roleData.permissions.map((p) => ({
            roleId: newRole.id,
            resource: p.resource as any,
            action: p.action as any,
          }))
        )
      })
      roleCount++
    }
  }
  console.log(`✅ ${roleCount} roles seeded`)

  console.log('✨ Seeding complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
