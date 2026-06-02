import { db } from '../../config/db'
import { roles, rolePermissions, adminUsers } from '@mira/db'
import { eq, and, sql, count } from 'drizzle-orm'
import type { CreateRoleDto, UpdateRoleDto, UpdatePermissionDto } from './roles.schema'

export async function getRoles() {
  const allRoles = await db.select().from(roles)
  
  const rolesWithData = await Promise.all(allRoles.map(async (role) => {
    const permissions = await db
      .select({ resource: rolePermissions.resource, action: rolePermissions.action })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id))
    
    const [userCount] = await db
      .select({ count: count() })
      .from(adminUsers)
      .where(and(eq(adminUsers.roleId, role.id), eq(adminUsers.isActive, true)))
    
    return {
      ...role,
      permissions,
      adminCount: Number(userCount?.count || 0)
    }
  }))

  return rolesWithData
}

export async function getPermissionMatrix() {
  const resources = [
    'products', 'orders', 'customers', 'inventory',
    'settings', 'analytics', 'telegram', 'expenses',
    'coupons', 'exchange_rates', 'boxes', 'users', 'roles'
  ]
  const actions = ['read', 'write', 'delete']
  
  const matrix: Record<string, string[]> = {}
  resources.forEach(res => {
    matrix[res] = [...actions]
  })

  return { resources, actions, matrix }
}

export async function getRoleById(id: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!role) throw { status: 404, code: 'ROLE_NOT_FOUND', message: 'Rol topilmadi' }

  const permissions = await db
    .select({ resource: rolePermissions.resource, action: rolePermissions.action })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, id))

  return { ...role, permissions }
}

export async function createRole(data: CreateRoleDto) {
  // Check unique name
  const [existing] = await db.select().from(roles).where(eq(roles.name, data.name)).limit(1)
  if (existing) throw { status: 409, code: 'ROLE_DUPLICATE_NAME', message: 'Bunday nomli rol mavjud' }

  return await db.transaction(async (tx) => {
    const [newRole] = await tx.insert(roles).values({
      name: data.name,
      description: data.description,
    }).returning()

    if (data.permissions.length > 0) {
      await tx.insert(rolePermissions).values(
        data.permissions.map(p => ({
          roleId: newRole.id,
          resource: p.resource,
          action: p.action,
        }))
      )
    }

    return newRole
  })
}

export async function updateRole(id: string, data: UpdateRoleDto) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!role) throw { status: 404, code: 'ROLE_NOT_FOUND', message: 'Rol topilmadi' }

  if (data.name) {
    const [existing] = await db.select().from(roles).where(and(eq(roles.name, data.name), sql`id != ${id}`)).limit(1)
    if (existing) throw { status: 409, code: 'ROLE_DUPLICATE_NAME', message: 'Bunday nomli rol mavjud' }
  }

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(roles)
      .set({
        name: data.name,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning()

    if (data.permissions) {
      // Atomic replace
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
      if (data.permissions.length > 0) {
        await tx.insert(rolePermissions).values(
          data.permissions.map(p => ({
            roleId: id,
            resource: p.resource,
            action: p.action,
          }))
        )
      }
    }

    return updated
  })
}

export async function updateGranularPermission(id: string, dto: UpdatePermissionDto) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  if (!role) throw { status: 404, code: 'ROLE_NOT_FOUND', message: 'Rol topilmadi' }

  if (dto.operation === 'add') {
    await db.insert(rolePermissions).values({
      roleId: id,
      resource: dto.resource,
      action: dto.action,
    }).onConflictDoNothing()
  } else {
    await db.delete(rolePermissions).where(
      and(
        eq(rolePermissions.roleId, id),
        eq(rolePermissions.resource, dto.resource),
        eq(rolePermissions.action, dto.action)
      )
    )
  }
}

export async function deleteRole(id: string) {
  const [userCount] = await db
    .select({ count: count() })
    .from(adminUsers)
    .where(and(eq(adminUsers.roleId, id), eq(adminUsers.isActive, true)))
  
  if (Number(userCount?.count || 0) > 0) {
    throw { status: 400, code: 'ROLE_IN_USE', message: 'Bu rolda adminlar bor. Avval ularni boshqa rolga o\'tkazing.' }
  }

  const [deleted] = await db.delete(roles).where(eq(roles.id, id)).returning()
  if (!deleted) throw { status: 404, code: 'ROLE_NOT_FOUND', message: 'Rol topilmadi' }
  return deleted
}
