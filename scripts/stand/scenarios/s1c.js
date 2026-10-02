const L = require('../lib'); const F = require('../flow'); const fs = require('fs')
;(async () => {
  const id = fs.readFileSync(L.SP + '/run/s1-id.txt', 'utf8').trim()
  const b = await L.launch(); const { page } = await L.session(b, 'ceo'); await F.open(page, id)
  await F.sectionBtn(page, 'Concept', 'Змінити вибір')
  await L.wiz(page).locator('.concept-card', { hasText: 'Retro Pixel' }).first().click({ force: true }); await L.wait(page, 1200)
  await F.next(page)
  await L.clickText(L.wiz(page), 'Bubbleton'); await L.wait(page, 500)
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  await F.dump(page, 'S1-ceo-after-save')
  console.log(JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 200)])))
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'Повернути на доопрацювання'); await L.wait(page, 2000)
  const bb = await L.buttons(L.wiz(page)); console.log('after return click', bb.slice(-6))
  await L.shot(page, 'S1-ceo-return-modal')
  const conf = bb.filter(x => /Повернути/.test(x)).pop(); if (conf) { await L.clickText(L.wiz(page), conf, { nth: (bb.filter(x => x === conf).length - 1) }); await L.wait(page, 3000) }
  console.log('url', L.wiz(page).url().replace(L.O, ''), (await L.text(L.wiz(page))).slice(0, 300))
  console.log(JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 300)])))
  const r = L.brand(id); console.log(F.dbSummary(id), 'ceo_sel=', JSON.stringify(r.ceo_selections))
  await b.close()
})()
