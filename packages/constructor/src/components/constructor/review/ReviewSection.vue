<script setup lang="ts">
interface ReviewSectionProps {
  title: string
  /** Render the "Змінити вибір" button in the header. */
  changeChoice?: boolean
  /** PO final review: step number for "Редагувати" → navigate to step. */
  editStep?: number
  /** Highlight the section (amber border) when validation requires action here. */
  highlighted?: boolean
  /** No card chrome (border/hr) — for loose blocks only if needed. */
  borderless?: boolean
}

const props = withDefaults(defineProps<ReviewSectionProps>(), {
  changeChoice: false,
  editStep: undefined,
  highlighted: false,
  borderless: false,
})

const emit = defineEmits<{
  change: []
  edit: [step: number]
}>()

function onEditClick() {
  if (props.editStep != null) {
    emit('edit', props.editStep)
  }
}
</script>

<template>
  <section v-if="borderless" class="space-y-4">
    <slot />
    <slot name="comment" />
  </section>

  <section
    v-else
    :class="[
      'rounded-2xl border bg-white transition-colors',
      highlighted ? 'border-amber-400 ring-2 ring-amber-200' : 'border-[#EDEDED]',
    ]"
  >
    <header class="flex items-center justify-between h-14 pl-4 pr-2">
      <h3
        class="text-[18px] font-medium leading-6 tracking-[-0.1504px] text-[#0a0a0a]"
      >
        {{ title }}
      </h3>
      <button
        v-if="editStep != null"
        type="button"
        class="inline-flex items-center gap-1 h-10 px-3 rounded-lg text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#373737] hover:bg-black/[0.04] transition-colors"
        @click="onEditClick"
      >
        <svg
          class="size-4 shrink-0 text-[#373737]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        Редагувати
      </button>
      <button
        v-else-if="changeChoice"
        type="button"
        class="inline-flex items-center gap-1 h-10 px-3 rounded-lg text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#373737] hover:bg-black/[0.04] transition-colors"
        @click="emit('change')"
      >
        <svg
          class="size-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.6842 7.61193C2.88059 7.45171 3.17039 7.46336 3.35347 7.64644L5.35347 9.64644C5.54871 9.8417 5.54872 10.1582 5.35347 10.3535C5.15821 10.5487 4.84169 10.5487 4.64644 10.3535L3.52339 9.23042C3.53078 9.42293 3.53985 9.615 3.55073 9.80659L3.59045 10.4036V10.4043C3.62879 10.9233 3.85266 11.4113 4.22066 11.7793C4.58865 12.1472 5.07665 12.3711 5.59566 12.4095H5.59631C7.19646 12.5302 8.80345 12.5302 10.4036 12.4095H10.4042C10.9233 12.3711 11.4113 12.1472 11.7792 11.7793C12.1472 11.4113 12.3711 10.9233 12.4095 10.4043V10.4029C12.4206 10.2593 12.4302 10.114 12.4394 9.96805C12.457 9.69266 12.6946 9.48329 12.97 9.5006C13.2455 9.51806 13.4547 9.75574 13.4375 10.0312C13.4281 10.1791 13.4177 10.3283 13.4062 10.4772L13.4069 10.4778C13.3509 11.2359 13.0238 11.9487 12.4863 12.4863C11.9487 13.0238 11.2359 13.3509 10.4778 13.4069L10.4772 13.4062C8.8278 13.5306 7.17146 13.5306 5.52209 13.4062V13.4069C4.76398 13.3509 4.05116 13.0238 3.51362 12.4863C2.97609 11.9487 2.64905 11.2359 2.59305 10.4778V10.4772C2.56046 10.0485 2.53695 9.61769 2.52144 9.18485L1.35347 10.3535C1.15821 10.5487 0.841694 10.5487 0.646437 10.3535C0.451181 10.1582 0.451194 9.8417 0.646437 9.64644L2.64644 7.64644L2.6842 7.61193ZM5.52079 2.5937C7.17107 2.4692 8.82883 2.46855 10.4791 2.59305L10.4785 2.5937C11.2364 2.64979 11.9488 2.97618 12.4863 3.51362C13.0237 4.05109 13.3508 4.76343 13.4069 5.52144H13.4062C13.4388 5.95031 13.4623 6.38134 13.4778 6.81441L14.6464 5.64644C14.8417 5.45118 15.1582 5.45118 15.3535 5.64644C15.5487 5.8417 15.5487 6.15821 15.3535 6.35347L13.3535 8.35347C13.1582 8.5487 12.8417 8.5487 12.6464 8.35347L10.6464 6.35347C10.4512 6.15821 10.4512 5.8417 10.6464 5.64644C10.8417 5.45118 11.1582 5.45118 11.3535 5.64644L12.4759 6.76883C12.4608 6.37615 12.439 5.98513 12.4095 5.59631V5.59566C12.3711 5.07665 12.1472 4.58865 11.7792 4.22066C11.4112 3.85266 10.9233 3.62879 10.4042 3.59045H10.4036C8.80344 3.46973 7.19646 3.46973 5.59631 3.59045H5.59566C5.07664 3.62879 4.58866 3.85266 4.22066 4.22066C3.85267 4.58865 3.62879 5.07665 3.59045 5.59566V5.59696C3.57936 5.74047 3.56974 5.88541 3.5605 6.0312C3.54305 6.30672 3.3054 6.51599 3.0299 6.49865C2.75431 6.48119 2.54499 6.24364 2.56245 5.96805C2.57184 5.81985 2.58153 5.67059 2.59305 5.52144C2.64911 4.76343 2.97617 4.05109 3.51362 3.51362C4.05092 2.97633 4.76305 2.64992 5.52079 2.5937Z"
            fill="#373737"
          />
        </svg>
        Змінити вибір
      </button>
    </header>
    <hr class="border-t border-black/10" />
    <div class="p-4 flex flex-col gap-4">
      <slot />
      <slot name="comment" />
    </div>
  </section>
</template>
