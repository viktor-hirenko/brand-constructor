// docs/architecture/fullrun-fixes-plan.md — the fixes seen in the browser.
// node fullrun/verify-fixes.js <concept> <ext> <int A> <int B>   (free QA items of the base under test)
const L = require('../lib'); const F = require('../flow'); const X = require('./ff')
const [CONCEPT, EXT, INT_A, INT_B] = process.argv.slice(2)
;(async () => {
  const b = await L.launch()
  // Bug 2: the role under the user's name.
  const r2 = X.run('FIX-2'); r2.id = '-'
  for (const [who, want] of [['po', 'Product Owner'], ['ceo', 'CPO / CEO'], ['strategy', 'Strategy & Identity'], ['admin', 'Admin']]) {
    const s = await L.session(b, who); await s.page.goto(L.O + '/brands', { waitUntil: 'networkidle' }); await L.wait(s.page, 2000)
    const role = await s.page.evaluate(() => document.querySelector('.sidebar__user-role')?.textContent?.trim())
    r2.check(`роль в меню у ${who}`, role === want, `«${role}»`, await L.shot(s.page, `FIX-2-${who}`))
    await s.ctx.close()
  }
  // Bug 1: an empty draft opened by a link without the step.
  const r1 = X.run('FIX-1')
  const s1 = await L.session(b, 'po'); const { id } = await F.newBrief(s1.page); r1.id = id
  await s1.ctx.close()
  const s1b = await L.session(b, 'po'); await s1b.page.goto(`${L.O}/workspace/brand/${id}`, { waitUntil: 'networkidle' }); await L.wait(s1b.page, 3500)
  const url = L.wiz(s1b.page).url(); const t = await L.text(L.wiz(s1b.page))
  r1.check('пустой черновик по ссылке открылся на шаге 1, без «Бриф готовий»', /step\/1/.test(url) && !/Бриф готовий/.test(t), url.replace(/^.*wizard/, ''), await L.shot(s1b.page, 'FIX-1-draft-link'))
  // finish this draft too, so nothing is left half-made
  await X.fill(s1b.page, r1, { resumeId: id, resumeStep: 1, label: 'проверка исправления 1: черновик по ссылке', concept: CONCEPT, exts: [EXT], int: INT_A, pkg: 'Trust Focus' })
  await X.send(s1b.page, r1); await s1b.ctx.close()
  // Bug 4: two briefs with the same concept and name; the CEO approves both.
  const r4 = X.run('FIX-4')
  const s2 = await L.session(b, 'po2'); await X.fill(s2.page, r4, { label: 'проверка исправления 4: тот же концепт, что у проверки 1', concept: CONCEPT, exts: [EXT], int: INT_B, pkg: 'Social Trust' })
  await X.send(s2.page, r4); await s2.ctx.close()
  const c1 = await X.ceo(b, r1); await X.ceoApprove(c1.page, r1); await c1.ctx.close()
  const c2 = await X.ceo(b, r4)
  await L.clickText(L.wiz(c2.page), 'Затвердити', { exact: true }); await L.wait(c2.page, 1300)
  const m = L.wiz(c2.page).locator('.ui-modal').last(); if (await m.count()) { await m.getByRole('button', { name: 'Затвердити', exact: true }).click(); await L.wait(c2.page, 3000) }
  const err = await L.text(L.wiz(c2.page))
  await c2.page.screenshot({ path: `${L.SP}/run/FIX-4-refused.png` })
  r4.check('второе утверждение того же концепта — отказ, бриф у CEO', X.status(r4.id) === 'submitted' && /уже використано/.test(err), `статус ${X.status(r4.id)}; на экране: ${(err.match(/[^\n]*уже використано[^\n]*/) || ['текста нет'])[0]}`)
  const owner = L.sql(`select (select used_in_brand_id from concepts where name='${CONCEPT}') c, (select used_in_brand_id from external_namings where name='${EXT}') e`)[0]
  r4.check('концепт и название остались за первым брифом', owner.c === r1.id && owner.e === r1.id, JSON.stringify(owner))
  await c2.ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net.filter(n => n.status !== 409)).slice(0, 500))
})()
