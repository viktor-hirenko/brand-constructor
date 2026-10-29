// Look around a screen: node fullrun/explore.js <who> <path> [clickText...]
const L = require('../lib')
;(async () => {
  const [who, p, ...clicks] = process.argv.slice(2)
  const b = await L.launch()
  const { page, ctx } = await L.session(b, who)
  await page.goto(L.O + p, { waitUntil: 'networkidle' }); await L.wait(page, 2500)
  for (const c of clicks) { await L.clickText(L.wiz(page), c); await L.wait(page, 1500) }
  const f = L.wiz(page)
  console.log((await L.text(f)).slice(0, 2500)); console.log(await L.buttons(f)); console.log((await L.form(f)).join('\n'))
  await L.shot(page, `explore-${who}-${p.replace(/\W+/g, '_')}-${clicks.length}`)
  await ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net))
})()
