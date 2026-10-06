import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatUiNameCardPrice, resolveUiNameCardBadge } from '@/components/ui/uiNameCard'
import {
  externalNamingAvailabilityRank,
  externalNamingReviewNote,
  resolveExternalNamingPrice,
} from '@/utils/externalNamingPrice'
import {
  getExternalNamingCommentHint,
  isExternalNamingCommentRequired,
  isExternalNamingStepValid,
} from '@/utils/externalNamingValidation'

/*
 * Domain status in the wizard (docs/architecture/domain-status-plan.md). On
 * the stage 06.10 the PO saw cashdisco.com as «$15, Available» — its real
 * price, $7 888, sat in a tagline the wizard never shows, and a manual
 * «Available» also dropped the comment a taken name requires.
 */

const cashdisco = { availability_status: 'for_sale' as const, price: 15, purchase_price: 7888 }

describe('the price on a step 3 card', () => {
  it('For sale shows what the owner asks, not the $15 registration price', () => {
    expect(resolveExternalNamingPrice(cashdisco)).toBe(7888)
  })

  it('Available shows the registration price; Sold and Unknown show none', () => {
    expect(resolveExternalNamingPrice({ availability_status: 'available', price: 15, purchase_price: null })).toBe(15)
    expect(resolveExternalNamingPrice({ availability_status: 'sold', price: 15, purchase_price: null })).toBeNull()
    expect(resolveExternalNamingPrice({ availability_status: 'unknown', price: 15, purchase_price: 9 })).toBeNull()
  })

  it('For sale gets the kit amber badge', () => {
    expect(resolveUiNameCardBadge('for_sale')).toEqual({ tone: 'amber', label: 'For sale' })
  })

  it('orders Available → For sale → Sold / Unknown', () => {
    const order = ['sold', 'for_sale', 'unknown', 'available']
      .slice()
      .sort((a, b) => externalNamingAvailabilityRank(a) - externalNamingAvailabilityRank(b))
    expect(order.slice(0, 2)).toEqual(['available', 'for_sale'])
  })
})

describe('choosing a For sale name needs a comment (Р3)', () => {
  const namings = [
    { id: 'cash', availability_status: 'for_sale' as const },
    { id: 'free', availability_status: 'available' as const },
  ]

  it('one For sale name alone requires a comment', () => {
    expect(isExternalNamingCommentRequired(['cash'], namings)).toBe(true)
    expect(isExternalNamingStepValid(['cash'], '', false, namings)).toBe(false)
    expect(isExternalNamingStepValid(['cash'], 'Worth it for the launch', false, namings)).toBe(true)
  })

  it('says why', () => {
    expect(getExternalNamingCommentHint(['cash'], namings)).toBe(
      "Коментар обов'язковий при виборі назви, яку треба викупити"
    )
  })
})

describe('Final review', () => {
  it('a For sale pick reads «домен треба викупити, $7 888»', () => {
    // Same `$7 888` as the step 3 card (grouped with a no-break space).
    expect(externalNamingReviewNote(cashdisco)).toBe(`домен треба викупити, ${formatUiNameCardPrice(7888)}`)
    expect(formatUiNameCardPrice(7888)).toMatch(/^\$7\s888$/)
  })

  it('other picks get no note', () => {
    expect(externalNamingReviewNote({ availability_status: 'available', price: 15, purchase_price: null })).toBeNull()
    expect(externalNamingReviewNote({ availability_status: 'sold', price: null, purchase_price: null })).toBeNull()
  })
})

describe('wiring', () => {
  const src = (p: string) => readFileSync(resolve(__dirname, '../../../src', p), 'utf8')

  it('step 3 cards take the price by status, not the raw column', () => {
    const grid = src('components/constructor/alternative-selection/ExternalNamingGrid.vue')
    expect(grid).toContain(':price="resolveExternalNamingPrice(naming)"')
    expect(grid).toContain('externalNamingAvailabilityRank')
  })

  it('the customer’s picks above the CEO and revision lists use the same price', () => {
    // «Вибір замовника» on the CEO alternative screen and on the revision
    // screen showed the raw `price` — $15 for a $7 888 For sale domain.
    for (const view of [
      'views/alternative-selection/AlternativeExternalNamingView.vue',
      'views/revision-response/RevisionExternalNamingView.vue',
    ]) {
      expect(src(view)).toContain('price: resolveExternalNamingPrice(n)')
      expect(src(view)).not.toContain('price: n.price')
    }
  })

  it('Final review passes the note for the PO pick and for the CEO pick', () => {
    expect(src('components/constructor/review/ReviewUnifiedView.vue')).toContain('note: externalNamingReviewNote(n)')
    expect(src('composables/useSupervisorApplyVariants.ts')).toContain('note: externalNamingReviewNote(n)')
    expect(src('components/constructor/review/ReviewExternalNamingsList.vue').match(/item\.note/g)?.length).toBe(8)
  })
})
