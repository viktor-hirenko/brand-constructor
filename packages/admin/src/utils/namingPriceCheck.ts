import type {
  ExternalNaming,
  NamingPriceCheck,
  NamingPriceSource,
  NamingPriceSourceReading,
} from '@brand-constructor/shared'
import { formatUsd } from '@/utils/namingDomainStatus'

/**
 * The price check of a domain in the admin: what stands in the table and the
 * card behind a price or a status (docs/architecture/domain-price-sync-plan.md,
 * «Предложение после просмотра владельцем»). The owner could not read the
 * first version — three lines of small text under each price — so the table
 * shows a price and a status, and whole sentences live in the card.
 * What happened is decided on the server; here — only its words.
 */

export const PRICE_SOURCE_LABELS: Record<NamingPriceSource, string> = {
  afternic: 'Afternic',
  sedo: 'Sedo',
  namecheap: 'Namecheap',
}

const SITES = 'Afternic, Sedo, Namecheap'

/** `07.10` — day and month, as the card shows a check's date. */
export function formatCheckDate(iso: string | null | undefined): string {
  if (!iso) return ''
  // D1 writes `datetime('now')` as `2026-10-07 06:00:00`, in UTC.
  const date = new Date(/^\d{4}-\d{2}-\d{2} /.test(iso) ? `${iso.replace(' ', 'T')}Z` : iso)
  if (Number.isNaN(date.getTime())) return ''
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(date.getDate())}.${two(date.getMonth() + 1)}`
}

/** What the card and the table need of a naming. */
export type CheckedNaming = Pick<
  ExternalNaming,
  | 'domain'
  | 'price'
  | 'purchase_price'
  | 'availability_status'
  | 'domain_checked_at'
  | 'domain_check_source'
  | 'status'
  | 'used_in_brand_id'
  | 'price_check'
  | 'price_auto'
>

function isForSale(n: CheckedNaming): boolean {
  return n.availability_status === 'for_sale' && n.domain_check_source === 'admin_override'
}

/** The old price stays beside the new one for a week after an automatic update. */
const PREVIOUS_PRICE_DAYS = 7

export interface PriceCellExtras {
  /** The price before the marketplace changed it, for a week. */
  previous: string | null
  /** Which way it went — the arrow beside the price; its tooltip says from what. */
  trend: 'up' | 'down' | null
  trendTitle: string | null
  /** A person typed the price. */
  manual: boolean
}

/**
 * What stands beside a «For sale» price in the table, and nothing else does:
 * an arrow and the old price for a week after the marketplace changed it, or
 * «вручну» when a person typed it. Everything longer is in the card
 * (`describeDomainCard`).
 */
export function priceCellExtras(n: CheckedNaming, now: Date = new Date()): PriceCellExtras {
  const none = { previous: null, trend: null, trendTitle: null }
  if (!isForSale(n)) return { ...none, manual: false }
  const manual = n.price_auto !== true
  const check = n.price_check
  if (
    check?.kind !== 'updated' ||
    check.prev == null ||
    check.date == null ||
    n.purchase_price == null ||
    n.purchase_price === check.prev ||
    now.getTime() - new Date(check.date).getTime() >= PREVIOUS_PRICE_DAYS * 24 * 60 * 60 * 1000
  ) {
    return { ...none, manual }
  }
  const previous = formatUsd(check.prev)
  const up = n.purchase_price > check.prev
  return {
    previous,
    trend: up ? 'up' : 'down',
    trendTitle: `${up ? 'Ціна зросла' : 'Ціна знизилась'}: було ${previous}`,
    manual,
  }
}

/** The price a person may take with «Взяти ціну сайту», when there is one. */
export function priceOffer(
  check: NamingPriceCheck | null | undefined
): { source: NamingPriceSource; amount: number } | null {
  if (check?.kind !== 'proposal' || check.source == null || check.amount == null) return null
  return { source: check.source, amount: check.amount }
}

/** The one thing in the table a person has to act on. */
export function needsDecision(n: CheckedNaming): boolean {
  return n.status === 'active' && priceOffer(n.price_check) !== null
}

export interface DomainCard {
  /** What the domain is now. */
  headline: string
  /** How the system knows, what it did, what it will do. */
  details: string[]
}

/**
 * The card behind a price or a status: the same facts the server decided on,
 * in whole sentences — who set the price, when it was checked, what happens next.
 */
export function describeDomainCard(n: CheckedNaming): DomainCard {
  const check = n.price_check ?? null
  const on = formatCheckDate(check?.date)
  const site = check?.source ? PRICE_SOURCE_LABELS[check.source] : ''
  const theirs = check?.amount != null ? formatUsd(check.amount) : ''
  const used = n.status === 'used'
  const locked = 'Назву закріплено за брендом, запис не змінюється.'

  if (!isForSale(n)) {
    const headline =
      n.availability_status === 'available'
        ? n.price != null
          ? `Домен вільний. Реєстрація — ${formatUsd(n.price)}.`
          : 'Домен вільний.'
        : n.availability_status === 'sold'
          ? 'Домен зайнятий.'
          : 'Статус домену ще не визначено.'
    const details: string[] = []
    if (check?.kind === 'delisted') {
      const was = check.prev != null ? ` за ${formatUsd(check.prev)}` : ''
      details.push(`Домен продавався${was}. ${on} оголошення зникло з усіх сайтів, статус For sale знято автоматично.`)
    } else if (n.domain_check_source === 'admin_override') {
      details.push('Статус встановлено вручну.')
    } else if (n.domain_check_source === 'pananames') {
      const checked = formatCheckDate(n.domain_checked_at)
      details.push(checked ? `Перевірено автоматично ${checked}.` : 'Перевірено автоматично.')
    } else {
      details.push('Автоматичної перевірки ще не було.')
    }
    if (used) details.push(locked)
    else if (n.availability_status !== 'available' && n.domain_check_source !== 'admin_override') {
      details.push(`Якщо домен з’явиться у продажу на ${SITES}, статус For sale і ціна встановляться автоматично.`)
    }
    return { headline, details }
  }

  const headline = n.purchase_price != null ? `Продається власником за ${formatUsd(n.purchase_price)}.` : 'Продається власником.'
  const manual = n.price_auto !== true
  const typed = 'Ціну введено вручну, автоматично вона не змінюється.'
  const details: string[] = []
  switch (check?.kind) {
    case 'verified':
      details.push(`Ціна з ${site}, перевірено ${on}.`, used ? locked : 'Оновлюється автоматично щодня.')
      break
    case 'updated': {
      const was = check.prev != null ? `: було ${formatUsd(check.prev)}` : ''
      details.push(`${on} ціна на ${site} змінилася${was}.`, 'Запис оновлено автоматично.')
      break
    }
    case 'differs':
      if (used) details.push(locked, `На ${site} — ${theirs} (перевірено ${on}).`)
      else if (manual) details.push(typed, `На ${site} — ${theirs} (перевірено ${on}).`)
      else {
        details.push(
          `На ${site} ціна вже ${theirs} (перевірено ${on}).`,
          'Якщо наступного дня вона та сама, запис оновиться автоматично.'
        )
      }
      break
    case 'proposal':
      if (manual) details.push('Ціну введено вручну.', `На ${site} домен продається за ${theirs} (перевірено ${on}).`)
      else {
        details.push(
          `Ціна на ${site} змінилася більш ніж удвічі: тепер ${theirs}.`,
          'Така зміна не записується без підтвердження.'
        )
      }
      break
    case 'no_fixed_price':
      details.push('На сайтах домен продається без фіксованої ціни в доларах.', 'Ціна в записі не змінюється.')
      break
    case 'not_found':
      details.push(
        `${on} оголошення не знайдено на жодному сайті.`,
        used ? locked : 'Якщо його не буде три перевірки поспіль, статус For sale зніметься автоматично.'
      )
      break
    case 'not_found_manual':
      details.push(typed, `На ${SITES} оголошення немає (перевірено ${on}).`)
      break
    case 'unread':
      details.push(
        on ? `Сайти не відповіли. Остання вдала перевірка — ${on}.` : 'Сайти ще не відповіли на жодну перевірку.',
        'Ціна і статус не змінюються.'
      )
      break
    default:
      details.push(manual ? 'Ціну введено вручну.' : 'Ціна із сайту.', `${SITES} ще не перевірялися. Перевірка — щодня вранці.`)
  }
  return { headline, details }
}

/** One marketplace in the card: «$2 995», «1 300 EUR», «не знайдено»… */
export function describeSourceReading(reading: NamingPriceSourceReading): string {
  switch (reading.outcome) {
    case 'listed':
      return reading.amount != null ? formatUsd(reading.amount) : '—'
    case 'no_fixed_price':
      if (reading.amount != null && reading.currency) {
        return `${formatUsd(reading.amount).slice(1)} ${reading.currency}`
      }
      return reading.min_offer != null
        ? `лише пропозиції, від ${formatUsd(reading.min_offer)}`
        : 'без фіксованої ціни'
    case 'absent':
      return 'не знайдено'
    case 'unread':
      return 'не перевірено'
  }
}

type RecheckRow = Pick<ExternalNaming, 'domain' | 'availability_status' | 'domain_check_source' | 'used_in_brand_id'>

/**
 * What «Перевірити зараз» of a row rechecks: an automatic row — the domain at
 * the registrar and whether it is for sale, a «For sale» one — its price at
 * the marketplaces. A naming used in a brand, or an old manual status, has no
 * such button.
 */
export function recheckKind(n: RecheckRow): 'domain' | 'price' | null {
  if (!n.domain || n.used_in_brand_id) return null
  if (n.domain_check_source !== 'admin_override') return 'domain'
  return n.availability_status === 'for_sale' ? 'price' : null
}

/** The server's refusal of «Взяти ціну сайту» / «Залишити свою», in words. */
export function priceDecisionErrorText(message: string | null | undefined): string {
  if (message === 'The marketplace price has changed') return 'Ціна на сайті вже інша. Дані в таблиці оновлено.'
  return 'Не вдалося зберегти'
}

/**
 * Which choice the edit window opens on: a marketplace's price that the system
 * follows is «Автоматично»; a typed price, and an old manual status, — «Своя ціна».
 */
export function initialPriceMode(n: Pick<ExternalNaming, 'domain_check_source' | 'price_auto'>): 'automatic' | 'for_sale' {
  return n.domain_check_source === 'admin_override' && n.price_auto !== true ? 'for_sale' : 'automatic'
}
