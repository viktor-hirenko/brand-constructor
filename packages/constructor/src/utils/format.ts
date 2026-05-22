export function formatNamingPrice(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(price)) return ''
  return `$${price.toLocaleString('uk-UA').replace(/,/g, ' ')}`
}
