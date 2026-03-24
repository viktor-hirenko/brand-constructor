import { useConstructorStore } from '@/stores/constructor';
import type { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';

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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Чернетка',
  submitted: 'На розгляді',
  needs_revision: 'Потребує доопрацювання',
  approved: 'Затверджено',
  rejected: 'Відхилено',
};

interface SectionRow {
  label: string;
  value: string;
}

const STYLES: StyleDictionary = {
  header: { fontSize: 20, bold: true, margin: [0, 0, 0, 4] },
  subheader: { fontSize: 10, color: '#666666', margin: [0, 0, 0, 24] },
  sectionHeader: { fontSize: 13, bold: true, margin: [0, 16, 0, 6] },
};

function val(str: string | null | undefined): string {
  return str?.trim() || '—';
}

function buildSectionContent(title: string, rows: SectionRow[]): Content[] {
  const filtered = rows.filter(r => r.value && r.value !== '—');
  if (filtered.length === 0) return [];

  return [
    { text: title, style: 'sectionHeader' },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#e5e5e5' }],
      margin: [0, 0, 0, 6] as [number, number, number, number],
    },
    {
      table: {
        widths: ['40%', '60%'],
        body: filtered.map(r => [
          { text: r.label, color: '#666666', fontSize: 11 },
          { text: r.value, color: '#1a1a1a', fontSize: 11 },
        ]),
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },
  ];
}

export function usePrintBrand() {
  const store = useConstructorStore();

  function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  function buildDocDefinition(data: PrintBrandData): TDocumentDefinitions {
    const sd = store.stepData;
    const status = store.brandStatus ?? 'draft';
    const dateString = new Date().toLocaleDateString('uk-UA');

    const content: Content[] = [
      { text: `Brand Brief — ${data.brandName}`, style: 'header' },
      { text: dateString, style: 'subheader' },
    ];

    // 1. Brand Basics
    content.push(...buildSectionContent('Brand Basics', [
      { label: 'Назва бренду', value: val(data.brandName) },
      { label: 'Статус', value: STATUS_LABELS[status] ?? status },
      { label: 'Географія', value: val(sd.brandBasics.geo.join(', ')) },
      { label: 'Дата запуску', value: formatDate(sd.brandBasics.launchDate) },
      { label: "Зв'язок з продуктом", value: val(sd.brandBasics.linkedProduct) },
      { label: 'Коментар', value: val(sd.brandBasics.comment) },
    ]));

    // 2. Mode
    content.push(...buildSectionContent('Mode', [
      { label: 'Тема', value: sd.mode === 'dark' ? 'Dark Mode' : sd.mode === 'light' ? 'Light Mode' : '—' },
    ]));

    // 3. Concept
    if (sd.concept.newConceptBrief) {
      const b = sd.concept.newConceptBrief;
      content.push(...buildSectionContent('Концепт (новий бриф)', [
        { label: 'Нове ГЕО?', value: b.isNewGeo === null ? '—' : b.isNewGeo ? 'Так' : 'Ні' },
        { label: 'Інформація по ГЕО', value: val(b.geoInfo) },
        { label: 'Research GEO?', value: b.needsGeoResearch === null ? '—' : b.needsGeoResearch ? 'Так' : 'Ні' },
        { label: 'Що не підійшло', value: val(b.conceptFeedback) },
        { label: 'Інформація від команди Трафіку', value: val(b.trafficTeamInfo) },
        { label: 'Конкуренти', value: val(b.competitors) },
        { label: "Зв'язок з продуктами?", value: b.keepProductConnection === null ? '—' : b.keepProductConnection ? `Так — ${b.connectedProducts}` : 'Ні' },
        { label: 'Мова назви', value: val(b.namingLanguage) },
        { label: 'Бажані слова', value: val(b.desiredWordsInName) },
        { label: 'Домени', value: val(b.domainZones.join(', ')) },
        { label: 'Бюджет домена', value: b.domainBudget !== null ? `$${b.domainBudget}` : '—' },
        { label: 'Дедлайн', value: formatDate(b.namingDeadline) },
        { label: 'Додаткова інфо по ГЕО', value: val(b.additionalGeoInfo ?? '') },
      ]));
    } else if (data.conceptName) {
      content.push(...buildSectionContent('Концепт', [
        { label: 'Назва', value: val(data.conceptName) },
        { label: 'Коментар', value: val(sd.concept.comment) },
      ]));
    }

    // 4. External Naming
    if (sd.externalNaming.newNamingBrief) {
      const b = sd.externalNaming.newNamingBrief;
      content.push(...buildSectionContent('External Naming (новий бриф)', [
        { label: 'Нове ГЕО?', value: b.isNewGeo === null ? '—' : b.isNewGeo ? 'Так' : 'Ні' },
        { label: 'Що не підійшло', value: val(b.namingFeedback) },
        { label: 'Від команди Трафіку', value: val(b.trafficTeamInfo) },
        { label: 'Research GEO?', value: b.needsGeoResearch === null ? '—' : b.needsGeoResearch ? 'Так' : 'Ні' },
        { label: 'Мова', value: val(b.namingLanguage) },
        { label: 'Бажані слова', value: val(b.desiredWordsInName) },
        { label: 'Домени', value: val(b.domainZones.join(', ')) },
        { label: 'Слова для уникнення', value: val(b.wordsToAvoid) },
        { label: 'Бюджет', value: b.domainBudget !== null ? `$${b.domainBudget}` : '—' },
        { label: 'Дедлайн', value: formatDate(b.namingDeadline) },
        { label: 'Додаткова інфо по ГЕО', value: val(b.additionalGeoInfo) },
      ]));
    } else if (data.externalNamingNames.length > 0) {
      content.push(...buildSectionContent('External Naming', [
        { label: 'Обрані назви', value: val(data.externalNamingNames.join(', ')) },
        { label: 'Коментар', value: val(sd.externalNaming.comment) },
      ]));
    }

    // 5. Internal Naming
    if (sd.internalNaming.newNamingFeedback) {
      content.push(...buildSectionContent('Internal Naming (новий)', [
        { label: 'Що не підійшло', value: val(sd.internalNaming.newNamingFeedback) },
      ]));
    } else if (data.internalNamingName) {
      content.push(...buildSectionContent('Internal Naming', [
        { label: 'Назва', value: val(data.internalNamingName) },
        { label: 'Коментар', value: val(sd.internalNaming.comment) },
      ]));
    }

    // 6. Brand Preview
    if (data.previewComment) {
      content.push(...buildSectionContent('Brand Preview', [
        { label: "Коментар до прев'ю", value: val(data.previewComment) },
      ]));
    }

    // 7. PR Package
    if (data.prPackageName) {
      content.push(...buildSectionContent('PR Package', [
        { label: 'Обраний пакет', value: val(data.prPackageName) },
        { label: 'Коментар', value: val(sd.marketingPackage.comment) },
      ]));
    }

    // 8. Deliverables
    content.push(...buildSectionContent('Deliverables', [
      { label: 'Legal Landing', value: sd.deliverables.legalLanding ? 'Так' : 'Ні' },
      { label: 'Partner Landing', value: sd.deliverables.partnerLanding ? 'Так' : 'Ні' },
      { label: 'Дедлайн', value: formatDate(sd.deliverables.developmentDeadline) },
      { label: 'Коментар', value: val(sd.deliverables.comment) },
    ]));

    // 9. Visual Components
    const vcRows: SectionRow[] = [];
    if (sd.visualComponents.delegateToDesigners) {
      vcRows.push({ label: 'Режим', value: 'Делеговано дизайнерам' });
    } else {
      for (const [, info] of Object.entries(data.componentTypes)) {
        vcRows.push({ label: info.typeName, value: info.variantName });
      }
    }
    vcRows.push({ label: 'Коментар', value: val(sd.visualComponents.comment) });
    content.push(...buildSectionContent('Visual Components', vcRows));

    // 10. CEO Comments
    if (data.ceoComments && Object.values(data.ceoComments).some(v => v?.trim())) {
      const ceoRows = Object.entries(data.ceoComments)
        .filter(([, v]) => v?.trim())
        .map(([key, value]) => ({
          label: CEO_SECTION_LABELS[key] ?? key,
          value: value,
        }));
      content.push(...buildSectionContent('Коментарі CEO', ceoRows));
    }

    // 11. CEO Alternatives
    if (data.ceoSelections && Object.values(data.ceoSelections).some(v => v?.trim())) {
      const selRows = Object.entries(data.ceoSelections)
        .filter(([, v]) => v?.trim())
        .map(([key, value]) => ({
          label: CEO_SECTION_LABELS[key] ?? key,
          value: value,
        }));
      content.push(...buildSectionContent('Альтернативи CEO', selRows));
    }

    return {
      info: {
        title: `Brand Brief — ${data.brandName}`,
        author: 'Brand Constructor',
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 11,
        color: '#1a1a1a',
        lineHeight: 1.4,
      },
      styles: STYLES,
      pageSize: 'A4' as const,
      pageMargins: [40, 40, 40, 40] as [number, number, number, number],
      content,
    };
  }

  async function downloadPdf(data: PrintBrandData) {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

    const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
    pdfMake.addVirtualFileSystem(pdfFontsModule.default ?? pdfFontsModule);

    const docDefinition = buildDocDefinition(data);
    const safeName = data.brandName.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
    const filename = `Brand-Brief-${safeName}.pdf`;

    await pdfMake.createPdf(docDefinition).download(filename);
  }

  return { downloadPdf };
}
