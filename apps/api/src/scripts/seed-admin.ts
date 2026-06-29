import { assertNotProduction } from './_guard'
assertNotProduction()

// Run: npx tsx src/scripts/seed-admin.ts
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

import { db } from '../config/db'
import { adminUsers } from '@mira/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db'

async function seedAdmin() {
  const email = 'admin@miracosmetics.uz'
  const password = 'MiraAdmin2026!'

  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)

  if (existing) {
    console.log('✅ Admin already exists:', email)
    await pool.end()
    return
  }

  const hash = await bcrypt.hash(password, 12)

  await db.insert(adminUsers).values({
    email,
    passwordHash: hash,
    fullName: 'Super Admin',
    isSuperAdmin: true,
    isActive: true,
  })

  console.log('✅ Admin created:')
  console.log('   Email:    ', email)
  console.log('   Password: ', password)
  console.log('   ⚠️  Change password after first login!')

  await pool.end()
}

seedAdmin().catch(console.error)
