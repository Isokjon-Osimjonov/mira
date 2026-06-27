import { db } from './apps/api/src/config/db'
import { customers } from '@mira/db'
import { signAccess } from './apps/api/src/lib/jwt'

async function run() {
  const [customer] = await db.insert(customers).values({
    phone: '+99899' + Math.floor(Math.random() * 10000000),
    phoneRegion: 'UZB',
    firstName: 'Test Delete',
    isActive: true,
  }).returning()

  const token = signAccess({ sub: customer.id, type: 'customer', phone: customer.phone, region: 'UZB' })
  console.log(customer.id)
  console.log(token)
  process.exit(0)
}
run()
