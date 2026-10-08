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
          : 'Невідомо, чи домен вільний.'
    const details: string[] = []
    if (check?.kind === 'delisted') {
      const was = check.prev != null ? ` за ${formatUsd(check.prev)}` : ''
      details.push(`Домен продавався${was}. ${on} оголошення зникло з усіх сайтів, статус For sale знято автоматично.`)
    } else if (n.domain_check_source === 'admin_override') {
      details.push('Статус встановлено вручну.')
    } else if (n.domain_check_source === 'pananames') {
      const checked = formatCheckDate(n.domain_checked_at)
      details.push(checked ? `Перевірено автоматично ${checked}.` : 'Перевірено автоматично.')
    }
    if (used) details.push(locked)
    else if (n.availability_status !== 'available' && n.domain_check_source !== 'admin_override') {
      // A taken domain without a price: say outright that the marketplaces
      // were asked and nobody sells it — «—» alone reads as «not checked».
      const checked = on ? ` Перевірено ${on}.` : ''
      const willCome = 'Якщо домен з’явиться у продажу, статус For sale і ціна встановляться автоматично.'
      switch (check?.kind) {
        case 'delisted':
          details.push(`Якщо домен з’явиться у продажу на ${SITES}, статус For sale і ціна встановляться автоматично.`)
          break
        case 'not_listed':
          details.push(`На ${SITES} домен не продається.${checked}`, willCome)
          break
        case 'no_fixed_price':
          details.push(`На ${SITES} домен не має фіксованої ціни в доларах.${checked}`, willCome)
          break
        case 'unread':
          details.push(on ? `Не всі сайти відповіли. Остання вдала перевірка — ${on}.` : 'Сайти ще не відповіли.', willCome)
          break
        default:
          details.push(`${SITES} ще не перевірялися.`, willCome)
      }
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

/** What the server answers about a domain being typed (`previewDomainPrice`). */
export interface PricePreview {
  sources: NamingPriceSourceReading[]
  /** The price a save would write: the first fixed USD one, Afternic → Sedo → Namecheap. */
  price: number | null
  source: NamingPriceSource | null
}

/** Enough of a domain to ask the marketplaces about: a dot and a zone after it. */
export function looksLikeDomain(text: string): boolean {
  return /[^\s./]\.[a-z]{2,}/i.test(text.trim())
}

/**
 * The sentence above the three marketplaces in the create and edit windows.
 * `automatic` — the choice «Автоматично» is on, so a save writes this price.
 */
export function describePricePreview(preview: PricePreview, automatic: boolean): string {
  if (preview.price != null && preview.source != null) {
    const found = `Продається власником за ${formatUsd(preview.price)} — ціна з ${PRICE_SOURCE_LABELS[preview.source]}.`
    return automatic ? `${found} Після збереження: статус For sale і ця ціна.` : found
  }
  if (preview.sources.some(s => s.outcome === 'unread')) return 'Не всі сайти відповіли. Ціну буде перевірено після збереження.'
  if (preview.sources.some(s => s.outcome === 'no_fixed_price')) return `На ${SITES} домен не має фіксованої ціни в доларах.`
  return `На ${SITES} домен не продається.`
}

/**
 * The frame with the three marketplaces in the create and edit windows. It is
 * in the window from the moment it opens and keeps its height in every state
 * — only what stands inside changes: the owner counted four jumps of the
 * window while a domain was typed (08.10), each one a piece appearing late.
 *
 *   idle    — no domain in the field yet
 *   loading — the marketplaces are being asked
 *   ready   — their answer about the domain in the field
 *   saved   — edit: what the last check stored, nobody is asked again
 *   failed  — the server could not ask them
 *   free    — the registrar says the domain is free: nobody to buy it from
 */
export type SitePricesState = 'idle' | 'loading' | 'ready' | 'saved' | 'failed' | 'free'

export function sitePricesState(input: {
  domain: string
  free: boolean
  saved: boolean
  loading: boolean
  failed: boolean
  ready: boolean
}): SitePricesState {
  if (input.free) return 'free'
  if (input.saved) return 'saved'
  if (!looksLikeDomain(input.domain)) return 'idle'
  if (input.failed) return 'failed'
  return input.ready && !input.loading ? 'ready' : 'loading'
}

/** The sentence above the three rows; null — still being asked, a skeleton stands there. */
export function sitePricesSummary(
  state: SitePricesState,
  given: { preview: PricePreview | null; automatic: boolean; saved: NamingPriceSourceReading[] | null }
): string | null {
  switch (state) {
    case 'idle':
      return `Введіть домен — тут з’являться ціни викупу на ${SITES}.`
    case 'loading':
      return null
    case 'ready':
      return given.preview ? describePricePreview(given.preview, given.automatic) : null
    case 'saved': {
      const last = (given.saved ?? []).reduce<string | null>(
        (max, r) => (r.read_at != null && (max == null || r.read_at > max) ? r.read_at : max),
        null
      )
      const on = formatCheckDate(last)
      return on ? `Остання перевірка — ${on}.` : 'Дані останньої перевірки.'
    }
    case 'failed':
      return 'Не вдалося перевірити сайти. Ціну буде визначено після збереження.'
    case 'free':
      return 'Домен вільний — викуповувати не потрібно.'
  }
}

export interface SitePricesRow {
  source: NamingPriceSource
  label: string
  /** The listing — once the marketplace answered. */
  url: string | null
  /** null — being asked: a skeleton stands in its place. */
  value: string | null
}

/** Always the same three rows, in the same order: only the value changes. */
export function sitePricesRows(state: SitePricesState, sources: NamingPriceSourceReading[] | null): SitePricesRow[] {
  const known = state === 'ready' || state === 'saved'
  return (Object.keys(PRICE_SOURCE_LABELS) as NamingPriceSource[]).map(source => {
    const reading = known ? (sources ?? []).find(r => r.source === source) : undefined
    return {
      source,
      label: PRICE_SOURCE_LABELS[source],
      url: reading?.url ?? null,
      value: state === 'loading' ? null : reading ? describeSourceReading(reading) : '—',
    }
  })
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
