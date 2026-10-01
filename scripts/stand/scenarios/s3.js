const L = require('../lib'); const F = require('../flow')
const ACT = process.argv[2]
;(async () => {
  const b = await L.launch(); const { page } = await L.session(b, 'po')
  const id = await F.toFinal(page); console.log(ACT, 'ID', id, F.dbSummary(id))
  await F.editSection(page, 'Concept')
  await L.wiz(page).locator('.concept-card', { hasText: 'Retro Pixel' }).first().click({ force: true }); await L.wait(page, 1000)
  await F.next(page)
  if (ACT === 'pick-reload') { await L.clickText(L.wiz(page), 'Bubbleton'); await L.wait(page, 500) }
  if (ACT.endsWith('reload')) { await page.reload({ waitUntil: 'networkidle' }); await L.wait(page, 3500) }
  if (ACT === 'close') { await L.clickText(L.wiz(page), 'Закрити'); await L.wait(page, 1500); console.log('after close', page.url(), (await L.buttons(L.wiz(page))).slice(0, 8)); await L.shot(page, 'S3-close-modal')
    const bb = await L.buttons(L.wiz(page)); const exitBtn = bb.find(x => /Вийти|Закрити бриф|Так/.test(x) && x !== 'Закрити'); if (exitBtn) { console.log('modal text:', (await L.text(L.wiz(page))).match(/Вийти[^\n]*\n[^\n]*\n?[^\n]*/)?.[0]); await L.clickText(L.wiz(page), exitBtn); await L.wait(page, 2500) }
    console.log('url', page.url())
    await page.goto(`${L.O}/workspace/brand/${id}`, { waitUntil: 'networkidle' }); await L.wait(page, 3500) }
  if (ACT === 'cancel-ext') { await L.clickText(L.wiz(page), 'Назад', { exact: true }); await L.wait(page, 1500); await L.clickText(L.wiz(page), 'Скасувати'); await L.wait(page, 2500) }
  console.log('url', L.wiz(page).url().replace(L.O, ''))
  console.log('screen:', (await L.text(L.wiz(page))).split('\n').slice(0, 12).join(' | '))
  console.log('Concept:', await F.sec(page, 'Concept')); console.log('External:', await F.sec(page, 'External Naming')); console.log('submit:', await F.submitState(page))
  console.log('DB:', F.dbSummary(id))
  await L.shot(page, 'S3-' + ACT)
  await b.close()
})()
