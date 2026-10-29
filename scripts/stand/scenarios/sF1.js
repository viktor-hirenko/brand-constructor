// Brief-orders phase 1 acceptance: order a concept → «Відправити в роботу» → «В роботі»;
// the CEO does not get it; the author swaps the order for a library concept and names,
// sends it to the CEO; a second tab gets «Бриф змінено»; the CEO approves.
// Run on the local build: STAND_FRONT=../../deploy/unified/public node scenarios/sF1.js
const L = require('../lib'); const F = require('../flow'); const fs = require('fs')

const log = (...a) => console.log(...a)
async function finalState(page) {
  const f = L.wiz(page)
  return f.evaluate(() => {
    const cards = [...document.querySelectorAll('section.ui-section-card')]
    const editable = cards.filter(c => [...c.querySelectorAll('button')].some(b => b.textContent.trim() === 'Редагувати')).map(c => c.querySelector('h3')?.textContent.trim())
    const submit = [...document.querySelectorAll('button')].find(b => /На погодження CEO|Відправити в роботу/.test(b.textContent))
    const hint = document.querySelector('.po-actions-footer__hint')?.textContent.trim() || null
    const badge = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^В роботі$/.test(e.textContent.trim()))
    return { editable, submit: submit ? `${submit.textContent.trim()}${submit.disabled ? ' [off]' : ' [on]'}` : 'none', hint, badge: !!badge }
  })
}

;(async () => {
  const b = await L.launch()

  // 1. PO orders a new concept and sends the brief to the teams.
  const { page } = await L.session(b, 'po')
  const { id } = await F.newBrief(page); log('ID', id); await F.step1(page)
  await F.orderConcept(page); await F.next(page)
  await F.step4(page, 'Luna'); await F.step5(page, 'Trust Focus'); await F.next(page); await F.step7delegate(page)
  log('final before send:', await F.submitState(page))
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'Відправити в роботу'); await L.wait(page, 3000)
  log('writes:', JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 60)])))
  log('db:', F.dbSummary(id)); await L.shot(page, 'F1-1-sent')
  fs.writeFileSync(L.SP + '/run/f1-id.txt', id)

  // 2. The CEO: not in her list, and a direct link shows the «still in work» gate.
  const ceo = await L.session(b, 'ceo')
  await ceo.page.goto(`${L.O}/brands`, { waitUntil: 'networkidle' }); await L.wait(ceo.page, 2500)
  const ceoList = await L.text(ceo.page.mainFrame())
  // names repeat on the stand (New Brand #N is a count), so look for the status, not the name
  log('CEO sees anything «In Work» (tab or badge):', ceoList.includes('In Work'))
  await F.open(ceo.page, id); log('CEO direct link:', (await L.text(L.wiz(ceo.page))).slice(0, 200).replace(/\n/g, ' | '))
  await L.shot(ceo.page, 'F1-2-ceo-gate')

  // 3. PO opens the brief «В роботі».
  await F.open(page, id)
  log('in work review:', JSON.stringify(await finalState(page))); await L.shot(page, 'F1-3-in-work')

  // 4. «Редагувати» Concept → a library concept → «Далі» → names → «Зберегти».
  // a concept that still has a free «Available» name (approved runs use names up;
  // a «For sale» or «Sold» pick asks for a comment before «Зберегти»)
  const free = L.sql("select distinct c.name from concepts c join external_namings en on en.concept_id = c.id where c.status = 'active' and en.status = 'active' and en.used_in_brand_id is null and en.for_brand_id is null and en.availability_status = 'available'").map(r => r.name)
  await F.editSection(page, 'Concept')
  const shown = await L.wiz(page).locator('.concept-card').allInnerTexts()
  const pick = free.find(n => shown.some(t => t.includes(n)))
  log('library concept:', pick, '| free:', free.length, '| shown:', shown.length)
  await L.wiz(page).locator('.concept-card', { hasText: pick }).first().click({ force: true }); await L.wait(page, 1200)
  const modal = L.wiz(page).locator('.ui-modal').last()
  if (await modal.count()) { log('modal:', (await modal.innerText()).replace(/\n+/g, ' | ')); await modal.getByRole('button').filter({ hasNotText: /Скасувати|Закрити/ }).last().click(); await L.wait(page, 1200) }
  await F.next(page); log('after Далі url:', L.wiz(page).url().replace(L.O, ''))
  const names = (await L.buttons(L.wiz(page))).filter(x => /Available/.test(x))
  if (names[0]) { await L.clickText(L.wiz(page), names[0].split(' ')[0]); await L.wait(page, 500) }
  L.state.writes.length = 0
  const save = (await L.buttons(L.wiz(page))).find(x => /Зберегти/.test(x)); log('save button:', save)
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  log('writes:', JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.res.slice(0, 80)])))
  log('db:', F.dbSummary(id)); log('back on review:', JSON.stringify(await finalState(page))); await L.shot(page, 'F1-4-swapped')

  // 5. A second tab still shows the brief; tab 1 sends it to the CEO, then tab 2 tries too.
  const tab2 = await L.session(b, 'po'); await F.open(tab2.page, id)
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000)
  log('tab1 sent:', JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 40)])), '| db:', F.dbSummary(id))
  L.state.writes.length = 0
  await L.clickText(L.wiz(tab2.page), 'На погодження CEO'); await L.wait(tab2.page, 2500)
  log('tab2 writes:', JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.res.slice(0, 90)])))
  const err = await L.wiz(tab2.page).evaluate(() => document.querySelector('.review-unified-view__error')?.textContent.trim() || null)
  log('tab2 error shown:', err); await L.shot(tab2.page, 'F1-5-second-tab')
  log('events:', JSON.stringify(L.sql(`select event_type from brand_workflow_events where brand_id='${id}' order by created_at`).map(r => r.event_type)))

  // 6. The CEO now reviews and approves.
  await F.open(ceo.page, id); log('CEO buttons:', (await L.buttons(L.wiz(ceo.page))).filter(x => /Затвердити|Повернути/.test(x)))
  await L.clickText(L.wiz(ceo.page), 'Затвердити'); await L.wait(ceo.page, 1200)
  const m2 = L.wiz(ceo.page).locator('.ui-modal').last()
  if (await m2.count()) { await m2.getByRole('button', { name: /Затвердити/ }).last().click(); await L.wait(ceo.page, 3000) }
  log('after approve db:', F.dbSummary(id))
  await b.close()
})().catch(e => { console.error('SCENARIO FAILED:', e.message); process.exit(1) })
