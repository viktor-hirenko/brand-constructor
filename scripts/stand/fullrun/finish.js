// Finish a brief a crash left on the revision: node fullrun/finish.js <B-NN> <brand id> [po|po2]
// The author marks every open section resolved, sends to the CEO, the CEO approves.
const L = require('../lib'); const F = require('../flow'); const X = require('./ff')
;(async () => {
  const [bn, id, who = 'po'] = process.argv.slice(2)
  const b = await L.launch(); const r = X.run(bn); r.id = id; r.num = L.sql(`select internal_name from brands where id='${id}'`)[0].internal_name
  r.note(`доведение ${r.num}, статус ${X.status(id)}`)
  if (X.status(id) === 'needs_revision') {
    const { page, ctx } = await L.session(b, who); await F.open(page, id)
    for (const s of ['Brand Basics', 'Concept', 'External Naming', 'Internal Naming', 'PR Package', 'Deliverables', 'Visual Components']) {
      if ((await F.sec(page, s)).includes('Позначити як вирішений')) { await F.sectionBtn(page, s, 'Позначити як вирішений'); await L.wait(page, 1000); r.note(`решён ${s}`) }
    }
    await X.send(page, r); await ctx.close()
  }
  if (X.status(id) === 'submitted') { const c = await X.ceo(b, r); await X.ceoApprove(c.page, r); await c.ctx.close() }
  await b.close(); console.log(`${bn} ${r.num}: ${X.status(id)}`)
})()
