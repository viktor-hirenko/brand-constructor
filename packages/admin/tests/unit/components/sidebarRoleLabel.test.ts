import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROLE_LABELS, USER_ROLES } from '@brand-constructor/shared'

/*
 * Full run 06.10, bug 2: the sidebar footer printed the role key with a
 * capital letter — «Product_owner», «Cpo_ceo», «Strategy_identity».
 * It shows the role's name, the same one the Brands list uses.
 */

const SOURCE = readFileSync(resolve(__dirname, '../../../src/components/ui/AppSidebar.vue'), 'utf8')
const TEMPLATE = SOURCE.slice(SOURCE.indexOf('<template>'), SOURCE.lastIndexOf('</template>'))
const STYLE = SOURCE.slice(SOURCE.indexOf('<style'))

describe('the role under the user in the sidebar', () => {
  it('is the role name from ROLE_LABELS, not the key', () => {
    const line = TEMPLATE.match(/<span class="sidebar__user-role">([^<]*)<\/span>/)?.[1] ?? ''
    expect(line).toContain('ROLE_LABELS[authStore.user.role]')
    expect(line.trim()).not.toBe('{{ authStore.user.role }}')
  })

  it('is not re-cased by CSS (the names are already written as they read)', () => {
    const block = STYLE.slice(STYLE.indexOf('&__user-role'), STYLE.indexOf('}', STYLE.indexOf('&__user-role')))
    expect(block).not.toMatch(/text-transform/)
  })

  it('every role has a name', () => {
    for (const role of Object.values(USER_ROLES)) expect(ROLE_LABELS[role], role).toBeTruthy()
    expect(ROLE_LABELS[USER_ROLES.PRODUCT_OWNER]).toBe('Product Owner')
    expect(ROLE_LABELS[USER_ROLES.CPO_CEO]).toBe('CPO / CEO')
  })
})
