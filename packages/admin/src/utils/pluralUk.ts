/**
 * Ukrainian plural for admin counters: `pluralUk(5, 'бренд', 'бренди', 'брендів')`
 * → `брендів`. One — 1, 21, 31…; few — 2–4, 22–24…; many — the rest, 11–14 included.
 */
export function pluralUk(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10
  const mod100 = Math.abs(n) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/** `5 брендів` — the number and the word. */
export function countUk(n: number, one: string, few: string, many: string): string {
  return `${n} ${pluralUk(n, one, few, many)}`
}
