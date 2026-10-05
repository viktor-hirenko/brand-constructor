// Portion 2 of docs/architecture/wizard-fixes-plan.md — a failed save is visible on every step.
// node scenarios/sP2.js [D-30 D-31 …]   (no args = all). Run with STAND_FRONT for a local build.
const fs = require('fs')
const L = require('../lib'); const F = require('../flow')
const ONLY = process.argv.slice(2)
const OUT = `${L.SP}/run/p2-results.jsonl`
const results = []
function verdict(id, ok, note) { const r = { id, verdict: ok ? 'pass' : 'fail', note }; results.push(r); console.log(JSON.stringify(r)); fs.appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + '\n') }
const NO_LINK = 'Немає звʼязку. Перевірте інтернет і спробуйте ще раз.'
const path = page => L.wiz(page).url().replace(L.O, '').replace(/\?.*$/, '')
// What the screen says about the failure: the text of the visible error line(s), or nothing.
const ERR = '.text-red-600, .text-destructive, .review-unified-view__error'
async function said(page) {
  const hits = await L.wiz(page).evaluate(sel => [...new Set([...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean))], ERR)
  return hits.length ? hits.join(' + ') : 'ничего'
}
// Colour and place of the error line: red, under the buttons, and on screen without scrolling.
const line = page => L.wiz(page).evaluate(sel => {
  const p = [...document.querySelectorAll(sel)].filter(e => e.offsetParent && e.textContent.trim()).pop()
  if (!p) return null
  const btn = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^(Далі|Зберегти|На погодження CEO|Order New Brand)$/.test(b.textContent.trim())).pop()
  const r = p.getBoundingClientRect()
  return { color: getComputedStyle(p).color, box: getComputedStyle(p).backgroundColor, below: btn ? r.top >= btn.getBoundingClientRect().bottom : null, onScreen: r.top >= 0 && r.bottom <= innerHeight }
}, ERR)
// `text-red-600` — the colour of the line on the steps.
const RED = 'oklch(0.577 0.245 27.325)'
const under = w => !!w && w.below === true && w.onScreen === true
const modal = async page => { const m = L.wiz(page).locator('.ui-modal').last(); return (await m.count()) ? (await m.innerText()).replace(/\n+/g, ' | ') : 'нет окна' }
const brandCount = () => L.sql('select count(*) as n from brands')[0].n
const CHECKS = {
  'D-30': async b => {
    const { page, ctx } = await L.session(b, 'po')
    await F.newBrief(page); await F.step1(page)
    await L.wiz(page).locator('.concept-card', { hasText: 'Wonka' }).first().click({ force: true }); await L.wait(page, 800)
    L.state.offline = true
    await F.next(page); const off = await said(page); const offPath = path(page); const where = await line(page); await L.shot(page, 'P2-D-30-a-offline-next')
    L.state.offline = false
    await F.next(page); const on = await said(page); const onPath = path(page); await L.shot(page, 'P2-D-30-b-online-next')
    verdict('D-30', off === NO_LINK && /step\/2$/.test(offPath) && under(where) && /step\/3$/.test(onPath) && on === 'ничего',
      `без связи «Далі» → остались на ${offPath}, сообщение: «${off}» (цвет ${where && where.color}, под кнопками: ${where && where.below}); связь вернулась → «Далі» → ${onPath}, сообщение: ${on}`)
    await ctx.close()
  },
  'D-31': async b => {
    const { page, ctx } = await L.session(b, 'po')
    await page.goto(L.O + '/workspace/new', { waitUntil: 'networkidle' }); await L.wait(page, 2500)
    const before = brandCount()
    L.state.offline = true
    await L.clickText(L.wiz(page), 'Order New Brand'); await L.wait(page, 2500)
    const landing = await said(page); const lw = await line(page); await L.shot(page, 'P2-D-31-a-offline-order-new-brand')
    L.state.offline = false
    await L.clickText(L.wiz(page), 'Order New Brand'); await L.wait(page, 2500)
    await L.wiz(page).waitForURL(/brand=/, { timeout: 10000 }).catch(() => {})
    const f = L.wiz(page)
    const geo = f.locator('input[placeholder^="Наприклад"]'); await geo.click(); await geo.fill('UK'); await L.wait(page, 600)
    await L.clickText(f, 'United Kingdom'); await L.wait(page, 300)
    await f.locator('body').click({ position: { x: 5, y: 300 } })
    await L.clickText(f, 'Виберіть дату'); await L.wait(page, 500)
    await L.clickText(f, 'Наступний місяць'); await L.wait(page, 300)
    await L.clickText(f, '15', { exact: true }); await L.wait(page, 300)
    L.state.offline = true
    await F.next(page); const off = await said(page); const offPath = path(page); await L.shot(page, 'P2-D-31-b-offline-step1-next')
    L.state.offline = false
    await F.next(page); const onPath = path(page); await L.shot(page, 'P2-D-31-c-online-step1-next')
    const made = brandCount() - before
    verdict('D-31', landing === NO_LINK && lw && lw.color === RED && lw.onScreen && off === NO_LINK && /step\/1$/.test(offPath) && /step\/2$/.test(onPath) && made === 1,
      `без связи «Order New Brand» → «${landing}» (цвет ${lw && lw.color}); шаг 1 «Далі» без связи → «${off}», остались на ${offPath}; связь вернулась → ${onPath}; создано брифов: ${made}`)
    await ctx.close()
  },
  'D-32': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await F.toFinal(page)
    L.state.offline = true
    await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000)
    await L.wait(page, 800); const off = await said(page); const where = await line(page); const btn = await F.submitState(page); await L.shot(page, 'P2-D-32-a-offline-submit')
    const st = L.brand(id).status
    L.state.offline = false
    await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000)
    const after = L.brand(id).status
    verdict('D-32', off === NO_LINK && where && where.onScreen && where.box === 'rgba(0, 0, 0, 0)' && st === 'draft' && /\[on\]/.test(btn) && after === 'submitted',
      `без связи «На погодження CEO» → «${off}» (строка на экране: ${where && where.onScreen}, фон: ${where && where.box}); статус ${st}; кнопка после ошибки ${btn}; связь вернулась → повторное нажатие → статус ${after}`)
    await ctx.close()
  },
  'D-33': async b => {
    const { page, ctx } = await L.session(b, 'po')
    await F.toFinal(page); await F.editSection(page, 'Brand Basics')
    const ta = L.wiz(page).locator('textarea:visible').last(); await ta.fill('P2 D-33 comment'); await L.wait(page, 400)
    L.state.offline = true
    await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
    const off = await said(page); const kept = await ta.inputValue(); await L.shot(page, 'P2-D-33-a-offline-save')
    L.state.offline = false
    verdict('D-33', off === NO_LINK && kept === 'P2 D-33 comment', `без связи «Зберегти» в правке Brand Basics → «${off}»; правка в поле: «${kept}»`)
    await ctx.close()
  },
  'D-61': async b => {
    const { page: A, ctx } = await L.session(b, 'po')
    const id = await F.toFinal(A)
    const B = await ctx.newPage(); await F.open(B, id)
    for (let i = 0; i < 3; i++) { await L.clickText(L.wiz(B), 'Назад', { exact: true }); await L.wait(B, 1500) }
    const bPath = path(B)
    await L.clickText(L.wiz(A), 'На погодження CEO'); await L.wait(A, 3000)
    L.state.writes.length = 0
    await F.next(B); const msg = await said(B); const win = await modal(B); const after = path(B); await L.shot(B, 'P2-D-61-b-tab-B-next')
    const put = L.state.writes.find(w => w.m === 'PUT')
    await L.clickText(L.wiz(B), 'Оновити сторінку'); await L.wait(B, 4000)
    const landed = path(B); const submit = await F.submitState(B); await L.shot(B, 'P2-D-61-c-tab-B-reloaded')
    verdict('D-61', /step\/5$/.test(bPath) && put && put.status === 409 && /^Бриф уже відправлено/.test(win) && /Оновити сторінку/.test(win) && msg === 'ничего' && after === bPath && new RegExp(`brand/${id}$`).test(landed) && submit === 'none' && L.brand(id).status === 'submitted',
      `A отправила CEO; B (открыта на ${bPath}) → «Далі»: окно «${win}», строки под кнопками: ${msg}, осталась на ${after}; ответ сервера: PUT ${put && put.status}; «Оновити сторінку» → ${landed}, кнопка отправки: ${submit}; статус ${L.brand(id).status}`)
    await ctx.close()
  },
  'D-62': async b => {
    const { page: A, ctx } = await L.session(b, 'po')
    const id = await F.toFinal(A)
    const B = await ctx.newPage(); await F.open(B, id)
    await L.clickText(L.wiz(A), 'На погодження CEO'); await L.wait(A, 3000)
    await L.clickText(L.wiz(B), 'На погодження CEO'); await L.wait(B, 3000)
    const win = await modal(B); const msg = await said(B); await L.shot(B, 'P2-D-62-b-tab-B-submit')
    verdict('D-62', /^Бриф уже відправлено/.test(win) && msg === 'ничего' && L.brand(id).status === 'submitted',
      `обе вкладки на Final review; A отправила, B → «На погодження CEO»: окно «${win}», строки: ${msg}; статус ${L.brand(id).status}`)
    await ctx.close()
  },
  // The red line belongs to the step it happened on: «Назад» must not carry it along.
  'P2-clear': async b => {
    const { page, ctx } = await L.session(b, 'po')
    await F.newBrief(page); await F.step1(page)
    await L.wiz(page).locator('.concept-card', { hasText: 'Wonka' }).first().click({ force: true }); await L.wait(page, 800)
    L.state.offline = true
    await F.next(page); const off = await said(page)
    L.state.offline = false
    await L.clickText(L.wiz(page), 'Назад', { exact: true }); await L.wait(page, 1500)
    const back = await said(page); const backPath = path(page); await L.shot(page, 'P2-clear-after-back')
    verdict('P2-clear', off === NO_LINK && back === 'ничего' && /step\/1$/.test(backPath), `шаг 2 без связи «Далі» → «${off}»; «Назад» → ${backPath}, сообщение: ${back}`)
    await ctx.close()
  },
  // Draft: Final review → «Редагувати» Concept → «Далі» with the same concept saves — it used to fail silently.
  'P2-edit-concept': async b => {
    const { page, ctx } = await L.session(b, 'po')
    await F.toFinal(page); await F.editSection(page, 'Concept')
    const ta = L.wiz(page).locator('textarea:visible').last(); await ta.fill('P2 edit concept'); await L.wait(page, 400)
    L.state.offline = true
    await F.next(page); const off = await said(page); const where = await line(page); const offPath = path(page); await L.shot(page, 'P2-edit-concept-offline')
    L.state.offline = false
    await F.next(page); const onPath = path(page)
    verdict('P2-edit-concept', off === NO_LINK && under(where) && /draft-edit\/concept$/.test(offPath) && !/draft-edit/.test(onPath), `«Редагувати» Concept → без связи «Далі» → «${off}», остались на ${offPath}; связь вернулась → «Далі» → ${onPath}`)
    await ctx.close()
  },
  // Revision: Internal Naming «Зберегти» was silent; the line must be on screen under a long list of names.
  'P2-revision': async b => {
    const id = await F.returned(b)
    const { page, ctx } = await L.session(b, 'po'); await F.open(page, id)
    await F.editSection(page, 'Internal Naming')
    L.state.offline = true
    await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
    const msg = await said(page); const where = await line(page); const at = path(page); await L.shot(page, 'P2-revision-internal-offline')
    L.state.offline = false
    await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2500)
    await F.editSection(page, 'Concept'); const carried = await said(page)
    verdict('P2-revision', msg === NO_LINK && under(where) && /po-edit\/internal-naming$/.test(at) && carried === 'ничего',
      `доработка, Internal Naming без связи «Зберегти» → «${msg}» (под кнопками и на экране: ${under(where)}), остались на ${at}; «Скасувати» → «Редагувати» Concept — сообщение: ${carried}`)
    await ctx.close()
  },
}
;(async () => {
  const b = await L.launch()
  for (const [id, fn] of Object.entries(CHECKS)) {
    if (ONLY.length && !ONLY.includes(id)) continue
    L.state.offline = false
    try { await fn(b) } catch (e) { verdict(id, false, `сценарий упал: ${String(e).slice(0, 300)}`) }
  }
  L.state.offline = false
  await b.close()
  console.log(`\n${results.filter(r => r.verdict === 'pass').length} pass / ${results.length}`)
})()
