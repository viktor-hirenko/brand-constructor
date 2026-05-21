import { countries } from 'countries-list'

export interface GeoOption {
  code: string
  name: string
  popular: boolean
}

const POPULAR_CODES = new Set([
  'UK',
  'DE',
  'PT',
  'ES',
  'CA',
  'AU',
  'NZ',
  'FI',
  'NO',
  'AT',
  'IE',
  'SE',
  'MT',
])

export const GEO_COUNTRIES: GeoOption[] = Object.entries(countries)
  .map(([code, country]) => ({
    code: code === 'GB' ? 'UK' : code,
    name: country.name,
    popular: false,
  }))
  .map(geo => ({
    ...geo,
    popular: POPULAR_CODES.has(geo.code),
  }))
  .sort((a, b) => {
    if (a.popular && !b.popular) return -1
    if (!a.popular && b.popular) return 1
    return a.code.localeCompare(b.code)
  })
