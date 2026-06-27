import { config } from 'dotenv';
config({ path: 'apps/api/.env' });
import { db } from './libs/db/src/index';
import { customers, products, categories, orders } from './libs/db/src/schema';
import { createWalkInCustomer } from './apps/api/src/modules/customers/customers.service';
import { adminCreateOrder } from './apps/api/src/modules/orders/orders.service';

async function run() {
  try {
    console.log("1. Creating dummy category and product...");
    const [cat] = await db.insert(categories).values({
      name: 'Test Category',
      slug: 'test-category'
    }).returning({ id: categories.id });

    const [prod] = await db.insert(products).values({
      name: 'Test Product',
      sku: 'TEST-123',
      barcode: '123456789',
      categoryId: cat.id,
      brandName: 'Test Brand',
      ingredients: [],
      skinTypes: [],
      benefits: [],
      weightGrams: 100,
      imageUrls: []
    }).returning({ id: products.id });

    console.log("2. Simulating /customers/walk-in...");
    const customer = await createWalkInCustomer({
      firstName: 'IsokjonTest',
      phone: '+998901234567',
      region: 'UZB',
      note: 'Walk-in from test'
    });
    console.log("Customer created:", customer);
    console.log("Customer ID:", customer.id);

    console.log("3. Simulating /orders/new (Manual Order)...");
    const orderData = await adminCreateOrder('fc748ddf-c6e6-4ed4-b67c-189cfa902559', {
      customerId: customer.id,
      paymentMethod: 'UZB_BANK',
      paymentMode: 'RECEIPT',
      items: [
        {
          productId: prod.id,
          quantity: 2,
          negotiatedPriceKrw: 15000
        }
      ]
    });
    console.log("Order created:", orderData.order.orderNumber);

    console.log("4. Verifying DB Rows...");
    const dbCustomer = await db.select().from(customers).where(customers.id.eq(customer.id));
    console.log("DB CUSTOMER ROW:", JSON.stringify(dbCustomer, null, 2));

    const dbOrder = await db.select().from(orders).where(orders.id.eq(orderData.order.id));
    console.log("DB ORDER ROW:", JSON.stringify(dbOrder, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
}
run();
