// Phase 1.4 of docs/qa/stage-full-run-plan.md: QA Admin builds the QA library through the admin.
// node fullrun/library.js [from] [to]   — concepts QA Concept <from..to>, 3 external names each.
const path = require('path')
const L = require('../lib')
const IMG = path.resolve(__dirname, '../../../docs/local/stage-qa/img')
const nn = i => String(i).padStart(2, '0')

async function concept(page, i) {
  const name = `QA Concept ${nn(i)}`
  const exists = L.sql(`select id from concepts where name='${name}'`)[0]
  let id = exists && exists.id
  if (!id) {
    await page.goto(L.O + '/concepts', { waitUntil: 'networkidle' }); await L.wait(page, 1500)
    await L.clickText(page.mainFrame(), '+ New Concept'); await L.wait(page, 600)
    await page.fill('input[placeholder="e.g. WonderLand"]', name)
    await page.fill('textarea[placeholder^="Theme, mood"]', `QA 06.10: test concept ${nn(i)} for the full stage run.`)
    await page.locator(`input[type=radio][value=${i % 2 ? 'light' : 'dark'}]`).check()
    await L.clickText(page.mainFrame(), 'Create Concept'); await L.wait(page, 2500)
    id = L.sql(`select id from concepts where name='${name}'`)[0].id
  } else {
    await page.goto(`${L.O}/concepts/${id}`, { waitUntil: 'networkidle' }); await L.wait(page, 1500)
  }
  const row = L.sql(`select visual_url, gallery_url_1, gallery_url_2 from concepts where id='${id}'`)[0]
  const slots = [row.visual_url, row.gallery_url_1, row.gallery_url_2]
  const inputs = page.locator('input[type=file]')
  for (let k = 0; k < 3; k++) {
    if (slots[k]) continue
    await inputs.nth(k).setInputFiles(`${IMG}/qa-${nn(((i + k) % 24) + 1)}.png`)
    await page.waitForResponse(r => r.url().includes('/api/') && r.request().method() !== 'GET', { timeout: 30000 }).catch(() => {})
    await L.wait(page, 2500)
  }
  const after = L.sql(`select visual_url, gallery_url_1, gallery_url_2 from concepts where id='${id}'`)[0]
  return { name, id, images: [after.visual_url, after.gallery_url_1, after.gallery_url_2].filter(Boolean).length }
}

async function external(page, conceptName, name) {
  if (L.sql(`select id from external_namings where name='${name}'`)[0]) return 'exists'
  await page.goto(L.O + '/namings', { waitUntil: 'networkidle' }); await L.wait(page, 1500)
  await L.clickText(page.mainFrame(), '+ New Naming'); await L.wait(page, 600)
  await page.fill('input[placeholder="Enter naming..."]', name)
  await page.fill('input[placeholder="Short description..."]', `QA 06.10 · ${conceptName}`)
  await page.locator('[role=dialog] select, .modal select, form select').last().selectOption({ label: conceptName })
  await page.getByRole('button', { name: 'Create', exact: true }).click(); await L.wait(page, 2000)
  return L.sql(`select id from external_namings where name='${name}'`)[0] ? 'created' : 'MISSING'
}

;(async () => {
  const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || 20)
  const b = await L.launch()
  const { page, ctx } = await L.session(b, 'admin')
  for (let i = from; i <= to; i++) {
    const c = await concept(page, i)
    const ext = []
    for (const s of ['A', 'B', 'C']) ext.push(await external(page, c.name, `QA Ext ${nn(i)}${s}`))
    console.log(JSON.stringify({ ...c, ext }))
  }
  await L.shot(page, 'library-last')
  await ctx.close(); await b.close()
  console.log('net:', JSON.stringify(L.net))
})()
