// Portion 6 of docs/architecture/wizard-fixes-plan.md — the rest of the run of 02.10.
// node scenarios/sP6.js [C-29 …]   (no args = all). Run with STAND_FRONT for a local build.
const fs = require('fs')
const L = require('../lib'); const F = require('../flow')
const ONLY = process.argv.slice(2)
const OUT = `${L.SP}/run/p6-results.jsonl`
const results = []
function verdict(id, ok, note) { const r = { id, verdict: ok ? 'pass' : 'fail', note }; results.push(r); console.log(JSON.stringify(r)); fs.mkdirSync(`${L.SP}/run`, { recursive: true }); fs.appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + '\n') }
const has = async (page, re) => re.test(await L.text(L.wiz(page)))
const btn = async (page, re) => (await L.buttons(L.wiz(page))).filter(x => re.test(x)).join(', ') || 'нет'
const NO_ACCESS = /Немає доступу до цього брифу/

/** A brief «В роботі»: a concept on order → «Відправити в роботу». */
async function inWorkBrief(b) {
  const { page, ctx } = await L.session(b, 'po')
  const { id } = await F.newBrief(page)
  await F.step1(page); await F.orderConcept(page); await F.next(page)
  await F.step4(page, 'Luna'); await F.step5(page, 'Trust Focus'); await F.next(page); await F.step7delegate(page)
  await L.clickText(L.wiz(page), 'Відправити в роботу'); await L.wait(page, 3000)
  await ctx.close()
  return id
}

/** CEO «Змінити вибір» Internal Naming → another name → «Зберегти». */
async function ceoPicksInternal(page) {
  await F.sectionBtn(page, 'Internal Naming', 'Змінити вибір')
  const pick = await L.wiz(page).evaluate(() => {
    const card = [...document.querySelectorAll('.internal-naming-grid button, .internal-naming-grid [role=button]')].find(e => e.offsetParent && !e.disabled && !/Luna/.test(e.textContent))
    return card ? card.textContent.trim().split(/\s+/)[0] : null
  })
  await L.clickText(L.wiz(page), pick); await L.wait(page, 500)
  await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
  return pick
}

let inWorkId = null
let draftId = null

const CHECKS = {
  // C-29: closing «Затвердити бриф зі змінами?» must not return the brief.
  'C-29': async b => {
    const id = await F.submitted(b)
    const { page, ctx } = await L.session(b, 'ceo'); await F.open(page, id)
    const pick = await ceoPicksInternal(page)
    await L.clickText(L.wiz(page), 'Затвердити', { exact: true }); await L.wait(page, 1200)
    const dialog = await has(page, /Затвердити бриф зі змінами\?/); await L.shot(page, 'P6-C-29-a-dialog')
    await page.keyboard.press('Escape'); await L.wait(page, 2500)
    const afterEsc = L.brand(id).status; const stillOpen = await has(page, /Затвердити бриф зі змінами\?/)
    await L.clickText(L.wiz(page), 'Затвердити', { exact: true }); await L.wait(page, 1200)
    await L.wiz(page).locator('.ui-modal').last().getByRole('button').first().click(); await L.wait(page, 2500)
    const afterCross = L.brand(id).status
    await L.shot(page, 'P6-C-29-b-closed')
    const returns = L.sql(`select count(*) n from brand_workflow_events where brand_id='${id}' and event_type in ('ceo_feedback','needs_revision')`)[0].n
    verdict('C-29', dialog && afterEsc === 'submitted' && !stillOpen && afterCross === 'submitted' && returns === 0,
      `CEO сменил Internal на ${pick} → «Затвердити» → окно «зі змінами»: ${dialog}; Esc → статус ${afterEsc}, окно открыто: ${stillOpen}; первая кнопка окна (крестик) → статус ${afterCross}; событий возврата: ${returns}`)
    await ctx.close()
  },
  // A-39 / BD-15: «Скасувати» in the concept edit brings the theme back.
  'A-39': async b => {
    const { page, ctx } = await L.session(b, 'po')
    const id = await F.toFinal(page); draftId = id
    await F.editSection(page, 'Concept')
    await L.clickText(L.wiz(page), 'Темна тема', { exact: true }); await L.wait(page, 1500)
    await L.shot(page, 'P6-A-39-a-dark')
    await L.clickText(L.wiz(page), 'Скасувати', { exact: true }); await L.wait(page, 2500)
    const concept = await F.sec(page, 'Concept')
    await page.reload({ waitUntil: 'networkidle' }); await L.wait(page, 3500)
    const afterF5 = await F.sec(page, 'Concept'); await L.shot(page, 'P6-A-39-b-after-cancel-F5')
    const db = L.brand(id).mode
    verdict('A-39', /Mode \| Light/.test(concept) && /Mode \| Light/.test(afterF5) && db === 'light',
      `Final review → «Редагувати» Concept → «Темна тема» → «Скасувати»: ${concept}; после F5: ${afterF5}; в базе mode=${db}`)
    await ctx.close()
  },
  // H-24: a brief «В роботі» — the other theme cannot be pressed.
  'H-24': async b => {
    inWorkId = await inWorkBrief(b)
    const { page, ctx } = await L.session(b, 'po'); await F.open(page, inWorkId)
    await F.editSection(page, 'Concept')
    const themes = await btn(page, /тема/)
    await L.shot(page, 'P6-H-24-theme-locked')
    verdict('H-24', L.brand(inWorkId).status === 'in_work' && /Темна тема \[off\]/.test(themes) && /Світла тема(?! \[off\])/.test(themes),
      `бриф ${L.brand(inWorkId).status} → «Редагувати» Concept → переключатель: ${themes}`)
    await ctx.close()
  },
  // H-04 / H-30: the CEO's comments are on the server while typing; two tabs keep both.
  'H-04': async b => {
    const id = await F.submitted(b)
    const a = await L.session(b, 'ceo'); await F.open(a.page, id)
    await F.ceoComment(a.page, 'Concept', 'P6: comment from tab A'); await L.wait(a.page, 1500)
    const saved = L.brand(id).ceo_comments
    const other = await L.session(b, 'ceo'); await F.open(other.page, id)
    const seen = await F.sec(other.page, 'Concept'); await L.shot(other.page, 'P6-H-04-a-other-computer')
    const po = await L.session(b, 'po'); await F.open(po.page, id)
    const poApi = await L.wiz(po.page).evaluate(async bid => (await (await fetch(`/api/brands/${bid}`)).json()).data.ceoComments, id)
    await po.ctx.close()
    await F.ceoComment(other.page, 'Internal Naming', 'P6: comment from tab B'); await L.wait(other.page, 1500)
    await other.ctx.close()
    await F.ceoReturn(a.page)
    const r = L.brand(id)
    await L.shot(a.page, 'P6-H-04-b-returned')
    verdict('H-04', saved?.concept?.value === 'P6: comment from tab A' && /comment from tab A/.test(seen) && poApi == null && r.status === 'needs_revision' && r.ceo_comments?.concept?.value === 'P6: comment from tab A' && r.ceo_comments?.internalNaming?.value === 'P6: comment from tab B',
      `вкладка A пишет у Concept → на сервере: ${JSON.stringify(saved)}; второй компьютер CEO видит: ${seen}; автор через API видит комментарии: ${JSON.stringify(poApi)}; вкладка B пишет у Internal; вкладка A «Повернути» → ${r.status}, комментарии на брифе: ${Object.keys(r.ceo_comments || {}).join(', ')}`)
    await a.ctx.close()
  },
  // D-33 / E-27: «свій варіант» holds on another computer.
  'D-33': async b => {
    const id = await F.submitted(b)
    const ceo = await L.session(b, 'ceo'); await F.open(ceo.page, id)
    const pick = await ceoPicksInternal(ceo.page)
    await F.ceoComment(ceo.page, 'Internal Naming', 'P6: maybe this one'); await F.ceoReturn(ceo.page); await ceo.ctx.close()
    const { page, ctx } = await L.session(b, 'po'); await F.open(page, id)
    const own = (L.sql(`select n.name from brands b join internal_namings n on n.id=b.internal_naming_id where b.id='${id}'`)[0] || {}).name
    await F.editSection(page, 'Internal Naming')
    await L.clickText(L.wiz(page), own); await L.wait(page, 500)
    await L.clickText(L.wiz(page), 'Зберегти', { exact: true }); await L.wait(page, 3000)
    await F.sectionBtn(page, 'Internal Naming', 'Позначити як вирішений'); await L.wait(page, 1500)
    const here = await F.submitState(page)
    const kept = L.brand(id).step_data?.revisionKeptOwn
    await ctx.close()
    const other = await L.session(b, 'po'); await F.open(other.page, id)
    const elsewhere = await F.submitState(other.page); const section = await F.sec(other.page, 'Internal Naming')
    await L.shot(other.page, 'P6-D-33-other-computer')
    verdict('D-33', /\[on\]/.test(here) && kept && kept.internalNaming && /\[on\]/.test(elsewhere) && !/Потрібно обрати варіант/.test(section),
      `CEO предложил Internal ${pick}; автор оставил свой ${own} («Зберегти») и отметил комментарий → кнопка ${here}; в брифе отметка: ${JSON.stringify(kept)}; другой компьютер → кнопка ${elsewhere}; раздел: ${section}`)
    await other.ctx.close()
  },
  // H-38: step 1 hints on leaving an empty field and on the grey «Далі».
  'H-38': async b => {
    const { page, ctx } = await L.session(b, 'po')
    await F.newBrief(page)
    const fresh = await has(page, /Оберіть хоча б одну ГЕО|Вкажіть дату запуску/)
    const f = L.wiz(page)
    await f.locator('input[placeholder^="Наприклад"]').click(); await L.wait(page, 400)
    await f.locator('body').click({ position: { x: 5, y: 300 } }); await L.wait(page, 600)
    const geoHint = await has(page, /Оберіть хоча б одну ГЕО/)
    await f.getByRole('button', { name: 'Далі', exact: true }).click({ force: true }); await L.wait(page, 600)
    const dateHint = await has(page, /Вкажіть дату запуску/)
    await L.shot(page, 'P6-H-38-hints')
    verdict('H-38', !fresh && geoHint && dateHint,
      `новый бриф, шаг 1 — подсказки сразу: ${fresh}; открыл GEO и ушёл пустым → «Оберіть хоча б одну ГЕО»: ${geoHint}; нажал серую «Далі» → «Вкажіть дату запуску»: ${dateHint}`)
    await ctx.close()
  },
  // H-36: «Список чернеток» shows every draft of the author.
  'H-36': async b => {
    const { page, ctx } = await L.session(b, 'po')
    await page.goto(L.O + '/workspace/new', { waitUntil: 'networkidle' }); await L.wait(page, 2500)
    await L.clickText(L.wiz(page), 'Список чернеток'); await L.wait(page, 3000)
    const shown = await L.wiz(page).evaluate(() => (document.body.innerText.match(/New Brand #\d+/g) || []).length)
    const inDb = L.sql(`select count(*) n from brands where created_by='${L.USERS.po.sub}' and status='draft'`)[0].n
    await L.shot(page, 'P6-H-36-drafts')
    verdict('H-36', inDb > 20 && shown === inDb, `черновиков автора в базе: ${inDb}; в «Список чернеток»: ${shown}`)
    await ctx.close()
  },
  // H-41 / H-52 / H-37: a link to a brief the person may not open.
  'H-41': async b => {
    const id = draftId || (L.sql(`select id from brands where created_by='${L.USERS.po.sub}' and status='draft' limit 1`)[0] || {}).id
    const inWork = inWorkId || (L.sql(`select id from brands where status='in_work' limit 1`)[0] || {}).id
    const po2 = await L.session(b, 'po2'); await F.open(po2.page, id)
    const po2Sees = await has(po2.page, NO_ACCESS); const po2Landing = await has(po2.page, /Order New Brand/); await L.shot(po2.page, 'P6-H-41-po2'); await po2.ctx.close()
    const st = await L.session(b, 'strategy'); await F.open(st.page, inWork)
    const stSees = await has(st.page, NO_ACCESS); const stButtons = await btn(st.page, /./); await L.shot(st.page, 'P6-H-52-strategy'); await st.ctx.close()
    const ceo = await L.session(b, 'ceo'); await F.open(ceo.page, id)
    const ceoSees = await has(ceo.page, NO_ACCESS); await ceo.ctx.close()
    const ceoInWork = await L.session(b, 'ceo'); await F.open(ceoInWork.page, inWork)
    const ceoGate = await has(ceoInWork.page, /Бриф ще в роботі/); await ceoInWork.ctx.close()
    verdict('H-41', po2Sees && !po2Landing && stSees && ceoSees && ceoGate,
      `второй PO по ссылке на чужой черновик — «Немає доступу»: ${po2Sees}, заставка «Order New Brand»: ${po2Landing}; Strategy по ссылке на бриф «В роботі» — «Немає доступу»: ${stSees} (кнопки: ${stButtons}); CEO по ссылке на черновик — «Немає доступу»: ${ceoSees}; CEO на бриф «В роботі» — прежняя заглушка «Бриф ще в роботі»: ${ceoGate}`)
  },
  // H-37: the CEO's Brands has no «Drafts» and lists no drafts.
  'H-37': async b => {
    const { page, ctx } = await L.session(b, 'ceo')
    await page.goto(L.O + '/brands', { waitUntil: 'networkidle' }); await L.wait(page, 3000)
    const tabs = await page.evaluate(() => [...document.querySelectorAll('[role=tab], .tabs button, button')].map(e => e.textContent.trim()).filter(t => /^(All|Drafts|In Work|Submitted|Approved|Needs Revision)\b/.test(t)).join(', '))
    const drafts = await page.evaluate(async () => (await (await fetch('/api/brands?status=draft&per_page=5')).json()).total)
    const all = await page.evaluate(async () => (await (await fetch('/api/brands?per_page=500')).json()).data.filter(x => x.status === 'draft').length)
    await L.shot(page, 'P6-H-37-ceo-brands')
    verdict('H-37', !/Drafts/.test(tabs) && drafts === 0 && all === 0, `вкладки CEO: ${tabs}; черновиков по фильтру: ${drafts}; черновиков в «All»: ${all}`)
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
