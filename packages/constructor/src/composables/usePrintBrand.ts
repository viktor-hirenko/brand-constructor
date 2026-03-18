import { useConstructorStore } from '@/stores/constructor';

export interface PrintBrandData {
  brandName: string;
  conceptName: string | null;
  externalNamingNames: string[];
  internalNamingName: string | null;
  prPackageName: string | null;
  componentLabels: Record<string, string>;
}

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  ct_header: 'Хедер',
  ct_banners: 'Банери',
  ct_thumbnails: 'Сабнейли',
  ct_tabbar: 'Таббар',
  ct_sidebar: 'Сайдбар',
  ct_theme: 'Тема',
};

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
      .map(r => `<tr><td class="label">${esc(r.label)}</td><td class="value">${esc(r.value)}</td></tr>`)
      .join('');
    if (!rowsHtml) return '';
    return `<div class="section"><h2>${esc(title)}</h2><table>${rowsHtml}</table></div>`;
  }

  function generatePrintHtml(data: PrintBrandData): string {
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
      for (const [typeId, variantName] of Object.entries(data.componentLabels)) {
        const typeLabel = COMPONENT_TYPE_LABELS[typeId] ?? typeId;
        vcRows.push({ label: typeLabel, value: variantName });
      }
    }
    vcRows.push({ label: 'Коментар', value: sd.visualComponents.comment });
    sections += buildSection('Visual Components', vcRows);

    return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Brand Brief — ${esc(data.brandName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 32px; }
    .section { margin-bottom: 24px; break-inside: avoid; }
    .section h2 { font-size: 16px; font-weight: 600; padding: 8px 0; border-bottom: 2px solid #e5e5e5; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 0; font-size: 14px; vertical-align: top; }
    td.label { width: 40%; color: #666; }
    td.value { width: 60%; }
    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Brand Brief — ${esc(data.brandName)}</h1>
  <div class="meta">${new Date().toLocaleDateString('uk-UA')}</div>
  ${sections}
</body>
</html>`;
  }

  function printBrand(data: PrintBrandData) {
    const html = generatePrintHtml(data);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  return { printBrand };
}
