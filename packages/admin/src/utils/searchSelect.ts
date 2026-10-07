/**
 * The list behind `SearchSelect`: a field one types into, and the options
 * that match stay under it. Made for picking a concept (owner, 07.10: «у нас
 * их уже огромная куча», and a plain list of fifty is scrolled, not read).
 */

export interface SearchSelectOption {
  value: string | null
  label: string
}

/** Options whose label contains the text, any case; an empty text keeps them all. */
export function filterOptions<T extends SearchSelectOption>(options: T[], query: string): T[] {
  const text = query.trim().toLowerCase()
  if (!text) return options
  return options.filter(option => option.label.toLowerCase().includes(text))
}

/** The highlighted row after an arrow key: wraps round both ends; -1 when there is nothing to highlight. */
export function moveHighlight(current: number, delta: 1 | -1, length: number): number {
  if (length === 0) return -1
  if (current < 0) return delta === 1 ? 0 : length - 1
  return (current + delta + length) % length
}

/** The label the closed field shows; empty when the value is not among the options. */
export function selectedLabel(options: SearchSelectOption[], value: string | null): string {
  return options.find(option => option.value === value)?.label ?? ''
}
