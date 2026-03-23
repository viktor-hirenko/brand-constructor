import { useConstructorStore } from '@/stores/constructor';

export interface ComponentTypeInfo {
  typeName: string;
  variantName: string;
}

export interface PrintBrandData {
  brandName: string;
  conceptName: string | null;
  externalNamingNames: string[];
  internalNamingName: string | null;
  prPackageName: string | null;
  componentTypes: Record<string, ComponentTypeInfo>;
  ceoComments?: Record<string, string> | null;
  ceoSelections?: Record<string, string> | null;
  previewComment?: string;
}

const CEO_SECTION_LABELS: Record<string, string> = {
  concept: 'Концепт',
  externalNaming: 'Зовнішня назва',
  internalNaming: 'Внутрішня назва',
  marketingPackage: 'PR пакет',
  deliverables: 'Deliverables',
  visualComponents: 'Візуальні компоненти',
  general: 'Загальний коментар',
};

const S = {
  section: 'margin-bottom:24px;break-inside:avoid',
  h2: 'font-size:16px;font-weight:600;padding:8px 0;border-bottom:2px solid #e5e5e5;margin:0 0 8px 0',
  table: 'width:100%;border-collapse:collapse',
  tdLabel: 'padding:6px 0;font-size:14px;vertical-align:top;width:40%;color:#666',
  tdValue: 'padding:6px 0;font-size:14px;vertical-align:top;width:60%;color:#1a1a1a',
} as const;

export function usePrintBrand() {
  const store = useConstructorStore();

  function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  function esc(str: string | null | undefined): string {
    if (!str) return '—';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildSection(title: string, rows: Array<{ label: string; value: string }>): string {
    const rowsHtml = rows
      .filter(r => r.value && r.value !== '—')
      .map(
        r =>
          `<tr><td style="${S.tdLabel}">${esc(r.label)}</td><td style="${S.tdValue}">${esc(r.value)}</td></tr>`
      )
      .join('');
    if (!rowsHtml) return '';
    return `<div style="${S.section}"><h2 style="${S.h2}">${esc(title)}</h2><table style="${S.table}">${rowsHtml}</table></div>`;
  }

  function generatePrintContent(data: PrintBrandData): string {
    const sd = store.stepData;
    const status = store.brandStatus ?? 'draft';

    const STATUS_LABELS: Record<string, string> = {
      draft: 'Чернетка',
      submitted: 'На розгляді',
      needs_revision: 'Потребує доопрацювання',
      approved: 'Затверджено',
      rejected: 'Відхилено',
    };

    let sections = '';

    sections += buildSection('Brand Basics', [
      { label: 'Назва бренду', value: data.brandName },
      { label: 'Статус', value: STATUS_LABELS[status] ?? status },
      { label: 'Географія', value: sd.brandBasics.geo.join(', ') },
      { label: 'Дата запуску', value: formatDate(sd.brandBasics.launchDate) },
      { label: "Зв'язок з продуктом", value: sd.brandBasics.linkedProduct },
      { label: 'Коментар', value: sd.brandBasics.comment },
    ]);

    sections += buildSection('Mode', [
      { label: 'Тема', value: sd.mode === 'dark' ? 'Dark Mode' : sd.mode === 'light' ? 'Light Mode' : '—' },
    ]);

    if (sd.concept.newConceptBrief) {
      const b = sd.concept.newConceptBrief;
      sections += buildSection('Концепт (новий бриф)', [
        { label: 'Нове ГЕО?', value: b.isNewGeo === null ? '—' : b.isNewGeo ? 'Так' : 'Ні' },
        { label: 'Інформація по ГЕО', value: b.geoInfo },
        { label: 'Research GEO?', value: b.needsGeoResearch === null ? '—' : b.needsGeoResearch ? 'Так' : 'Ні' },
        { label: 'Що не підійшло', value: b.conceptFeedback },
        { label: 'Інформація від команди Трафіку', value: b.trafficTeamInfo },
        { label: 'Конкуренти', value: b.competitors },
        { label: "Зв'язок з продуктами?", value: b.keepProductConnection === null ? '—' : b.keepProductConnection ? `Так — ${b.connectedProducts}` : 'Ні' },
        { label: 'Мова назви', value: b.namingLanguage },
        { label: 'Бажані слова', value: b.desiredWordsInName },
        { label: 'Домени', value: b.domainZones.join(', ') },
        { label: 'Бюджет домена', value: b.domainBudget !== null ? `$${b.domainBudget}` : '—' },
        { label: 'Дедлайн', value: formatDate(b.namingDeadline) },
        { label: 'Додаткова інфо по ГЕО', value: b.additionalGeoInfo ?? '' },
      ]);
    } else if (data.conceptName) {
      sections += buildSection('Концепт', [
        { label: 'Назва', value: data.conceptName },
        { label: 'Коментар', value: sd.concept.comment },
      ]);
    }

    if (sd.externalNaming.newNamingBrief) {
      const b = sd.externalNaming.newNamingBrief;
      sections += buildSection('External Naming (новий бриф)', [
        { label: 'Нове ГЕО?', value: b.isNewGeo === null ? '—' : b.isNewGeo ? 'Так' : 'Ні' },
        { label: 'Що не підійшло', value: b.namingFeedback },
        { label: 'Від команди Трафіку', value: b.trafficTeamInfo },
        { label: 'Research GEO?', value: b.needsGeoResearch === null ? '—' : b.needsGeoResearch ? 'Так' : 'Ні' },
        { label: 'Мова', value: b.namingLanguage },
        { label: 'Бажані слова', value: b.desiredWordsInName },
        { label: 'Домени', value: b.domainZones.join(', ') },
        { label: 'Слова для уникнення', value: b.wordsToAvoid },
        { label: 'Бюджет', value: b.domainBudget !== null ? `$${b.domainBudget}` : '—' },
        { label: 'Дедлайн', value: formatDate(b.namingDeadline) },
        { label: 'Додаткова інфо по ГЕО', value: b.additionalGeoInfo },
      ]);
    } else if (data.externalNamingNames.length > 0) {
      sections += buildSection('External Naming', [
        { label: 'Обрані назви', value: data.externalNamingNames.join(', ') },
        { label: 'Коментар', value: sd.externalNaming.comment },
      ]);
    }

    if (sd.internalNaming.newNamingFeedback) {
      sections += buildSection('Internal Naming (новий)', [
        { label: 'Що не підійшло', value: sd.internalNaming.newNamingFeedback },
      ]);
    } else if (data.internalNamingName) {
      sections += buildSection('Internal Naming', [
        { label: 'Назва', value: data.internalNamingName },
        { label: 'Коментар', value: sd.internalNaming.comment },
      ]);
    }

    if (data.previewComment) {
      sections += buildSection('Brand Preview', [
        { label: 'Коментар до прев\'ю', value: data.previewComment },
      ]);
    }

    if (data.prPackageName) {
      sections += buildSection('PR Package', [
        { label: 'Обраний пакет', value: data.prPackageName },
        { label: 'Коментар', value: sd.marketingPackage.comment },
      ]);
    }

    sections += buildSection('Deliverables', [
      { label: 'Legal Landing', value: sd.deliverables.legalLanding ? 'Так' : 'Ні' },
      { label: 'Partner Landing', value: sd.deliverables.partnerLanding ? 'Так' : 'Ні' },
      { label: 'Дедлайн', value: formatDate(sd.deliverables.developmentDeadline) },
      { label: 'Коментар', value: sd.deliverables.comment },
    ]);

    const vcRows: Array<{ label: string; value: string }> = [];
    if (sd.visualComponents.delegateToDesigners) {
      vcRows.push({ label: 'Режим', value: 'Делеговано дизайнерам' });
    } else {
      for (const [, info] of Object.entries(data.componentTypes)) {
        vcRows.push({ label: info.typeName, value: info.variantName });
      }
    }
    vcRows.push({ label: 'Коментар', value: sd.visualComponents.comment });
    sections += buildSection('Visual Components', vcRows);

    if (data.ceoComments && Object.values(data.ceoComments).some(v => v?.trim())) {
      const ceoRows = Object.entries(data.ceoComments)
        .filter(([, v]) => v?.trim())
        .map(([key, value]) => ({
          label: CEO_SECTION_LABELS[key] ?? key,
          value: value,
        }));
      sections += buildSection('Коментарі CEO', ceoRows);
    }

    if (data.ceoSelections && Object.values(data.ceoSelections).some(v => v?.trim())) {
      const selRows = Object.entries(data.ceoSelections)
        .filter(([, v]) => v?.trim())
        .map(([key, value]) => ({
          label: CEO_SECTION_LABELS[key] ?? key,
          value: value,
        }));
      sections += buildSection('Альтернативи CEO', selRows);
    }

    return `<h1 style="font-size:24px;margin:0 0 8px 0;color:#1a1a1a">Brand Brief &mdash; ${esc(data.brandName)}</h1>
<div style="font-size:13px;color:#666;margin-bottom:32px">${new Date().toLocaleDateString('uk-UA')}</div>
${sections}`;
  }

  function generatePrintHtml(data: PrintBrandData): string {
    const content = generatePrintContent(data);
    return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Brand Brief — ${esc(data.brandName)}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto">
  ${content}
</body>
</html>`;
  }

  async function downloadPdf(data: PrintBrandData) {
    const content = generatePrintContent(data);

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:white;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML =
      '<p style="font-size:18px;color:#999;font-family:sans-serif">Генерація PDF...</p>';
    document.body.appendChild(overlay);

    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position:fixed;left:0;top:0;width:800px;z-index:99998;background:white;padding:40px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1a1a1a;line-height:1.4';
    wrapper.innerHTML = content;
    document.body.appendChild(wrapper);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: 'Brand-Brief.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(wrapper)
        .save();
    } finally {
      document.body.removeChild(wrapper);
      document.body.removeChild(overlay);
      document.body.style.overflow = prevOverflow;
    }
  }

  return { downloadPdf, generatePrintHtml };
}
