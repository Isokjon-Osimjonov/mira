import { db } from '../../config/db'
import { carts, cartItems, products, productRegionalConfigs, inventoryBatches } from '@mira/db'
import { eq, and, sql, isNull } from 'drizzle-orm'
import type { AddCartItemDto, UpdateCartItemDto } from './cart.schema'
import { validateCoupon } from '../coupons/coupons.service'

export async function getCart(customerId: string, regionCode: 'UZB' | 'KOR') {
  // Try to find the cart
  const [cart] = await db.select().from(carts).where(eq(carts.customerId, customerId)).limit(1)

  if (!cart) {
    return {
      id: null,
      regionCode,
      items: [],
      summary: { itemCount: 0, subtotal: 0n, currency: 'KRW' },
      autoApplyCoupons: [],
    }
  }

  // Fetch all items with product, regional config, and aggregated stock
  const items = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      priceSnapshot: cartItems.priceSnapshot,
      product: {
        id: products.id,
        name: products.name,
        barcode: products.barcode,
        sku: products.sku,
        brandName: products.brandName,
        imageUrls: products.imageUrls,
        categoryId: products.categoryId,
        isActive: products.isActive,
        deletedAt: products.deletedAt,
      },
      regionalConfig: {
        retailPrice: productRegionalConfigs.retailPrice,
        wholesalePrice: productRegionalConfigs.wholesalePrice,
        minWholesaleQty: productRegionalConfigs.minWholesaleQty,
        minOrderQty: productRegionalConfigs.minOrderQty,
        currency: productRegionalConfigs.currency,
        isAvailable: productRegionalConfigs.isAvailable,
      },
      stockAvailable:
        sql<number>`COALESCE((SELECT SUM(current_qty) FROM inventory_batches WHERE product_id = ${products.id}), 0)`.mapWith(
          Number
        ),
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(
      productRegionalConfigs,
      and(
        eq(productRegionalConfigs.productId, products.id),
        eq(productRegionalConfigs.regionCode, regionCode)
      )
    )
    .where(eq(cartItems.cartId, cart.id))

  let subtotal = 0n
  let itemCount = 0
  let currency = 'KRW'

  const processedItems = items.map((row) => {
    // If the product is not active or deleted, we still return it but it might need to be filtered out at checkout
    const qty = row.quantity
    const config = row.regionalConfig
    const isWholesale = qty >= config.minWholesaleQty
    const unitPrice = isWholesale ? config.wholesalePrice : config.retailPrice
    const itemSubtotal = unitPrice * BigInt(qty)

    subtotal += itemSubtotal
    itemCount += qty
    currency = config.currency // Assuming all items have same currency (KRW)

    return {
      id: row.id,
      productId: row.product.id,
      name: row.product.name,
      barcode: row.product.barcode,
      sku: row.product.sku,
      brandName: row.product.brandName,
      categoryId: row.product.categoryId,
      imageUrls: row.product.imageUrls,
      quantity: qty,
      unitPrice,
      isWholesale,
      subtotal: itemSubtotal,
      currency: config.currency,
      stockAvailable: row.stockAvailable,
      inStock: row.stockAvailable > 0,
      isActive: row.product.isActive && row.product.deletedAt === null && config.isAvailable,
    }
  })

  return {
    id: cart.id,
    regionCode,
    items: processedItems,
    summary: { itemCount, subtotal, currency },
    autoApplyCoupons: [],
  }
}

async function validateAndCalcPrice(
  productId: string,
  regionCode: 'UZB' | 'KOR',
  quantity: number
) {
  // 1. Verify product
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1)
  if (!product || product.deletedAt !== null) {
    throw { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }
  }
  if (!product.isActive) {
    throw { status: 400, code: 'PRODUCT_INACTIVE', message: 'Mahsulot hozirda faol emas' }
  }

  // 2. Verify regional config
  const [config] = await db
    .select()
    .from(productRegionalConfigs)
    .where(
      and(
        eq(productRegionalConfigs.productId, productId),
        eq(productRegionalConfigs.regionCode, regionCode)
      )
    )
    .limit(1)

  if (!config || !config.isAvailable) {
    throw {
      status: 400,
      code: 'PRODUCT_NO_REGIONAL_CONFIG',
      message: 'Mahsulot ushbu hududda mavjud emas',
    }
  }

  // 3. Check stock
  const stockResult = await db
    .select({ total: sql<number>`SUM(${inventoryBatches.currentQty})`.mapWith(Number) })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, productId))

  const stockAvailable = stockResult[0]?.total || 0

  // 4 & 5. Quantities
  if (quantity > stockAvailable) {
    throw { status: 400, code: 'INSUFFICIENT_STOCK', message: "Omborda yetarli mahsulot yo'q" }
  }
  if (quantity < config.minOrderQty) {
    throw {
      status: 400,
      code: 'INVALID_QUANTITY',
      message: `Minimal buyurtma miqdori: ${config.minOrderQty}`,
    }
  }

  const isWholesale = quantity >= config.minWholesaleQty
  const unitPrice = isWholesale ? config.wholesalePrice : config.retailPrice

  return { unitPrice }
}

export async function addItem(customerId: string, regionCode: 'UZB' | 'KOR', dto: AddCartItemDto) {
  return await db.transaction(async (tx) => {
    const { unitPrice } = await validateAndCalcPrice(dto.productId, regionCode, dto.quantity)

    // 6. Ensure cart exists
    let [cart] = await tx.select().from(carts).where(eq(carts.customerId, customerId)).limit(1)
    if (!cart) {
      const [newCart] = await tx.insert(carts).values({ customerId, regionCode }).returning()
      cart = newCart
    }

    // 7. Check if item exists in cart
    const [existingItem] = await tx
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, dto.productId)))
      .limit(1)

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity
      // Re-validate stock for new quantity
      const { unitPrice: newUnitPrice } = await validateAndCalcPrice(
        dto.productId,
        regionCode,
        newQty
      )

      await tx
        .update(cartItems)
        .set({ quantity: newQty, priceSnapshot: newUnitPrice, updatedAt: new Date() })
        .where(eq(cartItems.id, existingItem.id))
    } else {
      await tx.insert(cartItems).values({
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        priceSnapshot: unitPrice,
      })
    }
  })
}

export async function updateItemQuantity(
  customerId: string,
  regionCode: 'UZB' | 'KOR',
  itemId: string,
  quantity: number
) {
  return await db.transaction(async (tx) => {
    // SECURITY: verify ownership
    const item = await tx
      .select({ cartItem: cartItems, cart: carts })
      .from(cartItems)
      .innerJoin(carts, eq(cartItems.cartId, carts.id))
      .where(eq(cartItems.id, itemId))
      .limit(1)
      .then((res) => res[0])

    if (!item) {
      throw { status: 404, code: 'CART_ITEM_NOT_FOUND', message: 'Savatda mahsulot topilmadi' }
    }
    if (item.cart.customerId !== customerId) {
      throw { status: 403, code: 'CART_ITEM_UNAUTHORIZED', message: 'Bu sizning savatingiz emas' }
    }

    if (quantity === 0) {
      await tx.delete(cartItems).where(eq(cartItems.id, itemId))
      return
    }

    const { unitPrice } = await validateAndCalcPrice(item.cartItem.productId, regionCode, quantity)

    await tx
      .update(cartItems)
      .set({ quantity, priceSnapshot: unitPrice, updatedAt: new Date() })
      .where(eq(cartItems.id, itemId))
  })
}

export async function deleteItem(customerId: string, itemId: string) {
  await db.transaction(async (tx) => {
    const item = await tx
      .select({ cartItem: cartItems, cart: carts })
      .from(cartItems)
      .innerJoin(carts, eq(cartItems.cartId, carts.id))
      .where(eq(cartItems.id, itemId))
      .limit(1)
      .then((res) => res[0])

    if (!item) {
      throw { status: 404, code: 'CART_ITEM_NOT_FOUND', message: 'Savatda mahsulot topilmadi' }
    }
    if (item.cart.customerId !== customerId) {
      throw { status: 403, code: 'CART_ITEM_UNAUTHORIZED', message: 'Bu sizning savatingiz emas' }
    }

    await tx.delete(cartItems).where(eq(cartItems.id, itemId))
  })
}

export async function clearCart(customerId: string) {
  const [cart] = await db.select().from(carts).where(eq(carts.customerId, customerId)).limit(1)
  if (cart) {
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id))
  }
}

export async function validateCartCoupon(
  customerId: string,
  regionCode: 'UZB' | 'KOR',
  code: string
) {
  const cartData = await getCart(customerId, regionCode)

  // Create an array mapping for validateCoupon matching the expected interface
  const cartItemsMapped = cartData.items.map((item) => ({
    productId: item.productId,
    categoryId: item.categoryId,
    brandName: item.brandName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal,
    isWholesale: item.isWholesale,
  }))

  const result = await validateCoupon({
    code,
    customerId,
    region: regionCode,
    cartItems: cartItemsMapped,
    cartSubtotal: cartData.summary.subtotal,
    orderCount: 0, // Should realistically query orders table, but passed 0 as instructed for now
  })

  return {
    valid: true,
    coupon: {
      id: result.coupon.id,
      code: result.coupon.code,
      type: result.coupon.type,
      value: Number(result.coupon.value),
      scope: result.coupon.scope,
    },
    discountAmount: Number(result.discountAmount),
    eligibleSubtotal: Number(result.eligibleSubtotal),
  }
}
