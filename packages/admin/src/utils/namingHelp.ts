import type { DomainFilter } from '@/utils/namingFilters'

/**
 * What the namings table does not say of itself to a person who sees it for
 * the first time (the owner, 08.10): the «Ціна» column holds two different
 * prices, a price and a status open a card, the quick filters are words
 * without a context, and nothing says the prices are found and kept
 * automatically. Three layers, the cheapest first: the things that open a
 * card look it; a sentence on hover for a term; «Як це працює» — one screen
 * for the whole picture. Described, not ordered: the tone of the tab's other
 * hints (06.10).
 */

export const PRICE_COLUMN_HINT =
  'Для вільного домену — вартість реєстрації. Для For sale — ціна, за яку домен продає власник.'

export const STATUS_COLUMN_HINT = 'Визначається автоматично і перевіряється щодня.'

const CARD = 'Подробиці — у картці домену.'

type DomainStatus = 'available' | 'sold' | 'for_sale' | 'unknown'

export const STATUS_HINTS: Record<DomainStatus, string> = {
  available: 'Available — домен вільний, його можна зареєструвати.',
  sold: 'Sold — домен зайнятий і не продається за фіксованою ціною.',
  for_sale: 'For sale — домен зайнятий, але власник його продає.',
  unknown: 'Unknown — статус домену ще не перевірено.',
}

function known(status: string | null | undefined): DomainStatus {
  return status === 'available' || status === 'sold' || status === 'for_sale' ? status : 'unknown'
}

/** On a status badge; `card` — the badge opens the domain's card. */
export function statusHint(status: string | null | undefined, card: boolean): string {
  return card ? `${STATUS_HINTS[known(status)]} ${CARD}` : STATUS_HINTS[known(status)]
}

/** On a price: which of the two prices this one is. */
export function priceHint(status: string | null | undefined): string {
  if (status === 'for_sale') return `Ціна, за яку домен продає власник. ${CARD}`
  if (status === 'available') return `Вартість реєстрації вільного домену. ${CARD}`
  return CARD
}

export const FILTER_HINTS: Record<DomainFilter, string> = {
  decision: 'Ціна в записі не збігається з ціною сайту. Рішення — у картці домену.',
  for_brief: 'Назви, створені на замовлення брифу, який ще не затверджено.',
  for_sale: 'Домен зайнятий, але власник його продає.',
  available: 'Домен вільний.',
  sold: 'Домен зайнятий і не продається за фіксованою ціною.',
  changed: 'Ціну за останній тиждень оновлено автоматично слідом за сайтом.',
  manual: 'Ціну викупу введено вручну, автоматично вона не змінюється.',
}

export interface HelpSection {
  title: string
  lines: string[]
}

/** «Як це працює»: one screen, four questions in the order a newcomer asks them. */
export const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Статус домену',
    lines: [
      'Available — домен вільний. Ціна поруч — вартість реєстрації, близько $15.',
      'Sold — домен зайнятий і не продається за фіксованою ціною.',
      'For sale — домен зайнятий, але власник його продає. Ціна поруч — за скільки домен можна викупити.',
    ],
  },
  {
    title: 'Звідки статус і ціна',
    lines: [
      'Статус і ціна визначаються автоматично після збереження назви з доменом і перевіряються щодня.',
      'Ціна викупу береться із сайтів Afternic, Sedo та Namecheap.',
      'Якщо ціна на сайті змінилась, вона оновлюється в таблиці: поруч стрілка і попередня ціна.',
      'Якщо домен зник із продажу на всіх трьох сайтах, статус For sale знімається.',
    ],
  },
  {
    title: 'Коли потрібне рішення',
    lines: [
      'Червоний значок біля статусу означає: ціна в записі не збігається з ціною сайту або змінилась більш ніж удвічі.',
      'У картці домену є дві кнопки: взяти ціну сайту або залишити свою.',
    ],
  },
  {
    title: 'Своя ціна викупу',
    lines: [
      'Для домену, що продається на іншому сайті або за домовленою ціною, у вікні редагування є «Своя ціна викупу».',
      'Така ціна має позначку «вручну» й автоматично не змінюється.',
    ],
  },
]

export const HELP_FOOTNOTE = 'Усе про конкретний домен — у його картці: вона відкривається з ціни або статусу в таблиці.'
