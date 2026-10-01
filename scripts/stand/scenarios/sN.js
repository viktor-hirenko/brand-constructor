const L = require('../lib'); const F = require('../flow')
;(async () => {
  const b = await L.launch(); const { page } = await L.session(b, 'po')
  // N2: order name for Wonka, go back, switch concept
  let r = await F.newBrief(page); await F.step1(page); await F.step2(page, 'Wonka')
  await F.orderNaming(page); console.log('N2 step3 after order:', await L.buttons(L.wiz(page)))
  await F.next(page); console.log('N2 after Далі url', L.wiz(page).url().replace(L.O, ''), F.dbSummary(r.id))
  await L.back(page); await L.back(page); console.log('N2 back to', L.wiz(page).url().replace(L.O, ''))
  await L.wiz(page).locator('.concept-card', { hasText: 'Wonderland' }).first().click({ force: true }); await L.wait(page, 1200)
  const m = L.wiz(page).locator('.ui-modal').last(); if (await m.count()) console.log('N2 MODAL:', (await m.innerText()).replace(/\n+/g, ' | '))
  await F.next(page); await F.dump(page, 'N2-step3-after-concept-switch'); console.log('N2 DB', F.dbSummary(r.id))
  // N1: order name, send to work, then pick a library name
  const id = await (async () => { const x = await F.newBrief(page); await F.step1(page); await F.step2(page, 'Wonka'); await F.orderNaming(page); await F.next(page); await F.step4(page, 'Bit'); await F.step5(page, 'Trust Focus'); await F.next(page); await F.step7delegate(page); return x.id })()
  console.log('N1 final submit:', await F.submitState(page)); await L.clickText(L.wiz(page), 'Відправити в роботу'); await L.wait(page, 3000); console.log('N1 sent', F.dbSummary(id))
  await F.open(page, id); console.log('N1 in work External:', await F.sec(page, 'External Naming'))
  await F.editSection(page, 'External Naming'); await F.dump(page, 'N1-edit-ext')
  await b.close()
})()
