import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import prPackages from '@/routes/pr-packages'

/*
 * A PR package is a shared option, like a plan on a SaaS site — owner, 29.09:
 * «Если кто-то его использовал, это не значит, что он для других недоступен.»
 * Many brands pick the same package, and it is not used up like a concept.
 *
 * So: editing is always allowed, approval does not mark the package, and only
 * deletion is refused while some brief still points at the package.
 * `pr_packages.used_in_brand_id` stays in the schema but nothing may act on it.
 */

type Row = Record<string, unknown>

function fakeDb(pkg: Row, brands: Row[] = []) {
  const packages = new Map<string, Row>([[pkg.id as string, { ...pkg }]])
  const prepare = (sql: string) => {
    let args: unknown[] = []
    const stmt = {
      bind: (...a: unknown[]) => {
        args = a
        return stmt
      },
      first: async () => {
        if (/FROM pr_packages WHERE id = \?/.test(sql)) return packages.get(args[0] as string) ?? null
        if (/FROM brands WHERE pr_package_id = \?/.test(sql))
          return brands.find(b => b.pr_package_id === args[0]) ?? null
        throw new Error(`unexpected query: ${sql}`)
      },
      run: async () => {
        const id = args[args.length - 1] as string
        if (/^UPDATE pr_packages SET/.test(sql)) {
          const cols = [...sql.matchAll(/(\w+) = \?/g)].map(m => m[1]).slice(0, -1)
          const row = packages.get(id)!
          cols.forEach((col, i) => (row[col] = args[i]))
        } else if (/^DELETE FROM pr_packages/.test(sql)) {
          packages.delete(id)
        } else throw new Error(`unexpected query: ${sql}`)
        return { success: true }
      },
    }
    return stmt
  }
  return { db: { prepare }, packages }
}

function appWith(db: unknown) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user' as never, { id: 'usr_1', role: 'pr_marketing' } as never)
    await next()
  })
  app.route('/', prPackages as never)
  return (path: string, init: RequestInit) => app.request(path, init, { DB: db })
}

const approvedPkg = {
  id: 'prp_1',
  name: 'Basic',
  timeline: '2 weeks',
  used_in_brand_id: 'brd_approved',
}

describe('PR package — edit is always allowed', () => {
  it('saves a package that an approved brand has picked', async () => {
    const { db, packages } = fakeDb(approvedPkg, [{ id: 'brd_approved', pr_package_id: 'prp_1' }])
    const res = await appWith(db)('/prp_1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ timeline: '3 weeks' }),
    })
    expect(res.status).toBe(200)
    expect(packages.get('prp_1')!.timeline).toBe('3 weeks')
  })
})

describe('PR package — delete', () => {
  it('is refused while a brief points at the package', async () => {
    const { db, packages } = fakeDb(approvedPkg, [{ id: 'brd_draft', pr_package_id: 'prp_1' }])
    const res = await appWith(db)('/prp_1', { method: 'DELETE' })
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toBe(
      'Cannot delete: PR package is referenced by a brand'
    )
    expect(packages.has('prp_1')).toBe(true)
  })

  it('goes through once no brief points at it, whatever the old used_in_brand_id says', async () => {
    const { db, packages } = fakeDb(approvedPkg, [])
    const res = await appWith(db)('/prp_1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(packages.has('prp_1')).toBe(false)
  })
})

describe('PR package — approval does not mark it', () => {
  // The approve handler needs a full brand, D1 batch and Slack/Jira queue;
  // what matters is that its statement list never writes to pr_packages.
  const src = readFileSync(resolve(__dirname, '../../../src/routes/brands.status.ts'), 'utf8')

  it('brands.status.ts never updates pr_packages', () => {
    expect(src).not.toMatch(/UPDATE\s+pr_packages/i)
  })
})

describe('PR package list — tells the Admin how many briefs picked each package', () => {
  const src = readFileSync(resolve(__dirname, '../../../src/routes/pr-packages.ts'), 'utf8')
  const list = src.slice(src.indexOf("app.get('/',"), src.indexOf("app.get('/:id',"))

  it('counts briefs of any status by pr_package_id', () => {
    expect(list).toMatch(
      /\(SELECT COUNT\(\*\) FROM brands b WHERE b\.pr_package_id = p\.id\) AS brands_count/
    )
  })
})
