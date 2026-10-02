// Brief-orders phase 2b: the owner's path after picking what the team made
// («Редагувати» External Naming), and the same screens of a draft with an ordered
// concept beside it — what «Редагувати», the order button's menu and the
// confirmations do in each. Run after nothing; makes its own briefs.
// STAND_FRONT=../../deploy/unified/public node scenarios/sF2b-compare.js
const L = require('../lib'); const F = require('../flow')
const log = (...a) => console.log(...a)
const post = (page, path, body) =>
  page.evaluate(async ([p, b]) => {
    const me = await fetch('/api/auth/me').then(r => r.json())
    const r = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json', 'X-CSRF-Token': me.data.csrfToken }, body: JSON.stringify(b) })
    return { status: r.status, body: await r.json().catch(() => null) }
  }, [path, body])
const editButtons = page => L.wiz(page).evaluate(() => [...document.querySelectorAll('section.ui-section-card')].map(s => `${s.querySelector('h3')?.textContent.trim()}: ${[...s.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean).join(', ') || '—'}`))
const orderMenu = async page => {
  const btn = L.wiz(page).locator('.brief-order-button--created')
  if (!(await btn.count())) return (await L.wiz(page).locator('.brief-order-button').count()) ? 'кнопка «Замовити…»' : 'кнопки нет'
  await btn.click(); await L.wait(page, 400)
  const items = await L.wiz(page).locator('.brief-order-button--created ~ div button').allInnerTexts()
  await btn.click(); await L.wait(page, 300)
  return items.join(' / ')
}
const modal = async page => { const m = L.wiz(page).locator('.ui-modal'); return (await m.count()) ? (await m.last().innerText()).replace(/\n+/g, ' | ').slice(0, 160) : 'окна нет' }

;(async () => {
  const b = await L.launch()
  const { page } = await L.session(b, 'po2')

  // DRAFT with an ordered concept, Final review.
  const d = await F.newBrief(page)
  await F.step1(page); await F.orderConcept(page); await F.next(page)
  await F.step4(page, 'Luna'); await F.step5(page, 'Trust Focus'); await F.next(page); await F.step7delegate(page)
  log('DRAFT sections:', JSON.stringify(await editButtons(page)))
  await F.editSection(page, 'Concept')
  log('DRAFT concept screen, order menu:', await orderMenu(page))
  await L.wiz(page).locator('.concept-card', { hasText: 'Wonka' }).first().click({ force: true }); await L.wait(page, 900)
  log('DRAFT pick library concept:', await modal(page))
  await L.shot(page, 'CMP-draft-concept-confirm')
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true, within: '.ui-modal' }).catch(() => {}); await L.wait(page, 500)
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2000)

  // IN WORK: send, team makes and sends, author picks, then «Редагувати» External Naming.
  await L.clickText(L.wiz(page), 'Відправити в роботу'); await L.wait(page, 3000)
  const id = d.id
  const st = await L.session(b, 'strategy')
  await st.page.goto(`${L.O}/orders/${id}`, { waitUntil: 'networkidle' }); await L.wait(st.page, 1200)
  const stamp = Date.now() % 1000
  const c = await post(st.page, '/api/concepts', { name: `Golden Sun ${stamp}`, description: 'made for the order', mode: 'light', for_brand_id: id })
  await post(st.page, '/api/namings/external', { name: `Golden ${stamp}`, domain: `golden${stamp}.com`, availability_status: 'available', concept_id: c.body.data.id, for_brand_id: id })
  log('ready:', (await post(st.page, `/api/orders/${id}/ready`, {})).status)

  await F.open(page, id)
  log('IN WORK sections:', JSON.stringify(await editButtons(page)))
  await L.shot(page, 'CMP-inwork-review')
  await F.editSection(page, 'Concept')
  log('IN WORK concept screen, order menu:', await orderMenu(page))
  await L.wiz(page).locator('.concept-card', { hasText: 'Wonka' }).first().click({ force: true }); await L.wait(page, 900)
  log('IN WORK pick library concept:', await modal(page))
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true, within: '.ui-modal' }).catch(() => {}); await L.wait(page, 500)
  await L.wiz(page).locator('.made-for-brief-groups__made .concept-card').first().click({ force: true }); await L.wait(page, 900)
  log('IN WORK pick made concept:', await modal(page))
  await F.next(page)
  await L.shot(page, 'CMP-inwork-names')
  await L.clickText(L.wiz(page), `Golden ${stamp}`); await L.wait(page, 500)
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  log('IN WORK after pick sections:', JSON.stringify(await editButtons(page)))
  log('IN WORK header:', await L.wiz(page).evaluate(() => document.querySelector('.review-header')?.innerText.replace(/\n+/g, ' | ')))
  await L.shot(page, 'CMP-inwork-picked')

  await F.editSection(page, 'External Naming')
  log('IN WORK edit External url:', L.wiz(page).url().replace(L.O, ''))
  log('IN WORK edit External screen:', (await L.text(L.wiz(page))).replace(/\n+/g, ' | ').slice(0, 600))
  log('IN WORK edit External buttons:', JSON.stringify(await L.buttons(L.wiz(page))))
  await L.shot(page, 'CMP-inwork-edit-external')

  // Same screen in a draft that picked from the library: «Редагувати» External Naming.
  const d2 = await F.toFinal(page)
  await F.editSection(page, 'External Naming')
  log('DRAFT edit External url:', L.wiz(page).url().replace(L.O, ''))
  log('DRAFT edit External buttons:', JSON.stringify(await L.buttons(L.wiz(page))))
  await L.shot(page, 'CMP-draft-edit-external')
  log('draft id', d2)
  await b.close()
})().catch(e => { console.error('SCENARIO FAILED:', e.message); process.exit(1) })
