const L = require('../lib'); const F = require('../flow'); const fs = require('fs')
;(async () => {
  const id = fs.readFileSync(L.SP + '/run/s1-id.txt', 'utf8').trim()
  const b = await L.launch(); const po = await L.session(b, 'po'); await F.open(po.page, id)
  await F.sectionBtn(po.page, 'External Naming', 'Застосувати варіант CEO'); await L.wait(po.page, 1500)
  console.log('External:', await F.sec(po.page, 'External Naming')); console.log('submit:', await F.submitState(po.page))
  L.state.writes.length = 0
  await L.clickText(L.wiz(po.page), 'На погодження CEO'); await L.wait(po.page, 3000)
  console.log('after submit', L.wiz(po.page).url().replace(L.O, '')); console.log(JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 120)])))
  console.log(F.dbSummary(id))
  const ceo = await L.session(b, 'ceo'); await F.open(ceo.page, id)
  console.log('CEO sees Concept:', await F.sec(ceo.page, 'Concept')); console.log('CEO sees External:', await F.sec(ceo.page, 'External Naming'))
  L.state.writes.length = 0
  await L.clickText(L.wiz(ceo.page), 'Затвердити'); await L.wait(ceo.page, 1500)
  const modal = L.wiz(ceo.page).locator('.ui-modal').last()
  if (await modal.count()) { console.log('APPROVE MODAL:', (await modal.innerText()).replace(/\n+/g, ' | ')); await modal.getByRole('button').filter({ hasText: /Затвердити|Підтвердити/ }).last().click(); await L.wait(ceo.page, 3000) }
  console.log('after approve', L.wiz(ceo.page).url().replace(L.O, ''), JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 120)])))
  console.log(F.dbSummary(id))
  await b.close()
})()
