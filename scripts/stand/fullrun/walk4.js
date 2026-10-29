const L = require('../lib'); const F = require('../flow')
const id = process.argv[2]
;(async () => {
  const b = await L.launch()
  const { page, ctx } = await L.session(b, 'po')
  await page.goto(`${L.O}/workspace/brand/${id}?step=5`, { waitUntil: 'networkidle' }); await L.wait(page, 3500)
  await F.step5(page, 'Trust Focus'); await F.dump(page, 'W4-6'); console.log((await L.form(L.wiz(page))).join('\n'))
  await F.next(page); await F.dump(page, 'W4-7'); console.log((await L.form(L.wiz(page))).join('\n'))
  const acc = await L.wiz(page).evaluate(() => [...document.querySelectorAll('[class*=accordion] , details, [aria-expanded]')].map(e => `${e.tagName}.${e.className.toString().slice(0, 60)} exp=${e.getAttribute('aria-expanded')} ${(e.innerText || '').slice(0, 40).replace(/\n/g, ' ')}`).slice(0, 30))
  console.log(acc.join('\n'))
  await page.screenshot({ path: `${L.SP}/run/W4-7-full.png`, fullPage: true })
  await ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net))
})()
