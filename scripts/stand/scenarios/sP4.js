// Portion 4 of docs/architecture/wizard-fixes-plan.md — a save says which version of the brief the tab saw (H-29).
// node scenarios/sP4.js [D-60 …]   (no args = all). Run with STAND_FRONT for a local build.
const fs = require('fs')
const L = require('../lib'); const F = require('../flow')
const ONLY = process.argv.slice(2)
const OUT = `${L.SP}/run/p4-results.jsonl`
const results = []
function verdict(id, ok, note) { const r = { id, verdict: ok ? 'pass' : 'fail', note }; results.push(r); console.log(JSON.stringify(r)); fs.appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + '\n') }
const CHANGED = 'Бриф змінено — оновіть сторінку.'
const path = page => L.wiz(page).url().replace(L.O, '').replace(/\?.*$/, '')
const ERR = '.text-red-600, .text-destructive, .review-unified-view__error'
async function said(page) {
  const hits = await L.wiz(page).evaluate(sel => [...new Set([...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean))], ERR)
  return hits.length ? hits.join(' + ') : 'ничего'
}
// The line is under «Далі» and on screen without scrolling.
const under = page => L.wiz(page).evaluate(sel => {
  const p = [...document.querySelectorAll(sel)].filter(e => e.offsetParent && e.textContent.trim()).pop()
  const btn = [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.textContent.trim() === 'Далі').pop()
  if (!p || !btn) return false
  const r = p.getBoundingClientRect()
  return r.top >= btn.getBoundingClientRect().bottom && r.bottom <= innerHeight
}, ERR)
const modal = async page => { const m = L.wiz(page).locator('.ui-modal').last(); return (await m.count()) ? (await m.innerText()).replace(/\n+/g, ' | ') : 'нет окна' }
const names = id => (L.brand(id).external_naming_ids || []).map(x => L.sql(`select name from external_namings where id='${x}'`)[0]?.name || x)
// Winilla is «Sold»: the wizard asks for a comment before «Далі».
const pickSold = async (page, note) => { await L.clickText(L.wiz(page), 'Winilla'); await L.wait(page, 500); const ta = L.wiz(page).locator('textarea:visible').last(); await ta.fill(note); await L.wait(page, 400) }
const reload = async page => { await page.reload({ waitUntil: 'networkidle' }); await L.wait(page, 3500) }

const CHECKS = {
  // Run 02.10: B, opened before A saved, picked Retropix → «Далі» — nothing on screen, A's pick gone.
  'D-60': async b => {
    const { page: A, ctx } = await L.session(b, 'po')
    const { id } = await F.newBrief(A); await F.step1(A); await F.step2(A, 'Wonka')
    // B opens the draft from Brands, as the author would — it lands on the step saved last.
    const B = await ctx.newPage()
    await B.goto(`${L.O}/brands`, { waitUntil: 'networkidle' }); await L.wait(B, 2000)
    await B.getByText(L.brand(id).internal_name, { exact: true }).first().click(); await L.wait(B, 3500)
    const aPath = path(A); const bPath = path(B)
    L.state.writes.length = 0
    await L.clickText(L.wiz(A), 'Joymus'); await L.wait(A, 500); await F.next(A)
    const putA = L.state.writes.find(w => w.m === 'PUT')
    await pickSold(B, 'P4 D-60 tab B'); await L.shot(B, 'P4-D-60-a-tab-B-picked')
    L.state.writes.length = 0
    await F.next(B)
    const putB = L.state.writes.find(w => w.m === 'PUT')
    const msg = await said(B); const below = await under(B); const win = await modal(B); const afterB = path(B)
    await L.shot(B, 'P4-D-60-b-tab-B-next')
    const kept = names(id)
    verdict('D-60', /step\/3$/.test(aPath) && /step\/3$/.test(bPath) && putA && putA.status === 200 && putB && putB.status === 409 &&
      msg === CHANGED && below && win === 'нет окна' && afterB === bPath && JSON.stringify(kept) === '["Joymus"]',
      `обе вкладки на шаге 3 (A ${aPath}, B ${bPath}); A — Joymus → «Далі»: PUT ${putA && putA.status}; B — Winilla → «Далі»: PUT ${putB && putB.status}, на экране «${msg}» (под кнопками и на экране: ${below}), окно: ${win}, осталась на ${afterB}; в базе названия: ${JSON.stringify(kept)}`)

    // F5 in B: the server's brief — what A saved — and saving works again.
    await reload(B); const landed = path(B); const afterReload = await said(B)
    await L.shot(B, 'P4-D-60-c-tab-B-reloaded')
    if (/step\/4$/.test(landed)) { await L.clickText(L.wiz(B), 'Назад', { exact: true }); await L.wait(B, 1500) }
    await L.shot(B, 'P4-D-60-d-tab-B-step3-after-F5')
    await pickSold(B, 'P4 D-60 tab B after F5')
    L.state.writes.length = 0
    await F.next(B)
    const putB2 = L.state.writes.find(w => w.m === 'PUT'); const msg2 = await said(B); const final = names(id)
    await L.shot(B, 'P4-D-60-e-tab-B-saved-after-F5')
    verdict('D-60-F5', putB2 && putB2.status === 200 && msg2 === 'ничего' && JSON.stringify(final) === '["Joymus","Winilla"]',
      `B после F5 открылась на ${landed} (сообщение: ${afterReload}); на шаге 3 Joymus уже выбран (выбор A), добавлена Winilla → «Далі»: PUT ${putB2 && putB2.status}, сообщение: ${msg2}; в базе: ${JSON.stringify(final)}`)
    await ctx.close()
  },
  // One tab, the whole draft and a section edit from Final review: its own saves are never refused.
  'P4-one-tab': async b => {
    const { page, ctx } = await L.session(b, 'po')
    L.state.writes.length = 0
    const id = await F.toFinal(page)
    await F.editSection(page, 'PR Package')
    await L.wiz(page).getByText('Social Trust', { exact: true }).first().click({ force: true }); await L.wait(page, 800)
    await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 2500)
    await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000)
    const puts = L.state.writes.filter(w => w.m === 'PUT')
    const refused = L.state.writes.filter(w => w.status >= 400)
    await L.shot(page, 'P4-one-tab-submitted')
    verdict('P4-one-tab', puts.length >= 7 && refused.length === 0 && L.brand(id).status === 'submitted',
      `одна вкладка: шаги 1–7, «Редагувати» PR Package → «Зберегти», «На погодження CEO»: сохранений ${puts.length}, отказов ${refused.length}; статус ${L.brand(id).status}`)
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
  await b.close()
  console.log(`\n${results.filter(r => r.verdict === 'pass').length} pass / ${results.length}`)
})()
