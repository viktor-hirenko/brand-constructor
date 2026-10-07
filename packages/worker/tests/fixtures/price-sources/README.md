# Marketplace answers the price readers are tested against

Taken live on 07.10.2026 with the server's own `User-Agent`
(`src/utils/price-sources.ts`), one request each.

| File | Request | What it shows |
|---|---|---|
| `namecheap.json` | `aftermarket.namecheapapi.com/domain/status?domain=chamboo.com,cashdisco.com,hitgroove.com,boomico.com,pixellia.com,google.com` | prices in dollars; `google.com` — `notfound` |
| `sedo-buynow-usd.json` | `sedo.com/api/domain-details/information/chamboo.com` | fixed price, cents, USD |
| `sedo-buynow-eur.json` | `…/hitgroove.com` | fixed price in EUR |
| `sedo-offers-only.json` | `…/cashdisco.com` | offers only (`bidrange`), a minimum offer |
| `sedo-not-found.json` | `…/google.com` (HTTP 404; `pixellia.com` answers the same) | no listing |
| `afternic-listing.html` | `www.afternic.com/domain/chamboo.com` | `buyNow` in millionths of a dollar |

`afternic-listing.html` is the page's `__NEXT_DATA__` script as served, with the
330 KB of markup around it and the site config and page state inside it removed. The other
files are byte for byte.

Afternic answers without a body, kept in the tests themselves: `google.com` —
307 to `/_error` (no listing); `boomico.com` — 307 to `/forsale/boomico.com`
(a GoDaddy «make an offer» page, no fixed price). Without a `User-Agent`
Afternic and Sedo answer a Cloudflare worker 403 (plan, phase 0).
