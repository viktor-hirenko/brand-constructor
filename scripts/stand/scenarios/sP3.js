// Portion 3 of docs/architecture/wizard-fixes-plan.md — the screen does not lie.
// node scenarios/sP3.js [D-07 D-13 …]   (no args = all). Run with STAND_FRONT for a local build.
const fs = require('fs')
const L = require('../lib'); const F = require('../flow')
const ONLY = process.argv.slice(2)
const OUT = `${L.SP}/run/p3-results.jsonl`
const results = []
function verdict(id, ok, note) { const r = { id, verdict: ok ? 'pass' : 'fail', note }; results.push(r); console.log(JSON.stringify(r)); fs.appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + '\n') }
const path = page => L.wiz(page).url().replace(L.O, '').replace(/\?.*$/, '')
const conceptName = id => (L.sql(`select c.name from brands b join concepts c on c.id=b.concept_id where b.id='${id}'`)[0] || {}).name || 'нет'
// The attention banner of a returned brief, or «нет».
const banner = page => L.wiz(page).evaluate(() => {
  const m = document.body.innerText.match(/\d+ секці\S* потребу\S* уваги/)
  return m ? m[0] : 'нет'
})
// Scroll the wizard so the snapshot shows what is checked: the top banner, or a text.
const toTop = page => L.wiz(page).evaluate(() => document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0 }))
const toText = (page, re) => L.wiz(page).evaluate(src => { const re = new RegExp(src); const el = [...document.querySelectorAll('p, span, div')].filter(e => e.offsetParent && re.test(e.textContent) && e.children.length === 0)[0]; if (el) el.scrollIntoView({ block: 'center' }) }, re.source)
const said = page => L.wiz(page).evaluate(() => [...new Set([...document.querySelectorAll('.text-red-600, .text-destructive, [role=alert]')].filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean))].join(' + ') || 'ничего')

/** PO: returned brief → «Редагувати» Concept → Wonderland → «Далі» (names screen). */
async function revisionConceptToNames(b) {
  const id = await F.returned(b)
  const { page, ctx } = await L.session(b, 'po'); await F.open(page, id)
  const before = await banner(page); await toTop(page); await L.shot(page, 'P3-U-05-one-section')
  await F.editSection(page, 'Concept')
  await L.wiz(page).locator('.concept-card', { hasText: 'Wonderland' }).first().click({ force: true }); await L.wait(page, 1000)
  await F.next(page)
  return { id, page, ctx, before, names: path(page) }
}

const CHECKS = {
  // F5 in the middle of a revision edit: the review shows what the server has.
  'D-07': async b => {
    const { id, page, ctx, before, names } = await revisionConceptToNames(b)
    await L.shot(page, 'P3-D-07-a-names-after-concept')
    await page.reload({ waitUntil: 'networkidle' }); await L.wait(page, 3500)
    const at = path(page); const concept = await F.sec(page, 'Concept'); const ext = await F.sec(page, 'External Naming')
    await L.shot(page, 'P3-D-07-b-after-F5')
    await F.open(page, id); const reopened = await F.sec(page, 'Concept'); await L.shot(page, 'P3-D-07-c-reopened')
    const db = conceptName(id)
    verdict('D-07', /po-edit\/concept\/external-naming$/.test(names) && new RegExp(`brand/${id}$`).test(at) && /Wonka/.test(concept) && !/Wonderland/.test(concept) && /Joymus/.test(ext) && /Wonka/.test(reopened) && !/Wonderland/.test(reopened) && db === 'Wonka' && before === '1 секція потребує уваги',
      `плашка до правки: «${before}»; «Редагувати» Concept → Wonderland → «Далі» → ${names}; F5 → ${at}; Concept: ${concept}; External: ${ext}; открыт снова — Concept: ${reopened}; в базе: ${db}`)
    await ctx.close()
  },
  // «назад» of the browser from the names screen: the concept screen, then the review — nothing half-saved.
  'D-13': async b => {
    const { id, page, ctx } = await revisionConceptToNames(b)
    await L.back(page); const first = path(page); const pair = (await L.text(L.wiz(page))).match(/Вибір замовника[\s\S]{0,60}/)?.[0]?.replace(/\n/g, ' ') || ''
    await L.shot(page, 'P3-D-13-a-after-back')
    await L.back(page); const second = path(page); const concept = await F.sec(page, 'Concept'); const ext = await F.sec(page, 'External Naming')
    await L.shot(page, 'P3-D-13-b-after-back2')
    await F.open(page, id); const reopened = await F.sec(page, 'Concept'); await L.shot(page, 'P3-D-13-c-reopened')
    verdict('D-13', /po-edit\/concept$/.test(first) && new RegExp(`brand/${id}$`).test(second) && /Wonka/.test(concept) && !/Wonderland/.test(concept) && /Joymus/.test(ext) && /Wonka/.test(reopened) && !/Wonderland/.test(reopened) && conceptName(id) === 'Wonka',
      `«назад» → ${first} (${pair}); «назад» ещё раз → ${second}; Concept: ${concept}; External: ${ext}; открыт снова — Concept: ${reopened}; в базе: ${conceptName(id)}`)
    await ctx.close()
  },
  // Regression: a revision edit that WAS saved stays — on the screen, after F5, in another browser.
  'T-046': async b => {
    const { id, page, ctx } = await revisionConceptToNames(b)
    const name = await L.wiz(page).evaluate(() => {
      const card = [...document.querySelectorAll('.external-naming-grid button, .external-naming-grid [role=button]')].find(e => e.offsetParent && !e.disabled && !/Sold/.test(e.textContent))
      return card ? card.textContent.trim().split(/[\s(]/)[0] : null
    })
    await L.clickText(L.wiz(page), name); await L.wait(page, 500)
    await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
    const at = path(page); const concept = await F.sec(page, 'Concept')
    await page.reload({ waitUntil: 'networkidle' }); await L.wait(page, 3500)
    const afterF5 = await F.sec(page, 'Concept'); const ext = await F.sec(page, 'External Naming'); await L.shot(page, 'P3-T-046-after-save-F5')
    const other = await L.session(b, 'po'); await F.open(other.page, id); const elsewhere = await F.sec(other.page, 'Concept'); await other.ctx.close()
    verdict('T-046', new RegExp(`brand/${id}$`).test(at) && /Wonderland/.test(concept) && /Wonderland/.test(afterF5) && ext.includes(name) && /Wonderland/.test(elsewhere) && conceptName(id) === 'Wonderland',
      `«Редагувати» Concept → Wonderland → «Далі» → ${name} → «Зберегти» → ${at}; Concept: ${concept}; после F5: ${afterF5}; External: ${ext}; другой браузер: ${elsewhere}; в базе: ${conceptName(id)}`)
    await ctx.close()
  },
  // Draft: concept changed from the review, the names screen left by «назад» ×2.
  'D-12': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await F.toFinal(page)
    await F.editSection(page, 'Concept')
    await L.wiz(page).locator('.concept-card', { hasText: 'Retro Pixel' }).first().click({ force: true }); await L.wait(page, 1200)
    await F.next(page); const names = path(page); await L.shot(page, 'P3-D-12-a-names-new-concept')
    await L.back(page); await L.back(page)
    const at = path(page); const concept = await F.sec(page, 'Concept'); const ext = await F.sec(page, 'External Naming'); const submit = await F.submitState(page)
    await L.shot(page, 'P3-D-12-b-after-back2')
    // the draft's review is step 8 of the wizard or the brief's own page, whichever it was opened from
    verdict('D-12', /draft-edit\/concept\/external-naming$/.test(names) && (new RegExp(`brand/${id}$`).test(at) || /step\/8$/.test(at)) && /Wonka/.test(concept) && !/Retro Pixel/.test(concept) && /Joymus/.test(ext) && /\[on\]/.test(submit) && conceptName(id) === 'Wonka',
      `«Редагувати» Concept → Retro Pixel → «Далі» → ${names}; «назад» ×2 → ${at}; Concept: ${concept}; External: ${ext}; кнопка: ${submit}; в базе: ${conceptName(id)}`)
    await ctx.close()
  },
  // The backstop: a brief that has a concept and no names cannot go to the CEO from the screen.
  'D-12-gate': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await F.toFinal(page)
    L.sql(`update brands set external_naming_ids='[]', step_data=json_set(step_data,'$.externalNaming.selectedIds',json('[]')) where id='${id}'`)
    await F.open(page, id)
    const ext = await F.sec(page, 'External Naming'); const submit = await F.submitState(page); await L.shot(page, 'P3-D-12-c-no-names-gate')
    verdict('D-12-gate', /\[off\]/.test(submit), `черновик с концептом и без названий (как его оставлял H-02): External: ${ext}; кнопка: ${submit}`)
    await ctx.close()
  },
  // CEO changes concept + names; then the Author applies — the counter goes down (H-11, H-33, H-46).
  'T-042': async b => {
    const id = await F.submitted(b)
    const ceo = await L.session(b, 'ceo'); await F.open(ceo.page, id)
    await F.sectionBtn(ceo.page, 'Concept', 'Змінити вибір')
    await L.wiz(ceo.page).locator('.concept-card', { hasText: 'Wonderland' }).first().click({ force: true }); await L.wait(ceo.page, 1200)
    await F.next(ceo.page)
    const name = await L.wiz(ceo.page).evaluate(() => {
      const cards = [...document.querySelectorAll('.external-naming-grid button, .external-naming-grid [role=button]')].filter(e => e.offsetParent && !e.disabled)
      // «For sale» and «Sold» ask for a comment before «Зберегти»
      const card = cards.find(e => /Available/.test(e.textContent)) || cards.find(e => !/Sold/.test(e.textContent))
      return card ? card.textContent.trim().split(/\s+/)[0] : null
    })
    await L.clickText(L.wiz(ceo.page), name); await L.wait(ceo.page, 500)
    await L.clickText(L.wiz(ceo.page), 'Зберегти', { exact: true }); await L.wait(ceo.page, 3000)
    await F.ceoComment(ceo.page, 'Concept', 'CEO: Wonderland fits better')
    await L.clickText(L.wiz(ceo.page), 'Повернути на доопрацювання'); await L.wait(ceo.page, 1500)
    const warn = await L.wiz(ceo.page).evaluate(() => (document.body.innerText.match(/Додайте[^\n]*/) || ['нет'])[0])
    await toText(ceo.page, /^Додайте/); await L.shot(ceo.page, 'P3-T-042-a-ceo-one-comment')
    await F.ceoComment(ceo.page, 'External Naming', 'CEO: and the name')
    await F.ceoReturn(ceo.page)
    await ceo.ctx.close()
    const st = L.brand(id).status
    const { page, ctx } = await L.session(b, 'po'); await F.open(page, id)
    const b0 = await banner(page); await toTop(page); await L.shot(page, 'P3-T-042-b-revision')
    await F.sectionBtn(page, 'Concept', 'Застосувати варіант CEO'); await L.wait(page, 1500)
    const b1 = await banner(page); const s1 = await F.submitState(page); await toTop(page); await L.shot(page, 'P3-T-042-c-applied-concept')
    await F.sectionBtn(page, 'External Naming', 'Застосувати варіант CEO'); await L.wait(page, 1500)
    const b2 = await banner(page); const s2 = await F.submitState(page); await toTop(page); await L.shot(page, 'P3-T-042-d-applied-both')
    const resolved = L.brand(id).ceo_comments
    await F.open(page, id); const b3 = await banner(page)
    verdict('T-042', /кожного розділу, де ви змінили вибір/.test(warn) && st === 'needs_revision' && b0 === '2 секції потребують уваги' && b1 === '1 секція потребує уваги' && /\[off\]/.test(s1) && b2 === 'нет' && /\[on\]/.test(s2) && resolved.concept.resolved && resolved.externalNaming.resolved && b3 === 'нет',
      `CEO: Wonderland + ${name}, комментарий только у Concept → «Повернути»: «${warn}»; оба комментария → ${st}. PO: плашка «${b0}» → «Застосувати варіант CEO» в Concept → «${b1}», кнопка ${s1} → в External → плашка ${b2}, кнопка ${s2}; в базе комментарии вирішені: Concept ${resolved.concept.resolved}, External ${resolved.externalNaming.resolved}; F5 → плашка ${b3}`)
    await ctx.close()
  },
  // CEO changes Internal only; the Author's Internal screen asks nothing the server does not have.
  'T-045': async b => {
    const id = await F.submitted(b)
    const ceo = await L.session(b, 'ceo'); await F.open(ceo.page, id)
    // the local stand has no image files: their 404s are expected and do not count
    const ceo404 = []; ceo.page.on('response', r => { if (r.status() === 404 && /\/api\/(namings|brands|concepts)/.test(r.url())) ceo404.push(r.url().replace(L.O, '')) })
    await F.sectionBtn(ceo.page, 'Internal Naming', 'Змінити вибір')
    const ceoScreen = await L.wiz(ceo.page).evaluate(() => (document.body.innerText.match(/Вибір замовника[\s\S]{0,40}/) || ['—'])[0].replace(/\s+/g, ' '))
    await L.shot(ceo.page, 'P3-T-045-a-ceo-internal')
    const pick = await L.wiz(ceo.page).evaluate(() => {
      const card = [...document.querySelectorAll('.internal-naming-grid button, .internal-naming-grid [role=button]')].find(e => e.offsetParent && !e.disabled && !/Luna/.test(e.textContent))
      return card ? card.textContent.trim().split(/\s+/)[0] : null
    })
    await L.clickText(L.wiz(ceo.page), pick); await L.wait(ceo.page, 500)
    await L.clickText(L.wiz(ceo.page), 'Зберегти', { exact: true }); await L.wait(ceo.page, 3000)
    await F.ceoComment(ceo.page, 'Internal Naming', 'CEO: another internal name')
    await F.ceoReturn(ceo.page); await ceo.ctx.close()
    const { page, ctx } = await L.session(b, 'po')
    const po404 = []; page.on('response', r => { if (r.status() === 404 && /\/api\/(namings|brands|concepts)/.test(r.url())) po404.push(r.url().replace(L.O, '')) })
    const own = (L.sql(`select n.name from brands b join internal_namings n on n.id=b.internal_naming_id where b.id='${id}'`)[0] || {}).name
    await F.open(page, id); await F.editSection(page, 'Internal Naming')
    const poScreen = await L.wiz(page).evaluate(() => (document.body.innerText.match(/Ваш попередній вибір[\s\S]{0,40}/) || ['—'])[0].replace(/\s+/g, ' '))
    await L.shot(page, 'P3-T-045-b-po-internal-edit')
    await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2500)
    await F.sectionBtn(page, 'Internal Naming', 'Застосувати варіант CEO'); await L.wait(page, 1500)
    const r = L.brand(id); const intName = (L.sql(`select name from internal_namings where id='${r.internal_naming_id}'`)[0] || {}).name
    await L.shot(page, 'P3-T-045-c-applied')
    verdict('T-045', ceo404.length === 0 && po404.length === 0 && poScreen.includes(own) && intName === pick && conceptName(id) === 'Wonka',
      `CEO «Змінити вибір» Internal: на экране ${ceoScreen}; выбрал ${pick}; PO «Редагувати» Internal (свой выбор ${own}): ${poScreen}; ответов 404 — у CEO: ${ceo404.length ? ceo404.join(', ') : 'нет'}, у PO: ${po404.length ? po404.join(', ') : 'нет'}; «Застосувати варіант CEO» → Internal в базе: ${intName}; Concept: ${conceptName(id)}`)
    await ctx.close()
  },
  // A deleted draft must not give its number to a brief that repeats an existing name.
  'T-082': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const maxBefore = L.sql(`select max(cast(substr(internal_name, 12) as integer)) m from brands where internal_name like 'New Brand #%'`)[0].m
    const { id: first } = await F.newBrief(page)
    const firstName = L.brand(first).internal_name
    // deleted as the Admin did it in the run of 02.10 (a PO may not delete a brief)
    L.sql(`delete from brand_workflow_events where brand_id='${first}'`); L.sql(`delete from brands where id='${first}'`)
    const del = L.brand(first) ? 'не удалён' : 'удалён'
    const { id: second } = await F.newBrief(page)
    const name = L.brand(second).internal_name
    const same = L.sql(`select count(*) n from brands where internal_name='${name}'`)[0].n
    await L.shot(page, 'P3-T-082-new-brief')
    verdict('T-082', firstName === `New Brand #${maxBefore + 1}` && del === 'удалён' && name === `New Brand #${maxBefore + 1}` && same === 1,
      `самый большой номер до прогона: #${maxBefore}; новый бриф → «${firstName}»; ${del}; следующий новый → «${name}»; брифов с этим именем: ${same}`)
    await ctx.close()
  },
}
;(async () => {
  const b = await L.launch()
  for (const [id, fn] of Object.entries(CHECKS)) {
    if (ONLY.length && !ONLY.includes(id)) continue
    try { await fn(b) } catch (e) { verdict(id, false, `сценарий упал: ${String(e).slice(0, 300)}`) }
  }
  await b.close()
  console.log(`\n${results.filter(r => r.verdict === 'pass').length} pass / ${results.length}`)
})()
