<script setup lang="ts">
/**
 * Warning banner shown on the chained External Naming step after the user
 * changed the concept during a draft inline edit from the final review.
 *
 * Figma ref: node 2864-9219 (Brand-Builder, "Twil" flow) — cream-yellow card,
 * 24px warning icon, title + body.
 */
</script>

<template>
  <div
    class="concept-cascade-banner flex items-start gap-3 rounded-lg border border-[#f5e6bc] bg-[#fefce8] p-4"
    role="status"
  >
    <svg
      class="concept-cascade-banner__icon shrink-0"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#eab308" />
      <path
        d="M12 7.25c.414 0 .75.336.75.75v5a.75.75 0 0 1-1.5 0V8c0-.414.336-.75.75-.75ZM12 15a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"
        fill="#fefce8"
      />
    </svg>
    <div class="concept-cascade-banner__content flex flex-col gap-1">
      <p class="concept-cascade-banner__title text-[16px] font-medium leading-6 text-[#030213]">
        Необхідно обрати External Naming
      </p>
      <p class="concept-cascade-banner__body text-[14px] leading-5 text-[#717182]">
        Попередній вибір більше не відповідає новому концепту.
      </p>
    </div>
  </div>
</template>
