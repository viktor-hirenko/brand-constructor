import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * PR Packages card: a package is a shared option (owner, 29.09) — Edit is
 * always there; Delete only while no brief has picked the package. Otherwise
 * the card says in how many briefs it is chosen, instead of offering a button
 * the server would refuse.
 */

const view = readFileSync(resolve(__dirname, '../../../src/views/PrPackagesView.vue'), 'utf8')
const template = view
  .slice(view.indexOf('<template>'), view.lastIndexOf('</template>'))
  .replace(/<!--[\s\S]*?-->/g, '')
const actions = template.slice(
  template.indexOf('package-card__actions'),
  template.indexOf('</div>', template.indexOf('package-card__actions'))
)

describe('PR package card actions', () => {
  it('offers Edit with no condition beyond the write right', () => {
    expect(actions).toMatch(/<BaseButton variant="secondary" size="sm" @click\.stop="openEdit\(pkg\)">Edit/)
  })

  it('offers Delete only when no brief picked the package', () => {
    expect(actions).toMatch(/v-if="pkg\.brands_count"[\s\S]*briefsLabel\(pkg\.brands_count\)/)
    expect(actions).toMatch(/v-else[\s\S]*handleDelete\(pkg\.id, pkg\.name\)[\s\S]*>Delete</)
  })

  it('names the count in Ukrainian with the right ending', () => {
    const fn = view.match(/function briefsLabel[\s\S]*?\n}/)![0]
    const briefsLabel = new Function(`${fn.replace(/: number|: string/g, '')}; return briefsLabel`)()
    expect(briefsLabel(1)).toBe('Вибрано в 1 брифі')
    expect(briefsLabel(3)).toBe('Вибрано в 3 брифах')
    expect(briefsLabel(11)).toBe('Вибрано в 11 брифах')
    expect(briefsLabel(21)).toBe('Вибрано в 21 брифі')
  })
})
