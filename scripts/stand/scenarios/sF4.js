// Brief-orders phase 4 acceptance — an order placed while the brief is back from the CEO:
// CEO returns → the author orders a new concept on the revision Concept screen → the
// footer turns «Відправити в роботу» → in_work → Strategy makes a concept and a name and
// sends them → the author picks them → «На погодження CEO» → submitted as a RE-submission
// (CEO comments cleared, `resubmit_cleared_ceo`). Also: the order buttons on the revision
// External and Internal Naming screens.
// Run on the local build: STAND_FRONT=../../deploy/unified/public node scenarios/sF4.js
const L = require('../lib'); const F = require('../flow')
const log = (...a) => console.log(...a)
const post = (page, path, body) =>
  page.evaluate(async ([p, b]) => {
    const me = await fetch('/api/auth/me').then(r => r.json())
    const r = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json', 'X-CSRF-Token': me.data.csrfToken }, body: JSON.stringify(b) })
    return { status: r.status, body: await r.json().catch(() => null) }
  }, [path, body])
const header = page => L.wiz(page).evaluate(() => document.querySelector('.review-header')?.innerText.replace(/\n+/g, ' | ').slice(0, 300) ?? 'none')
const buttons = page => L.wiz(page).evaluate(() => [...document.querySelectorAll('.brief-order-button')].map(b => b.textContent.trim()))
const events = id => L.sql(`SELECT event_type FROM brand_workflow_events WHERE brand_id='${id}' ORDER BY rowid`).map(r => r.event_type).join(' → ')

;(async () => {
  const b = await L.launch()

  // 1. A complete brief, sent to the CEO and returned with a comment on Concept.
  const id = await F.returned(b)
  log('returned:', F.dbSummary(id))

  const po = await L.session(b, 'po'); const page = po.page
  await F.open(page, id)
  log('returned header:', await header(page))
  log('returned submit:', await F.submitState(page))

  // 2. The revision screens offer the order button (External, Internal: look, then cancel).
  await F.editSection(page, 'External Naming')
  log('external revision buttons:', await buttons(page))
  await L.shot(page, 'F4-1-external-revision')
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2000)
  await F.editSection(page, 'Internal Naming')
  log('internal revision buttons:', await buttons(page))
  await L.shot(page, 'F4-2-internal-revision')
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2000)

  // 3. Concept: order a new concept, «Далі».
  await F.editSection(page, 'Concept')
  log('concept revision buttons:', await buttons(page))
  await F.orderConcept(page)
  log('after order buttons:', await buttons(page))
  await L.shot(page, 'F4-3-concept-ordered')
  await F.next(page)
  log('after Далі:', F.dbSummary(id))
  log('review header:', await header(page))
  log('review submit:', await F.submitState(page))
  log('concept section:', await F.sec(page, 'Concept'))
  log('external section:', await F.sec(page, 'External Naming'))
  // the names' right panel has no concept to show now — no endless skeleton
  await F.editSection(page, 'Internal Naming')
  await L.shot(page, 'F4-3b-internal-after-concept-order')
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2000)

  // 4. Resolve the CEO comment if the counter still holds the button.
  const off = /\[off\]/.test(await F.submitState(page))
  if (off) {
    const resolveBtn = L.wiz(page).getByRole('button', { name: /Позначити як вирішений/ })
    log('resolving comments:', await resolveBtn.count())
    for (let i = await resolveBtn.count(); i > 0; i--) { await resolveBtn.first().click(); await L.wait(page, 1500) }
    log('after resolve submit:', await F.submitState(page))
  }
  await L.shot(page, 'F4-4-review-send-to-work')

  // 5. «Відправити в роботу».
  await L.clickText(L.wiz(page), 'Відправити в роботу'); await L.wait(page, 3000)
  log('sent:', F.dbSummary(id))
  log('events:', events(id))
  await L.shot(page, 'F4-5-success')

  // 6. Strategy: the order page, make a concept and its name, send to the author.
  const st = await L.session(b, 'strategy')
  await st.page.goto(`${L.O}/orders/${id}`, { waitUntil: 'networkidle' }); await L.wait(st.page, 2000)
  const before = await post(st.page, `/api/orders/${id}/ready`, {})
  log('ready before making:', before.status, before.body?.error)
  const stamp = Date.now() % 1000
  const concept = await post(st.page, '/api/concepts', { name: `Stand Phoenix ${stamp}`, description: 'made after the CEO return', mode: 'light', for_brand_id: id })
  const conceptId = concept.body?.data?.id
  const naming = await post(st.page, '/api/namings/external', { name: `Stand Ember ${stamp}`, domain: `ember${stamp}.com`, availability_status: 'available', concept_id: conceptId, for_brand_id: id })
  const ready = await post(st.page, `/api/orders/${id}/ready`, {})
  log('made:', concept.status, naming.status, 'ready:', ready.status, ready.body?.error ?? '')
  await st.page.goto(`${L.O}/orders/${id}`, { waitUntil: 'networkidle' }); await L.wait(st.page, 2000)
  await L.shot(st.page, 'F4-6-order-page')

  // 7. The author picks what was made and sends to the CEO.
  await F.open(page, id)
  log('in work header:', await header(page))
  await F.editSection(page, 'Concept')
  await L.wiz(page).locator('.concept-card', { hasText: `Stand Phoenix ${stamp}` }).first().click({ force: true }); await L.wait(page, 1000)
  await F.next(page)
  await L.clickText(L.wiz(page), `Stand Ember ${stamp}`); await L.wait(page, 800)
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 2500)
  log('picked:', F.dbSummary(id))
  log('in work submit:', await F.submitState(page))
  await L.shot(page, 'F4-7-ready-for-ceo')
  await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000)
  const row = L.brand(id)
  log('resubmitted:', F.dbSummary(id), 'submit_count=', row.submit_count, 'ceo_comments=', row.ceo_comments)
  log('events:', events(id))

  // 8. The CEO sees an ordinary review.
  const ceo = await L.session(b, 'ceo'); await F.open(ceo.page, id)
  log('ceo header:', await header(ceo.page))
  await L.shot(ceo.page, 'F4-8-ceo')

  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
