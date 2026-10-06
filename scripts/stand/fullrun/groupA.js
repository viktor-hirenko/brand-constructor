// Group A of docs/qa/stage-full-run-plan.md — briefs without orders, each to «Затверджено».
// STAND_TARGET=stage STAND_DIR=../../docs/local/stage-qa node fullrun/groupA.js [B-02 …]
const fs = require('fs')
const L = require('../lib'); const F = require('../flow'); const X = require('./ff')
const ONLY = process.argv.slice(2)
// RESUME='{"B-04":{"id":"brand_…","step":2},"B-05":{"id":"brand_…","sent":true}}' — continue a brief a crash left.
const RESUME = JSON.parse(process.env.RESUME || '{}')
const resumeOf = r => RESUME[r.b] || {}
const withResume = (r, o) => { const x = resumeOf(r); if (x.id && !x.sent) { o.resumeId = x.id; o.resumeStep = x.step || 1 } return o }

const po = async (b, r, who = 'po') => { const s = await L.session(b, who); await F.open(s.page, r.id); return s }
const sec = (page, s) => F.sec(page, s)
async function resolve(page, r, section) {
  await F.sectionBtn(page, section, 'Позначити як вирішений'); await L.wait(page, 1200)
  const t = await sec(page, section)
  return r.check(`автор «Позначити як вирішений» ${section}`, /Вирішено|Повернути$/.test(t.trim()) && !/Позначити як вирішений/.test(t), t.slice(0, 160))
}
async function apply(page, r, section) {
  await F.sectionBtn(page, section, 'Застосувати варіант CEO'); await L.wait(page, 1500)
  const t = await sec(page, section)
  return r.check(`автор «Застосувати варіант CEO» ${section}`, !/Застосувати варіант CEO/.test(t), t.slice(0, 160), await L.shot(page, `${r.b}-apply-${section.replace(/\s/g, '')}`))
}
async function save(page) { await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 2500) }
async function editConcept(page, r, concept, names) {
  await F.editSection(page, 'Concept')
  await X.chooseConcept(page, concept)
  await L.clickText(L.wiz(page), 'Далі', { exact: true }); await L.wait(page, 2200)
  for (const n of names) { await L.clickText(L.wiz(page), n); await L.wait(page, 400) }
  if (names.length > 1) await X.comment(page, `${r.b}: кілька назв після зміни концепту`)
  await save(page)
  const t = await sec(page, 'Concept')
  return r.check(`«Редагувати» Concept → ${concept}`, t.includes(concept), t.slice(0, 160), await L.shot(page, `${r.b}-edit-concept`))
}
async function editPick(page, r, section, pick, exact = false) {
  await F.editSection(page, section)
  await L.clickText(L.wiz(page), pick, { exact }); await L.wait(page, 500)
  // the author's own pick is already ticked — a click unticks it; tick it back
  if (((await L.buttons(L.wiz(page))).find(x => /^Зберегти/.test(x)) || '').endsWith('[off]') && !(await L.text(L.wiz(page))).match(/обовʼязковий|обов'язковий/)) { await L.clickText(L.wiz(page), pick, { exact }); await L.wait(page, 500) }
  if (section === 'External Naming') {
    const nx = (await L.buttons(L.wiz(page))).find(x => /^Зберегти/.test(x))
    if (nx && nx.endsWith('[off]')) await X.comment(page, `${r.b}: коментар до назв`)
  }
  await save(page)
  const t = await sec(page, section)
  return r.check(`«Редагувати» ${section} → ${pick}`, t.includes(pick), t.slice(0, 160))
}
async function revisionScreen(page, r) {
  const t = await L.text(L.wiz(page))
  await L.shot(page, `${r.b}-revision`)
  r.check('автор видит Brief Revision', /Brief Revision/.test(t) && /потребу/.test(t), (t.match(/\d+ секці[^\n]*/) || ['—'])[0])
  return t
}
async function approveAs(b, r, opts) { const c = await X.ceo(b, r); await X.ceoApprove(c.page, r, opts); await c.ctx.close() }
async function submitted(b, r, o, who = 'po') {
  const x = resumeOf(r)
  if (x.sent) { r.id = x.id; r.num = L.sql(`select internal_name from brands where id='${x.id}'`)[0].internal_name; r.note(`продолжение ${r.num} после отправки`); return }
  const s = await L.session(b, who); await X.fill(s.page, r, withResume(r, o)); await X.send(s.page, r); await s.ctx.close()
}
function used(r, { concept, exts = [], int }) {
  const q = L.sql(`select (select used_in_brand_id from concepts where name='${concept}') c, (select group_concat(used_in_brand_id) from external_namings where name in (${exts.map(e => `'${e}'`).join(',') || "''"})) e, (select used_in_brand_id from internal_namings where name='${int}') i`)[0]
  return r.check('утверждённое занято брифом', q.c === r.id && (!exts.length || q.e.split(',').every(x => x === r.id)) && q.i === r.id, JSON.stringify(q))
}

const BRIEFS = {
  'B-01': async b => {
    const r = X.run('B-01'); const o = { label: 'минимум: библиотека, 1 название, «Довірити», CEO утверждает как есть', concept: 'QA Concept 01', exts: ['QA Ext 01A'], int: 'QA Int 35', pkg: 'Trust Focus' }
    await submitted(b, r, o); await approveAs(b, r); used(r, { concept: o.concept, exts: o.exts, int: o.int }); return r
  },
  'B-02': async b => {
    const r = X.run('B-02'); const o = { resumeId: process.env.B02_ID, resumeStep: Number(process.env.B02_STEP || 1), label: 'максимум: 3 GEO, связь с продуктом, 3 названия, все 5 компонентов, комментарии на каждом шаге, тёмная тема, Legal+Partner → CEO утверждает', geos: ['UK', 'DE', 'PT'], conn: 'Thor', theme: 'dark', concept: 'QA Concept 02', exts: ['QA Ext 02A', 'QA Ext 02B', 'QA Ext 02C'], int: 'QA Int 01', pkg: 'Social Trust', legal: true, partner: true, step7: 'all', types: 'ABCDA', comments: true }
    await submitted(b, r, o)
    const row = L.brand(r.id)
    r.check('в базе всё, что выбрано', row.mode === 'dark' && row.external_naming_ids.length === 3 && /DE/.test(row.geo) && Object.keys(row.component_selections || {}).length >= 5, `mode=${row.mode} ext=${row.external_naming_ids.length} geo=${row.geo} comps=${JSON.stringify(row.component_selections).slice(0, 120)}`)
    await approveAs(b, r); used(r, { concept: o.concept, exts: o.exts, int: o.int }); return r
  },
  'B-03': async b => {
    const r = X.run('B-03'); const o = { label: 'Final review: «Редагувати» каждого раздела; Concept → другой концепт и названия; «Скасувати» с темой (A-39)', concept: 'QA Concept 03', exts: ['QA Ext 03A'], int: 'QA Int 02', pkg: 'Full Reputation', step7: 'delegate' }
    const { page, ctx } = await L.session(b, 'po'); await X.fill(page, r, withResume(r, o))
    const skip = resumeOf(r).skip || []
    if (!skip.includes('a39')) {
    // A-39: theme on «Скасувати»
    await F.editSection(page, 'Concept'); await L.clickText(L.wiz(page), 'Темна тема', { exact: true }); await L.wait(page, 1000)
    await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2200)
    r.check('«Скасувати» в Concept возвращает тему (A-39)', /Light/.test(await sec(page, 'Concept')) && L.brand(r.id).mode === 'light', `${(await sec(page, 'Concept')).slice(0, 100)}; mode=${L.brand(r.id).mode}`)
    // Brand Basics: one more GEO
    await F.editSection(page, 'Brand Basics')
    const geo = L.wiz(page).locator('input[placeholder^="Наприклад"], input[placeholder^="Пошук"]').first(); await geo.click(); await geo.fill('PL'); await L.wait(page, 700); await L.clickText(L.wiz(page), 'Poland'); await L.wait(page, 300)
    await L.wiz(page).locator('body').click({ position: { x: 5, y: 300 } }); await save(page)
    r.check('«Редагувати» Brand Basics → +PL', /PL/.test(await sec(page, 'Brand Basics')), (await sec(page, 'Brand Basics')).slice(0, 120))
    }
    await editConcept(page, r, 'QA Concept 21', ['QA Ext 21A', 'QA Ext 21B'])
    await editPick(page, r, 'External Naming', 'QA Ext 21C')
    await editPick(page, r, 'Internal Naming', 'QA Int 03', true)
    await F.editSection(page, 'PR Package'); await L.wiz(page).getByText('Media Reputation', { exact: true }).first().click({ force: true }); await L.wait(page, 600); await save(page)
    r.check('«Редагувати» PR Package → Media Reputation', /Media Reputation/.test(await sec(page, 'PR Package')), (await sec(page, 'PR Package')).slice(0, 120))
    await F.editSection(page, 'Deliverables'); await L.wiz(page).locator('button[aria-label="Legal Landing"]').click(); await L.wait(page, 400); await X.pickDate(page, 22); await save(page)
    r.check('«Редагувати» Deliverables → Legal', /Legal/.test(await sec(page, 'Deliverables')), (await sec(page, 'Deliverables')).slice(0, 120))
    await F.editSection(page, 'Visual Components'); await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2000)
    r.check('«Редагувати» Visual → «Скасувати» — без изменений', /Final review/.test(await L.text(L.wiz(page))), L.wiz(page).url().replace(/^.*wizard/, ''))
    const row = L.brand(r.id)
    r.check('в базе — правки Final review', /PL/.test(row.geo) && row.external_naming_ids.length === 3 && row.legal_landing !== 0, `geo=${row.geo} ext=${row.external_naming_ids.length} pkg=${row.pr_package_id} legal=${row.legal_landing}`)
    await X.send(page, r); await ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 21', exts: ['QA Ext 21A', 'QA Ext 21B', 'QA Ext 21C'], int: 'QA Int 03' }); return r
  },
  'B-04': async b => {
    const r = X.run('B-04'); await submitted(b, r, { label: 'CEO: комментарий у Concept → «Повернути»; автор: «Редагувати» Concept — свой другой концепт → «Позначити як вирішений»', concept: 'QA Concept 04', exts: ['QA Ext 04A'], int: 'QA Int 04', pkg: 'Media Reputation', partner: true })
    const c = await X.ceo(b, r); await F.ceoComment(c.page, 'Concept', 'B-04 CEO: концепт не підходить, оберіть інший'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p = await po(b, r); await revisionScreen(p.page, r)
    await editConcept(p.page, r, 'QA Concept 22', ['QA Ext 22A'])
    if ((await sec(p.page, 'Concept')).includes('Позначити як вирішений')) await resolve(p.page, r, 'Concept')
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 22', exts: ['QA Ext 22A'], int: 'QA Int 04' }); return r
  },
  'B-05': async b => {
    const r = X.run('B-05'); await submitted(b, r, { label: 'CEO меняет Concept+External+Internal → «Повернути»; автор «Застосувати варіант CEO» во всех', concept: 'QA Concept 05', exts: ['QA Ext 05A'], int: 'QA Int 05', pkg: 'Brand Excellence' })
    const c = await X.ceo(b, r)
    if (!(resumeOf(r).skip || []).includes('changes')) {
      await X.ceoChange(c.page, r, 'Concept', 'QA Concept 20', ['QA Ext 20A'])
      await X.ceoChange(c.page, r, 'Internal Naming', 'QA Int 06')
    } else { await F.ceoComment(c.page, 'External Naming', 'B-05 CEO: назви під новий концепт'); await F.ceoComment(c.page, 'Internal Naming', 'B-05 CEO: краще QA Int 06') }
    await F.ceoComment(c.page, 'Concept', 'B-05 CEO: краще QA Concept 20'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p = await po(b, r); await revisionScreen(p.page, r)
    await apply(p.page, r, 'Concept')
    if ((await sec(p.page, 'External Naming')).includes('Застосувати варіант CEO')) await apply(p.page, r, 'External Naming')
    await apply(p.page, r, 'Internal Naming')
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 20', exts: ['QA Ext 20A'], int: 'QA Int 06' }); return r
  },
  'B-06': async b => {
    const r = X.run('B-06'); await submitted(b, r, { label: 'CEO меняет External и Internal → «Повернути»; автор оставляет свои; отметка держится в другом браузере (D-33)', concept: 'QA Concept 06', exts: ['QA Ext 06A'], int: 'QA Int 07', pkg: 'Total Market Presence', legal: true, partner: true })
    if (!(resumeOf(r).skip || []).includes('ceo')) {
      const c = await X.ceo(b, r)
      if (!(resumeOf(r).skip || []).includes('changes')) { await X.ceoChange(c.page, r, 'External Naming', 'QA Ext 06B'); await X.ceoChange(c.page, r, 'Internal Naming', 'QA Int 08') }
      else await F.ceoComment(c.page, 'Internal Naming', 'B-06 CEO: може, QA Int 08?')
      await F.ceoComment(c.page, 'External Naming', 'B-06 CEO: може, QA Ext 06B?'); await X.ceoReturn(c.page, r); await c.ctx.close()
    }
    const p = await po(b, r); await revisionScreen(p.page, r)
    await editPick(p.page, r, 'External Naming', 'QA Ext 06A'); await editPick(p.page, r, 'Internal Naming', 'QA Int 07', true)
    for (const s of ['External Naming', 'Internal Naming']) if ((await sec(p.page, s)).includes('Позначити як вирішений')) await resolve(p.page, r, s)
    const here = await F.submitState(p.page); await p.ctx.close()
    const p2 = await po(b, r); const there = await F.submitState(p2.page); await L.shot(p2.page, 'B-06-other-browser')
    r.check('«свій варіант» держится в другом браузере (D-33)', here.endsWith('[on]') && there.endsWith('[on]'), `здесь ${here}; другой браузер ${there}`)
    await X.send(p2.page, r); await p2.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 06', exts: ['QA Ext 06A'], int: 'QA Int 07' }); return r
  },
  'B-07': async b => {
    const r = X.run('B-07'); await submitted(b, r, { label: 'CEO меняет Concept → «Затвердити» → окно «зі змінами»: Esc и крестик не возвращают бриф (C-29) → «Затвердити зі змінами»', concept: 'QA Concept 07', exts: ['QA Ext 07A'], int: 'QA Int 09', pkg: 'Trust Focus' })
    const c = await X.ceo(b, r); await X.ceoChange(c.page, r, 'Concept', 'QA Concept 23', ['QA Ext 23A'], { noComment: true })
    await L.clickText(L.wiz(c.page), 'Затвердити', { exact: true }); await L.wait(c.page, 1200)
    await c.page.keyboard.press('Escape'); await L.wait(c.page, 2000)
    r.check('Esc в окне «зі змінами» — бриф остаётся у CEO (C-29)', X.status(r.id) === 'submitted', `статус ${X.status(r.id)}`)
    await L.clickText(L.wiz(c.page), 'Затвердити', { exact: true }); await L.wait(c.page, 1200)
    await L.wiz(c.page).locator('.ui-modal').last().getByRole('button').first().click(); await L.wait(c.page, 2000)
    r.check('крестик окна «зі змінами» — бриф остаётся (C-29)', X.status(r.id) === 'submitted', `статус ${X.status(r.id)}`)
    await X.ceoApprove(c.page, r, { withChanges: true }); await c.ctx.close()
    used(r, { concept: 'QA Concept 23', exts: ['QA Ext 23A'], int: 'QA Int 09' }); return r
  },
  'B-08': async b => {
    const r = X.run('B-08'); await submitted(b, r, { label: 'CEO меняет только Internal → «Повернути»; автор применяет', concept: 'QA Concept 08', exts: ['QA Ext 08A', 'QA Ext 08B'], int: 'QA Int 10', pkg: 'Social Trust', theme: 'dark' })
    const c = await X.ceo(b, r); await X.ceoChange(c.page, r, 'Internal Naming', 'QA Int 11'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p = await po(b, r); await revisionScreen(p.page, r); await apply(p.page, r, 'Internal Naming')
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 08', exts: ['QA Ext 08A', 'QA Ext 08B'], int: 'QA Int 11' }); return r
  },
  'B-09': async b => {
    const r = X.run('B-09'); await submitted(b, r, { label: 'CEO «Повернути» без комментария → подсказка; общий комментарий → «Повернути»; автор «Вирішено» → «Повернути» → «Вирішено»', concept: 'QA Concept 09', exts: ['QA Ext 09A'], int: 'QA Int 12', pkg: 'Full Reputation' })
    const c = await X.ceo(b, r)
    await L.clickText(L.wiz(c.page), 'Повернути на доопрацювання'); await L.wait(c.page, 1500)
    const warn = await L.text(L.wiz(c.page)); await L.shot(c.page, 'B-09-no-comment')
    r.check('«Повернути» без комментария — подсказка, бриф у CEO (M-30)', /Додайте хоча б один коментар/.test(warn) && X.status(r.id) === 'submitted', `${(warn.match(/Додайте[^\n]*/) || ['нет подсказки'])[0]}; статус ${X.status(r.id)}`)
    await X.generalComment(c.page, 'B-09 CEO: загальний коментар — уточніть бриф'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p = await po(b, r); const t = await revisionScreen(p.page, r)
    r.check('автор видит «Загальний коментар CEO»', /B-09 CEO: загальний коментар/.test(t), (t.match(/Загальний коментар[^\n]*\n?[^\n]*/) || ['—'])[0])
    const general = await p.page.evaluate(() => 1)
    const btn = (await L.buttons(L.wiz(p.page))).filter(x => /Позначити як вирішений|Вирішено/.test(x))
    r.note(`кнопки решения: ${btn.join(', ')}`)
    if (btn.length) {
      await L.clickText(L.wiz(p.page), 'Позначити як вирішений'); await L.wait(p.page, 1200)
      const s1 = await F.submitState(p.page)
      await L.clickText(L.wiz(p.page), 'Вирішено'); await L.wait(p.page, 1200)
      const s2 = await F.submitState(p.page)
      await L.clickText(L.wiz(p.page), 'Позначити як вирішений'); await L.wait(p.page, 1200)
      const s3 = await F.submitState(p.page)
      r.check('«Вирішено» → «Повернути» → «Вирішено» меняет кнопку отправки', s1.endsWith('[on]') && s2.endsWith('[off]') && s3.endsWith('[on]'), `${s1} → ${s2} → ${s3}`)
    }
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 09', exts: ['QA Ext 09A'], int: 'QA Int 12' }); return r
  },
  'B-10': async b => {
    const r = X.run('B-10'); await submitted(b, r, { label: 'два круга доработки: комментарии у двух разделов, затем только общий комментарий', concept: 'QA Concept 10', exts: ['QA Ext 10A'], int: 'QA Int 13', pkg: 'Brand Excellence', geos: ['UK', 'CA'] })
    let c = await X.ceo(b, r)
    await F.ceoComment(c.page, 'Brand Basics', 'B-10 CEO круг 1: дата?'); await F.ceoComment(c.page, 'PR Package', 'B-10 CEO круг 1: пакет?')
    await X.ceoReturn(c.page, r); await c.ctx.close()
    let p = await po(b, r); await revisionScreen(p.page, r)
    await resolve(p.page, r, 'Brand Basics'); await resolve(p.page, r, 'PR Package')
    await X.send(p.page, r); await p.ctx.close()
    const row = L.brand(r.id)
    r.check('после повторной отправки комментарии CEO очищены, счётчик отправок 2', !row.ceo_comments || Object.keys(row.ceo_comments).length === 0 || row.submit_count >= 2, `submit_count=${row.submit_count} ceo_comments=${JSON.stringify(row.ceo_comments).slice(0, 100)}`)
    c = await X.ceo(b, r)
    const t = await L.text(L.wiz(c.page)); r.check('CEO видит повторную отправку чистой', !/круг 1/.test(t), (t.match(/круг 1[^\n]*/) || ['старых комментариев нет'])[0])
    await X.generalComment(c.page, 'B-10 CEO круг 2: останнє уточнення'); await X.ceoReturn(c.page, r); await c.ctx.close()
    p = await po(b, r); await revisionScreen(p.page, r)
    const res = (await L.buttons(L.wiz(p.page))).filter(x => /Позначити як вирішений/.test(x))
    if (res.length) { await L.clickText(L.wiz(p.page), 'Позначити як вирішений'); await L.wait(p.page, 1000) }
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 10', exts: ['QA Ext 10A'], int: 'QA Int 13' }); return r
  },
  'B-11': async b => {
    const r = X.run('B-11'); await submitted(b, r, { label: 'разное по разделам: External — вариант CEO, Internal — свой, Brand Basics — правка своего', concept: 'QA Concept 11', exts: ['QA Ext 11A'], int: 'QA Int 14', pkg: 'Total Market Presence' })
    const c = await X.ceo(b, r)
    await X.ceoChange(c.page, r, 'External Naming', 'QA Ext 11B'); await X.ceoChange(c.page, r, 'Internal Naming', 'QA Int 15')
    await F.ceoComment(c.page, 'Brand Basics', 'B-11 CEO: додайте Canada'); await X.ceoReturn(c.page, r); await c.ctx.close()
    const p = await po(b, r); await revisionScreen(p.page, r)
    await apply(p.page, r, 'External Naming')
    await editPick(p.page, r, 'Internal Naming', 'QA Int 14', true)
    if ((await sec(p.page, 'Internal Naming')).includes('Позначити як вирішений')) await resolve(p.page, r, 'Internal Naming')
    await F.editSection(p.page, 'Brand Basics')
    const geo = L.wiz(p.page).locator('input[placeholder^="Наприклад"], input[placeholder^="Пошук"]').first(); await geo.click(); await geo.fill('CA'); await L.wait(p.page, 700); await L.clickText(L.wiz(p.page), 'Canada'); await L.wait(p.page, 300)
    await L.wiz(p.page).locator('body').click({ position: { x: 5, y: 300 } }); await save(p.page)
    if ((await sec(p.page, 'Brand Basics')).includes('Позначити як вирішений')) await resolve(p.page, r, 'Brand Basics')
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 11', exts: ['QA Ext 11B'], int: 'QA Int 14' }); return r
  },
  'B-12': async b => {
    const r = X.run('B-12'); const { page, ctx } = await L.session(b, 'po')
    const o = withResume(r, { label: 'сохранность: F5 на шагах, «назад» браузера, крестик → «Вийти з брифу?», продолжение из «Список чернеток»', concept: 'QA Concept 12', exts: ['QA Ext 12A'], int: 'QA Int 16', pkg: 'Trust Focus', partner: true,
      beforeExternal: async pg => { await pg.reload({ waitUntil: 'networkidle' }); await L.wait(pg, 3500); const c = L.brand(r.id).concept_id; const names = await L.text(L.wiz(pg)); r.check('F5 на шаге 3 — концепт выбран, названия концепта на экране', !!c && /QA Ext 12A/.test(names), `concept_id=${c}; на экране ${(names.match(/QA Ext 12./g) || []).join(', ')}`) },
      beforeInternal: async pg => {
        await L.back(pg); await L.wait(pg, 1500)
        const t3 = await L.text(L.wiz(pg)); r.check('«назад» браузера с шага 4 → шаг 3, название на месте', X.urlStep(pg) === 3, `шаг ${X.urlStep(pg)}`)
        await L.wiz(pg).getByRole('button', { name: 'Далі', exact: true }).click(); await L.wait(pg, 2200)
        await L.clickText(L.wiz(pg), 'Закрити'); await L.wait(pg, 1000)
        const dlg = await L.text(L.wiz(pg), '.ui-modal'); r.check('крестик → «Вийти з брифу?»', /Вийти з брифу/.test(dlg), dlg.replace(/\n/g, ' | ').slice(0, 120), await L.shot(pg, 'B-12-exit-dialog'))
        await L.clickText(L.wiz(pg), 'Залишитись', { exact: true }); await L.wait(pg, 800)
        r.check('«Залишитись» — остаёмся на шаге 4', X.urlStep(pg) === 4, `шаг ${X.urlStep(pg)}`)
      } })
    if ((resumeOf(r).skip || []).includes('hooks')) { delete o.beforeExternal; delete o.beforeInternal }
    await X.fill(page, r, o); await ctx.close()
    // a new tab: «Список чернеток» → the brief → Final review
    const s = await L.session(b, 'po'); await s.page.goto(L.O + '/workspace/new', { waitUntil: 'networkidle' }); await L.wait(s.page, 2500)
    await L.clickText(L.wiz(s.page), 'Список чернеток'); await L.wait(s.page, 2500)
    const list = await L.text(L.wiz(s.page)); r.check('черновик в «Список чернеток»', list.includes(r.num), list.match(new RegExp(`${r.num}[^\\n]*`))?.[0] || 'нет в списке', await L.shot(s.page, 'B-12-drafts'))
    await L.clickText(L.wiz(s.page), r.num); await L.wait(s.page, 3500)
    r.check('черновик открылся с выбором на месте', /QA Concept 12/.test(await L.text(L.wiz(s.page))), L.wiz(s.page).url().replace(/^.*wizard/, ''))
    await F.open(s.page, r.id); await X.send(s.page, r); await s.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 12', exts: ['QA Ext 12A'], int: 'QA Int 16' }); return r
  },
  'B-13': async b => {
    const r = X.run('B-13')
    const a = await L.session(b, 'po'); await X.fill(a.page, r, { label: 'две вкладки черновика (D-60); две вкладки CEO пишут в разные разделы (H-30)', concept: 'QA Concept 13', exts: ['QA Ext 13A'], int: 'QA Int 17', pkg: 'Media Reputation' })
    const t2 = await L.session(b, 'po'); await t2.page.goto(`${L.O}/workspace/brand/${r.id}?step=5`, { waitUntil: 'networkidle' }); await L.wait(t2.page, 3500)
    await a.page.goto(`${L.O}/workspace/brand/${r.id}?step=5`, { waitUntil: 'networkidle' }); await L.wait(a.page, 3500)
    await L.wiz(a.page).getByText('Social Trust', { exact: true }).first().click({ force: true }); await L.wait(a.page, 600); await F.next(a.page)
    await L.wiz(t2.page).getByText('Brand Excellence', { exact: true }).first().click({ force: true }); await L.wait(t2.page, 600)
    await L.clickText(L.wiz(t2.page), 'Далі', { exact: true }); await L.wait(t2.page, 2500)
    const err = await L.text(L.wiz(t2.page)); await L.shot(t2.page, 'B-13-second-tab')
    r.check('вторая вкладка — «Бриф змінено — оновіть сторінку.» (D-60)', /Бриф змінено/.test(err), (err.match(/Бриф змінено[^\n]*/) || ['нет'])[0])
    const pkg = (L.sql(`select p.name from brands b left join pr_packages p on p.id=b.pr_package_id where b.id='${r.id}'`)[0] || {}).name
    r.check('выбор первой вкладки цел', pkg === 'Social Trust', `пакет в базе: ${pkg}`)
    await t2.ctx.close()
    await F.open(a.page, r.id); await X.send(a.page, r); await a.ctx.close()
    const c1 = await X.ceo(b, r); const c2 = await X.ceo(b, r)
    await F.ceoComment(c1.page, 'Concept', 'B-13 CEO вкладка 1'); await L.wait(c1.page, 1500)
    await F.ceoComment(c2.page, 'Internal Naming', 'B-13 CEO вкладка 2'); await L.wait(c2.page, 1500)
    await c2.ctx.close(); await X.ceoReturn(c1.page, r); await c1.ctx.close()
    const cc = L.brand(r.id).ceo_comments || {}
    r.check('оба комментария двух вкладок CEO на брифе (H-30)', /вкладка 1/.test(JSON.stringify(cc)) && /вкладка 2/.test(JSON.stringify(cc)), JSON.stringify(cc).slice(0, 200))
    const p = await po(b, r); await revisionScreen(p.page, r)
    for (const s of ['Concept', 'Internal Naming']) await resolve(p.page, r, s)
    await X.send(p.page, r); await p.ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 13', exts: ['QA Ext 13A'], int: 'QA Int 17' }); return r
  },
  'B-14': async b => {
    const r = X.run('B-14'); await submitted(b, r, { label: 'шаг 7: все 5 компонентов → «Довірити» (окно: «Скасувати», затем «Довірити»); шаг 6 — только Legal', concept: 'QA Concept 14', exts: ['QA Ext 14A'], int: 'QA Int 18', pkg: 'Full Reputation', legal: true, step7: 'all-then-delegate', types: 'DCBAD' })
    const row = L.brand(r.id)
    r.check('в базе — «Довірити», компоненты сброшены', !row.component_selections || Object.keys(row.component_selections).length === 0 || row.delegate_components, `components=${JSON.stringify(row.component_selections).slice(0, 120)}`)
    await approveAs(b, r); used(r, { concept: 'QA Concept 14', exts: ['QA Ext 14A'], int: 'QA Int 18' }); return r
  },
  'B-15': async b => {
    const r = X.run('B-15'); const { page, ctx } = await L.session(b, 'po')
    const o15 = withResume(r, { label: 'обрыв связи при сохранении шага (D-30) → строка ошибки → связь вернулась → «Далі»', concept: 'QA Concept 15', exts: ['QA Ext 15A'], int: 'QA Int 19', pkg: 'Brand Excellence', theme: 'dark',
      beforeInternal: async pg => {
        await L.clickText(L.wiz(pg), 'QA Int 19', { exact: true }); await L.wait(pg, 400)
        L.state.offline = true
        await L.clickText(L.wiz(pg), 'Далі', { exact: true }); await L.wait(pg, 2500)
        const t = await L.text(L.wiz(pg)); await L.shot(pg, 'B-15-offline')
        r.check('нет связи — красная строка под кнопками, остаёмся на шаге 4 (D-30)', X.urlStep(pg) === 4 && /звʼязк|з'єднан|мереж|Не вдалося/i.test(t), `шаг ${X.urlStep(pg)}; ${(t.match(/[^\n]*(звʼязк|з'єднан|мереж|Не вдалося)[^\n]*/i) || ['нет строки'])[0]}`)
        L.state.offline = false
        await L.clickText(L.wiz(pg), 'QA Int 19', { exact: true }); await L.wait(pg, 400) // fill ticks it again
      } })
    if ((resumeOf(r).skip || []).includes('hooks')) delete o15.beforeInternal
    await X.fill(page, r, o15)
    await X.send(page, r); await ctx.close()
    await approveAs(b, r); used(r, { concept: 'QA Concept 15', exts: ['QA Ext 15A'], int: 'QA Int 19' }); return r
  },
  'B-16': async b => {
    const r16 = X.run('B-16'); const r17 = X.run('B-17')
    await submitted(b, r16, { label: 'то же внешнее название, что у B-17; B-16 утверждается первым (M-51)', concept: 'QA Concept 16', exts: ['QA Ext 16A'], int: 'QA Int 20', pkg: 'Social Trust' })
    const s = await L.session(b, 'po2'); await X.fill(s.page, r17, { label: 'то же внешнее название, что у B-16, от второго PO; после утверждения B-16 — смена (M-51, H-09)', concept: 'QA Concept 16', exts: ['QA Ext 16A'], int: 'QA Int 21', pkg: 'Trust Focus' })
    await X.send(s.page, r17); await s.ctx.close()
    await approveAs(b, r16); used(r16, { concept: 'QA Concept 16', exts: ['QA Ext 16A'], int: 'QA Int 20' })
    const c = await X.ceo(b, r17); const t = await L.text(L.wiz(c.page)); await L.shot(c.page, 'B-17-ceo-taken')
    r17.note(`CEO на B-17 после утверждения B-16: ${(t.match(/[^\n]*(зайнят|використ|обрано в|недоступ)[^\n]*/i) || ['отметки о занятом нет'])[0]}`)
    await L.clickText(L.wiz(c.page), 'Затвердити', { exact: true }); await L.wait(c.page, 1300)
    const m = L.wiz(c.page).locator('.ui-modal').last(); if (await m.count()) { await m.getByRole('button', { name: 'Затвердити', exact: true }).click().catch(() => {}); await L.wait(c.page, 3000) }
    const err = await L.text(L.wiz(c.page)); await L.shot(c.page, 'B-17-ceo-approve-taken')
    r17.check('CEO не может утвердить бриф с занятым концептом (H-09)', X.status(r17.id) === 'submitted', `статус ${X.status(r17.id)}; ${(err.match(/[^\n]*(зайнят|вже|використ)[^\n]*/i) || ['—'])[0]}`)
    await F.ceoComment(c.page, 'Concept', 'B-17 CEO: концепт уже зайнятий, оберіть інший'); await X.ceoReturn(c.page, r17); await c.ctx.close()
    const p = await po(b, r17, 'po2'); await revisionScreen(p.page, r17)
    await editConcept(p.page, r17, 'QA Concept 17', ['QA Ext 17A'])
    if ((await sec(p.page, 'Concept')).includes('Позначити як вирішений')) await resolve(p.page, r17, 'Concept')
    await X.send(p.page, r17); await p.ctx.close()
    await approveAs(b, r17); used(r17, { concept: 'QA Concept 17', exts: ['QA Ext 17A'], int: 'QA Int 21' })
    return [r16, r17]
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
  console.log('net errors:', JSON.stringify(L.net.filter(n => !(n.kind === 'http' && /Бриф неповний/.test(n.res)))).slice(0, 3000))
})()
