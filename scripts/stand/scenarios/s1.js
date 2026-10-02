const L = require('../lib'); const F = require('../flow'); const fs = require('fs')
;(async () => {
  const b = await L.launch()
  const id = await F.submitted(b); console.log('ID', id, F.dbSummary(id)); fs.writeFileSync(L.SP + '/run/s1-id.txt', id)
  const { page } = await L.session(b, 'ceo'); await F.open(page, id)
  await F.sectionBtn(page, 'Concept', 'Змінити вибір'); await F.dump(page, 'S1-ceo-reselect')
  await b.close()
})()
