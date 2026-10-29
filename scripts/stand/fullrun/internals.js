// Phase 1.4: QA Admin creates internal names «QA Int 01…NN» in the library.
const L = require('../lib')
const nn = i => String(i).padStart(2, '0')
;(async () => {
  const to = Number(process.argv[2] || 30)
  const have = new Set(L.sql("select name from internal_namings where name like 'QA Int %'").map(r => r.name))
  const b = await L.launch()
  const { page, ctx } = await L.session(b, 'admin')
  for (let i = 1; i <= to; i++) {
    const name = `QA Int ${nn(i)}`
    if (have.has(name)) continue
    await page.goto(L.O + '/namings', { waitUntil: 'networkidle' }); await L.wait(page, 1200)
    await L.clickText(page.mainFrame(), 'Internal Namings'); await L.wait(page, 800)
    await L.clickText(page.mainFrame(), '+ New Naming'); await L.wait(page, 600)
    await page.fill('input[placeholder="Enter naming..."]', name)
    await page.fill('input[placeholder="Short description..."]', 'QA 06.10 · internal name for the full stage run')
    await page.getByRole('button', { name: 'Create', exact: true }).click(); await L.wait(page, 1500)
  }
  const got = L.sql("select count(*) n from internal_namings where name like 'QA Int %'")[0].n
  console.log('QA internals:', got)
  await L.shot(page, 'internals-last'); await ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net))
})()
