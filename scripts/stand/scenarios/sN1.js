const L = require('../lib'); const F = require('../flow')
;(async () => {
  const id = L.sql("select id from brands where status='submitted' and new_naming_brief is not null and new_concept_brief is null order by updated_at desc limit 1")[0].id
  const b = await L.launch(); const { page } = await L.session(b, 'po'); await F.open(page, id)
  await F.editSection(page, 'External Naming')
  await L.clickText(L.wiz(page), 'Joymus'); await L.wait(page, 1000)
  const m = L.wiz(page).locator('.ui-modal').last(); if (await m.count()) { console.log('MODAL:', (await m.innerText()).replace(/\n+/g, ' | ')); await m.getByRole('button').filter({ hasNotText: /Скасувати/ }).last().click(); await L.wait(page, 1000) }
  L.state.writes.length = 0
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  console.log('after save url', L.wiz(page).url().replace(L.O, '')); console.log('header', (await L.text(L.wiz(page))).split('\n').slice(0, 7).join(' | '))
  console.log('External:', await F.sec(page, 'External Naming')); console.log('submit:', await F.submitState(page)); console.log(F.dbSummary(id))
  console.log(JSON.stringify(L.state.writes.map(w => [w.m, w.p, w.status, w.res])))
  await L.shot(page, 'N1-after-pick')
  const st = await F.submitState(page)
  if (st.includes('[on]')) { await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 3000); console.log('after CEO submit', L.wiz(page).url().replace(L.O, ''), F.dbSummary(id)) }
  await b.close()
})()
