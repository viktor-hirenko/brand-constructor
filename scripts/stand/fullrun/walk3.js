const L = require('../lib'); const F = require('../flow')
const id = process.argv[2]
;(async () => {
  const b = await L.launch()
  const { page, ctx } = await L.session(b, 'po')
  await page.goto(`${L.O}/workspace/brand/${id}?step=2`, { waitUntil: 'networkidle' }); await L.wait(page, 3500)
  await F.step2(page, 'QA Concept 01'); await F.dump(page, 'W3-3')
  await F.step3(page, ['QA Ext 01A']); await F.dump(page, 'W3-4')
  const ints = (await L.buttons(L.wiz(page))).filter(x => !/Закрити|Назад|Далі|Замовити|\[off\]/.test(x)); console.log('INTS', ints)
  await L.clickText(L.wiz(page), ints[0], { exact: true }); await L.wait(page, 500); await F.next(page); await F.dump(page, 'W3-5')
  await page.screenshot({ path: `${L.SP}/run/W3-5-full.png`, fullPage: true })
  await ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net))
})()
