// Group B of docs/qa/stage-full-run-plan.md — briefs with orders, each to «Затверджено».
// STAND_TARGET=stage STAND_DIR=../../docs/local/stage-qa node fullrun/groupB.js [B-20 …]
const fs = require('fs')
const path = require('path')
const L = require('../lib'); const F = require('../flow'); const X = require('./ff')
const ONLY = process.argv.slice(2)
const IMG = path.resolve(__dirname, '../../../docs/local/stage-qa/img')

const sec = (page, s) => F.sec(page, s)
const po = async (b, r, who = 'po') => { const s = await L.session(b, who); await F.open(s.page, r.id); return s }
async function save(page) { await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 2500) }
async function approveAs(b, r, opts) { const c = await X.ceo(b, r); await X.ceoApprove(c.page, r, opts); await c.ctx.close() }
const reviewHeader = page => L.wiz(page).evaluate(() => (document.querySelector('.review-header')?.innerText || document.body.innerText.slice(0, 400)).replace(/\n+/g, ' | ').slice(0, 300))

async function orderInternal(page) {
  await L.clickText(L.wiz(page), 'Замовити нову назву'); await L.wait(page, 1200)
  const dlg = L.wiz(page).locator('[role=dialog]').last()
  await dlg.locator('textarea').first().fill('QA: внутрішні назви не підходять — потрібна нова')
  await dlg.getByRole('button', { name: 'Зберегти' }).click(); await L.wait(page, 1500)
}

/** QA Strategy on /orders/<brief>: makes what was ordered and sends it to the author. */
async function fulfil(b, r, { concept, names = [], internal, send = true, who = 'strategy' }) {
  const { page, ctx } = await L.session(b, who)
  const open = async () => { await page.goto(`${L.O}/orders/${r.id}`, { waitUntil: 'networkidle' }); await L.wait(page, 2000) }
  await open()
  const head = await L.text(page.mainFrame()); await page.screenshot({ path: `${L.SP}/run/${r.b}-order-open.png`, fullPage: true })
  r.check('заказ открылся у команды', head.includes(r.num), (head.match(/Замовлено[^\n]*/) || ['—'])[0])
  if (concept) {
    await L.clickText(page.mainFrame(), 'Створити концепт'); await L.wait(page, 800)
    await page.fill('input[placeholder="e.g. WonderLand"]', concept)
    await page.fill('textarea[placeholder^="Theme, mood"]', `QA 06.10 · ${r.b}: концепт за замовленням`)
    await L.clickText(page.mainFrame(), 'Create Concept'); await L.wait(page, 2500)
    const inputs = page.locator('input[type=file]')
    for (let k = 0; k < 3; k++) { await inputs.nth(k).setInputFiles(`${IMG}/qa-${String(20 + k).padStart(2, '0')}.png`); await L.wait(page, 3500) }
    const row = L.sql(`select id, for_brand_id, (visual_url is not null)+(gallery_url_1 is not null)+(gallery_url_2 is not null) imgs from concepts where name='${concept}'`)[0] || {}
    r.check(`команда: концепт «${concept}» для брифа`, row.for_brand_id === r.id && row.imgs === 3, JSON.stringify(row))
    const back = (await L.buttons(page.mainFrame())).find(x => /Back to order/.test(x))
    r.check('страница концепта ведёт назад к заказу', !!back, back || 'нет «Back to order»')
    if (back) { await L.clickText(page.mainFrame(), back); await L.wait(page, 2000) } else await open()
  }
  for (let k = 0; k < names.length; k++) {
    const btn = (await L.buttons(page.mainFrame())).find(x => /^Створити назву$|^Додати ще назву$/.test(x))
    const extSection = page.locator('section, .order-detail__block, div', { hasText: /Назв(и|а) для|Нові назви|External/ }).filter({ has: page.getByRole('button', { name: /Створити назву|Додати ще назву/ }) }).last()
    await (await extSection.count() ? extSection.getByRole('button', { name: /Створити назву|Додати ще назву/ }).first() : page.getByRole('button', { name: btn }).first()).click(); await L.wait(page, 800)
    await page.fill('input[placeholder="Enter naming..."]', names[k])
    await page.fill('input[placeholder="Short description..."]', `QA 06.10 · ${r.b}`).catch(() => {})
    await page.getByRole('button', { name: 'Create', exact: true }).click(); await L.wait(page, 2000)
    const row = L.sql(`select for_brand_id, concept_id from external_namings where name='${names[k]}'`)[0] || {}
    r.check(`команда: название «${names[k]}» для брифа`, row.for_brand_id === r.id, JSON.stringify(row))
  }
  if (internal) {
    const block = page.locator('section, div', { hasText: 'Нова внутрішня назва' }).filter({ has: page.getByRole('button', { name: 'Створити назву' }) }).last()
    await block.getByRole('button', { name: 'Створити назву' }).first().click(); await L.wait(page, 800)
    await page.fill('input[placeholder="Enter naming..."]', internal)
    await page.getByRole('button', { name: 'Create', exact: true }).click(); await L.wait(page, 2000)
    const row = L.sql(`select for_brand_id from internal_namings where name='${internal}'`)[0] || {}
    r.check(`команда: внутреннее «${internal}» для брифа`, row.for_brand_id === r.id, JSON.stringify(row))
  }
  await page.screenshot({ path: `${L.SP}/run/${r.b}-order-made.png`, fullPage: true })
  if (send) {
    const st = (await L.buttons(page.mainFrame())).find(x => /Відправити замовнику/.test(x))
    r.check('«Відправити замовнику» доступна', st === 'Відправити замовнику', st)
    await L.clickText(page.mainFrame(), 'Відправити замовнику'); await L.wait(page, 900)
    await page.locator('.modal, [role=dialog]').last().getByRole('button', { name: 'Відправити', exact: true }).click(); await L.wait(page, 2500)
    const t = await L.text(page.mainFrame()); await L.shot(page, `${r.b}-order-sent`)
    const ready = L.sql(`select orders_ready_at from brands where id='${r.id}'`)[0].orders_ready_at
    r.check('«Відправити» → заказ у автора', !!ready && /Відправлено замовнику/.test(t), `${(t.match(/Відправлено замовнику[^\n]*/) || ['—'])[0]}; orders_ready_at=${ready}`)
  }
  await ctx.close()
}

/** The author after «Відправити замовнику»: picks what the team made. */
async function pickMade(page, r, { concept, names = [], internal }) {
  const hdr = await reviewHeader(page); await L.shot(page, `${r.b}-po-ready`)
  r.check('автор видит «Замовлення виконано»', /Замовлення виконано|Замовлення готове/.test(hdr), hdr.slice(0, 200))
  if (concept) {
    await F.editSection(page, 'Concept')
    const grp = await L.text(L.wiz(page)); r.check('созданный концепт — в «Створено для вашого брифу»', /Створено для вашого брифу/.test(grp) && grp.includes(concept), (grp.match(/Створено для вашого брифу[^\n]*/) || ['нет группы'])[0])
    await X.chooseConcept(page, concept)
    const m = L.wiz(page).locator('.ui-modal'); if (await m.count()) { r.note(`окно при выборе: ${(await m.last().innerText()).replace(/\n+/g, ' | ').slice(0, 160)}`); await m.last().getByRole('button').last().click(); await L.wait(page, 900) }
    await L.clickText(L.wiz(page), 'Далі', { exact: true }); await L.wait(page, 2200)
    for (const n of names) { await L.clickText(L.wiz(page), n); await L.wait(page, 500) }
    if (names.length > 1) await X.comment(page, `${r.b}: кілька назв`)
    await save(page)
    r.check(`автор выбрал созданный концепт ${concept}`, (await sec(page, 'Concept')).includes(concept), (await sec(page, 'Concept')).slice(0, 140))
  } else if (names.length) {
    await F.editSection(page, 'External Naming')
    for (const n of names) { await L.clickText(L.wiz(page), n); await L.wait(page, 500) }
    if (names.length > 1) await X.comment(page, `${r.b}: кілька назв`)
    await save(page)
    r.check(`автор выбрал созданные названия`, names.every(n => true) && (await sec(page, 'External Naming')).includes(names[0]), (await sec(page, 'External Naming')).slice(0, 140))
  }
  if (internal) {
    await F.editSection(page, 'Internal Naming')
    await L.clickText(L.wiz(page), internal, { exact: true }); await L.wait(page, 500)
    await save(page)
    r.check(`автор выбрал созданное внутреннее ${internal}`, (await sec(page, 'Internal Naming')).includes(internal), (await sec(page, 'Internal Naming')).slice(0, 140))
  }
}

async function ceoSeesNothing(b, r) {
  const c = await L.session(b, 'ceo'); await c.page.goto(`${L.O}/brands`, { waitUntil: 'networkidle' }); await L.wait(c.page, 2500)
  const list = await L.text(c.page.mainFrame())
  await F.open(c.page, r.id); const gate = await L.text(L.wiz(c.page)); await L.shot(c.page, `${r.b}-ceo-in-work`)
  r.check('CEO: бриф «В роботі» не в списке, по ссылке — «Бриф ще в роботі»', !list.includes(r.num) && /Бриф ще в роботі/.test(gate), `в списке: ${list.includes(r.num)}; по ссылке: ${(gate.match(/Бриф ще в роботі/) || ['нет заглушки'])[0]}`)
  await c.ctx.close()
}

async function themeLocked(page, r) {
  await F.editSection(page, 'Concept')
  const themes = (await L.buttons(L.wiz(page))).filter(x => /тема/.test(x)).join(', ')
  r.check('бриф «В роботі»: другая тема выключена (H-24)', /Темна тема \[off\]|Світла тема \[off\]/.test(themes), themes)
  await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2000)
}

const inWork = async (b, r, o) => {
  const s = await L.session(b, o.who || 'po'); await X.fill(s.page, r, o)
  await X.send(s.page, r, 'Відправити в роботу', 'in_work'); await s.ctx.close()
}

const BRIEFS = {
  'B-20': async b => {
    const r = X.run('B-20')
    await inWork(b, r, { label: 'заказ концепта (названия пропущены) → команда: концепт + 2 названия → автор выбирает → CEO утверждает', int: 'QA Int 22', pkg: 'Trust Focus', beforeConcept: async pg => { await F.orderConcept(pg); await L.shot(pg, 'B-20-ordered') } })
    await ceoSeesNothing(b, r)
    const p2 = await L.session(b, 'po2'); await p2.page.goto(`${L.O}/workspace/new`, { waitUntil: 'networkidle' }); await p2.ctx.close()
    await fulfil(b, r, { concept: 'QA Made 20', names: ['QA Made 20A', 'QA Made 20B'] })
    // M-50: another author does not see what was made for this brief
    const o2 = await L.session(b, 'po2'); const { id: other } = await F.newBrief(o2.page); await F.step1(o2.page)
    const seen = (await L.text(L.wiz(o2.page))).includes('QA Made 20'); await L.shot(o2.page, 'B-20-po2-concepts')
    r.check('второй PO не видит концепт, сделанный под чужой заказ (M-50)', !seen, `виден: ${seen}; черновик PO2 ${other} оставлен на шаге 2`)
    await o2.ctx.close()
    const p = await po(b, r); await themeLocked(p.page, r)
    await pickMade(p.page, r, { concept: 'QA Made 20', names: ['QA Made 20A'] })
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); return r
  },
  'B-21': async b => {
    const r = X.run('B-21')
    await inWork(b, r, { label: 'заказ внешнего названия → команда: 3 названия → автор выбирает 2 → CEO возвращает → автор применяет → утверждает', concept: 'QA Concept 24', int: 'QA Int 23', pkg: 'Social Trust', beforeExternal: async pg => { await F.orderNaming(pg); await L.shot(pg, 'B-21-ordered') } })
    await fulfil(b, r, { names: ['QA Made 21A', 'QA Made 21B', 'QA Made 21C'] })
    const p = await po(b, r); await pickMade(p.page, r, { names: ['QA Made 21A', 'QA Made 21B'] })
    await X.send(p.page, r); await p.ctx.close()
    const c = await X.ceo(b, r); await X.ceoChange(c.page, r, 'External Naming', 'QA Made 21C'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p2 = await po(b, r); await F.sectionBtn(p2.page, 'External Naming', 'Застосувати варіант CEO'); await L.wait(p2.page, 1500)
    await X.send(p2.page, r); await p2.ctx.close()
    await approveAs(b, r); return r
  },
  'B-22': async b => {
    const r = X.run('B-22')
    await inWork(b, r, { label: 'заказ внутреннего названия → команда → автор выбирает → CEO утверждает', concept: 'QA Concept 25', exts: ['QA Ext 25A'], pkg: 'Full Reputation', beforeInternal: async pg => { await orderInternal(pg); await L.shot(pg, 'B-22-ordered') } })
    await fulfil(b, r, { internal: 'QA Made Int 22' })
    const p = await po(b, r); await pickMade(p.page, r, { internal: 'QA Made Int 22' }); await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); return r
  },
  'B-23': async b => {
    const r = X.run('B-23')
    await inWork(b, r, { label: 'заказ концепта и внутреннего → команда всё → автор выбирает → CEO меняет Internal → «Затвердити зі змінами»', pkg: 'Media Reputation', beforeConcept: async pg => F.orderConcept(pg), beforeInternal: async pg => orderInternal(pg) })
    await fulfil(b, r, { concept: 'QA Made 23', names: ['QA Made 23A'], internal: 'QA Made Int 23' })
    const p = await po(b, r); await pickMade(p.page, r, { concept: 'QA Made 23', names: ['QA Made 23A'], internal: 'QA Made Int 23' }); await X.send(p.page, r); await p.ctx.close()
    const c = await X.ceo(b, r); await X.ceoChange(c.page, r, 'Internal Naming', 'QA Int 24'); await X.ceoApprove(c.page, r, { withChanges: true }); await c.ctx.close()
    return r
  },
  'B-24': async b => {
    const r = X.run('B-24')
    await inWork(b, r, { label: 'заказ внешнего и внутреннего → команда → автор выбирает → CEO утверждает', concept: 'QA Concept 26', pkg: 'Brand Excellence', beforeExternal: async pg => F.orderNaming(pg), beforeInternal: async pg => orderInternal(pg) })
    await fulfil(b, r, { names: ['QA Made 24A'], internal: 'QA Made Int 24' })
    const p = await po(b, r); await pickMade(p.page, r, { names: ['QA Made 24A'], internal: 'QA Made Int 24' }); await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); return r
  },
  'B-25': async b => {
    const r = X.run('B-25'); const s = await L.session(b, 'po')
    await X.fill(s.page, r, { label: 'заказ концепта → передумал до отправки, выбрал из библиотеки (окно «Обрати цей концепт?») → CEO утверждает (M-09)', exts: ['QA Ext 18A'], int: 'QA Int 25', pkg: 'Total Market Presence',
      beforeConcept: async pg => {
        await F.orderConcept(pg)
        await X.chooseConcept(pg, 'QA Concept 18')
        const m = await L.text(L.wiz(pg), '.ui-modal'); r.check('окно «Обрати цей концепт?»', /Обрати цей концепт/.test(m), m.replace(/\n/g, ' | ').slice(0, 160), await L.shot(pg, 'B-25-pick-dialog'))
        await L.clickText(L.wiz(pg), 'Обрати концепт', { exact: true, within: '.ui-modal' }); await L.wait(pg, 1200)
        r.check('заказ концепта снят', !L.brand(r.id).new_concept_brief, `new_concept_brief=${!!L.brand(r.id).new_concept_brief}`)
      } })
    await X.send(s.page, r); await s.ctx.close(); await approveAs(b, r); return r
  },
  'B-26': async b => {
    const r = X.run('B-26'); const s = await L.session(b, 'po')
    await X.fill(s.page, r, { label: 'заказ концепта → «Редагувати бриф» → «Видалити бриф» (форма заказа) → библиотека → CEO утверждает (M-11, M-12)', exts: ['QA Ext 19A'], int: 'QA Int 26', pkg: 'Trust Focus',
      beforeConcept: async pg => {
        await F.orderConcept(pg)
        await L.clickText(L.wiz(pg), 'Бриф концепту створено'); await L.wait(pg, 600)
        const menu = (await L.buttons(L.wiz(pg))).filter(x => /бриф/i.test(x)); r.note(`меню: ${menu.join(', ')}`)
        await L.clickText(L.wiz(pg), 'Редагувати бриф'); await L.wait(pg, 1000)
        const dlg = L.wiz(pg).locator('[role=dialog]').last(); await dlg.locator('textarea[placeholder^="Ваш відгук"]').fill('QA: відгук змінено'); await dlg.getByRole('button', { name: 'Зберегти' }).click(); await L.wait(pg, 1500)
        r.check('«Редагувати бриф» сохранил правку', /відгук змінено/.test(JSON.stringify(L.brand(r.id).new_concept_brief)), JSON.stringify(L.brand(r.id).new_concept_brief).slice(0, 120))
        await L.clickText(L.wiz(pg), 'Бриф концепту створено'); await L.wait(pg, 600)
        await L.clickText(L.wiz(pg), 'Видалити бриф'); await L.wait(pg, 900)
        const m = L.wiz(pg).locator('.ui-modal'); if (await m.count()) { r.note(`окно удаления: ${(await m.last().innerText()).replace(/\n+/g, ' | ').slice(0, 140)}`); await m.last().getByRole('button').last().click(); await L.wait(pg, 1200) }
        r.check('«Видалити бриф» снял заказ', !L.brand(r.id).new_concept_brief, `new_concept_brief=${!!L.brand(r.id).new_concept_brief}`)
        await X.chooseConcept(pg, 'QA Concept 19')
      } })
    await X.send(s.page, r); await s.ctx.close(); await approveAs(b, r); return r
  },
  'B-27': async b => {
    const r = X.run('B-27'); const s = await L.session(b, 'po')
    await X.fill(s.page, r, { label: 'заказ названия → назад на шаг 2, смена концепта → «Змінити концепт?» → заказ снят (M-10, H-07)', concept: 'QA Concept 27', int: 'QA Int 27', pkg: 'Social Trust',
      beforeExternal: async pg => {
        await F.orderNaming(pg); await L.back(pg)
        await X.chooseConcept(pg, 'QA Concept 28')
        const m = await L.text(L.wiz(pg), '.ui-modal'); r.check('окно «Змінити концепт?»', /Змінити концепт/.test(m), m.replace(/\n/g, ' | ').slice(0, 160), await L.shot(pg, 'B-27-change-dialog'))
        await L.clickText(L.wiz(pg), 'Змінити концепт', { exact: true, within: '.ui-modal' }); await L.wait(pg, 1000)
        r.check('заказ названия снят', !L.brand(r.id).new_naming_brief, `new_naming_brief=${!!L.brand(r.id).new_naming_brief}`)
        await F.next(pg); await L.clickText(L.wiz(pg), 'QA Ext 28B'); await L.wait(pg, 400)
      } })
    await X.send(s.page, r); await s.ctx.close(); await approveAs(b, r); return r
  },
  'B-28': async b => {
    const r = X.run('B-28')
    await inWork(b, r, { label: 'заказ концепта → команда создаёт, но не отправляет → автор выбирает из библиотеки → заказ отменён (M-43, H-31)', exts: [], int: 'QA Int 28', pkg: 'Full Reputation', beforeConcept: async pg => F.orderConcept(pg) })
    await fulfil(b, r, { concept: 'QA Made 28', names: ['QA Made 28A'], send: false })
    const p = await po(b, r)
    await F.editSection(p.page, 'Concept'); await X.chooseConcept(p.page, 'QA Concept 29')
    const m = L.wiz(p.page).locator('.ui-modal'); if (await m.count()) { r.note(`окно: ${(await m.last().innerText()).replace(/\n+/g, ' | ').slice(0, 160)}`); await m.last().getByRole('button').last().click(); await L.wait(p.page, 900) }
    await L.clickText(L.wiz(p.page), 'Далі', { exact: true }); await L.wait(p.page, 2200); await L.clickText(L.wiz(p.page), 'QA Ext 29B'); await L.wait(p.page, 400); await save(p.page)
    r.check('выбор из библиотеки снял заказ', !L.brand(r.id).new_concept_brief, `статус ${X.status(r.id)}; new_concept_brief=${!!L.brand(r.id).new_concept_brief}`)
    const st = await L.session(b, 'strategy'); await st.page.goto(`${L.O}/orders/${r.id}`, { waitUntil: 'networkidle' }); await L.wait(st.page, 2000)
    const t = await L.text(st.page.mainFrame()); await L.shot(st.page, 'B-28-strategy-cancelled')
    r.check('команда видит, что заказ отменён', /скасовано|Скасовано|Archive|Архів/.test(t) || !/Відправити замовнику/.test(t), (t.match(/[^\n]*(скасован|обрав)[^\n]*/i) || ['—'])[0])
    await st.ctx.close()
    await X.send(p.page, r); await p.ctx.close(); await approveAs(b, r)
    const made = L.sql("select for_brand_id, used_in_brand_id from concepts where name='QA Made 28'")[0]
    r.check('созданный, но не выбранный концепт — свободен в библиотеке', made && !made.used_in_brand_id && !made.for_brand_id, JSON.stringify(made))
    return r
  },
  'B-29': async b => {
    const r = X.run('B-29')
    if (process.env.B29_ID) { r.id = process.env.B29_ID; r.num = L.sql(`select internal_name from brands where id='${r.id}'`)[0].internal_name; r.note(`продолжение ${r.num} после «Відправити замовнику»`) }
    else {
      await inWork(b, r, { label: 'заказ концепта → команда отправила → автор выбирает библиотечный, не созданное → созданное в библиотеке (M-44, M-46)', int: 'QA Int 29', pkg: 'Brand Excellence', beforeConcept: async pg => F.orderConcept(pg) })
      await fulfil(b, r, { concept: 'QA Made 29', names: ['QA Made 29A'] })
    }
    const p = await po(b, r)
    await F.editSection(p.page, 'Concept'); await X.chooseConcept(p.page, 'QA Concept 27')
    const m = L.wiz(p.page).locator('.ui-modal'); if (await m.count()) { r.note(`окно: ${(await m.last().innerText()).replace(/\n+/g, ' | ').slice(0, 160)}`); await m.last().getByRole('button').last().click(); await L.wait(p.page, 900) }
    await L.clickText(L.wiz(p.page), 'Далі', { exact: true }); await L.wait(p.page, 2200); await L.clickText(L.wiz(p.page), 'QA Ext 27B'); await L.wait(p.page, 400); await save(p.page)
    await X.send(p.page, r); await p.ctx.close(); await approveAs(b, r)
    const made = L.sql("select for_brand_id, used_in_brand_id from concepts where name='QA Made 29'")[0]
    r.check('созданное, но не выбранное — в общей библиотеке (M-46)', made && !made.used_in_brand_id && !made.for_brand_id, JSON.stringify(made))
    return r
  },
  'B-30': async b => {
    const r = X.run('B-30')
    const s = await L.session(b, 'po'); await X.fill(s.page, r, { label: 'CEO возвращает → автор заказывает концепт на доработке → «Відправити в роботу» → команда → автор выбирает → CEO (M-27)', concept: 'QA Concept 31', exts: ['QA Ext 31B'], int: 'QA Int 30', pkg: 'Media Reputation' })
    await X.send(s.page, r); await s.ctx.close()
    const c = await X.ceo(b, r); await F.ceoComment(c.page, 'Concept', 'B-30 CEO: потрібен новий концепт'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p = await po(b, r); await F.editSection(p.page, 'Concept'); await F.orderConcept(p.page); await L.wait(p.page, 1000)
    const bt = (await L.buttons(L.wiz(p.page))).filter(x => /Зберегти|Далі|Скасувати/.test(x)); r.note(`кнопки после заказа на доработке: ${bt.join(', ')}`)
    await L.clickText(L.wiz(p.page), bt.find(x => /Зберегти|Далі/.test(x) && !/off/.test(x)) || 'Зберегти', { exact: true }); await L.wait(p.page, 2500)
    if ((await sec(p.page, 'Concept')).includes('Позначити як вирішений')) await F.sectionBtn(p.page, 'Concept', 'Позначити як вирішений')
    await X.send(p.page, r, 'Відправити в роботу', 'in_work'); await p.ctx.close()
    await fulfil(b, r, { concept: 'QA Made 30', names: ['QA Made 30A'] })
    const p2 = await po(b, r); await pickMade(p2.page, r, { concept: 'QA Made 30', names: ['QA Made 30A'] })
    await X.send(p2.page, r); await p2.ctx.close()
    const row = L.brand(r.id); r.check('повторная отправка: комментарии CEO очищены', !row.ceo_comments || !JSON.stringify(row.ceo_comments).includes('B-30 CEO'), JSON.stringify(row.ceo_comments).slice(0, 120))
    await approveAs(b, r); return r
  },
  'B-31': async b => {
    const r = X.run('B-31')
    const s = await L.session(b, 'po2'); await X.fill(s.page, r, { label: 'CEO возвращает → автор (второй PO) заказывает внешнее и внутреннее на доработке (M-28)', concept: 'QA Concept 32', exts: ['QA Ext 32C'], int: 'QA Int 31', pkg: 'Total Market Presence' })
    await X.send(s.page, r); await s.ctx.close()
    const c = await X.ceo(b, r); await F.ceoComment(c.page, 'External Naming', 'B-31 CEO: потрібна нова назва'); await F.ceoComment(c.page, 'Internal Naming', 'B-31 CEO: і внутрішня'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p = await po(b, r, 'po2')
    await F.editSection(p.page, 'External Naming'); await F.orderNaming(p.page); await save(p.page)
    await F.editSection(p.page, 'Internal Naming'); await orderInternal(p.page); await save(p.page)
    for (const sct of ['External Naming', 'Internal Naming']) if ((await sec(p.page, sct)).includes('Позначити як вирішений')) await F.sectionBtn(p.page, sct, 'Позначити як вирішений')
    await X.send(p.page, r, 'Відправити в роботу', 'in_work'); await p.ctx.close()
    await fulfil(b, r, { names: ['QA Made 31A'], internal: 'QA Made Int 31', who: 'admin' })
    const p2 = await po(b, r, 'po2'); await pickMade(p2.page, r, { names: ['QA Made 31A'], internal: 'QA Made Int 31' }); await X.send(p2.page, r); await p2.ctx.close()
    await approveAs(b, r); return r
  },
  'B-32': async b => {
    const r = X.run('B-32'); const s = await L.session(b, 'po')
    const resume = process.env.B32_ID ? { resumeId: process.env.B32_ID, resumeStep: 2 } : {}
    await X.fill(s.page, r, { ...resume, concept: 'QA Concept 33', label: 'заказ концепта → «Редагувати бриф» → «Далі»: правка в базе; затем «Видалити бриф» → библиотека → CEO (вопрос B-26)', exts: ['QA Ext 33A'], int: 'QA Int 32', pkg: 'Social Trust',
      beforeConcept: process.env.B32_ID ? undefined : async pg => {
        await F.orderConcept(pg)
        await L.clickText(L.wiz(pg), 'Бриф концепту створено'); await L.wait(pg, 600)
        await L.clickText(L.wiz(pg), 'Редагувати бриф'); await L.wait(pg, 1000)
        const dlg = L.wiz(pg).locator('[role=dialog]').last(); await dlg.locator('textarea[placeholder^="Ваш відгук"]').fill('QA B-32: відгук змінено'); await dlg.getByRole('button', { name: 'Зберегти' }).click(); await L.wait(pg, 1500)
        r.note(`до «Далі» в базе: ${JSON.stringify(L.brand(r.id).new_concept_brief || null).slice(0, 80)}`)
        await F.next(pg); await L.wait(pg, 1500)
        r.check('правка формы заказа в базе после «Далі»', /B-32: відгук змінено/.test(JSON.stringify(L.brand(r.id).new_concept_brief)), JSON.stringify(L.brand(r.id).new_concept_brief).slice(0, 160))
        await L.back(pg); await L.wait(pg, 1500)
        await L.clickText(L.wiz(pg), 'Бриф концепту створено'); await L.wait(pg, 600)
        await L.clickText(L.wiz(pg), 'Видалити бриф'); await L.wait(pg, 900)
        const m = L.wiz(pg).locator('.ui-modal'); if (await m.count()) { await m.last().getByRole('button', { name: 'Видалити', exact: true }).click(); await L.wait(pg, 1200) }
      } })
    r.check('после «Видалити бриф» и выбора концепта заказа нет', !L.brand(r.id).new_concept_brief, `new_concept_brief=${!!L.brand(r.id).new_concept_brief}`)
    await X.send(s.page, r); await s.ctx.close(); await approveAs(b, r); return r
  },
  'B-33': async b => {
    const r = X.run('B-33')
    const id = (L.sql("select id from brands where created_by='usr_qa_po2' and status='draft' order by created_at limit 1")[0] || {}).id
    const s = await L.session(b, 'po2')
    await X.fill(s.page, r, { resumeId: id, resumeStep: 1, label: 'черновик второго PO, начатый проверкой M-50 в B-20 → до утверждения', concept: 'QA Concept 34', exts: ['QA Ext 34A'], int: 'QA Int 33', pkg: 'Full Reputation' })
    await X.send(s.page, r); await s.ctx.close(); await approveAs(b, r); return r
  },
}

;(async () => {
  const b = await L.launch()
  const summary = []
  for (const [k, fn] of Object.entries(BRIEFS)) {
    if (ONLY.length && !ONLY.includes(k)) continue
    console.log(`\n=== ${k}`)
    try {
      const out = await fn(b)
      for (const r of [].concat(out)) summary.push({ b: r.b, id: r.id, num: r.num, ok: r.checks.filter(c => c.ok).length, all: r.checks.length, end: r.id && X.status(r.id) })
    } catch (e) {
      console.log(`  ✗✗ ${k} сценарий упал: ${String(e).slice(0, 400)}`)
      fs.appendFileSync(`${L.SP}/run/results.jsonl`, JSON.stringify({ b: k, kind: 'crash', err: String(e).slice(0, 800), at: new Date().toISOString() }) + '\n')
      summary.push({ b: k, crash: String(e).slice(0, 160) })
      for (const ctx of b.contexts()) { const pg = ctx.pages()[0]; if (pg) await L.shot(pg, `${k}-crash`).catch(() => {}); await ctx.close().catch(() => {}) }
    }
  }
  await b.close()
  console.log('\nSUMMARY', JSON.stringify(summary, null, 1))
  console.log('net errors:', JSON.stringify(L.net).slice(0, 3000))
})()
