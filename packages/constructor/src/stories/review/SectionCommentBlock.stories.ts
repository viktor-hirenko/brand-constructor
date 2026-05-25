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
    'onUpdate:supervisorComment': fn(),
    onResolve: fn(),
    onUnresolve: fn(),
  },
} satisfies Meta<typeof SectionCommentBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AuthorCommentOnly: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: '',
    supervisorEditable: false,
  },
};

export const SupervisorEmptyCta: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: '',
    supervisorEditable: true,
  },
};

export const SupervisorEditing: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: '',
    supervisorEditable: true,
    alwaysExpanded: true,
    placeholder: 'Додайте ваші коментарі або побажання…',
  },
};

export const SupervisorFilledReadonly: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: CEO_COMMENT,
    supervisorEditable: false,
  },
};

export const SupervisorUnresolvedWithResolveUi: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: CEO_COMMENT,
    supervisorEditable: false,
    showResolveUi: true,
    supervisorResolved: false,
    canResolve: true,
  },
};

export const SupervisorResolved: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: CEO_COMMENT,
    supervisorEditable: false,
    showResolveUi: true,
    supervisorResolved: true,
    canResolve: true,
  },
};

export const SupervisorHighlightedValidation: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: '',
    supervisorEditable: true,
    highlighted: true,
    alwaysExpanded: true,
  },
};

export const GeneralCommentAlwaysExpanded: Story = {
  args: {
    sectionKey: 'general',
    supervisorComment: CEO_COMMENT,
    supervisorEditable: true,
    alwaysExpanded: true,
    emptyLabel: 'Коментар CEO',
    placeholder: 'Додайте ваші коментарі або побажання…',
  },
};

/** Supervisor resolve button in loading state (API call in-flight) */
export const SupervisorResolveLoading: Story = {
  args: {
    authorComment: PO_COMMENT,
    supervisorComment: CEO_COMMENT,
    supervisorEditable: false,
    showResolveUi: true,
    supervisorResolved: false,
    canResolve: true,
    supervisorResolveLoading: true,
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
      const supervisorResolved = ref(false);
      const supervisorResolveLoading = ref(false);

      async function onResolve() {
        supervisorResolveLoading.value = true;
        await new Promise((r) => setTimeout(r, 600));
        supervisorResolved.value = true;
        supervisorResolveLoading.value = false;
        args.onResolve?.();
      }

      async function onUnresolve() {
        supervisorResolveLoading.value = true;
        await new Promise((r) => setTimeout(r, 600));
        supervisorResolved.value = false;
        supervisorResolveLoading.value = false;
        args.onUnresolve?.();
      }

      return {
        authorComment: PO_COMMENT,
        supervisorComment: CEO_COMMENT,
        supervisorResolved,
        supervisorResolveLoading,
        onResolve,
        onUnresolve,
      };
    },
    template: `
      <SectionCommentBlock
        section-key="basics"
        :author-comment="authorComment"
        :supervisor-comment="supervisorComment"
        :supervisor-editable="false"
        show-resolve-ui
        :supervisor-resolved="supervisorResolved"
        :supervisor-resolve-loading="supervisorResolveLoading"
        can-resolve
        @resolve="onResolve"
        @unresolve="onUnresolve"
      />
    `,
  }),
  args: { supervisorEditable: false },
};
