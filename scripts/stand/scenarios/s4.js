const L = require('../lib'); const F = require('../flow')
const ACT = process.argv[2]
;(async () => {
  const b = await L.launch(); const id = await F.returned(b); console.log(ACT, 'ID', id, F.dbSummary(id))
  const { page } = await L.session(b, 'po'); await F.open(page, id)
  await F.editSection(page, 'Concept'); console.log('on', L.wiz(page).url().replace(L.O, ''))
  const cards = L.wiz(page).locator('.concept-card').filter({ hasText: 'Wonderland' }); console.log('cards', await cards.allInnerTexts()); await cards.first().click({ force: true }); await L.wait(page, 1000)
  await F.next(page); console.log('on', L.wiz(page).url().replace(L.O, ''))
  if (ACT === 'close') { await L.clickText(L.wiz(page), 'Закрити'); await L.wait(page, 1500)
    const modal = L.wiz(page).locator('.ui-modal').last(); if (await modal.count()) { console.log('MODAL:', (await modal.innerText()).replace(/\n+/g, ' | ')); await modal.getByRole('button').filter({ hasNotText: /Залишитись|Скасувати/ }).last().click(); await L.wait(page, 2000) }
    await F.open(page, id) }
  if (ACT === 'reload') { await page.reload({ waitUntil: 'networkidle' }); await L.wait(page, 3500) }
  if (ACT === 'back') { await L.back(page); await L.back(page) }
  if (ACT === 'menu') { await page.getByRole('link', { name: 'Brands' }).first().click().catch(async () => { await page.goto(L.O + '/brands') }); await L.wait(page, 2500); await F.open(page, id) }
  console.log('url', L.wiz(page).url().replace(L.O, ''))
  console.log('Concept:', await F.sec(page, 'Concept')); console.log('External:', await F.sec(page, 'External Naming')); console.log('submit:', await F.submitState(page))
  console.log('DB:', F.dbSummary(id))
  await L.shot(page, 'S4-' + ACT)
  const other = await L.session(b, 'po'); await F.open(other.page, id)
  console.log('OTHER BROWSER Concept:', await F.sec(other.page, 'Concept')); console.log('OTHER BROWSER External:', await F.sec(other.page, 'External Naming'))
  await F.open(page, id); await F.editSection(page, 'Concept'); await L.clickText(L.wiz(page), 'Скасувати'); await L.wait(page, 2500)
  console.log('AFTER Редагувати→Скасувати Concept:', await F.sec(page, 'Concept')); console.log('External:', await F.sec(page, 'External Naming')); console.log('submit:', await F.submitState(page))
  await b.close()
})()
