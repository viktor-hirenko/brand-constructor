import { describe, expect, it } from 'vitest'
import type { NamingPriceCheck, NamingPriceSourceReading } from '@brand-constructor/shared'
import {
  describeDomainCard,
  describeSourceReading as describeSourceReadingRaw,
  formatCheckDate,
  initialPriceMode,
  needsDecision,
  priceCellExtras,
  priceDecisionErrorText,
  priceOffer,
  recheckKind,
  type CheckedNaming,
} from '@/utils/namingPriceCheck'

/*
 * The price check in the namings table (docs/architecture/domain-price-sync-plan.md,
 * «Предложение после просмотра владельцем»). The first version put three lines
 * of small text under every price, and the owner could not tell what had
 * happened, who had set the price, or whether anything was his to do. Now the
 * table shows a price and a status, at most one mark beside the price and one
 * button when a decision is a person's; the card says the rest in sentences.
 */

// Midday UTC: the same day and month in any time zone the tests run in.
const AT = '2026-10-07T12:00:00.000Z'
const NOW = new Date('2026-10-08T12:00:00.000Z')

/** Non-breaking spaces as plain ones — `formatUsd` groups thousands with them. */
const plain = (text: string) => text.replace(/\u00A0/g, ' ')

function check(kind: NamingPriceCheck['kind'], rest: Partial<NamingPriceCheck> = {}): NamingPriceCheck {
  return { kind, date: AT, source: null, url: null, amount: null, prev: null, sources: [], ...rest }
}

function forSale(price: number, rest: Partial<CheckedNaming> = {}): CheckedNaming {
  return {
    domain: 'darkmont.com',
    price: null,
    purchase_price: price,
    availability_status: 'for_sale',
    domain_checked_at: null,
    domain_check_source: 'admin_override',
    status: 'active',
    used_in_brand_id: null,
    price_check: null,
    price_auto: true,
    ...rest,
  }
}

const automatic = (rest: Partial<CheckedNaming> = {}): CheckedNaming =>
  forSale(0, { purchase_price: null, availability_status: 'sold', domain_check_source: 'pananames', price_auto: false, ...rest })

/** The card as a person reads it. */
const card = (n: CheckedNaming) => {
  const c = describeDomainCard(n)
  return plain([c.headline, ...c.details].join(' '))
}

describe('beside the price in the table', () => {
  it('a marketplace’s price that did not change: nothing', () => {
    const n = forSale(2795, { price_check: check('verified', { source: 'afternic' }) })
    expect(priceCellExtras(n, NOW)).toEqual({ previous: null, trend: null, trendTitle: null, manual: false })
  })

  it('the marketplace raised the price: an arrow up and the old price, for a week', () => {
    const n = forSale(2995, { price_check: check('updated', { source: 'afternic', prev: 2795 }) })
    const extras = priceCellExtras(n, NOW)
    expect(plain(extras.previous ?? '')).toBe('$2 795')
    expect(extras.trend).toBe('up')
    expect(plain(extras.trendTitle ?? '')).toBe('Ціна зросла: було $2 795')
    expect(priceCellExtras(n, new Date('2026-10-15T12:00:00.000Z'))).toMatchObject({ previous: null, trend: null })
  })

  it('the marketplace lowered it: an arrow down', () => {
    const n = forSale(2595, { price_check: check('updated', { source: 'afternic', prev: 2795 }) })
    const extras = priceCellExtras(n, NOW)
    expect(extras.trend).toBe('down')
    expect(plain(extras.trendTitle ?? '')).toBe('Ціна знизилась: було $2 795')
  })

  it('a price a person typed: «вручну» — before any check too', () => {
    expect(priceCellExtras(forSale(1200, { price_auto: false }), NOW)).toMatchObject({ previous: null, trend: null, manual: true })
    expect(priceCellExtras(forSale(1200, { price_auto: undefined }), NOW).manual).toBe(true)
  })

  it('a row that is not For sale has no marks, whatever is left in the record', () => {
    const n = automatic({ purchase_price: 1500, price_check: check('delisted', { prev: 1500 }) })
    expect(priceCellExtras(n, NOW)).toEqual({ previous: null, trend: null, trendTitle: null, manual: false })
  })
})

describe('«Потрібне рішення» — the one thing a person acts on', () => {
  it('only when the server offers a price to take', () => {
    const offer = check('proposal', { source: 'afternic', amount: 97000 })
    expect(needsDecision(forSale(1200, { price_auto: false, price_check: offer }))).toBe(true)
    expect(needsDecision(forSale(1200, { price_check: check('differs', { source: 'afternic', amount: 97000 }) }))).toBe(false)
    expect(needsDecision(forSale(1200, { price_check: check('not_found') }))).toBe(false)
    expect(needsDecision(forSale(1200))).toBe(false)
  })

  it('never for a naming used in a brand: there is nothing to decide', () => {
    const offer = check('proposal', { source: 'afternic', amount: 97000 })
    expect(needsDecision(forSale(1200, { status: 'used', price_check: offer }))).toBe(false)
  })

  it('what «Взяти ціну сайту» sends', () => {
    expect(priceOffer(check('proposal', { source: 'namecheap', amount: 2685 }))).toEqual({ source: 'namecheap', amount: 2685 })
    expect(priceOffer(check('differs', { source: 'namecheap', amount: 2685 }))).toBeNull()
    expect(priceOffer(null)).toBeNull()
  })
})

describe('the card: who set the price, when it was checked, what happens next', () => {
  it('a marketplace’s price', () => {
    expect(card(forSale(2685, { price_check: check('verified', { source: 'namecheap' }) }))).toBe(
      'Продається власником за $2 685. Ціна з Namecheap, перевірено 07.10. Оновлюється автоматично щодня.'
    )
  })

  it('the marketplace changed it and the system followed', () => {
    expect(card(forSale(2685, { price_check: check('updated', { source: 'namecheap', prev: 2600 }) }))).toBe(
      'Продається власником за $2 685. 07.10 ціна на Namecheap змінилася: було $2 600. Запис оновлено автоматично.'
    )
  })

  it('a new price seen once: it will be written the next day', () => {
    expect(card(forSale(2795, { price_check: check('differs', { source: 'afternic', amount: 2995 }) }))).toBe(
      'Продається власником за $2 795. На Afternic ціна вже $2 995 (перевірено 07.10). Якщо наступного дня вона та сама, запис оновиться автоматично.'
    )
  })

  it('a typed price the marketplace disagrees with: the question', () => {
    const n = forSale(1200, { price_auto: false, price_check: check('proposal', { source: 'afternic', amount: 97000 }) })
    expect(card(n)).toBe(
      'Продається власником за $1 200. Ціну введено вручну. На Afternic домен продається за $97 000 (перевірено 07.10).'
    )
  })

  it('a typed price a person chose to keep', () => {
    const n = forSale(2600, { price_auto: false, price_check: check('differs', { source: 'namecheap', amount: 2685 }) })
    expect(card(n)).toBe(
      'Продається власником за $2 600. Ціну введено вручну, автоматично вона не змінюється. На Namecheap — $2 685 (перевірено 07.10).'
    )
  })

  it('a jump of the marketplace’s own price waits for a person', () => {
    const n = forSale(2795, { price_check: check('proposal', { source: 'afternic', amount: 5600 }) })
    expect(card(n)).toBe(
      'Продається власником за $2 795. Ціна на Afternic змінилася більш ніж удвічі: тепер $5 600. Така зміна не записується без підтвердження.'
    )
  })

  it('the listing is gone: what will happen', () => {
    expect(card(forSale(2795, { price_check: check('not_found') }))).toBe(
      'Продається власником за $2 795. 07.10 оголошення не знайдено на жодному сайті. Якщо його не буде три перевірки поспіль, статус For sale зніметься автоматично.'
    )
  })

  it('a typed price and no listing anywhere: nothing will change', () => {
    expect(card(forSale(1234, { price_auto: false, price_check: check('not_found_manual') }))).toBe(
      'Продається власником за $1 234. Ціну введено вручну, автоматично вона не змінюється. На Afternic, Sedo, Namecheap оголошення немає (перевірено 07.10).'
    )
  })

  it('offers only; no answer; not checked yet', () => {
    expect(card(forSale(2795, { price_check: check('no_fixed_price', { source: 'sedo' }) }))).toContain(
      'без фіксованої ціни в доларах. Ціна в записі не змінюється.'
    )
    expect(card(forSale(2795, { price_check: check('unread') }))).toContain(
      'Сайти не відповіли. Остання вдала перевірка — 07.10. Ціна і статус не змінюються.'
    )
    expect(card(forSale(2795, { price_auto: false }))).toBe(
      'Продається власником за $2 795. Ціну введено вручну. Afternic, Sedo, Namecheap ще не перевірялися. Перевірка — щодня вранці.'
    )
  })

  it('«For sale» taken off by the system: what it was and when', () => {
    const n = automatic({ availability_status: 'unknown', domain_check_source: 'manual', purchase_price: 1500, price_check: check('delisted', { prev: 1500 }) })
    expect(card(n)).toBe(
      'Статус домену ще не визначено. Домен продавався за $1 500. 07.10 оголошення зникло з усіх сайтів, статус For sale знято автоматично. Якщо домен з’явиться у продажу на Afternic, Sedo, Namecheap, статус For sale і ціна встановляться автоматично.'
    )
  })

  it('a taken domain: For sale will come by itself', () => {
    expect(card(automatic({ domain_checked_at: '2026-10-07 12:00:00' }))).toBe(
      'Домен зайнятий. Перевірено автоматично 07.10. Якщо домен з’явиться у продажу на Afternic, Sedo, Namecheap, статус For sale і ціна встановляться автоматично.'
    )
  })

  it('a free domain; a status nobody checked yet; an old manual status', () => {
    expect(card(automatic({ availability_status: 'available', price: 15 }))).toBe('Домен вільний. Реєстрація — $15. Перевірено автоматично.')
    expect(card(automatic({ availability_status: 'unknown', domain_check_source: 'manual' }))).toContain(
      'Статус домену ще не визначено. Автоматичної перевірки ще не було.'
    )
    expect(card(automatic({ availability_status: 'sold', domain_check_source: 'admin_override' }))).toBe(
      'Домен зайнятий. Статус встановлено вручну.'
    )
  })

  it('a naming used in a brand is said to be fixed, and promised no change', () => {
    const n = forSale(2795, { status: 'used', price_check: check('differs', { source: 'afternic', amount: 2995 }) })
    expect(card(n)).toBe(
      'Продається власником за $2 795. Назву закріплено за брендом, запис не змінюється. На Afternic — $2 995 (перевірено 07.10).'
    )
    expect(card(forSale(2795, { status: 'used', price_check: check('not_found') }))).not.toContain('зніметься')
  })
})

describe('the card: what each marketplace asks', () => {
  const describeSourceReading = (r: NamingPriceSourceReading) => plain(describeSourceReadingRaw(r))
  const reading = (rest: Partial<NamingPriceSourceReading>): NamingPriceSourceReading => ({
    source: 'sedo',
    outcome: 'listed',
    amount: null,
    currency: null,
    min_offer: null,
    url: null,
    read_at: AT,
    ...rest,
  })

  it('a fixed price in dollars', () => {
    expect(describeSourceReading(reading({ amount: 2995, currency: 'USD' }))).toBe('$2 995')
  })

  it('a price in euros is shown as it is, not as dollars', () => {
    expect(describeSourceReading(reading({ outcome: 'no_fixed_price', amount: 1300, currency: 'EUR' }))).toBe('1 300 EUR')
  })

  it('offers only, with and without a minimum', () => {
    expect(describeSourceReading(reading({ outcome: 'no_fixed_price', min_offer: 2000 }))).toBe(
      'лише пропозиції, від $2 000'
    )
    expect(describeSourceReading(reading({ outcome: 'no_fixed_price' }))).toBe('без фіксованої ціни')
  })

  it('no listing and no answer are different words', () => {
    expect(describeSourceReading(reading({ outcome: 'absent' }))).toBe('не знайдено')
    expect(describeSourceReading(reading({ outcome: 'unread', amount: 2995 }))).toBe('не перевірено')
  })
})

describe('the edit window opens on the choice the row has', () => {
  it('a marketplace’s price and any automatic status — «Автоматично»', () => {
    expect(initialPriceMode({ domain_check_source: 'admin_override', price_auto: true })).toBe('automatic')
    expect(initialPriceMode({ domain_check_source: 'pananames', price_auto: false })).toBe('automatic')
    expect(initialPriceMode({ domain_check_source: 'manual' })).toBe('automatic')
  })

  it('a typed price, and an old manual status that still asks for one, — «Своя ціна»', () => {
    expect(initialPriceMode({ domain_check_source: 'admin_override', price_auto: false })).toBe('for_sale')
    expect(initialPriceMode({ domain_check_source: 'admin_override' })).toBe('for_sale')
  })
})

describe('recheckKind — what «Перевірити зараз» rechecks', () => {
  const row = (rest: object) => ({
    domain: 'darkmont.com',
    availability_status: 'sold' as const,
    domain_check_source: 'pananames' as const,
    used_in_brand_id: null,
    ...rest,
  })

  it('an automatic row — the domain, as before', () => {
    expect(recheckKind(row({}))).toBe('domain')
    expect(recheckKind(row({ domain_check_source: 'manual', availability_status: 'unknown' }))).toBe('domain')
  })

  it('a «For sale» row — its price at the marketplaces', () => {
    expect(recheckKind(row({ availability_status: 'for_sale', domain_check_source: 'admin_override' }))).toBe('price')
  })

  it('nothing to recheck: an old manual status, a naming used in a brand, no domain', () => {
    expect(recheckKind(row({ availability_status: 'available', domain_check_source: 'admin_override' }))).toBeNull()
    expect(recheckKind(row({ used_in_brand_id: 'brand_1' }))).toBeNull()
    expect(
      recheckKind(row({ availability_status: 'for_sale', domain_check_source: 'admin_override', used_in_brand_id: 'brand_1' }))
    ).toBeNull()
    expect(recheckKind(row({ domain: null }))).toBeNull()
  })
})

describe('formatCheckDate, priceDecisionErrorText', () => {
  it('day and month — of an ISO date and of the database’s own; nothing for no date', () => {
    expect(formatCheckDate('2026-01-05T12:00:00.000Z')).toBe('05.01')
    expect(formatCheckDate('2026-01-05 12:00:00')).toBe('05.01')
    expect(formatCheckDate(null)).toBe('')
    expect(formatCheckDate('not a date')).toBe('')
  })

  it('the server’s refusal of a stale offer, in words', () => {
    expect(priceDecisionErrorText('The marketplace price has changed')).toBe(
      'Ціна на сайті вже інша. Дані в таблиці оновлено.'
    )
    expect(priceDecisionErrorText('Internal Server Error')).toBe('Не вдалося зберегти')
  })
})
