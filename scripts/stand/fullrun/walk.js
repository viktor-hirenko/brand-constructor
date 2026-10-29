// Walk one draft through every step, dumping each screen: node fullrun/walk.js <label>
const L = require('../lib'); const F = require('../flow')
;(async () => {
  const label = process.argv[2] || 'walk'
  const b = await L.launch()
  const { page, ctx } = await L.session(b, 'po')
  const { id } = await F.newBrief(page)
  console.log('BRIEF', id, JSON.stringify(L.sql(`select internal_name, status from brands where id='${id}'`)))
  await F.dump(page, `${label}-1`)
  await ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net))
})()
