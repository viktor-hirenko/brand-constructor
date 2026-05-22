import type { Concept, ExternalNaming, InternalNaming } from '@brand-constructor/shared/types';

const NOW = '2026-04-10T12:00:00.000Z';

export const PO_COMMENT =
  'Текст коментаря замовника. Хочемо акцент на UK-ринок і швидкий запуск у Q2.';

export const CEO_COMMENT =
  'Текст коментаря CEO. Пропоную переглянути географію та узгодити naming перед фіналом.';

export const CEO_COMMENT_LONG =
  'Додайте ваші коментарі або побажання…'.replace(
    '…',
    ' Перевірте також PR package — потрібен Media Reputation.'
  );

export function mockConcept(overrides: Partial<Concept> = {}): Concept {
  return {
    id: 'concept-winphoria',
    name: 'Winphoria',
    description: 'Bright casino concept for UK market',
    mode: 'light',
    status: 'active',
    visual_url: 'https://picsum.photos/seed/winphoria/460/460',
    gallery_url_1: null,
    gallery_url_2: null,
    gallery_url_3: null,
    gallery_url_4: null,
    gallery_url_5: null,
    gallery_url_6: null,
    gallery_url_7: null,
    gallery_url_8: null,
    gallery_url_9: null,
    gallery_url_10: null,
    created_by: 'user-po',
    used_in_brand_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

export function mockCeoConcept(overrides: Partial<Concept> = {}): Concept {
  return mockConcept({
    id: 'concept-joymania',
    name: 'JoyMania',
    visual_url: 'https://picsum.photos/seed/joymania/460/460',
    ...overrides,
  });
}

export function mockExternalNaming(overrides: Partial<ExternalNaming> = {}): ExternalNaming {
  return {
    id: 'ext-winphoria',
    name: 'Winphoria',
    tagline: 'Feel the win',
    domain: 'test.com',
    price: 1200,
    availability_status: 'available',
    domain_checked_at: NOW,
    domain_check_source: 'manual',
    concept_id: 'concept-winphoria',
    status: 'active',
    created_by: 'user-po',
    used_in_brand_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

export function mockInternalNaming(overrides: Partial<InternalNaming> = {}): InternalNaming {
  return {
    id: 'int-joymania',
    name: 'JoyMania',
    tagline: 'Internal codename',
    status: 'active',
    created_by: 'user-po',
    used_in_brand_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

export const externalNamingItems = [
  { id: 'ext-1', name: 'Winphoria', domain: 'test.com' },
  { id: 'ext-2', name: 'Winstery', domain: 'test.com' },
  { id: 'ext-3', name: 'Echo', domain: 'test.com' },
];

export const ceoExternalItems = [{ id: 'ext-ceo', name: 'JoyMania', domain: 'test.com' }];

export const conceptGridItems: Concept[] = [
  mockConcept(),
  mockConcept({
    id: 'concept-2',
    name: 'StarVegas',
    visual_url: 'https://picsum.photos/seed/starvegas/460/460',
  }),
  mockConcept({
    id: 'concept-3',
    name: 'LuckySpin',
    visual_url: 'https://picsum.photos/seed/luckyspin/460/460',
  }),
  mockConcept({
    id: 'concept-4',
    name: 'GoldenRush',
    visual_url: 'https://picsum.photos/seed/goldenrush/460/460',
  }),
  mockConcept({
    id: 'concept-5',
    name: 'NeonJackpot',
    visual_url: 'https://picsum.photos/seed/neonjackpot/460/460',
  }),
  mockConcept({
    id: 'concept-6',
    name: 'RoyalBet',
    visual_url: 'https://picsum.photos/seed/royalbet/460/460',
  }),
];

export const externalNamingGridItems: ExternalNaming[] = [
  mockExternalNaming(),
  mockExternalNaming({
    id: 'ext-winstery',
    name: 'Winstery',
    price: 980,
  }),
  mockExternalNaming({
    id: 'ext-echo',
    name: 'Echo',
    price: 750,
    availability_status: 'sold',
  }),
  mockExternalNaming({
    id: 'ext-nova',
    name: 'NovaPlay',
    domain: 'novaplay.io',
    price: 2100,
  }),
  mockExternalNaming({
    id: 'ext-blaze',
    name: 'BlazeBet',
    domain: 'blaze.bet',
    price: 1500,
  }),
  mockExternalNaming({
    id: 'ext-orbit',
    name: 'OrbitWin',
    domain: 'orbit.win',
    price: 890,
  }),
];

export const internalNamingGridItems: InternalNaming[] = [
  mockInternalNaming(),
  mockInternalNaming({ id: 'int-2', name: 'Project Aurora' }),
  mockInternalNaming({ id: 'int-3', name: 'Blue Horizon' }),
  mockInternalNaming({ id: 'int-4', name: 'Rocket Codename' }),
  mockInternalNaming({ id: 'int-5', name: 'Internal Vega' }),
  mockInternalNaming({ id: 'int-6', name: 'Phoenix' }),
];
