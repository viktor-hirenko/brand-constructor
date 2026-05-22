import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { fn } from '@storybook/test';
import SectionCommentBlock from '@/components/constructor/fields/SectionCommentBlock.vue';
import { CEO_COMMENT, PO_COMMENT } from '../mocks/fixtures';

const meta = {
  title: 'Review/SectionCommentBlock',
  component: SectionCommentBlock,
  tags: ['autodocs'],
  args: {
    sectionKey: 'basics',
    'onUpdate:ceoComment': fn(),
    onResolve: fn(),
    onUnresolve: fn(),
  },
} satisfies Meta<typeof SectionCommentBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PoCommentOnly: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: '',
    ceoEditable: false,
  },
};

export const CeoEmptyCta: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: '',
    ceoEditable: true,
  },
};

export const CeoEditing: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: '',
    ceoEditable: true,
    alwaysExpanded: true,
    placeholder: 'Додайте ваші коментарі або побажання…',
  },
};

export const CeoFilledReadonly: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: CEO_COMMENT,
    ceoEditable: false,
  },
};

export const CeoUnresolvedWithResolveUi: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: CEO_COMMENT,
    ceoEditable: false,
    showResolveUi: true,
    ceoResolved: false,
    canResolve: true,
  },
};

export const CeoResolved: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: CEO_COMMENT,
    ceoEditable: false,
    showResolveUi: true,
    ceoResolved: true,
    canResolve: true,
  },
};

export const CeoHighlightedValidation: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: '',
    ceoEditable: true,
    highlighted: true,
    alwaysExpanded: true,
  },
};

export const GeneralCommentAlwaysExpanded: Story = {
  args: {
    sectionKey: 'general',
    ceoComment: CEO_COMMENT,
    ceoEditable: true,
    alwaysExpanded: true,
    emptyLabel: 'Коментар CEO',
    placeholder: 'Додайте ваші коментарі або побажання…',
  },
};

/** CEO resolve button in loading state (API call in-flight) */
export const CeoResolveLoading: Story = {
  args: {
    poComment: PO_COMMENT,
    ceoComment: CEO_COMMENT,
    ceoEditable: false,
    showResolveUi: true,
    ceoResolved: false,
    canResolve: true,
    ceoResolveLoading: true,
  },
};

/**
 * Interactive resolve — click "Позначити як вирішений" / "Повернути" to toggle.
 * Simulates a 600 ms API round-trip before the state flips.
 */
export const InteractiveResolve: Story = {
  name: 'Interactive ▶ resolve / unresolve',
  render: (args) => ({
    components: { SectionCommentBlock },
    setup() {
      const ceoResolved = ref(false);
      const ceoResolveLoading = ref(false);

      async function onResolve() {
        ceoResolveLoading.value = true;
        await new Promise((r) => setTimeout(r, 600));
        ceoResolved.value = true;
        ceoResolveLoading.value = false;
        args.onResolve?.();
      }

      async function onUnresolve() {
        ceoResolveLoading.value = true;
        await new Promise((r) => setTimeout(r, 600));
        ceoResolved.value = false;
        ceoResolveLoading.value = false;
        args.onUnresolve?.();
      }

      return {
        poComment: PO_COMMENT,
        ceoComment: CEO_COMMENT,
        ceoResolved,
        ceoResolveLoading,
        onResolve,
        onUnresolve,
      };
    },
    template: `
      <SectionCommentBlock
        section-key="basics"
        :po-comment="poComment"
        :ceo-comment="ceoComment"
        :ceo-editable="false"
        show-resolve-ui
        :ceo-resolved="ceoResolved"
        :ceo-resolve-loading="ceoResolveLoading"
        can-resolve
        @resolve="onResolve"
        @unresolve="onUnresolve"
      />
    `,
  }),
  args: { ceoEditable: false },
};
