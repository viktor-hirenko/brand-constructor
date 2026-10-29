// Fixes 1–3 on the stage (orders version), every brief made here is approved.
const L = require('../lib'); const F = require('../flow'); const X = require('./ff')
;(async () => {
  const b = await L.launch()
  const r2 = X.run('FIX-2'); r2.id = '-'
  for (const [who, want] of [['po', 'Product Owner'], ['ceo', 'CPO / CEO'], ['strategy', 'Strategy & Identity'], ['head', 'Head of DHC'], ['pr', 'PR & Marketing']]) {
    const s = await L.session(b, who); await s.page.goto(L.O + '/brands', { waitUntil: 'networkidle' }); await L.wait(s.page, 2000)
    const role = await s.page.evaluate(() => document.querySelector('.sidebar__user-role')?.textContent?.trim())
    r2.check(`роль в меню у ${who}`, role === want, `«${role}»`, await L.shot(s.page, `FIX-2-${who}`)); await s.ctx.close()
  }
  const r3 = X.run('FIX-3'); r3.id = '-'
  const st = await L.session(b, 'strategy')
  for (const [n, want] of [['New Brand #102', 'Замовлено новий Internal Naming'], ['New Brand #100', 'Замовлено новий External Naming'], ['New Brand #104', 'Замовлено новий концепт і новий Internal Naming']]) {
    const id = L.sql(`select id from brands where internal_name='${n}'`)[0].id
    await st.page.goto(`${L.O}/orders/${id}`, { waitUntil: 'networkidle' }); await L.wait(st.page, 2000)
    const t = await L.text(st.page.mainFrame()); const line = (t.match(/Замовлено[^·\n]*/) || ['—'])[0].trim()
    r3.check(`шапка заказа ${n}`, line === want, `«${line}»`, await L.shot(st.page, `FIX-3-${n.replace(/\W+/g, '')}`))
  }
  await st.page.goto(`${L.O}/orders`, { waitUntil: 'networkidle' }); await L.wait(st.page, 1500)
  await L.clickText(st.page.mainFrame(), 'Archive'); await L.wait(st.page, 1500)
  const list = await L.text(st.page.mainFrame()); r3.check('в списке заказов те же слова', /Новий Internal Naming/.test(list) && /Новий External Naming/.test(list), (list.match(/Новий [A-Za-zа-я ]+/g) || []).slice(0, 4).join(', '), await L.shot(st.page, 'FIX-3-list'))
  await st.ctx.close()
  const r1 = X.run('FIX-1')
  const s1 = await L.session(b, 'po'); const { id } = await F.newBrief(s1.page); r1.id = id; await s1.ctx.close()
  const s = await L.session(b, 'po'); await s.page.goto(`${L.O}/workspace/brand/${id}`, { waitUntil: 'networkidle' }); await L.wait(s.page, 3500)
  const url = L.wiz(s.page).url(); const t = await L.text(L.wiz(s.page))
  r1.check('пустой черновик по ссылке открылся на шаге 1, без «Бриф готовий»', /step\/1/.test(url) && !/Бриф готовий/.test(t), url.replace(/^.*wizard/, ''), await L.shot(s.page, 'FIX-1-draft-link'))
  await X.fill(s.page, r1, { resumeId: id, resumeStep: 1, label: 'проверка исправления 1: пустой черновик по ссылке открывается на своём шаге', concept: 'QA Concept 30', exts: ['QA Ext 30A'], int: 'QA Int 34', pkg: 'Media Reputation' })
  await X.send(s.page, r1); await s.ctx.close()
  const c = await X.ceo(b, r1); await X.ceoApprove(c.page, r1); await c.ctx.close()
  await b.close(); console.log('net:', JSON.stringify(L.net).slice(0, 400))
})()
