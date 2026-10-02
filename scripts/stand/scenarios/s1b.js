const L = require('../lib'); const F = require('../flow'); const fs = require('fs')
;(async () => {
  const id = fs.readFileSync(L.SP + '/run/s1-id.txt', 'utf8').trim()
  const b = await L.launch(); const { page } = await L.session(b, 'ceo'); await F.open(page, id)
  await F.sectionBtn(page, 'Concept', 'Змінити вибір')
  await L.wiz(page).locator('.concept-card', { hasText: 'Farm' }).first().click({ force: true }); await L.wait(page, 1200)
  await F.next(page); await F.dump(page, 'S1-ceo-ext')
  await b.close()
})()
