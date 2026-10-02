const L = require('../lib'); const F = require('../flow')
;(async () => {
  const id = 'brand_c00347bb1c9b429e'; console.log(F.dbSummary(id))
  const b = await L.launch(); const { page } = await L.session(b, 'ceo'); await F.open(page, id)
  console.log('External:', await F.sec(page, 'External Naming'))
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'Затвердити'); await L.wait(page, 1500)
  const modal = L.wiz(page).locator('.ui-modal').last(); if (await modal.count()) { await modal.getByRole('button').filter({ hasText: /Затвердити/ }).last().click(); await L.wait(page, 3000) }
  console.log(JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status])), F.dbSummary(id))
  await b.close()
})()
