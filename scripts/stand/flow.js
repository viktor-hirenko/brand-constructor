// Happy-path helpers through the wizard, reused by scenarios.
const L = require('./lib')
async function newBrief(page) {
  await page.goto(L.O + '/workspace/new', { waitUntil: 'networkidle' }); await L.wait(page, 2500)
  let f = L.wiz(page); await L.clickText(f, 'Order New Brand'); await L.wait(page, 2500); f = L.wiz(page)
  await f.waitForURL(/brand=/, { timeout: 10000 }).catch(() => {})
  const id = new URL(L.wiz(page).url()).searchParams.get('brand')
  return { f, id }
}
async function step1(page) {
  const f = L.wiz(page)
  const geo = f.locator('input[placeholder^="Наприклад"]'); await geo.click(); await geo.fill('UK'); await L.wait(page, 600)
  await L.clickText(f, 'United Kingdom'); await L.wait(page, 300)
  await f.locator('body').click({ position: { x: 5, y: 300 } })
  await L.clickText(f, 'Виберіть дату'); await L.wait(page, 500)
  await L.clickText(f, 'Наступний місяць'); await L.wait(page, 300)
  await L.clickText(f, '15', { exact: true }); await L.wait(page, 300)
  await L.clickText(f, 'Далі', { exact: true }); await L.wait(page, 2500)
}
async function dump(page, name) {
  const f = L.wiz(page)
  console.log(`--- ${name} ${f.url().replace(L.O, '')}`)
  console.log((await L.text(f)).slice(0, 2000)); console.log(await L.buttons(f))
  await L.shot(page, name)
}
module.exports = { newBrief, step1, dump }
const next = async page => { await L.clickText(L.wiz(page), 'Далі', { exact: true }); await L.wait(page, 2200) }
async function step2(page, concept) { await L.wiz(page).locator('.concept-card', { hasText: concept }).first().click({ force: true }); await L.wait(page, 1000); await next(page) }
async function step3(page, names) { for (const n of names) { await L.clickText(L.wiz(page), n); await L.wait(page, 500) } await next(page) }
async function step4(page, name) {
  const all = (await L.buttons(L.wiz(page))).filter(x => !/Закрити|Назад|Далі|Замовити|\[off\]/.test(x))
  const pick = all.includes(name) ? name : all[0]
  await L.clickText(L.wiz(page), pick, { exact: true }); await L.wait(page, 500); await next(page)
}
async function step5(page, pkg) { await L.wiz(page).getByText(pkg, { exact: true }).first().click({ force: true }); await L.wait(page, 800); await next(page) }
module.exports.next = next; Object.assign(module.exports, { step2, step3, step4, step5 })
async function step7delegate(page) { await L.clickText(L.wiz(page), 'Довірити вибір дизайнерам'); await L.wait(page, 800); await next(page) }
async function toFinal(page, o = {}) {
  const { id } = await newBrief(page)
  await step1(page); await step2(page, o.concept || 'Wonka'); await step3(page, o.ext || ['Joymus']); await step4(page, o.int || 'Luna'); await step5(page, o.pkg || 'Trust Focus')
  await next(page); await step7delegate(page)
  return id
}
Object.assign(module.exports, { step7delegate, toFinal })
async function editSection(page, section) {
  const f = L.wiz(page)
  const card = f.locator('section.ui-section-card', { has: f.locator('h3', { hasText: new RegExp(`^${section}$`) }) }).first()
  await card.scrollIntoViewIfNeeded(); await card.getByRole('button', { name: 'Редагувати' }).click(); await L.wait(page, 2200)
}
async function sec(page, name) {
  return L.wiz(page).evaluate(n => { const s = [...document.querySelectorAll('section.ui-section-card')].find(x => x.querySelector('h3')?.textContent.trim() === n); return s ? s.innerText.replace(/\n+/g, ' | ').slice(-400) : 'none' }, name)
}
async function submitState(page) {
  return L.wiz(page).evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /На погодження CEO|Відправити в роботу/.test(x.textContent)); return b ? `${b.textContent.trim()}${b.disabled ? ' [off]' : ' [on]'}` : 'none' })
}
function dbSummary(id) {
  const r = L.brand(id)
  return `status=${r.status} concept=${r.concept_id} ext=${JSON.stringify(r.external_naming_ids)} int=${r.internal_naming_id} newConcept=${r.new_concept_brief ? 'yes' : 'no'} newNaming=${r.new_naming_brief ? 'yes' : 'no'} step=${r.current_step}`
}
Object.assign(module.exports, { editSection, sec, submitState, dbSummary })
async function orderConcept(page) {
  await L.clickText(L.wiz(page), 'Замовити новий концепт'); await L.wait(page, 1200)
  const f = L.wiz(page); const dlg = f.locator('[role=dialog]').last()
  await dlg.locator('textarea[placeholder^="Хто наші"]').fill('Stand test: traffic info')
  await dlg.locator('textarea[placeholder^="Ваш відгук"]').fill('Stand test: none of the concepts fit')
  await dlg.getByRole('button', { name: 'Виберіть дату' }).click(); await L.wait(page, 400)
  await f.getByRole('button', { name: 'Наступний місяць' }).last().click(); await f.getByRole('button', { name: '20', exact: true }).last().click(); await L.wait(page, 300)
  const save = dlg.getByRole('button', { name: 'Зберегти' })
  console.log('order save disabled?', await save.isDisabled())
  await save.click(); await L.wait(page, 1500)
}
module.exports.orderConcept = orderConcept
async function submitted(browser, o) {
  const { page, ctx } = await L.session(browser, 'po')
  const id = await toFinal(page, o)
  await L.clickText(L.wiz(page), 'На погодження CEO'); await L.wait(page, 2500)
  await ctx.close(); return id
}
async function open(page, id) { await page.goto(`${L.O}/workspace/brand/${id}`, { waitUntil: 'networkidle' }); await L.wait(page, 3500) }
async function sectionBtn(page, section, name) {
  const f = L.wiz(page)
  const card = f.locator('section.ui-section-card', { has: f.locator('h3', { hasText: new RegExp(`^${section}$`) }) }).first()
  await card.scrollIntoViewIfNeeded(); await card.getByRole('button', { name }).first().click(); await L.wait(page, 2200)
}
Object.assign(module.exports, { submitted, open, sectionBtn })
async function ceoComment(page, section, textValue) {
  const f = L.wiz(page)
  const card = f.locator('section.ui-section-card', { has: f.locator('h3', { hasText: new RegExp(`^${section}$`) }) }).first()
  await card.scrollIntoViewIfNeeded(); await card.getByRole('button', { name: 'Коментар CEO' }).click(); await L.wait(page, 600)
  const ta = card.locator('textarea').first(); await ta.fill(textValue); await ta.blur(); await L.wait(page, 800)
}
async function ceoReturn(page) {
  await L.clickText(L.wiz(page), 'Повернути на доопрацювання'); await L.wait(page, 1500)
  const modal = L.wiz(page).locator('.ui-modal').last()
  if (await modal.count()) { console.log('RETURN MODAL:', (await modal.innerText()).replace(/\n+/g, ' | ')); await modal.getByRole('button').filter({ hasText: /Повернути|Відправити|Підтвердити/ }).last().click(); await L.wait(page, 3000) }
}
Object.assign(module.exports, { ceoComment, ceoReturn })
async function returned(browser, o = {}) {
  const id = await submitted(browser, o)
  const { page, ctx } = await L.session(browser, 'ceo'); await open(page, id)
  await ceoComment(page, 'Concept', 'CEO: rethink the concept'); await ceoReturn(page)
  await ctx.close(); return id
}
module.exports.returned = returned
async function orderNaming(page) {
  await L.clickText(L.wiz(page), 'Замовити нову назву'); await L.wait(page, 1200)
  const f = L.wiz(page); const dlg = f.locator('[role=dialog]').last()
  await dlg.locator('textarea[placeholder^="Хто наші"]').fill('Stand test: traffic info')
  await dlg.locator('textarea[placeholder^="Ваш відгук"]').fill('Stand test: names do not fit')
  await dlg.getByRole('button', { name: 'Виберіть дату' }).click(); await L.wait(page, 400)
  await f.getByRole('button', { name: 'Наступний місяць' }).last().click(); await f.getByRole('button', { name: '20', exact: true }).last().click(); await L.wait(page, 300)
  await dlg.getByRole('button', { name: 'Зберегти' }).click(); await L.wait(page, 1500)
}
module.exports.orderNaming = orderNaming
