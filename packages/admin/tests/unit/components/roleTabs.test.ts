import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LIBRARY_TAB_ROLES, ORDER_ROLES, USER_ROLES } from '@brand-constructor/shared'

/*
 * Product Owner and CPO/CEO see only «Brands» in the Admin menu — team request
 * 29.09 (docs/design-audit/admin-role-tabs.md). They still pick concepts,
 * namings, packages and components inside the brief, which reads the API
 * directly, so only the Admin menu and the Admin pages are closed to them.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8')

const LIBRARY_ROUTES = [
  'concepts',
  'concept-detail',
  'namings',
  'pr-packages',
  'components',
  'component-variants',
]

describe('library tabs by role', () => {
  it('are closed to Product Owner and CPO/CEO, open to the other six roles', () => {
    const roles = LIBRARY_TAB_ROLES as readonly string[]
    expect(roles).not.toContain(USER_ROLES.PRODUCT_OWNER)
    expect(roles).not.toContain(USER_ROLES.CPO_CEO)
    const others = Object.values(USER_ROLES).filter(
      r => r !== USER_ROLES.PRODUCT_OWNER && r !== USER_ROLES.CPO_CEO
    )
    expect([...roles].sort()).toEqual([...others].sort())
  })

  it('every library page asks the router for those roles', () => {
    const router = read('router/index.ts')
    for (const name of LIBRARY_ROUTES) {
      const block = router.slice(router.indexOf(`name: '${name}'`))
      const route = block.slice(0, block.indexOf('}'))
      expect(route, name).toContain('meta: { roles: LIBRARY_TAB_ROLES')
    }
  })

  it('the sidebar shows the four library items only to those roles', () => {
    const sidebar = read('components/ui/AppSidebar.vue')
    for (const label of ['Concepts', 'Namings', 'PR Packages', 'UI Components']) {
      expect(sidebar).toMatch(new RegExp(`label: '${label}'[^}]*roles: LIBRARY_TAB_ROLES`))
    }
    expect(sidebar).toMatch(/item\.roles\.includes\(authStore\.user\?\.role/)
    expect(sidebar).toMatch(/label: 'Brands', path: '\/brands', icon: tag \}/)
  })
})

describe('Orders by role (brief-orders plan, phase 2a)', () => {
  it('are for Strategy, Admin and Head of DHC only', () => {
    expect([...ORDER_ROLES].sort()).toEqual(
      [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC, USER_ROLES.STRATEGY_IDENTITY].sort()
    )
  })

  it('both order pages ask the router for those roles', () => {
    const router = read('router/index.ts')
    for (const name of ['orders', 'order-detail']) {
      const block = router.slice(router.indexOf(`name: '${name}'`))
      const route = block.slice(0, block.indexOf('}'))
      expect(route, name).toContain('meta: { roles: ORDER_ROLES')
    }
  })

  it('the sidebar shows «Orders» between Brands and Concepts, only to those roles', () => {
    const sidebar = read('components/ui/AppSidebar.vue')
    expect(sidebar).toMatch(/label: 'Orders', path: '\/orders', icon: clipboardText, roles: ORDER_ROLES/)
    const brands = sidebar.indexOf("label: 'Brands'")
    const orders = sidebar.indexOf("label: 'Orders'")
    const concepts = sidebar.indexOf("label: 'Concepts'")
    expect(brands).toBeLessThan(orders)
    expect(orders).toBeLessThan(concepts)
  })
})
