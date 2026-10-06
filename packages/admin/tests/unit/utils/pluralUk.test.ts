import { describe, expect, it } from 'vitest'
import { countUk } from '@/utils/pluralUk'

// Admin counters in Ukrainian (06.10): «161 неймінг», «88 брендів», «2 бренди».
describe('countUk', () => {
  const brands = (n: number) => countUk(n, 'бренд', 'бренди', 'брендів')
  it('one, few, many — and the teens are many', () => {
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 88, 101, 111, 161].map(brands)).toEqual([
      '1 бренд', '2 бренди', '4 бренди', '5 брендів', '11 брендів', '12 брендів', '14 брендів',
      '21 бренд', '22 бренди', '88 брендів', '101 бренд', '111 брендів', '161 бренд',
    ])
    expect(brands(0)).toBe('0 брендів')
  })
})
