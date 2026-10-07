import type { SearchSelectOption } from '@/utils/searchSelect'

/**
 * Finding a row in a list of the admin: the text typed into `SearchInput`
 * against the fields a person knows the row by, and a «whose» / «which»
 * choice built from the rows themselves.
 */

/** Any of the values contains the text, any case; an empty text matches everything. */
export function matchesText(values: (string | null | undefined)[], query: string): boolean {
  const text = query.trim().toLowerCase()
  if (!text) return true
  return values.some(value => (value ?? '').toLowerCase().includes(text))
}

export const ALL = 'all'

/**
 * Options of a filter by one field: «all» first, then every value the rows
 * have, once, in alphabetical order. `label` turns a stored value into words.
 */
export function distinctOptions(
  values: (string | null | undefined)[],
  allLabel: string,
  label: (value: string) => string = value => value
): SearchSelectOption[] {
  const seen = [...new Set(values.filter((v): v is string => !!v))]
  const options = seen.map(value => ({ value, label: label(value) })).sort((a, b) => a.label.localeCompare(b.label))
  return [{ value: ALL, label: allLabel }, ...options]
}

/** The filter is off, or the row has the chosen value. */
export function matchesChoice(value: string | null | undefined, choice: string | null): boolean {
  return choice == null || choice === ALL || value === choice
}

/** «12 із 90» while something is filtered out, nothing otherwise — put before the list's own count. */
export function shownOf(shown: number, loaded: number): string {
  return shown === loaded ? '' : `${shown} із `
}
