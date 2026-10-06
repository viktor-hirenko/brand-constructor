// Phase 1 of docs/qa/stage-full-run-plan.md: every QA person signs in on the stage.
// STAND_TARGET=stage STAND_DIR=<dir> node fullrun/login-check.js
const L = require('../lib')
;(async () => {
  const b = await L.launch()
  for (const who of Object.keys(L.USERS)) {
    const { page, ctx } = await L.session(b, who)
    await page.goto(L.O + '/brands', { waitUntil: 'networkidle' }); await L.wait(page, 2500)
    const me = await page.evaluate(async () => { const r = await fetch('/api/auth/me'); return { status: r.status, body: (await r.text()).slice(0, 160) } })
    const menu = (await L.text(page.mainFrame(), 'nav, aside')).replace(/\n/g, ' · ').slice(0, 200)
    await L.shot(page, `login-${who}`)
    console.log(JSON.stringify({ who, url: page.url().replace(L.O, ''), me: me.status, menu }))
    await ctx.close()
  }
  await b.close()
  console.log('net errors:', JSON.stringify(L.net))
})()
