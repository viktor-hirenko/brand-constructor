const L = require('../lib'); const F = require('../flow'); const fs = require('fs')
;(async () => {
  const id = fs.readFileSync(L.SP + '/run/s1-id.txt', 'utf8').trim()
  const b = await L.launch(); const { page } = await L.session(b, 'ceo'); await F.open(page, id)
  await F.ceoComment(page, 'Concept', 'CEO: take Retro Pixel'); await F.ceoComment(page, 'External Naming', 'CEO: Bubbleton')
  L.state.writes.length = 0
  await F.ceoReturn(page)
  console.log('url', L.wiz(page).url().replace(L.O, ''), (await L.text(L.wiz(page))).slice(0, 200).replace(/\n/g, ' | '))
  console.log(JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 300)])))
  const r = L.brand(id); console.log(F.dbSummary(id), 'ceo_sel=', JSON.stringify(r.ceo_selections), 'ceo_comments=', JSON.stringify(r.ceo_comments).slice(0, 200))
  await b.close()
})()
