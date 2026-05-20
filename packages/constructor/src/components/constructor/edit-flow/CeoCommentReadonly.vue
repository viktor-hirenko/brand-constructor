<script setup lang="ts">
/**
 * Read-only CEO comment block — matches `StepCommentField` visual style but
 * non-editable. Used on PO edit screens (PoEditConcept/External/InternalView)
 * to surface the CEO's comment that triggered the revision.
 */
interface CeoCommentReadonlyProps {
  value: string
}

defineProps<CeoCommentReadonlyProps>()
</script>

<template>
  <div v-if="value" class="flex flex-col gap-2">
    <div class="flex items-center gap-2 h-6">
      <svg
        class="size-5 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M17.5 10.6323V5.61768C17.5 4.57011 16.7694 3.69157 15.778 3.54574V3.54492C13.8649 3.26416 11.9336 3.12439 10 3.125C8.03728 3.125 6.10774 3.26851 4.22201 3.54574C3.23072 3.69155 2.5 4.57082 2.5 5.61768V10.6331C2.5 11.679 3.23061 12.5584 4.22201 12.7043C5.14811 12.8404 6.08397 12.9446 7.02962 13.0151C7.44987 13.0464 7.84078 13.2438 8.11361 13.5636L8.22347 13.7077L8.22428 13.7093L10 16.3729L11.7773 13.7069C11.9109 13.5084 12.0879 13.3425 12.2949 13.2227C12.5014 13.1031 12.7324 13.0324 12.9704 13.0151L13.6743 12.9565C14.3776 12.8914 15.0791 12.807 15.778 12.7043C16.7694 12.5584 17.5 11.6799 17.5 10.6323ZM10 8.75C10.3452 8.75 10.625 9.02982 10.625 9.375C10.625 9.72018 10.3452 10 10 10H6.25C5.90482 10 5.625 9.72018 5.625 9.375C5.625 9.02982 5.90482 8.75 6.25 8.75H10ZM13.75 6.25C14.0952 6.25 14.375 6.52982 14.375 6.875C14.375 7.22018 14.0952 7.5 13.75 7.5H6.25C5.90482 7.5 5.625 7.22018 5.625 6.875C5.625 6.52982 5.90482 6.25 6.25 6.25H13.75Z"
          fill="#5B5B62"
        />
      </svg>
      <span
        class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5b5b62]"
      >
        Коментар СЕО
      </span>
    </div>
    <div
      class="w-full px-4 py-4 bg-[rgba(197,197,200,0.2)] rounded-[8px] text-[16px] leading-6 tracking-[-0.1504px] text-[#3d3d3d] whitespace-pre-line"
    >
      {{ value }}
    </div>
  </div>
</template>
