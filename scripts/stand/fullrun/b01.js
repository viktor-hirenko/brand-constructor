// B-01: draft New Brand #88 (started while exploring) — step 7 «Довірити» → CEO → approved as is.
const L = require('../lib'); const F = require('../flow'); const X = require('./ff')
;(async () => {
  const b = await L.launch()
  const r = X.run('B-01'); r.id = 'brand_885daeac82df4775'; r.num = 'New Brand #88'
  const { page, ctx } = await L.session(b, 'po')
  await page.goto(`${L.O}/workspace/brand/${r.id}?step=7`, { waitUntil: 'networkidle' }); await L.wait(page, 3500)
  await L.clickText(L.wiz(page), 'Довірити вибір дизайнерам'); await L.wait(page, 800)
  await X.next(page, r, 7)
  const fin = await L.text(L.wiz(page)); await L.shot(page, 'B-01-8-final')
  r.check('Final review', /Бриф готовий/.test(fin) && /QA Concept 01/.test(fin) && /QA Ext 01A/.test(fin) && /Echo/.test(fin) && /Trust Focus/.test(fin), fin.replace(/\n/g, ' | ').slice(0, 400))
  await X.send(page, r); await ctx.close()
  const c = await X.ceo(b, r)
  const t = await L.text(L.wiz(c.page)); await L.shot(c.page, 'B-01-ceo-open')
  r.check('CEO видит Brief Review', /Brief Review/.test(t), (t.match(/Бриф на розгляді[^\n]*/) || ['—'])[0])
  await X.ceoApprove(c.page, r); await c.ctx.close()
  const p2 = await L.session(b, 'po'); await F.open(p2.page, r.id)
  const t2 = await L.text(L.wiz(p2.page)); await L.shot(p2.page, 'B-01-po-approved')
  r.check('автор видит «Бриф затверджено»', /Бриф затверджено/.test(t2), (t2.match(/Бриф затверджено[^\n]*/) || ['—'])[0])
  const used = L.sql(`select (select used_in_brand_id from concepts where name='QA Concept 01') c, (select used_in_brand_id from external_namings where name='QA Ext 01A') e`)[0]
  r.check('концепт и название заняты брифом', used.c === r.id && used.e === r.id, JSON.stringify(used))
  await b.close()
  console.log(`B-01 ${r.num}: ${r.checks.filter(c => c.ok).length}/${r.checks.length}`, 'net:', JSON.stringify(L.net))
})()
