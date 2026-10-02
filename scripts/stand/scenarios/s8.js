const L = require('../lib'); const F = require('../flow')
;(async () => {
  const b = await L.launch(); const { page } = await L.session(b, 'po')
  // A: wizard step «Далі» while offline
  const { id } = await F.newBrief(page); await F.step1(page)
  await L.wiz(page).locator('.concept-card', { hasText: 'Wonka' }).first().click({ force: true }); await L.wait(page, 800)
  L.state.offline = true
  await F.next(page); console.log('A offline Далі → url', L.wiz(page).url().replace(L.O, '')); console.log('A screen:', (await L.text(L.wiz(page))).split('\n').slice(0, 5).join(' | '))
  await L.shot(page, 'S8-A'); L.state.offline = false
  console.log('A DB:', F.dbSummary(id))
  // B: Final review «На погодження CEO» while offline
  const id2 = await F.toFinal(page); L.state.offline = true
  await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000)
  console.log('B url', L.wiz(page).url().replace(L.O, '')); console.log('B screen:', (await L.text(L.wiz(page))).split('\n').slice(0, 8).join(' | ')); await L.shot(page, 'S8-B')
  L.state.offline = false; console.log('B DB:', F.dbSummary(id2))
  // C: Final review → Редагувати Concept → Далі → name → Зберегти offline
  const id3 = await F.toFinal(page)
  await F.editSection(page, 'Concept'); await L.wiz(page).locator('.concept-card', { hasText: 'Wonderland' }).first().click({ force: true }); await L.wait(page, 800); await F.next(page)
  const nm = (await L.buttons(L.wiz(page))).find(x => /Available/.test(x)); await L.clickText(L.wiz(page), nm.split(' ')[0]); await L.wait(page, 400)
  L.state.offline = true
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  console.log('C url', L.wiz(page).url().replace(L.O, '')); console.log('C Concept:', await F.sec(page, 'Concept')); console.log('C External:', await F.sec(page, 'External Naming')); await L.shot(page, 'S8-C')
  console.log('C toasts:', await L.wiz(page).evaluate(() => [...document.querySelectorAll('[role=alert],[class*=toast],[class*=error]')].map(e => e.innerText).filter(Boolean)))
  L.state.offline = false; console.log('C DB:', F.dbSummary(id3))
  await b.close()
})()
