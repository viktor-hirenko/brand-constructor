import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isStaleChunkError, reloadAddress } from '@/utils/staleRelease'

/*
 * After a release a click on a tab must open the tab (owner, 07.10: «нажимаю
 * вкладку, а переход не переходит и только со временем переходит»). Before:
 * the page either did nothing, or reloaded the address it was on — the reader
 * stayed where they were and had to click again.
 */

describe('isStaleChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/UsersView-abc.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: https://x/assets/UsersView-abc.js',
  ])('the screen file is not there: %s', message => {
    expect(isStaleChunkError(new TypeError(message))).toBe(true)
  })

  it('any other failure is not a reason to reload', () => {
    expect(isStaleChunkError(new Error('Request failed with status 500'))).toBe(false)
    expect(isStaleChunkError(new Error('Couldn\'t resolve component "default" at "/users"'))).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
  })
})

describe('reloadAddress', () => {
  it('a tab was clicked: the tab, not the address the page is on', () => {
    expect(reloadAddress('/users', '/brands', null)).toBe('/users')
  })

  it('no click in progress: the address the page is on', () => {
    expect(reloadAddress(null, '/namings?tab=internal', null)).toBe('/namings?tab=internal')
  })

  it('already reloaded for this address: no second time', () => {
    expect(reloadAddress('/users', '/brands', '/users')).toBeNull()
    expect(reloadAddress(null, '/users', '/users')).toBeNull()
  })

  it('reloaded for another address before: this one still gets its turn', () => {
    expect(reloadAddress('/users', '/brands', '/brands')).toBe('/users')
  })
})

describe('the wiring', () => {
  const src = (path: string) => readFileSync(resolve(__dirname, '../../../src', path), 'utf8')

  it('the router remembers the clicked tab and reloads at it', () => {
    const router = src('router/index.ts')
    expect(router).toMatch(/clicked = to\.fullPath/)
    expect(router).toMatch(/reloadAddress\(clicked, /)
    expect(router).toMatch(/router\.onError\(/)
  })

  it('nothing reloads the address the page is on behind the router', () => {
    expect(src('main.ts')).not.toMatch(/location\.reload\(\)/)
  })
})
