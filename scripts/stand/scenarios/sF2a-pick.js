// Brief-orders phase 2a: the author picks what Strategy made (after sF2a.js) and sends
// the brief to the CEO. Run after sF2a.js; reads .stand/run/f2a-id.txt.
const L = require('../lib'); const F = require('../flow'); const fs = require('fs')
const log = (...a) => console.log(...a)

;(async () => {
  const id = fs.readFileSync(L.SP + '/run/f2a-id.txt', 'utf8').trim()
  const made = L.sql(`select name from concepts where for_brand_id='${id}'`).map(r => r.name)
  const names = L.sql(`select name from external_namings where for_brand_id='${id}'`).map(r => r.name)
  log('made for', id, made, names)
  const b = await L.launch()
  const { page } = await L.session(b, 'po2')
  await F.open(page, id)
  await F.editSection(page, 'Concept')
  const shown = await L.wiz(page).locator('.concept-card').allInnerTexts()
  log('made concept in the list:', shown.some(t => t.includes(made[0])), '| cards:', shown.length)
  await L.wiz(page).locator('.concept-card', { hasText: made[0] }).first().click({ force: true }); await L.wait(page, 1200)
  const modal = L.wiz(page).locator('.ui-modal').last()
  if (await modal.count()) { log('modal:', (await modal.innerText()).replace(/\n+/g, ' | ').slice(0, 160)); await modal.getByRole('button').filter({ hasNotText: /Скасувати|Закрити/ }).last().click(); await L.wait(page, 1200) }
  await L.shot(page, 'F2a-10-picked-concept')
  await F.next(page)
  await L.clickText(L.wiz(page), names[0]); await L.wait(page, 600)
  await L.shot(page, 'F2a-11-picked-name')
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  log('save:', JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.res.slice(0, 80)])))
  log('submit:', JSON.stringify(await F.submitState(page)))
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000)
  log('send:', JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.res.slice(0, 80)])))
  log('db:', F.dbSummary(id))
  log('events:', JSON.stringify(L.sql(`select event_type from brand_workflow_events where brand_id='${id}' order by created_at`).map(r => r.event_type)))
  await L.shot(page, 'F2a-12-sent')
  await b.close()
})().catch(e => { console.error('SCENARIO FAILED:', e.message); process.exit(1) })
