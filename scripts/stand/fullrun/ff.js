// Full-run flow of docs/qa/stage-full-run-plan.md: the wizard with every option,
// the CEO, the author's revision — each step checked on the screen and in the base.
const fs = require('fs')
const L = require('../lib'); const F = require('../flow')

const OUT = () => `${L.SP}/run/results.jsonl`
const GEO = { UK: 'United Kingdom', DE: 'Germany', PT: 'Portugal', PL: 'Poland', CA: 'Canada' }
const COMPONENTS = ['Header', 'Banners', 'Thumbnails', 'Tabbar', 'Sidebar']

/** One brief's log: every check, every candidate bug, kept in results.jsonl. */
function run(b) {
  const r = { b, id: null, num: null, checks: [], bugs: [] }
  r.check = (step, ok, note, shot) => {
    const c = { step, ok: !!ok, note, shot }
    r.checks.push(c)
    console.log(`${ok ? '  ✓' : '  ✗'} ${b} ${step}: ${note}`)
    fs.mkdirSync(`${L.SP}/run`, { recursive: true })
    fs.appendFileSync(OUT(), JSON.stringify({ b, id: r.id, kind: 'check', ...c, at: new Date().toISOString() }) + '\n')
    if (!ok) r.bugs.push(c)
    return ok
  }
  r.note = msg => { console.log(`  · ${b} ${msg}`); fs.appendFileSync(OUT(), JSON.stringify({ b, id: r.id, kind: 'note', msg }) + '\n') }
  return r
}

const status = id => (L.sql(`select status from brands where id='${id}'`)[0] || {}).status
const urlStep = page => { const m = L.wiz(page).url().match(/step\/(\d)/); return m ? Number(m[1]) : null }
const comment = async (page, text) => { const ta = L.wiz(page).locator('textarea:visible').last(); await ta.fill(text); await ta.blur(); await L.wait(page, 300) }

async function next(page, r, from, skip = false) {
  await F.next(page)
  const at = urlStep(page)
  return r.check(`шаг ${from} → «Далі»`, at === from + 1 || (skip && at === from + 2) || (from === 7 && /constructor\/brand\//.test(L.wiz(page).url())), `теперь ${L.wiz(page).url().replace(/^.*\/wizard/, '')}`)
}

/** Clicks a concept card, switching the theme tab first — the wizard lists one theme at a time. */
async function chooseConcept(page, name) {
  const f = L.wiz(page)
  const mode = (L.sql(`select mode from concepts where name='${name}'`)[0] || {}).mode
  const tab = mode === 'dark' ? 'Темна тема' : 'Світла тема'
  const card = () => f.locator('.concept-card', { hasText: name }).first()
  if (!(await card().isVisible().catch(() => false))) {
    const tabBtn = f.getByRole('button', { name: tab, exact: true })
    if (await tabBtn.count()) { await tabBtn.first().click(); await L.wait(page, 1000) }
  }
  await card().click({ force: true }); await L.wait(page, 1000)
  const m = f.locator('.ui-modal').last()
  if (await m.count() && /Обрати цей концепт\?/.test(await m.innerText().catch(() => ''))) { await m.getByRole('button', { name: 'Обрати концепт', exact: true }).click(); await L.wait(page, 1200) }
}

async function setSwitch(page, label, want) {
  const sw = L.wiz(page).locator(`button[aria-label="${label}"]`)
  const on = await sw.evaluate(e => e.getAttribute('aria-checked') === 'true')
  if (on !== want) { await sw.click(); await L.wait(page, 400) }
}

async function pickDate(page, day) {
  const f = L.wiz(page)
  await L.clickText(f, 'Виберіть дату'); await L.wait(page, 500)
  await f.getByRole('button', { name: 'Наступний місяць' }).last().click(); await L.wait(page, 300)
  await f.getByRole('button', { name: String(day), exact: true }).last().click(); await L.wait(page, 400)
}

/** A new brief from the splash screen through step 7; ends on Final review. */
async function fill(page, r, o) {
  let id = o.resumeId
  const from = o.resumeStep || 1
  if (id && from >= 8) await F.open(page, id)
  else if (id) { await page.goto(`${L.O}/workspace/brand/${id}?step=${from}`, { waitUntil: 'networkidle' }); await L.wait(page, 3500) }
  else id = (await F.newBrief(page)).id
  r.id = id
  r.num = (L.sql(`select internal_name from brands where id='${id}'`)[0] || {}).internal_name
  r.note(`бриф ${r.num} (${id})`)
  const f = () => L.wiz(page)
  // 1 · Brand Basics
  if (from <= 1) {
  for (const g of o.geos || ['UK']) {
    if ((await L.buttons(f())).includes(`Прибрати ${g}`)) continue
    const geo = f().locator('input[placeholder^="Наприклад"], input[placeholder^="Пошук"]').first(); await geo.click(); await geo.fill(g); await L.wait(page, 700)
    await L.clickText(f(), GEO[g] || g); await L.wait(page, 300)
    await f().locator('body').click({ position: { x: 5, y: 300 } })
  }
  if ((await L.buttons(f())).includes('Виберіть дату')) {
    await L.clickText(f(), 'Виберіть дату'); await L.wait(page, 500)
    await L.clickText(f(), 'Наступний місяць'); await L.wait(page, 300)
    await L.clickText(f(), String(o.day || 15), { exact: true }); await L.wait(page, 300)
  }
  if (o.conn) await f().locator('input[placeholder^="Thor"], textarea[placeholder^="Thor"]').first().fill(o.conn)
  await comment(page, `QA 06.10 · ${r.b} · ${o.label}`)
  await L.shot(page, `${r.b}-1`)
  await next(page, r, 1)
  }
  // 2 · Concept
  if (from <= 2) {
  if (o.theme === 'dark' && !o.concept) { await L.clickText(f(), 'Темна тема', { exact: true }); await L.wait(page, 800) }
  if (o.beforeConcept) await o.beforeConcept(page, r)
  if (o.concept) await chooseConcept(page, o.concept)
  if (o.comments) await comment(page, `${r.b}: коментар до концепту`)
  await L.shot(page, `${r.b}-2`)
  await next(page, r, 2, !o.concept)
  }
  // 3 · External Naming (skipped when the concept is ordered)
  if (from <= 3) {
  if (urlStep(page) === 3) {
    if (o.beforeExternal) await o.beforeExternal(page, r)
    for (const n of o.exts || []) { await L.clickText(f(), n); await L.wait(page, 500) }
    if (o.comments || (o.exts || []).length > 1) await comment(page, `${r.b}: коментар до назв (обовʼязковий при кількох)`)
    await L.shot(page, `${r.b}-3`)
    await next(page, r, 3)
  }
  }
  // 4 · Internal Naming
  if (from <= 4) {
  if (o.beforeInternal) await o.beforeInternal(page, r)
  if (o.int) { await L.clickText(f(), o.int, { exact: true }); await L.wait(page, 500) }
  if (o.comments) await comment(page, `${r.b}: коментар до внутрішньої назви`)
  await L.shot(page, `${r.b}-4`)
  await next(page, r, 4)
  }
  // 5 · Marketing Package
  if (from <= 5) {
  await f().getByText(o.pkg || 'Trust Focus', { exact: true }).first().click({ force: true }); await L.wait(page, 800)
  if (o.comments) await comment(page, `${r.b}: коментар до пакета`)
  await next(page, r, 5)
  }
  // 6 · Deliverables
  if (from <= 6) {
  await setSwitch(page, 'Legal Landing', !!o.legal)
  await setSwitch(page, 'Partner Landing', !!o.partner)
  if ((o.legal || o.partner) && (await L.buttons(f())).includes('Виберіть дату')) await pickDate(page, 20)
  if (o.comments) await comment(page, `${r.b}: коментар до deliverables`)
  await next(page, r, 6)
  }
  // 7 · Interface Components
  if (from <= 7) {
  if (o.step7 === 'all' || o.step7 === 'all-then-delegate') {
    const types = o.types || 'ABCDA'
    for (let k = 0; k < COMPONENTS.length; k++) {
      const item = f().locator('.ui-accordion-item', { has: f().locator('.ui-accordion-item__title', { hasText: new RegExp(`^${COMPONENTS[k]}$`) }) }).first()
      if ((await item.getAttribute('class')).includes('closed') || !(await item.locator('button', { hasText: /Type/ }).first().isVisible().catch(() => false))) {
        await item.locator('.ui-accordion-item__title-group').click(); await L.wait(page, 600)
      }
      const offered = (await item.locator('button', { hasText: /Type [A-D]/ }).allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
      const want = offered.find(t => t.endsWith(`Type ${types[k]}`)) || offered[0]
      await item.locator('button', { hasText: want.replace(/^. /, '') }).first().click(); await L.wait(page, 600)
      r.note(`шаг 7: ${COMPONENTS[k]} — ${want} (есть: ${offered.join(', ')})`)
    }
    const nx = (await L.buttons(f())).find(x => /^Далі/.test(x))
    r.check('шаг 7: все 5 выбраны — «Далі» доступна', nx === 'Далі', `Далі: ${nx}`, await L.shot(page, `${r.b}-7-all`))
  }
  if (o.step7 === 'all-then-delegate') {
    await L.clickText(f(), 'Довірити вибір дизайнерам'); await L.wait(page, 900)
    const dlg = await L.text(f(), '.ui-modal')
    r.check('шаг 7: окно «Довірити»', /Довірити вибір дизайнерам\?/.test(dlg), dlg.replace(/\n/g, ' | ').slice(0, 160), await L.shot(page, `${r.b}-7-dialog`))
    await L.clickText(f(), 'Скасувати', { exact: true, within: '.ui-modal' }); await L.wait(page, 700)
    const still = (await L.buttons(f())).find(x => /^Далі/.test(x))
    r.check('шаг 7: «Скасувати» — компоненты на месте', still === 'Далі', `Далі: ${still}`)
    await L.clickText(f(), 'Довірити вибір дизайнерам'); await L.wait(page, 900)
    await L.clickText(f(), 'Довірити', { exact: true, within: '.ui-modal' }); await L.wait(page, 900)
  } else if (o.step7 !== 'all') {
    await L.clickText(f(), 'Довірити вибір дизайнерам'); await L.wait(page, 800)
  }
  if (o.comments) await comment(page, `${r.b}: коментар до компонентів`)
  await L.shot(page, `${r.b}-7`)
  await next(page, r, 7)
  }
  await L.shot(page, `${r.b}-8-final`)
  const fin = await L.text(f())
  r.check('Final review', /Final review/.test(fin) && /Бриф готовий/.test(fin), fin.match(/Бриф[^\n]*/)?.[0] || 'нет плашки')
  return id
}

/** «На погодження CEO» (or «Відправити в роботу») → the success screen → the status. */
async function send(page, r, button = 'На погодження CEO', expect = 'submitted') {
  const st = await F.submitState(page)
  r.check(`кнопка «${button}»`, st.startsWith(button) && st.endsWith('[on]'), st)
  await L.clickText(L.wiz(page), button); await L.wait(page, 3000)
  const t = await L.text(L.wiz(page))
  await L.shot(page, `${r.b}-sent-${expect}`)
  return r.check(`«${button}» → ${expect}`, status(r.id) === expect, `статус ${status(r.id)}; экран: ${(t.match(/Бриф[^\n]*!/) || [''])[0]}`)
}

async function ceo(b, r) { const s = await L.session(b, 'ceo'); await F.open(s.page, r.id); return s }

async function ceoApprove(page, r, { withChanges = false } = {}) {
  await L.clickText(L.wiz(page), 'Затвердити', { exact: true }); await L.wait(page, 1300)
  const modal = L.wiz(page).locator('.ui-modal').last()
  const mt = (await modal.count()) ? (await modal.innerText()).replace(/\n+/g, ' | ') : ''
  r.check('окно утверждения', withChanges ? /зі змінами/.test(mt) : /Затвердити бриф\?/.test(mt), mt.slice(0, 160), await L.shot(page, `${r.b}-ceo-approve-dialog`))
  await modal.getByRole('button', { name: withChanges ? 'Затвердити зі змінами' : 'Затвердити', exact: true }).click(); await L.wait(page, 3500)
  await L.shot(page, `${r.b}-approved`)
  return r.check('CEO «Затвердити» → approved', status(r.id) === 'approved', `статус ${status(r.id)}`)
}

async function ceoReturn(page, r) {
  await L.clickText(L.wiz(page), 'Повернути на доопрацювання'); await L.wait(page, 1500)
  const modal = L.wiz(page).locator('.ui-modal').last()
  if (await modal.count()) await modal.getByRole('button').filter({ hasText: /Повернути|Відправити|Підтвердити/ }).last().click()
  await L.wait(page, 3000)
  const st = status(r.id)
  let why = ''
  if (st !== 'needs_revision') {
    await page.screenshot({ path: `${L.SP}/run/${r.b}-return-refused.png`, fullPage: true })
    why = ((await L.text(L.wiz(page))).match(/[^\n]*(Додайте|коментар|потрібно|обов)[^\n]*/gi) || ['причина на экране не написана']).slice(0, 3).join(' / ')
  } else await L.shot(page, `${r.b}-returned`)
  return r.check('CEO «Повернути» → needs_revision', st === 'needs_revision', `статус ${st}${why ? '; на экране: ' + why : ''}`)
}

async function generalComment(page, text) {
  const ta = L.wiz(page).locator('textarea[placeholder*="агальн"], textarea').last(); await ta.fill(text); await ta.blur(); await L.wait(page, 900)
}

/** CEO «Змінити вибір»: concept (+ names), external, internal. */
async function ceoChange(page, r, section, pick, names = [], opts = {}) {
  await F.sectionBtn(page, section, 'Змінити вибір')
  const f = L.wiz(page)
  if (section === 'Concept') {
    await chooseConcept(page, pick)
    await L.clickText(f, 'Далі', { exact: true }); await L.wait(page, 2200)
    for (const n of names) { await L.clickText(L.wiz(page), n); await L.wait(page, 400) }
    if (names.length > 1) await comment(page, `${r.b} CEO: кілька назв`)
  } else {
    await L.clickText(f, pick, { exact: section === 'Internal Naming' }); await L.wait(page, 500)
  }
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 2500)
  // a changed choice needs the CEO's comment in its section (the «Коментар CEO» button turns yellow)
  if (!opts.noComment) {
    await F.ceoComment(page, section, `${r.b} CEO: змінив вибір на ${pick}`)
    if (section === 'Concept') await F.ceoComment(page, 'External Naming', `${r.b} CEO: назви під новий концепт`)
  }
  const key = { Concept: 'concept', 'External Naming': 'externalNaming', 'Internal Naming': 'internalNaming' }[section]
  const sel = (L.sql(`select ceo_selections from brands where id='${r.id}'`)[0] || {}).ceo_selections
  const shown = await F.sec(page, section)
  return r.check(`CEO «Змінити вибір» ${section} → ${pick}`, !!sel && sel.includes(`"${key}"`) && shown.includes(pick), `раздел: ${shown.slice(0, 140)}; ceo_selections ${String(sel).slice(0, 140)}`, await L.shot(page, `${r.b}-ceo-change-${section.replace(/\s/g, '')}`))
}

module.exports = { chooseConcept, setSwitch, pickDate, run, status, urlStep, comment, next, fill, send, ceo, ceoApprove, ceoReturn, generalComment, ceoChange, COMPONENTS }
