// Portion 1 of docs/architecture/wizard-fixes-plan.md — the browser copy of a draft.
// node scenarios/sP1.js [D-01 D-02 …]   (no args = all). Run with STAND_FRONT for a local build.
const fs = require('fs')
const L = require('../lib'); const F = require('../flow')
const ONLY = process.argv.slice(2)
const OUT = `${L.SP}/run/p1-results.jsonl`
const results = []
function verdict(id, ok, note) { const r = { id, verdict: ok ? 'pass' : 'fail', note }; results.push(r); console.log(JSON.stringify(r)); fs.appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + '\n') }
const picked = (f, name) => f.evaluate(n => { const b = [...document.querySelectorAll('button, [role=button], label')].find(x => x.offsetParent && x.textContent.trim().startsWith(n)); return b ? `${b.className} ${b.getAttribute('aria-pressed')} ${b.getAttribute('aria-checked')} ${b.getAttribute('data-state')}` : 'none' }, name)
const reload = async page => { await page.reload({ waitUntil: 'networkidle' }); await L.wait(page, 3500) }
const comment = async (page, v) => { const ta = L.wiz(page).locator('textarea:visible').last(); await ta.fill(v); await L.wait(page, 400) }
const commentValue = page => L.wiz(page).locator('textarea:visible').last().inputValue().catch(() => '')
async function fillStep1(page) {
  const f = L.wiz(page)
  const geo = f.locator('input[placeholder^="Наприклад"]'); await geo.click(); await geo.fill('UK'); await L.wait(page, 600)
  await L.clickText(f, 'United Kingdom'); await L.wait(page, 300)
  await f.locator('body').click({ position: { x: 5, y: 300 } })
  await L.clickText(f, 'Виберіть дату'); await L.wait(page, 500)
  await L.clickText(f, 'Наступний місяць'); await L.wait(page, 300)
  await L.clickText(f, '15', { exact: true }); await L.wait(page, 300)
}
async function openFromBrands(page, id) {
  await page.goto(`${L.O}/brands`, { waitUntil: 'networkidle' }); await L.wait(page, 2000)
  await page.getByText(L.brand(id).internal_name, { exact: true }).first().click(); await L.wait(page, 3500)
}
async function toStep(page, n, o = {}) {
  const { id } = await F.newBrief(page)
  if (n >= 2) await F.step1(page)
  if (n >= 3) await F.step2(page, o.concept || 'Wonka')
  if (n >= 4) await F.step3(page, o.ext || ['Joymus'])
  if (n >= 5) await F.step4(page, o.int || 'Luna')
  return id
}
const CHECKS = {
  'D-01': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const { id } = await F.newBrief(page); await fillStep1(page); await comment(page, 'P1 D-01 comment')
    await L.shot(page, 'P1-D-01-a-filled')
    await reload(page)
    const after = await L.text(L.wiz(page)); const cm = await commentValue(page); await L.shot(page, 'P1-D-01-b-after-F5')
    const db = L.brand(id)
    const geoOk = /(^|\n)UK(\n|$)/.test(after)
    const ok = geoOk && !/Виберіть дату/.test(after) && cm === 'P1 D-01 comment'
    verdict('D-01', ok, `после F5 шаг 1: GEO UK ${geoOk ? 'на месте' : 'ПРОПАЛ'}, дата ${/Виберіть дату/.test(after) ? 'ПРОПАЛА' : 'на месте'}, комментарий «${cm}»; на сервере geo=${db.geo} (до «Далі» не уходило)`)
    await ctx.close()
  },
  'D-02': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await toStep(page, 3)
    const off = await picked(L.wiz(page), 'Joymus')
    await L.clickText(L.wiz(page), 'Joymus'); await L.wait(page, 500); await comment(page, 'P1 D-02 comment')
    const on = await picked(L.wiz(page), 'Joymus'); await L.shot(page, 'P1-D-02-a-step3-picked')
    await reload(page)
    const now = await picked(L.wiz(page), 'Joymus'); const cm = await commentValue(page); await L.shot(page, 'P1-D-02-b-after-F5')
    verdict('D-02', on !== off && now === on && cm === 'P1 D-02 comment', `после F5 на шаге 3: Joymus ${now === on && on !== off ? 'выбран' : 'НЕ выбран'}, комментарий «${cm}»; на сервере названий: ${JSON.stringify(L.brand(id).external_naming_ids)}`)
    await ctx.close()
  },
  'D-04': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await toStep(page, 2); await F.orderConcept(page)
    const b1 = await L.buttons(L.wiz(page)); await L.shot(page, 'P1-D-04-a-order-saved')
    await reload(page)
    const b2 = await L.buttons(L.wiz(page)); await L.shot(page, 'P1-D-04-b-after-F5')
    const has = x => x.some(t => /Бриф концепту створено/.test(t))
    verdict('D-04', has(b1) && has(b2), `после «Зберегти» кнопка «Бриф концепту створено»: ${has(b1)}; после F5: ${has(b2) ? 'на месте' : 'ПРОПАЛА'}; на сервере заказ: ${L.brand(id).new_concept_brief ? 'есть' : 'ещё нет (уйдёт с «Далі»)'}`)
    await F.next(page); await L.wait(page, 800)
    console.log('D-04 after Далі — server order:', L.brand(id).new_concept_brief ? 'yes' : 'no', L.wiz(page).url().replace(L.O, ''))
    await ctx.close()
  },
  'D-10': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await toStep(page, 4)
    const all = (await L.buttons(L.wiz(page))).filter(x => !/Закрити|Назад|Далі|Замовити|\[off\]/.test(x)); const name = all[0]
    const off = await picked(L.wiz(page), name); await L.clickText(L.wiz(page), name, { exact: true }); await L.wait(page, 500)
    const on = await picked(L.wiz(page), name); await L.shot(page, 'P1-D-10-a-step4-picked')
    await L.back(page); const urlBack = L.wiz(page).url().replace(L.O, ''); await L.shot(page, 'P1-D-10-b-after-back')
    await reload(page); await F.next(page)
    const now = await picked(L.wiz(page), name); await L.shot(page, 'P1-D-10-c-step4-again')
    verdict('D-10', on !== off && now === on, `«назад» браузера → ${urlBack}; затем F5 и «Далі» → шаг 4: ${name} ${now === on ? 'выбран' : 'НЕ выбран'}`)
    await ctx.close()
  },
  'D-11': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await toStep(page, 3); const nm = L.brand(id).internal_name
    await page.goto(`${L.O}/brands`, { waitUntil: 'networkidle' }); await L.wait(page, 2000)
    await page.getByText(nm, { exact: true }).first().click(); await L.wait(page, 3500)
    const opened = L.wiz(page).url().replace(L.O, '')
    const off = await picked(L.wiz(page), 'Joymus'); await L.clickText(L.wiz(page), 'Joymus'); await L.wait(page, 500); await comment(page, 'P1 D-11 comment')
    const on = await picked(L.wiz(page), 'Joymus'); await L.shot(page, 'P1-D-11-a-opened-and-changed')
    await page.goBack(); await L.wait(page, 2500); const urlBack = page.url().replace(L.O, ''); await L.shot(page, 'P1-D-11-b-after-back')
    await page.getByText(nm, { exact: true }).first().click(); await L.wait(page, 3500)
    const now = await picked(L.wiz(page), 'Joymus'); const cm = await commentValue(page); await L.shot(page, 'P1-D-11-c-reopened')
    verdict('D-11', on !== off && now === on && cm === 'P1 D-11 comment', `бриф ${nm} открыт из Brands на ${opened}; выбор Joymus и комментарий → «назад» браузера → ${urlBack}; открыт снова: Joymus ${now === on ? 'выбран' : 'НЕ выбран'}, комментарий «${cm}»`)
    await ctx.close()
  },
  'D-20': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await toStep(page, 5)
    await L.wiz(page).getByText('Trust Focus', { exact: true }).first().click({ force: true }); await L.wait(page, 800)
    const before = await L.text(L.wiz(page)); await L.shot(page, 'P1-D-20-a-step5-picked')
    const canNext1 = (await L.buttons(L.wiz(page))).includes('Далі')
    await page.close()
    const page2 = await ctx.newPage(); await openFromBrands(page2, id)
    const url = L.wiz(page2).url().replace(L.O, ''); const canNext2 = (await L.buttons(L.wiz(page2))).includes('Далі'); await L.shot(page2, 'P1-D-20-b-reopened')
    await F.next(page2)
    const db = L.brand(id)
    verdict('D-20', canNext1 && canNext2 && !!db.pr_package_id, `вкладка закрыта; бриф открыт снова на ${url}: «Далі» ${canNext2 ? 'активна (пакет выбран)' : 'выключена (пакет ПРОПАЛ)'}; после «Далі» на сервере пакет: ${db.pr_package_id}`)
    await ctx.close()
  },
  'D-21': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await toStep(page, 3)
    const off = await picked(L.wiz(page), 'Joymus'); await L.clickText(L.wiz(page), 'Joymus'); await L.wait(page, 500)
    const on = await picked(L.wiz(page), 'Joymus'); await L.shot(page, 'P1-D-21-a-step3-picked')
    await page.getByRole('link', { name: /Brands/ }).first().click(); await L.wait(page, 2500); const url = page.url().replace(L.O, ''); await L.shot(page, 'P1-D-21-b-after-menu')
    await openFromBrands(page, id); const now = await picked(L.wiz(page), 'Joymus'); await L.shot(page, 'P1-D-21-c-reopened')
    verdict('D-21', on !== off && now === on, `«Brands» в меню → ${url}; бриф открыт снова (${L.wiz(page).url().replace(L.O, '')}): Joymus ${now === on ? 'выбран' : 'НЕ выбран'}`)
    await ctx.close()
  },
  'D-50': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await toStep(page, 3)
    const off = await picked(L.wiz(page), 'Joymus'); await L.clickText(L.wiz(page), 'Joymus'); await L.wait(page, 500)
    const on = await picked(L.wiz(page), 'Joymus')
    L.state.expired = true
    await L.clickText(L.wiz(page), 'Далі', { exact: true }); await L.wait(page, 3500)
    const loginUrl = page.url().replace(L.O, ''); await L.shot(page, 'P1-D-50-a-expired-next')
    L.state.expired = false
    const redirect = new URL(page.url()).searchParams.get('redirect')
    await page.goto(L.O + (redirect || `/workspace/brand/${id}?step=3`), { waitUntil: 'networkidle' }); await L.wait(page, 3500)
    const now = await picked(L.wiz(page), 'Joymus'); await L.shot(page, 'P1-D-50-b-after-login')
    await F.next(page)
    verdict('D-50', /login/.test(loginUrl) && on !== off && now === on, `вход истёк → «Далі» → ${loginUrl}; после входа (${redirect}): Joymus ${now === on ? 'выбран' : 'НЕ выбран'}; после «Далі» на сервере: ${JSON.stringify(L.brand(id).external_naming_ids)}`)
    await ctx.close()
  },
  'D-51': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await F.toFinal(page)
    const was = await F.sec(page, 'PR Package')
    await F.editSection(page, 'PR Package')
    const names = await L.wiz(page).evaluate(() => [...document.querySelectorAll('h3, h4')].map(x => x.textContent.trim()).filter(Boolean))
    const other = names.find(n => n !== 'Trust Focus' && !/Marketing Package/.test(n))
    await L.wiz(page).getByText(other, { exact: true }).first().click({ force: true }); await L.wait(page, 800); await L.shot(page, 'P1-D-51-a-edited')
    L.state.expired = true
    await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3500)
    const loginUrl = page.url().replace(L.O, ''); await L.shot(page, 'P1-D-51-b-expired-save')
    L.state.expired = false
    const redirect = new URL(page.url()).searchParams.get('redirect')
    await page.goto(L.O + (redirect || `/workspace/brand/${id}`), { waitUntil: 'networkidle' }); await L.wait(page, 3500)
    const now = await F.sec(page, 'PR Package'); await L.shot(page, 'P1-D-51-c-after-login')
    verdict('D-51', /login/.test(loginUrl) && now.includes(other), `«Редагувати» PR Package: ${other} вместо Trust Focus → вход истёк → «Зберегти» → ${loginUrl}; после входа Final review: ${now.slice(0, 90)} (было: ${was.slice(0, 60)})`)
    await ctx.close()
  },
}
;(async () => {
  const b = await L.launch()
  for (const [id, fn] of Object.entries(CHECKS)) {
    if (ONLY.length && !ONLY.includes(id)) continue
    L.state.expired = false
    try { await fn(b) } catch (e) { verdict(id, false, `сценарий упал: ${String(e).slice(0, 300)}`) }
  }
  await b.close()
  console.log(`\n${results.filter(r => r.verdict === 'pass').length} pass / ${results.length}`)
})()
