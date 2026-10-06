// Access by role on the stage (read only): drafts, Orders, links to briefs one may not open.
const L = require('../lib'); const F = require('../flow'); const X = require('./ff')
const NO = /Немає доступу до цього брифу/
;(async () => {
  const b = await L.launch(); const r = X.run('ACCESS'); r.id = '-'
  const draft = L.sql("select b.id, b.internal_name n from brands b where status='draft' and created_by not like 'usr_qa_%' order by created_at desc limit 1")[0]
  const inWork = L.sql("select id, internal_name n from brands where status='in_work' limit 1")[0]
  r.note(`чужой черновик ${draft.n}, бриф в работе ${inWork && inWork.n}`)
  const api = (page, p) => page.evaluate(async u => { const x = await fetch(u); return { s: x.status, j: await x.json().catch(() => null) } }, p)
  let s = await L.session(b, 'ceo'); await s.page.goto(L.O + '/brands', { waitUntil: 'networkidle' }); await L.wait(s.page, 2500)
  const tabs = (await L.buttons(s.page.mainFrame())).filter(t => /^(All|Drafts|In Work|Submitted|Approved|Needs Revision)/.test(t)).join(', ')
  const d = await api(s.page, '/api/brands?status=draft&per_page=5')
  r.check('CEO: нет «Drafts» и «In Work», черновиков по фильтру 0 (H-37)', !/Drafts|In Work/.test(tabs) && d.j && d.j.total === 0, `вкладки: ${tabs}; черновиков: ${d.j && d.j.total}`, await L.shot(s.page, 'ACCESS-ceo-brands'))
  await F.open(s.page, draft.id); r.check('CEO по ссылке на черновик — «Немає доступу» (H-41)', NO.test(await L.text(L.wiz(s.page))), (await L.text(L.wiz(s.page))).slice(0, 80).replace(/\n/g, ' | '), await L.shot(s.page, 'ACCESS-ceo-draft'))
  await s.ctx.close()
  s = await L.session(b, 'po2'); await F.open(s.page, draft.id)
  r.check('второй PO по ссылке на чужой черновик — «Немає доступу» (H-41)', NO.test(await L.text(L.wiz(s.page))), (await L.text(L.wiz(s.page))).slice(0, 80).replace(/\n/g, ' | '), await L.shot(s.page, 'ACCESS-po2-draft'))
  const o = await api(s.page, '/api/orders?tab=open'); r.check('PO: Orders закрыт (403)', o.s === 403, `ответ ${o.s}`)
  await s.ctx.close()
  s = await L.session(b, 'strategy'); await F.open(s.page, draft.id)
  r.check('Strategy по ссылке на черновик — «Немає доступу» (H-52)', NO.test(await L.text(L.wiz(s.page))), (await L.text(L.wiz(s.page))).slice(0, 80).replace(/\n/g, ' | '), await L.shot(s.page, 'ACCESS-strategy-draft'))
  await s.ctx.close()
  for (const who of ['pr', 'design']) {
    s = await L.session(b, who); await s.page.goto(L.O + '/orders', { waitUntil: 'networkidle' }); await L.wait(s.page, 2000)
    const a = await api(s.page, '/api/orders?tab=open')
    r.check(`${who}: Orders закрыт — страница не открылась, сервер 403`, a.s === 403 && !/\/orders$/.test(s.page.url()), `адрес ${s.page.url().replace(L.O, '')}; сервер ${a.s}`, await L.shot(s.page, `ACCESS-${who}-orders`))
    await s.ctx.close()
  }
  s = await L.session(b, 'head'); await s.page.goto(L.O + '/orders', { waitUntil: 'networkidle' }); await L.wait(s.page, 2000)
  const h = await L.text(s.page.mainFrame()); r.check('Head DHC: Orders открывается', /Open\s*\d+/.test(h) && /Archive/.test(h), (h.match(/Open[\s\S]{0,40}Archive\s*\d+/) || ['—'])[0].replace(/\n/g, ' '), await L.shot(s.page, 'ACCESS-head-orders'))
  await s.ctx.close()
  s = await L.session(b, 'po'); await s.page.goto(L.O + '/brands', { waitUntil: 'networkidle' }); await L.wait(s.page, 2500)
  const mine = await api(s.page, '/api/brands?per_page=500'); const qa = (mine.j.data || []).filter(x => /^usr_qa_/.test(x.createdBy || x.created_by || '')).length
  r.check('QA PO видит в Brands все брифы QA', (mine.j.data || []).length > 30, `в списке ${(mine.j.data || []).length}, из них QA ${qa}`, await L.shot(s.page, 'ACCESS-po-brands'))
  await s.ctx.close(); await b.close()
  console.log(`ACCESS ${r.checks.filter(c => c.ok).length}/${r.checks.length}`, 'net:', JSON.stringify(L.net.filter(n => n.status !== 403 && n.status !== 404)).slice(0, 600))
})()
