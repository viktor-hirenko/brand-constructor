// Brief-orders phase 2a acceptance: Strategy opens Orders → an order → «Створити концепт»
// (For brief fixed) → back to the order → «Додати назву» → «Готово». The brief's author
// sees what was made in the wizard lists; another author does not; a PO has no Orders.
// Run on the local build: STAND_FRONT=../../deploy/unified/public node scenarios/sF2a.js
const L = require('../lib')

const log = (...a) => console.log(...a)
const api = (page, path) => page.evaluate(p => fetch(p).then(r => r.json()), path)

;(async () => {
  const b = await L.launch()
  const { page } = await L.session(b, 'strategy')

  // 1. The Orders list, with the counter in the menu.
  await page.goto(`${L.O}/orders`, { waitUntil: 'networkidle' }); await L.wait(page, 2000)
  log('menu:', (await L.text(page.mainFrame(), '.sidebar__nav')).replace(/\n/g, ' | '))
  log('list:', (await L.text(page.mainFrame(), '.orders-view')).slice(0, 600))
  await L.shot(page, 'F2a-1-orders')

  // Pick an open order whose author is po2 (the stand can sign in as them).
  const list = await api(page, '/api/orders?tab=open')
  const authors = Object.fromEntries(L.sql("select id, created_by from brands where status='in_work'").map(r => [r.id, r.created_by]))
  const target = list.data.items.find(o => authors[o.brandId] === L.USERS.po2.sub && o.openKinds.length > 0)
  if (!target) throw new Error('no open order of po2 on the stand')
  log('target:', target.brandName, target.brandId, target.openKinds)
  require('fs').writeFileSync(L.SP + '/run/f2a-id.txt', target.brandId)

  // 2. The order page.
  await page.goto(`${L.O}/orders/${target.brandId}`, { waitUntil: 'networkidle' }); await L.wait(page, 2000)
  log('order buttons:', await L.buttons(page.mainFrame()))
  await page.screenshot({ path: `${L.SP}/run/F2a-2-order.png`, fullPage: true })

  const kinds = target.openKinds
  let conceptName = null
  if (kinds.includes('concept')) {
    // 3. «Створити концепт» — For brief is fixed — then the concept page links back.
    await L.clickText(page.mainFrame(), 'Створити концепт'); await L.wait(page, 800)
    log('modal:', (await L.text(page.mainFrame(), '.modal')).replace(/\n/g, ' | ').slice(0, 300))
    await L.shot(page, 'F2a-3-create-concept')
    conceptName = `Stand Sunrise ${Date.now() % 1000}`
    await page.getByPlaceholder('напр. WonderLand').fill(conceptName)
    await L.clickText(page.mainFrame(), 'Створити концепт', { exact: true, within: '.modal' }); await L.wait(page, 2500)
    log('after create url:', page.url())
    log('concept page:', (await L.text(page.mainFrame(), '.concept-detail__back')).replace(/\n/g, ' | '), '/', await L.text(page.mainFrame(), '.concept-detail__meta'))
    await L.shot(page, 'F2a-4-concept-page')
    await L.clickText(page.mainFrame(), 'До замовлення'); await L.wait(page, 2000)
  }

  if (kinds.includes('concept') || kinds.includes('externalNaming')) {
    // 4. «Створити назву».
    await L.clickText(page.mainFrame(), 'Створити назву'); await L.wait(page, 800)
    log('naming modal:', (await L.text(page.mainFrame(), '.modal')).replace(/\n/g, ' | ').slice(0, 300))
    await page.getByPlaceholder('Введіть назву…').fill(`Stand Beam ${Date.now() % 1000}`)
    await L.shot(page, 'F2a-5-add-name')
    await L.clickText(page.mainFrame(), 'Створити', { exact: true, within: '.modal' }); await L.wait(page, 2000)
  }
  if (kinds.includes('internalNaming')) {
    await page.locator('.order-detail__section', { hasText: 'Нова внутрішня назва' }).getByRole('button', { name: 'Створити назву' }).click(); await L.wait(page, 800)
    await page.getByPlaceholder('Введіть назву…').fill(`Stand Inner ${Date.now() % 1000}`)
    await L.clickText(page.mainFrame(), 'Створити', { exact: true, within: '.modal' }); await L.wait(page, 2000)
  }
  log('order buttons after making:', await L.buttons(page.mainFrame()))
  await page.screenshot({ path: `${L.SP}/run/F2a-6-made.png`, fullPage: true })

  // 5. «Готово».
  await L.clickText(page.mainFrame(), 'Відправити замовнику'); await L.wait(page, 800)
  await L.shot(page, 'F2a-7-confirm')
  await L.clickText(page.mainFrame(), 'Відправити', { exact: true, within: '.modal' }); await L.wait(page, 2000)
  log('after ready:', (await L.text(page.mainFrame(), '.order-detail__note')))
  await page.screenshot({ path: `${L.SP}/run/F2a-8-ready.png`, fullPage: true })
  log('db:', JSON.stringify(L.sql(`select orders_ready_at is not null as ready, orders_ready_by from brands where id='${target.brandId}'`)))
  log('events:', JSON.stringify(L.sql(`select event_type from brand_workflow_events where brand_id='${target.brandId}' order by created_at`).map(r => r.event_type)))

  // 6. The Concepts library: the plate «For New Brand #N».
  await page.goto(`${L.O}/concepts`, { waitUntil: 'networkidle' }); await L.wait(page, 2000)
  if (conceptName) {
    const card = page.locator('.concept-card', { hasText: conceptName })
    log('library card:', (await card.innerText()).replace(/\n/g, ' | '))
    await card.scrollIntoViewIfNeeded(); await L.shot(page, 'F2a-9-library')
  }

  // 7. The author sees it among the brief's concepts; another author does not.
  const own = await L.session(b, 'po2')
  await own.page.goto(`${L.O}/brands`, { waitUntil: 'networkidle' })
  const ownList = await api(own.page, `/api/concepts?per_page=100&available_for_brand=${target.brandId}`)
  log('author sees it:', conceptName ? ownList.data.some(c => c.name === conceptName) : 'n/a')
  const other = await L.session(b, 'po')
  await other.page.goto(`${L.O}/brands`, { waitUntil: 'networkidle' }); await L.wait(other.page, 1500)
  const otherBrief = L.sql(`select id from brands where created_by='${L.USERS.po.sub}' order by updated_at desc limit 1`)[0]
  const otherList = await api(other.page, `/api/concepts?per_page=100&available_for_brand=${otherBrief?.id ?? 'x'}`)
  log('another author sees it:', conceptName ? otherList.data.some(c => c.name === conceptName) : 'n/a')
  log('PO menu:', (await L.text(other.page.mainFrame(), '.sidebar__nav')).replace(/\n/g, ' | '))
  await other.page.goto(`${L.O}/orders`, { waitUntil: 'networkidle' }); await L.wait(other.page, 1500)
  log('PO on /orders lands on:', new URL(other.page.url()).pathname)
  log('PO GET /api/orders:', (await other.page.evaluate(() => fetch('/api/orders').then(r => r.status))))

  log('writes:', JSON.stringify(L.state.writes.map(w => [w.who, w.m, w.p, w.status])))
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
