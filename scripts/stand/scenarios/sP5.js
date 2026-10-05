// Portion 5 of docs/architecture/wizard-fixes-plan.md — «заказчик выбрал из библиотеки» ×
// «Strategy: Відправити замовнику»: one goes through, the other hears why (H-31, D-65); D-64 on top.
// node scenarios/sP5.js [D-65-strategy-first …]   (no args = all). Run with STAND_FRONT for a local build.
const fs = require('fs')
const L = require('../lib'); const F = require('../flow')
const ONLY = process.argv.slice(2)
const OUT = `${L.SP}/run/p5-results.jsonl`
const results = []
function verdict(id, ok, note) { const r = { id, verdict: ok ? 'pass' : 'fail', note }; results.push(r); console.log(JSON.stringify(r)); fs.appendFileSync(OUT, JSON.stringify({ ...r, at: new Date().toISOString() }) + '\n') }
const SENT = 'Замовлення вже відправлено замовнику — оновіть сторінку.'
const PICKED = 'Замовник уже обрав з бібліотеки — замовлення скасовано.'
const CHANGED = 'Бриф змінено — оновіть сторінку.'
const LIBRARY = 'Wonka'
const ERR = '.text-red-600, .text-destructive, .review-unified-view__error'
async function said(page) {
  const hits = await L.wiz(page).evaluate(sel => [...new Set([...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean))], ERR)
  return hits.length ? hits.join(' + ') : 'ничего'
}
const header = page => L.wiz(page).evaluate(() => document.querySelector('.review-header')?.innerText.replace(/\n+/g, ' | ').slice(0, 300) ?? 'none')
const events = id => L.sql(`select event_type from brand_workflow_events where brand_id='${id}' order by created_at, rowid`).map(r => r.event_type)
const post = (page, path, body) =>
  page.evaluate(async ([p, b]) => {
    const me = await fetch('/api/auth/me').then(r => r.json())
    const r = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json', 'X-CSRF-Token': me.data.csrfToken }, body: JSON.stringify(b) })
    return { status: r.status, body: await r.json().catch(() => null) }
  }, [path, body])
// The admin's error window (useErrorDialog) or anything modal on the order page.
const adminSaid = page => page.evaluate(() => [...document.querySelectorAll('.modal')].filter(e => e.offsetParent).map(e => e.innerText.replace(/\n+/g, ' | ')).join(' ## ') || 'ничего')
const adminState = page => page.evaluate(() => (document.querySelector('.order-detail__header')?.innerText || '').replace(/\n+/g, ' | ').slice(0, 300))

/** A brief with a concept order, sent to the teams; Strategy made a concept and a name, not sent yet. */
async function orderMade(b) {
  const po = await L.session(b, 'po')
  const { id } = await F.newBrief(po.page)
  await F.step1(po.page); await F.orderConcept(po.page); await F.next(po.page)
  await F.step4(po.page, 'Luna'); await F.step5(po.page, 'Trust Focus'); await F.next(po.page); await F.step7delegate(po.page)
  await L.clickText(L.wiz(po.page), 'Відправити в роботу'); await L.wait(po.page, 3000)
  const st = await L.session(b, 'strategy')
  await st.page.goto(`${L.O}/orders/${id}`, { waitUntil: 'networkidle' }); await L.wait(st.page, 1500)
  const stamp = Date.now() % 100000
  const concept = await post(st.page, '/api/concepts', { name: `P5 Dawn ${stamp}`, description: 'made for the order', for_brand_id: id })
  await post(st.page, '/api/namings/external', { name: `P5 Ray ${stamp}`, domain: `p5ray${stamp}.com`, availability_status: 'available', concept_id: concept.body?.data?.id, for_brand_id: id })
  await st.page.reload({ waitUntil: 'networkidle' }); await L.wait(st.page, 1500)
  console.log('in work:', id, F.dbSummary(id))
  return { id, po, st, stamp }
}

/** The author: «Редагувати» Concept → library concept → «Обрати концепт» → its name; stops right before «Зберегти». */
async function pickLibraryUpToSave(page, id, shotName) {
  await F.open(page, id)
  await F.editSection(page, 'Concept')
  await L.wiz(page).locator('.concept-card', { hasText: LIBRARY }).first().click({ force: true }); await L.wait(page, 1200)
  if (shotName) await L.shot(page, shotName)
  await L.clickText(L.wiz(page), 'Обрати концепт', { exact: true }); await L.wait(page, 1000)
  await F.next(page)
  const name = (await L.buttons(L.wiz(page))).find(x => /Joymus|Wonkaland|Choco/.test(x)) || 'Joymus'
  await L.clickText(L.wiz(page), name); await L.wait(page, 600)
}
const save = page => L.clickText(L.wiz(page), 'Зберегти', { exact: true })
/** Strategy: «Відправити замовнику» → the confirm window, stops right before «Відправити». */
async function openSendConfirm(page) {
  await page.getByRole('button', { name: 'Відправити замовнику' }).first().click(); await L.wait(page, 800)
}
const send = page => page.locator('.modal').last().getByRole('button', { name: 'Відправити', exact: true }).click()

const CHECKS = {
  // Strategy sends while the author's tab is mid-pick: the pick is refused, the order stays sent.
  'D-65-strategy-first': async b => {
    const { id, po, st } = await orderMade(b)
    await pickLibraryUpToSave(po.page, id, 'P5-D-65-0-confirm')
    await openSendConfirm(st.page); await send(st.page); await L.wait(st.page, 2500)
    const stSaid = await adminSaid(st.page); const stState = await adminState(st.page)
    await L.shot(st.page, 'P5-D-65-a-strategy-sent')
    L.state.writes.length = 0
    await save(po.page); await L.wait(po.page, 3000)
    const put = L.state.writes.find(w => w.m === 'PUT')
    const msg = await said(po.page)
    await L.shot(po.page, 'P5-D-65-b-po-refused')
    const row = L.brand(id); const ev = events(id)
    verdict('D-65-strategy-first', put && put.status === 409 && msg === SENT && row.orders_ready_at && row.new_concept_brief && !ev.includes('order_cancelled'),
      `Strategy «Відправити»: окно ${stSaid}, шапка «${stState}»; PO «Зберегти» с ${LIBRARY}: PUT ${put && put.status}, на экране «${msg}»; в базе: ${F.dbSummary(id)}, отправлено ${row.orders_ready_at ? 'да' : 'нет'}; история: ${ev.join(' → ')}`)

    // F5: the order the team sent is there to pick.
    await F.open(po.page, id)
    const after = await header(po.page)
    await L.shot(po.page, 'P5-D-65-c-po-reloaded')
    verdict('D-65-strategy-first-F5', /Замовлення виконано/.test(after), `после F5 у PO шапка: «${after}»`)
    await po.ctx.close(); await st.ctx.close()
  },
  // The author picks from the library first; Strategy's page, opened before, sends — refused with the reason.
  'D-65-po-first': async b => {
    const { id, po, st } = await orderMade(b)
    await pickLibraryUpToSave(po.page, id)
    L.state.writes.length = 0
    await save(po.page); await L.wait(po.page, 3000)
    const put = L.state.writes.find(w => w.m === 'PUT')
    await openSendConfirm(st.page); L.state.writes.length = 0
    await send(st.page); await L.wait(st.page, 2500)
    const ready = L.state.writes.find(w => w.p.endsWith('/ready'))
    const stSaid = await adminSaid(st.page)
    await L.shot(st.page, 'P5-D-65-d-strategy-refused')
    const row = L.brand(id); const ev = events(id)
    verdict('D-65-po-first', put && put.status === 200 && ready && ready.status >= 400 && stSaid.includes(PICKED) && !row.orders_ready_at && ev.includes('order_cancelled') && !ev.includes('orders_ready'),
      `PO «Зберегти» с ${LIBRARY}: PUT ${put && put.status}; Strategy (страница открыта до этого) «Відправити»: POST ready ${ready && ready.status}, на экране: ${stSaid}; в базе: ${F.dbSummary(id)}, отправлено ${row.orders_ready_at ? 'да' : 'нет'}; история: ${ev.join(' → ')}`)
    await po.ctx.close(); await st.ctx.close()
  },
  // Run 02.10: both in the same second — both passed. Now exactly one does.
  'D-65-same-second': async b => {
    const { id, po, st } = await orderMade(b)
    await pickLibraryUpToSave(po.page, id)
    await openSendConfirm(st.page)
    L.state.writes.length = 0
    await Promise.all([save(po.page), send(st.page)]); await L.wait(po.page, 3000)
    const put = L.state.writes.find(w => w.m === 'PUT'); const ready = L.state.writes.find(w => w.p.endsWith('/ready'))
    const poMsg = await said(po.page); const stSaid = await adminSaid(st.page)
    await L.shot(po.page, 'P5-D-65-e-same-second-po'); await L.shot(st.page, 'P5-D-65-f-same-second-strategy')
    const ev = events(id)
    const one = [put && put.status, ready && ready.status].filter(s => s === 200).length === 1
    const loserTold = put && put.status === 200 ? stSaid.includes(PICKED) : poMsg === SENT
    verdict('D-65-same-second', one && loserTold && !(ev.includes('orders_ready') && ev.includes('order_cancelled')),
      `в одну секунду: PUT ${put && put.status}, POST ready ${ready && ready.status}; у PO: «${poMsg}»; у Strategy: ${stSaid}; история: ${ev.join(' → ')}`)
    await po.ctx.close(); await st.ctx.close()
  },
  // Two tabs of a brief in work; Strategy sends. After F5 both show the order done; B, stale after A's pick, does not overwrite it.
  'D-64': async b => {
    const { id, po, st, stamp } = await orderMade(b)
    const A = po.page; const B = await po.ctx.newPage()
    await F.open(A, id); await F.open(B, id)
    await openSendConfirm(st.page); await send(st.page); await L.wait(st.page, 2500)
    await F.open(A, id); await F.open(B, id)
    const hA = await header(A); const hB = await header(B)
    await L.shot(B, 'P5-D-64-a-tab-B-ready')
    // A picks what the team made.
    await F.editSection(A, 'Concept')
    await L.wiz(A).locator('.made-for-brief-groups__made .concept-card').first().click({ force: true }); await L.wait(A, 1200)
    await F.next(A); await L.clickText(L.wiz(A), `P5 Ray ${stamp}`); await L.wait(A, 600)
    L.state.writes.length = 0
    await save(A); await L.wait(A, 3000)
    const putA = L.state.writes.find(w => w.m === 'PUT')
    const picked = F.dbSummary(id)
    // B, opened before A saved, changes Internal Naming.
    await F.editSection(B, 'Internal Naming')
    const current = L.sql(`select name from internal_namings where id='${L.brand(id).internal_naming_id}'`)[0]?.name
    const other = (await L.buttons(L.wiz(B))).filter(x => x !== current && !/Закрити|Назад|Далі|Зберегти|Скасувати|Замовити|\[off\]/.test(x))[0]
    if (other) { await L.clickText(L.wiz(B), other, { exact: true }); await L.wait(B, 500) }
    L.state.writes.length = 0
    await save(B); await L.wait(B, 3000)
    const putB = L.state.writes.find(w => w.m === 'PUT'); const msgB = await said(B)
    await L.shot(B, 'P5-D-64-b-tab-B-save')
    const kept = F.dbSummary(id)
    verdict('D-64', /Замовлення виконано/.test(hA) && /Замовлення виконано/.test(hB) && putA && putA.status === 200 && putB && putB.status === 409 && msgB === CHANGED && kept === picked,
      `после «Відправити замовнику» и F5: A «${hA.slice(0, 60)}», B «${hB.slice(0, 60)}»; A выбрала созданные концепт и название: PUT ${putA && putA.status} (${picked}); B — Internal «${other}» → «Зберегти»: PUT ${putB && putB.status}, на экране «${msgB}»; в базе после B: ${kept}`)
    await po.ctx.close(); await st.ctx.close()
  },
}
;(async () => {
  const b = await L.launch()
  for (const [id, fn] of Object.entries(CHECKS)) {
    if (ONLY.length && !ONLY.includes(id)) continue
    L.state.offline = false
    try { await fn(b) } catch (e) { verdict(id, false, `сценарий упал: ${String(e).slice(0, 300)}`) }
  }
  await b.close()
  console.log(`\n${results.filter(r => r.verdict === 'pass').length} pass / ${results.length}`)
})()
