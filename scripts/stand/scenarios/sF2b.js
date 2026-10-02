// Brief-orders phase 2b acceptance — the author's side of an order:
// «Чекаємо на команду» (what is being made stays hidden) → the team sends the order →
// «Замовлення готове — оберіть» → «Обрати концепт» → the made concept first, picked
// without «Обрати цей концепт?» → its made name first → «На погодження CEO» on.
// Then H-07: a name ordered for one concept goes away when step 2 picks another.
// Run on the local build: STAND_FRONT=../../deploy/unified/public node scenarios/sF2b.js
const L = require('../lib'); const F = require('../flow')
const log = (...a) => console.log(...a)
// Writes need the CSRF token the admin reads from /api/auth/me.
const post = (page, path, body) =>
  page.evaluate(async ([p, b]) => {
    const me = await fetch('/api/auth/me').then(r => r.json())
    const r = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json', 'X-CSRF-Token': me.data.csrfToken }, body: JSON.stringify(b) })
    return { status: r.status, body: await r.json().catch(() => null) }
  }, [path, body])
const header = page => L.wiz(page).evaluate(() => document.querySelector('.review-header')?.innerText.replace(/\n+/g, ' | ').slice(0, 400) ?? 'none')
const modalText = async page => { const m = L.wiz(page).locator('.ui-modal'); return (await m.count()) ? (await m.last().innerText()).replace(/\n+/g, ' | ').slice(0, 200) : null }

;(async () => {
  const b = await L.launch()
  const po = await L.session(b, 'po2')
  const page = po.page

  // 1. A brief with a concept order, sent to the teams.
  const { id } = await F.newBrief(page)
  await F.step1(page); await F.orderConcept(page); await F.next(page)
  await F.step4(page, 'Luna'); await F.step5(page, 'Trust Focus'); await F.next(page); await F.step7delegate(page)
  await L.clickText(L.wiz(page), 'Відправити в роботу'); await L.wait(page, 3000)
  log('sent:', F.dbSummary(id))

  // 2. Strategy makes a concept (dark — the brief is light) and a name; not sent yet.
  const st = await L.session(b, 'strategy')
  await st.page.goto(`${L.O}/orders/${id}`, { waitUntil: 'networkidle' }); await L.wait(st.page, 1500)
  const stamp = Date.now() % 1000
  const concept = await post(st.page, '/api/concepts', { name: `Stand Dawn ${stamp}`, description: 'made for the order', mode: 'dark', for_brand_id: id })
  const conceptId = concept.body?.data?.id
  const naming = await post(st.page, '/api/namings/external', { name: `Stand Ray ${stamp}`, domain: `ray${stamp}.com`, availability_status: 'available', concept_id: conceptId, for_brand_id: id })
  log('made:', concept.status, conceptId, naming.status)

  // 3. The author, before the order is sent: waiting, the made concept hidden.
  await F.open(page, id)
  log('waiting header:', await header(page))
  log('waiting submit:', await F.submitState(page))
  await L.shot(page, 'F2b-1-waiting')
  await F.editSection(page, 'Concept')
  const hidden = await L.wiz(page).locator('.concept-card', { hasText: `Stand Dawn ${stamp}` }).count()
  log('made concept visible before ready:', hidden > 0)
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2000)

  // 4. Strategy sends the order.
  const ready = await post(st.page, `/api/orders/${id}/ready`, {})
  log('ready:', ready.status)

  // 5. The author: ready, the note and its button.
  await F.open(page, id)
  log('ready header:', await header(page))
  log('concept section:', await F.sec(page, 'Concept'))
  log('ready submit:', await F.submitState(page))
  await L.shot(page, 'F2b-2-ready')
  await L.shot(page, 'F2b-2b-ready-note').catch(() => {})
  await F.editSection(page, 'Concept')
  log('picker:', (await L.text(L.wiz(page), '.made-for-brief-groups')).replace(/\n+/g, ' | ').slice(0, 300))
  await L.shot(page, 'F2b-3-picker')
  await L.wiz(page).locator('.made-for-brief-groups__made .concept-card').first().click({ force: true }); await L.wait(page, 1200)
  log('modal after picking the made concept:', await modalText(page))
  await F.next(page)
  log('names:', (await L.text(L.wiz(page), '.made-for-brief-groups')).replace(/\n+/g, ' | ').slice(0, 300))
  await L.shot(page, 'F2b-4-names')
  await L.clickText(L.wiz(page), `Stand Ray ${stamp}`); await L.wait(page, 600)
  log('modal after picking the made name:', await modalText(page))
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  log('save:', JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status])))
  log('after pick header:', await header(page))
  log('after pick submit:', await F.submitState(page))
  log('db:', F.dbSummary(id), 'mode:', L.brand(id).mode)
  await L.shot(page, 'F2b-5-picked')
  log('events:', JSON.stringify(L.sql(`select event_type from brand_workflow_events where brand_id='${id}' order by created_at`).map(r => r.event_type)))

  // 6. H-07 on step 2.
  await page.goto(`${L.O}/brands`, { waitUntil: 'networkidle' }); await L.wait(page, 1500)
  const h = await F.newBrief(page)
  await F.step1(page); await F.step2(page, 'Wonka')
  await F.orderNaming(page); log('H-07 step 3 after order:', await L.buttons(L.wiz(page)))
  await L.back(page)
  await L.wiz(page).locator('.concept-card', { hasText: 'Wonderland' }).first().click({ force: true }); await L.wait(page, 1200)
  log('H-07 modal:', await modalText(page))
  await L.shot(page, 'F2b-6-h07-modal')
  await L.clickText(L.wiz(page), 'Змінити концепт', { exact: true }); await L.wait(page, 800)
  await F.next(page)
  log('H-07 step 3 after switch:', await L.buttons(L.wiz(page)))
  await F.step3(page, ['Joymus']).catch(() => {})
  log('H-07 db:', F.dbSummary(h.id))

  await b.close()
})().catch(e => { console.error('SCENARIO FAILED:', e.message); process.exit(1) })
