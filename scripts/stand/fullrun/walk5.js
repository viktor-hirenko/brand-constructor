const L = require('../lib'); const F = require('../flow')
const id = process.argv[2]
;(async () => {
  const b = await L.launch()
  const { page, ctx } = await L.session(b, 'po')
  await page.goto(`${L.O}/workspace/brand/${id}?step=7`, { waitUntil: 'networkidle' }); await L.wait(page, 3500)
  await L.clickText(L.wiz(page), 'Header', { exact: true }); await L.wait(page, 900)
  console.log(await L.buttons(L.wiz(page)))
  const opts = await L.wiz(page).evaluate(() => [...document.querySelectorAll('.ui-accordion-item')][0].innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/class="[^"]*"/g, '').slice(0, 2500))
  console.log(opts)
  await L.shot(page, 'W5-header-open')
  await ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net))
})()
