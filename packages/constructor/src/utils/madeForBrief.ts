/**
 * What the teams made for this brief's order, on the author's side —
 * brief-orders plan, phase 2b. A library item made for an order carries
 * `for_brand_id`; the server already hides it from every other brief
 * (`available_for_brand`). Here the author's own brief decides when it shows:
 * only once the team sent the order (`ordersReadyAt`) — until then the screen
 * says «Чекаємо на команду» and a half-made concept must not be pickable.
 */

export interface MadeForBriefItem {
  id: string
  for_brand_id?: string | null
}

export function isMadeForBrief(item: MadeForBriefItem, brandId: string | null | undefined): boolean {
  return !!brandId && item.for_brand_id === brandId
}

export interface MadeForBriefSplit<T> {
  /** Made for this brief and already sent to the author — shown first. */
  made: T[]
  /** Everything else the author may pick, in the list's own order. */
  library: T[]
}

/**
 * Splits a picker list into «Створено для вашого брифу» and the library.
 * Before the order is sent, what was made for it is withheld — unless it is
 * already picked (a pick made before this rule must not vanish from the screen).
 */
export function splitMadeForBrief<T extends MadeForBriefItem>(
  items: readonly T[],
  opts: { brandId: string | null | undefined; ordersReadyAt: string | null | undefined; pickedIds?: readonly string[] }
): MadeForBriefSplit<T> {
  const picked = new Set(opts.pickedIds ?? [])
  const made: T[] = []
  const library: T[] = []
  for (const item of items) {
    if (!isMadeForBrief(item, opts.brandId)) {
      library.push(item)
    } else if (opts.ordersReadyAt) {
      made.push(item)
    } else if (picked.has(item.id)) {
      library.push(item)
    }
  }
  return { made, library }
}

export interface MadeForBriefNames {
  concepts: readonly { name: string }[]
  externalNamings: readonly { name: string }[]
  internalNamings: readonly { name: string }[]
}

function quoted(items: readonly { name: string }[]): string {
  return items.map(i => `«${i.name}»`).join(', ')
}

/** «Концепт «Golden Sun», назва «Golden»» — what the team made, or '' when nothing. */
export function madeForBriefSummary(m: MadeForBriefNames): string {
  const parts: string[] = []
  if (m.concepts.length > 0) parts.push(`${m.concepts.length > 1 ? 'концепти' : 'концепт'} ${quoted(m.concepts)}`)
  if (m.externalNamings.length > 0) parts.push(`${m.externalNamings.length > 1 ? 'назви' : 'назва'} ${quoted(m.externalNamings)}`)
  if (m.internalNamings.length > 0) parts.push(`внутрішня назва ${quoted(m.internalNamings)}`)
  const text = parts.join(', ')
  return text ? text[0].toUpperCase() + text.slice(1) : ''
}

/**
 * The Final review's info block for a brief «В роботі» (owner, 02.10): yellow
 * «Бриф у роботі» while the teams work; once the team sent the order, the kit
 * Alert's blue type «Замовлення виконано» naming what was made; once everything
 * is picked and the brief may go to the CEO, the draft's own «Бриф готовий»
 * (`5387:91772`) — the same moment as a draft before sending.
 */
export function inWorkHeaderInfo(
  ordersReadyAt: string | null | undefined,
  summary = '',
  readyForCeo = false
): { title: string; description: string; iconVariant: 'warning' | 'info' | 'check' } {
  if (readyForCeo) {
    return {
      title: 'Бриф готовий',
      description: 'Ви можете повернутись та змінити будь-який розділ перед відправкою.',
      iconVariant: 'check',
    }
  }
  if (!ordersReadyAt) {
    return { title: 'Бриф у роботі', description: 'Команди готують замовлення.', iconVariant: 'warning' }
  }
  return {
    title: 'Замовлення виконано',
    description: summary
      ? `${summary}. Оберіть їх у розділах нижче та натисніть «На погодження CEO».`
      : 'Оберіть створене в розділах нижче та натисніть «На погодження CEO».',
    iconVariant: 'info',
  }
}
