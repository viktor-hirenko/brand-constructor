#!/usr/bin/env node
/**
 * Generates docs/component-index.html — a searchable catalog of Vue components
 * and their BEM class names for DevTools navigation.
 *
 * Run: npm run docs:components
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(pkgRoot, 'src');

const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.vue')) files.push(full);
  }
}

walk(path.join(srcRoot, 'components'));
walk(path.join(srcRoot, 'views'));

const bemRe = /\b([a-z][a-z0-9-]*(?:__[a-z0-9-]+|--[a-z0-9-]+)+)\b/g;
const importRe = /import\s+(\w+)\s+from\s+['"]@\/components\/([^'"]+)['"]/g;

const categoryLabels = {
  review: 'Review (карточки секций брифа)',
  fields: 'Fields (поля ввода)',
  'ceo-reselect': 'CEO Reselect (гриды выбора)',
  'edit-flow': 'Edit Flow (PO/CEO редактирование)',
  preview: 'Preview (попапы и превью)',
  modals: 'Modals',
  layout: 'Layout',
  ui: 'UI (общие)',
  icons: 'Icons (SVG)',
  views: 'Views (страницы)',
  'views-steps': 'Views — шаги wizard',
  'views-po-edit': 'Views — PO edit',
  'views-ceo-reselect': 'Views — CEO reselect',
};

const catMap = {
  'components/icons/': 'icons',
  'components/ui/': 'ui',
  'components/constructor/review/': 'review',
  'components/constructor/fields/': 'fields',
  'components/constructor/preview/': 'preview',
  'components/constructor/modals/': 'modals',
  'components/constructor/ceo-reselect/': 'ceo-reselect',
  'components/constructor/edit-flow/': 'edit-flow',
  'components/constructor/layout/': 'layout',
  'views/steps/': 'views-steps',
  'views/po-edit/': 'views-po-edit',
  'views/ceo-reselect/': 'views-ceo-reselect',
  'views/': 'views',
};

const reviewTree = {
  ReviewSubmitView: ['ReviewUnifiedView'],
  ReviewUnifiedView: ['ReviewHeader', 'ReviewSection', 'SectionCommentBlock', 'CeoActionsFooter', 'PoActionsFooter'],
  ReviewSection: [
    'ReviewSectionRow',
    'ReviewConceptBlock',
    'ReviewExternalNamingsList',
    'ReviewInternalNamingBlock',
    'ReviewPrPackageBlock',
    'ReviewDeliverablesBlock',
    'ReviewVisualComponentsBlock',
    'SectionCommentBlock',
    'UnresolvedDot',
    'SectionStatusBadge',
  ],
  ReviewConceptBlock: ['ReviewChoiceGroup', 'ApplyCeoVariantButton'],
  SectionCommentBlock: ['CeoCommentCard', 'PlusIcon'],
  CeoCommentCard: ['CheckIcon'],
};

function resolveCategory(rel) {
  for (const [prefix, cat] of Object.entries(catMap)) {
    if (rel.startsWith(prefix)) return cat;
  }
  return 'other';
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTree(node, indent = '') {
  let out = '';
  for (const [key, children] of Object.entries(node)) {
    out += `${indent}${key}\n`;
    if (Array.isArray(children)) {
      for (const ch of children) {
        if (reviewTree[ch]) out += renderTree({ [ch]: reviewTree[ch] }, `${indent}  `);
        else out += `${indent}  └─ ${ch}\n`;
      }
    }
  }
  return out;
}

const catalog = files.map(file => {
  const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const name = path.basename(file, '.vue');

  const bemClasses = new Set();
  let m;
  while ((m = bemRe.exec(content)) !== null) bemClasses.add(m[1]);

  const rootBlocks = [...new Set([...bemClasses].map(c => c.split('__')[0].split('--')[0]))].sort();

  const imports = [];
  while ((m = importRe.exec(content)) !== null) {
    imports.push({ name: m[1], path: m[2] });
  }

  return {
    name,
    rel,
    category: resolveCategory(rel),
    rootBlocks,
    bemClasses: [...bemClasses].sort(),
    imports,
    hasBem: bemClasses.size > 0,
  };
});

const usedBy = {};
for (const c of catalog) {
  for (const imp of c.imports) {
    if (!usedBy[imp.name]) usedBy[imp.name] = [];
    usedBy[imp.name].push(c.rel);
  }
}

const byCategory = {};
for (const c of catalog) {
  if (!byCategory[c.category]) byCategory[c.category] = [];
  byCategory[c.category].push(c);
}

let sidebar = '';
let main = '';

main += `<div class="tip"><strong>Как пользоваться:</strong> ищи компонент по имени или BEM-классу. Клик по классу копирует его в буфер — вставляй в DevTools → Elements → Ctrl+F. BEM-классы выделены синим; компоненты без BEM помечены жёлтым — там только Tailwind.</div>`;
main += `<div class="stats"><span>Всего: ${catalog.length} Vue-файлов</span><span>С BEM: ${catalog.filter(c => c.hasBem).length}</span><span>Без BEM: ${catalog.filter(c => !c.hasBem).length}</span></div>`;

main += `<div class="section-block" id="devtools-cheatsheet"><h2>Шпаргалка для DevTools (Final review)</h2><div class="tip">На странице <code>/constructor/brand/:id</code> или step 8 ищи в Elements → Ctrl+F:</div><div class="bem-list"><h4>Корневые блоки страницы</h4><code class="cls" data-copy="review-unified-view">review-unified-view</code><code class="cls" data-copy="review-section">review-section</code><code class="cls" data-copy="review-section__title">review-section__title</code><code class="cls" data-copy="review-section__edit-button">review-section__edit-button</code><code class="cls" data-copy="review-section__change-button">review-section__change-button</code></div><div class="bem-list"><h4>Комментарии (PO + CEO)</h4><code class="cls" data-copy="section-comment">section-comment</code><code class="cls" data-copy="section-comment__po">section-comment__po</code><code class="cls" data-copy="section-comment__ceo-cta">section-comment__ceo-cta</code><code class="cls" data-copy="section-comment__ceo-editor">section-comment__ceo-editor</code><code class="cls" data-copy="section-comment__ceo-textarea">section-comment__ceo-textarea</code><code class="cls" data-copy="ceo-comment-card">ceo-comment-card</code><code class="cls" data-copy="ceo-comment-card--unresolved">ceo-comment-card--unresolved</code><code class="cls" data-copy="ceo-comment-card__resolve-button">ceo-comment-card__resolve-button</code></div><div class="bem-list"><h4>data-атрибуты (скролл к секции)</h4><code class="cls" data-copy='[data-section="concept"]'>[data-section="concept"]</code><code class="cls" data-copy='[data-section="basics"]'>[data-section="basics"]</code><code class="cls" data-copy='[data-section="externalNaming"]'>[data-section="externalNaming"]</code><code class="cls" data-copy='[data-section="general"]'>[data-section="general"]</code></div><div class="bem-list"><h4>Контент секций</h4><code class="cls" data-copy="review-concept-block">review-concept-block</code><code class="cls" data-copy="review-external-namings-list">review-external-namings-list</code><code class="cls" data-copy="review-pr-package-block__view-button">review-pr-package-block__view-button</code><code class="cls" data-copy="review-apply-ceo-button">review-apply-ceo-button</code></div><div class="bem-list"><h4>Footer-кнопки</h4><code class="cls" data-copy="ceo-actions-footer__approve">ceo-actions-footer__approve</code><code class="cls" data-copy="po-actions-footer__submit">po-actions-footer__submit</code></div></div>`;

main += `<div class="section-block" id="review-tree"><h2>Дерево Review-блока (Final review)</h2><div class="tree">${esc(renderTree(reviewTree))}</div></div>`;

for (const [cat, items] of Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
  const label = categoryLabels[cat] || cat;
  sidebar += `<h2>${esc(label)}</h2>`;

  main += `<div class="section-block" data-category="${esc(cat)}"><h2>${esc(label)} <span style="color:var(--muted);font-weight:400">(${items.length})</span></h2>`;

  for (const c of items.sort((a, b) => a.name.localeCompare(b.name))) {
    sidebar += `<a href="#${c.name}" data-nav="${esc(c.category)}" data-name="${esc(c.name.toLowerCase())}">${esc(c.name)}<span class="path">${esc(c.rel)}</span></a>`;

    const used = usedBy[c.name] || [];
    main += `<article class="card" id="${esc(c.name)}" data-category="${esc(c.category)}" data-name="${esc(c.name.toLowerCase())}" data-bem="${esc(c.bemClasses.join(' ').toLowerCase())}">`;
    main += `<div class="card-head"><div><h3>${esc(c.name)}</h3><div class="file">src/${esc(c.rel)}</div></div>`;
    main += `<div class="badges"><span class="badge">${esc(c.category)}</span>`;
    main += c.hasBem ? `<span class="badge bem">BEM ✓</span>` : `<span class="badge no-bem">только Tailwind</span>`;
    if (c.rootBlocks.length) main += `<span class="badge">block: ${esc(c.rootBlocks.join(', '))}</span>`;
    main += `</div></div>`;

    if (c.bemClasses.length) {
      main += `<div class="bem-list"><h4>BEM-классы (${c.bemClasses.length}) — клик = копировать</h4>`;
      for (const cls of c.bemClasses) main += `<code class="cls" data-copy="${esc(cls)}">${esc(cls)}</code>`;
      main += `</div>`;
    }

    if (c.imports.length) {
      main += `<div class="imports"><h4>Импортирует компоненты</h4>`;
      for (const imp of c.imports) main += `<code class="cls">${esc(imp.name)}</code>`;
      main += `</div>`;
    }

    if (used.length) {
      main += `<div class="used-by"><h4>Используется в (${used.length})</h4>`;
      for (const u of used.slice(0, 8)) main += `<div class="file">${esc(u)}</div>`;
      if (used.length > 8) main += `<div class="file">…и ещё ${used.length - 8}</div>`;
      main += `</div>`;
    }

    main += `</article>`;
  }
  main += `</div>`;
}

const css = `
:root { --bg:#f6f6f8; --card:#fff; --border:#e5e5ea; --text:#1a1a1a; --muted:#5b5b62; --accent:#4882ff; --code:#eef2ff; }
* { box-sizing:border-box; }
body { margin:0; font-family:Inter,system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; }
header.top { position:sticky; top:0; z-index:10; background:rgba(246,246,248,.95); backdrop-filter:blur(8px); border-bottom:1px solid var(--border); padding:16px 24px; }
header.top h1 { margin:0 0 4px; font-size:22px; }
header.top p { margin:0; color:var(--muted); font-size:14px; }
.toolbar { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; align-items:center; }
#search { flex:1; min-width:240px; padding:10px 14px; border:1px solid var(--border); border-radius:10px; font-size:14px; }
.filter-btn { padding:8px 12px; border:1px solid var(--border); background:#fff; border-radius:999px; font-size:13px; cursor:pointer; }
.filter-btn.active { background:#030213; color:#fff; border-color:#030213; }
.layout { display:grid; grid-template-columns:280px 1fr; gap:0; min-height:calc(100vh - 120px); }
nav.sidebar { border-right:1px solid var(--border); background:#fff; padding:16px; overflow:auto; position:sticky; top:120px; height:calc(100vh - 120px); }
nav.sidebar h2 { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin:16px 0 8px; }
nav.sidebar h2:first-child { margin-top:0; }
nav.sidebar a { display:block; padding:6px 8px; border-radius:8px; color:var(--text); text-decoration:none; font-size:13px; }
nav.sidebar a:hover { background:#f3f3f5; }
nav.sidebar a .path { display:block; color:var(--muted); font-size:11px; }
main { padding:24px; overflow:auto; }
.section-block { margin-bottom:32px; }
.section-block h2 { font-size:18px; margin:0 0 12px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:12px; }
.card.hidden { display:none; }
.card-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; }
.card-head h3 { margin:0; font-size:16px; }
.card-head .file { font-family:ui-monospace,Menlo,monospace; font-size:12px; color:var(--muted); word-break:break-all; }
.badges { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
.badge { font-size:11px; padding:2px 8px; border-radius:999px; background:#f3f3f5; color:var(--muted); }
.badge.bem { background:#e8f0ff; color:#1d4ed8; }
.badge.no-bem { background:#fff9db; color:#936c00; }
.bem-list, .used-by { margin:12px 0 0; }
.bem-list h4, .used-by h4, .imports h4 { margin:0 0 6px; font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
code.cls { display:inline-block; font-family:ui-monospace,Menlo,monospace; font-size:12px; background:var(--code); padding:2px 6px; border-radius:6px; margin:2px 4px 2px 0; cursor:pointer; }
code.cls:hover { outline:2px solid var(--accent); }
code.cls.copied { background:#d4fde5; }
.tree { background:#fff; border:1px solid var(--border); border-radius:16px; padding:16px; font-family:ui-monospace,Menlo,monospace; font-size:13px; white-space:pre; overflow:auto; line-height:1.6; }
.tip { background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px 16px; margin-bottom:20px; font-size:14px; }
.tip strong { color:#030213; }
.stats { display:flex; gap:16px; flex-wrap:wrap; font-size:13px; color:var(--muted); margin-top:8px; }
@media (max-width:900px) { .layout { grid-template-columns:1fr; } nav.sidebar { position:static; height:auto; } }
`;

const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brand Constructor — Component Index</title>
<style>${css}</style>
</head>
<body>
<header class="top">
  <h1>Brand Constructor — Component Index</h1>
  <p>Справочник Vue-компонентов и BEM-классов для поиска в DevTools</p>
  <div class="toolbar">
    <input id="search" type="search" placeholder="Поиск: ReviewSection, section-comment__ceo-cta, ConceptGrid…" autofocus>
    <button class="filter-btn active" data-filter="all">Все</button>
    <button class="filter-btn" data-filter="bem">Только с BEM</button>
    <button class="filter-btn" data-filter="no-bem">Без BEM</button>
    <button class="filter-btn" data-filter="review">Review</button>
  </div>
</header>
<div class="layout">
  <nav class="sidebar" id="sidebar">${sidebar}</nav>
  <main id="main">${main}</main>
</div>
<script>
const search = document.getElementById('search');
const cards = [...document.querySelectorAll('.card')];
const navLinks = [...document.querySelectorAll('nav.sidebar a')];
let activeFilter = 'all';

function applyFilters() {
  const q = search.value.trim().toLowerCase();
  cards.forEach(card => {
    const hay = (card.dataset.name + ' ' + card.dataset.bem + ' ' + card.dataset.category).toLowerCase();
    const matchSearch = !q || hay.includes(q);
    const hasBem = card.querySelector('.badge.bem');
    let matchFilter = true;
    if (activeFilter === 'bem') matchFilter = !!hasBem;
    if (activeFilter === 'no-bem') matchFilter = !hasBem;
    if (activeFilter === 'review') matchFilter = card.dataset.category === 'review';
    card.classList.toggle('hidden', !(matchSearch && matchFilter));
  });
  navLinks.forEach(a => {
    const hay = (a.dataset.name + ' ' + a.textContent).toLowerCase();
    a.style.display = !q || hay.includes(q) ? '' : 'none';
  });
}

search.addEventListener('input', applyFilters);
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

document.querySelectorAll('code.cls[data-copy]').forEach(el => {
  el.addEventListener('click', async () => {
    const text = el.dataset.copy;
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    el.classList.add('copied');
    el.title = 'Скопировано: ' + text;
    setTimeout(() => el.classList.remove('copied'), 1200);
  });
});
</script>
</body>
</html>`;

const outDir = path.join(pkgRoot, 'docs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'component-index.html');
fs.writeFileSync(outFile, html);

console.log(`✓ Generated ${path.relative(pkgRoot, outFile)} (${catalog.length} components)`);
