const L = require('../lib'); const F = require('../flow'); const fs = require('fs')
;(async () => {
  const id = fs.readFileSync(L.SP + '/run/s6-id.txt', 'utf8').trim()
  const b = await L.launch(); const { page } = await L.session(b, 'po')
  await page.goto(`${L.O}/workspace/brand/${id}`, { waitUntil: 'networkidle' }); await L.wait(page, 3500)
  await F.editSection(page, 'Concept'); await F.dump(page, 'S6b-edit-concept')
  await L.wiz(page).locator('.concept-card', { hasText: 'Farm' }).first().click({ force: true }); await L.wait(page, 1200)
  const modal = L.wiz(page).locator('.ui-modal').last()
  if (await modal.count()) { console.log('MODAL:', (await modal.innerText()).replace(/\n+/g, ' | ')); await L.shot(page, 'S6b-modal')
    const ok = modal.getByRole('button').filter({ hasNotText: /Скасувати|Закрити/ }).last(); console.log('confirm with', await ok.innerText()); await ok.click(); await L.wait(page, 1200) }
  await F.next(page); await F.dump(page, 'S6b-ext')
  const names = (await L.buttons(L.wiz(page))).filter(x => /Available/.test(x))
  if (names[0]) { await L.clickText(L.wiz(page), names[0].split(' ')[0]); await L.wait(page, 500) }
  L.state.writes.length = 0
  const save = (await L.buttons(L.wiz(page))).find(x => /Зберегти|Далі/.test(x)); console.log('save btn', save)
  await L.clickText(L.wiz(page), save.replace(' [off]', ''), { exact: true }); await L.wait(page, 3000)
  await F.dump(page, 'S6b-after-save')
  console.log(JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.body.slice(0, 120), w.res.slice(0, 120)])))
  console.log(F.dbSummary(id)); console.log('submit:', await F.submitState(page))
  await b.close()
})()
