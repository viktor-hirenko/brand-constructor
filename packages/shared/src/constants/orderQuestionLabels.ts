/**
 * The questions of an order (new concept, new External Naming, new Internal
 * Naming) as the bc-strategy order message prints them. One source for the
 * Slack message and the Orders page of the Admin (brief-orders plan, phase 2a),
 * so the team reads the same words in both places.
 */

export const ORDER_KINDS = {
  CONCEPT: 'concept',
  EXTERNAL_NAMING: 'externalNaming',
  INTERNAL_NAMING: 'internalNaming',
} as const

export type OrderKind = (typeof ORDER_KINDS)[keyof typeof ORDER_KINDS]

/** What was ordered, short — the Orders list and the order page. */
export const ORDER_KIND_LABELS: Record<OrderKind, string> = {
  [ORDER_KINDS.CONCEPT]: 'Новий концепт',
  [ORDER_KINDS.EXTERNAL_NAMING]: 'Новий External Naming',
  [ORDER_KINDS.INTERNAL_NAMING]: 'Новий Internal Naming',
}

/** Section titles of the order message (`*--- … ---*` in Slack). */
export const ORDER_SECTION_TITLES: Record<OrderKind, string> = {
  [ORDER_KINDS.CONCEPT]: 'Бриф нового концепту',
  [ORDER_KINDS.EXTERNAL_NAMING]: 'Бриф нового External Naming',
  [ORDER_KINDS.INTERNAL_NAMING]: 'Бриф нового Internal Naming',
}

export const ORDER_QUESTION_LABELS = {
  isNewGeo: 'Нове ГЕО',
  geoInfo: 'Інфо про ГЕО',
  needsGeoResearch: 'Потрібен Brand Research GEO',
  feedback: 'Що не підійшло',
  trafficTeamInfo: 'Інфо від трафік-команди',
  competitors: 'Конкуренти',
  keepProductConnection: "Зв'язок з іншими продуктами",
  namingLanguage: 'Мова назви',
  desiredWordsInName: 'Бажані слова в назві',
  domainZones: 'Доменні зони',
  wordsToAvoid: 'Слова яких уникнути',
  domainBudget: 'Бюджет домена',
  namingDeadline: 'Дедлайн',
  additionalGeoInfo: 'Додаткова інфо по ГЕО',
} as const
