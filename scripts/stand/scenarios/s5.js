const L = require('../lib'); const F = require('../flow')
;(async () => {
  const b = await L.launch(); const id = await F.submitted(b); console.log('ID', id)
  const c1 = await L.session(b, 'ceo'); await F.open(c1.page, id)
  L.state.writes.length = 0
  await F.ceoComment(c1.page, 'Concept', 'CEO draft comment, not sent yet'); await L.wait(c1.page, 1500)
  console.log('writes while typing comment:', JSON.stringify(L.state.writes.map(w => [w.m, w.p])))
  console.log('ceo_comments in DB:', JSON.stringify(L.brand(id).ceo_comments))
  const c2 = await L.session(b, 'ceo'); await F.open(c2.page, id)
  console.log('OTHER BROWSER Concept:', await F.sec(c2.page, 'Concept'))
  await c1.page.reload({ waitUntil: 'networkidle' }); await L.wait(c1.page, 3500)
  console.log('SAME BROWSER after F5 Concept:', await F.sec(c1.page, 'Concept'))
  await b.close()
})()
