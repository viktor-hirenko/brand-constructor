// Stand harness: prod frontend, /api routed to the local worker (Slack/Jira off).
const { chromium } = require('playwright')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Stand working dir: local D1 copy, screenshots, run state. Never committed.
const SP = process.env.STAND_DIR || path.join(__dirname, '.stand')
const WORKER = path.resolve(__dirname, '../../packages/worker')
// Same secret the stand worker gets from stand.env (see README) — never .dev.vars.
const ENV_FILE = process.env.STAND_ENV || path.join(SP, 'stand.env')
const SECRET = fs.readFileSync(ENV_FILE, 'utf8').match(/^JWT_SECRET=(.*)$/m)[1].trim()
const O = 'https://brand-constructor.pages.dev'
const USERS = {
  po: { sub: 'usr_f8e2a1b3c4d54e01', email: 'ritasiropulo@gmail.com', name: 'PO', role: 'product_owner' },
  po2: { sub: 'usr_ad7987044775410c', email: 'viktor.hirenko@gmail.com', name: 'PO2', role: 'product_owner' },
  strategy: { sub: 'usr_edade59813104803', email: 'v.paitian@upstars.com', name: 'Valentyn Paitian', role: 'strategy_identity' },
  ceo: { sub: 'usr_179922a1565e4c22', email: 'viktor.hirenko.dev@gmail.com', name: 'CEO', role: 'cpo_ceo' },
}

function token(u, expired = false) {
  const b64 = s => Buffer.from(s).toString('base64url')
  const now = Math.floor(Date.now() / 1000) - (expired ? 200000 : 0)
  const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const p = b64(JSON.stringify({ ...u, iat: now, exp: now + 99999, sid: now }))
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`
}

// `expired`: every /api call goes out with a token past its `exp` — the worker answers 401.
const state = { offline: false, expired: false, writes: [] }

// STAND_FRONT=<dir> serves the site from a local unified build
// (`deploy/unified/public`) instead of prod — to try a change before release.
// Same shell fallback as deploy/unified/functions/_middleware.ts.
const FRONT = process.env.STAND_FRONT ? path.resolve(process.env.STAND_FRONT) : null
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json', '.webp': 'image/webp' }
async function serveFront(route) {
  const u = new URL(route.request().url())
  let file = path.join(FRONT, decodeURIComponent(u.pathname))
  if (!file.startsWith(FRONT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(FRONT, u.pathname.startsWith('/wizard') ? 'wizard/index.html' : 'index.html')
  }
  await route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) })
}

async function session(browser, who, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  const tk = token(USERS[who])
  const deadTk = token(USERS[who], true)
  await ctx.route(`${O}/api/**`, async route => {
    const req = route.request()
    if (state.offline) return route.abort('internetdisconnected')
    const u = new URL(req.url())
    const headers = { ...req.headers(), cookie: `auth_token=${state.expired ? deadTk : tk}` }
    delete headers['content-length']
    const res = await fetch(`http://127.0.0.1:8799${u.pathname}${u.search}`, { method: req.method(), headers, body: req.postDataBuffer() || undefined })
    const hh = {}
    res.headers.forEach((v, k) => { if (k !== 'content-encoding' && k !== 'set-cookie') hh[k] = v })
    const body = Buffer.from(await res.arrayBuffer())
    if (req.method() !== 'GET') state.writes.push({ who, m: req.method(), p: u.pathname, status: res.status, body: (req.postData() || '').slice(0, 400), res: body.toString().slice(0, 200) })
    await route.fulfill({ status: res.status, headers: hh, body })
  })
  if (FRONT) await ctx.route(url => url.origin === O && !url.pathname.startsWith('/api/'), serveFront)
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log(`[${who} pageerror]`, String(e).slice(0, 200)))
  return { ctx, page, who }
}

// the wizard lives in an iframe under /wizard/ when opened from the admin
function wiz(page) {
  return page.frames().find(f => f.url().includes('/wizard/')) || page.mainFrame()
}

async function wait(page, ms = 1500) { await page.waitForTimeout(ms) }

async function clickText(frame, text, { exact = false, nth = 0, within } = {}) {
  const root = within ? frame.locator(within) : frame
  let loc = root.getByRole('button', { name: text, exact })
  if (!(await loc.count())) loc = root.locator('button, a, [role=button], label, [role=tab], [role=radio], [role=option]').filter({ hasText: exact ? new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) : text })
  const n = await loc.count()
  if (n <= nth) throw new Error(`clickText: "${text}" not found (${n})`)
  await loc.nth(nth).scrollIntoViewIfNeeded()
  await loc.nth(nth).click()
}

async function buttons(frame) {
  return frame.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ') + (b.disabled ? ' [off]' : '')).filter(Boolean))
}

async function text(frame, sel = 'body') {
  return frame.evaluate(s => (document.querySelector(s)?.innerText || '').replace(/\n{2,}/g, '\n'), sel)
}

async function shot(page, name) {
  const p = `${SP}/run/${name}.png`
  fs.mkdirSync(`${SP}/run`, { recursive: true })
  await page.screenshot({ path: p })
  return p
}

function sql(q) {
  const out = execSync(`cd ${WORKER} && npx wrangler d1 execute brand-constructor-db --env production --local --persist-to ${SP}/d1 --json --command ${JSON.stringify(q)}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return JSON.parse(out)[0].results
}

function brand(id) {
  const r = sql(`select * from brands where id='${id}'`)[0]
  if (!r) return null
  for (const k of ['external_naming_ids', 'ceo_selections', 'ceo_comments', 'new_concept_brief', 'new_naming_brief', 'step_data', 'component_selections']) {
    try { if (r[k]) r[k] = JSON.parse(r[k]) } catch {}
  }
  return r
}

async function launch() { return chromium.launch() }

module.exports = { O, SP, USERS, state, session, wiz, wait, clickText, buttons, text, shot, sql, brand, launch }

async function form(frame) {
  return frame.evaluate(() => [...document.querySelectorAll('input, textarea, select, [role=combobox], [role=switch], [role=checkbox], [role=radio]')].filter(e => e.offsetParent || e.type === 'checkbox' || e.type === 'radio').map(e => `${e.tagName.toLowerCase()}[${e.type || e.getAttribute('role') || ''}] name=${e.name || ''} ph=${e.placeholder || ''} aria=${e.getAttribute('aria-label') || ''} val=${(e.value || '').slice(0, 40)} checked=${e.checked ?? e.getAttribute('aria-checked')}`))
}
module.exports.form = form
async function back(page) { await wiz(page).evaluate(() => history.back()).catch(() => {}); await page.waitForTimeout(2500) }
module.exports.back = back
