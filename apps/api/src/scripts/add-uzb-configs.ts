import { assertNotProduction } from './_guard'
assertNotProduction()

import { db } from '../config/db'
import { products, productRegionalConfigs } from '@mira/db'
import { eq, and } from 'drizzle-orm'

async function run() {
  console.log('Adding UZB configs to products...')

  // Get all products
  const allProducts = await db.select().from(products)

  let added = 0
  let skipped = 0

  for (const product of allProducts) {
    // Check if UZB config exists
    const [uzbConfig] = await db
      .select()
      .from(productRegionalConfigs)
      .where(
        and(
          eq(productRegionalConfigs.productId, product.id),
          eq(productRegionalConfigs.regionCode, 'UZB')
        )
      )
      .limit(1)

    if (uzbConfig) {
      skipped++
      continue
    }

    // Get KOR config to copy prices
    const [korConfig] = await db
      .select()
      .from(productRegionalConfigs)
      .where(
        and(
          eq(productRegionalConfigs.productId, product.id),
          eq(productRegionalConfigs.regionCode, 'KOR')
        )
      )
      .limit(1)

    if (!korConfig) {
      console.log(`No KOR config for ${product.name}, skipping`)
      skipped++
      continue
    }

    // Insert UZB config with same prices as KOR
    await db.insert(productRegionalConfigs).values({
      productId: product.id,
      regionCode: 'UZB',
      retailPrice: korConfig.retailPrice,
      wholesalePrice: korConfig.wholesalePrice,
      currency: 'KRW',
      minWholesaleQty: korConfig.minWholesaleQty,
      minOrderQty: korConfig.minOrderQty,
      isAvailable: true,
    })

    console.log(`✓ Added UZB config for: ${product.name}`)
    added++
  }

  console.log(`Done. Added: ${added}, Skipped: ${skipped}`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
