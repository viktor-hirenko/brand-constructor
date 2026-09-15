<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { GEO_COUNTRIES, type GeoOption } from '@/data/geo-countries';
import CloseIcon from '@/components/icons/CloseIcon.vue'
import CheckIcon from '@/components/icons/CheckIcon.vue';
import UiBadge from '@/components/ui/UiBadge.vue'
import UiListItem from '@/components/ui/UiListItem.vue'
import UiPopover from '@/components/ui/UiPopover.vue'
import { UI_POPOVER_HEADER_CLASS } from '@/components/ui/uiListItem'
import { UI_FIELD_CONTROL_BASE_CLASS, resolveUiFieldSurfaceClasses } from '@/components/ui/uiField'

/**
 * Phase 11 put this control on the kit.
 *
 * The trigger is the kit Input surface (`3424:2287`) in the `fluid` type: the
 * kit has no multi-value field, and a fixed 48 would clip the second row of
 * badges, so the box floors at the kit's 48 and grows. Everything painted on it
 * — fill, border, hover, focus, radius — comes from `resolveUiFieldSurfaceClasses`,
 * the same function the date trigger and the brief-order form fields call.
 *
 * The list below it is the kit Popover `3446:5235` with kit List items
 * `3446:5054`; the section headers are the kit's own Header slot, which used to
 * be an uppercase 12/16 caption of our own making.
 */
const model = defineModel<string[]>({ required: true });

const isOpen = ref(false);
const search = ref('');
const containerRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

const triggerClass = computed(() =>
  resolveUiFieldSurfaceClasses({ type: 'fluid', focused: isOpen.value })
)

const popularGeos = computed(() =>
  GEO_COUNTRIES.filter((g) => g.popular),
);
const otherGeos = computed(() =>
  GEO_COUNTRIES.filter((g) => !g.popular),
);

function matchesSearch(geo: GeoOption): boolean {
  if (!search.value) return true;
  const q = search.value.toLowerCase();
  return geo.code.toLowerCase().includes(q) || geo.name.toLowerCase().includes(q);
}

const popularFiltered = computed(() => popularGeos.value.filter(matchesSearch));
const otherFiltered = computed(() => otherGeos.value.filter(matchesSearch));
const hasResults = computed(() => popularFiltered.value.length > 0 || otherFiltered.value.length > 0);

function isSelected(code: string): boolean {
  return model.value.includes(code);
}

function toggleGeo(code: string) {
  if (isSelected(code)) {
    model.value = model.value.filter((c) => c !== code);
  } else {
    model.value = [...model.value, code];
  }
  search.value = '';
}

function removeGeo(code: string) {
  model.value = model.value.filter((c) => c !== code);
}

function openDropdown() {
  isOpen.value = true;
  search.value = '';
}

function closeDropdown() {
  isOpen.value = false;
}

function handleDocumentPointerDown(event: MouseEvent) {
  if (!isOpen.value || !containerRef.value) return;
  const target = event.target;
  if (target instanceof Node && !containerRef.value.contains(target)) {
    closeDropdown();
  }
}

watch(isOpen, (open) => {
  if (open) {
    // Defer so the opening click does not immediately close the dropdown.
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleDocumentPointerDown);
    });
  } else {
    document.removeEventListener('mousedown', handleDocumentPointerDown);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown);
});
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Kit Input surface, Type = fluid — see the note in <script>. -->
    <div :class="[triggerClass, 'cursor-text']" @click="openDropdown(); searchInputRef?.focus()">
      <!--
        Kit badge `3453:1619`, neutral tone, with the remove control riding the
        kit's own `Icon right` slot. Was a rounded-6 `bg-primary/10` chip at
        14/16 — the one badge recipe in the wizard that was neither a pill nor
        a kit colour.
      -->
      <UiBadge v-for="code in model" :key="code" tone="neutral" :label="code">
        <template #trailing>
          <button
            type="button"
            class="geo-multi-select__chip-remove inline-flex size-4 items-center justify-center text-ink-700 transition-colors hover:text-ink-900"
            :aria-label="`Прибрати ${code}`"
            @click.stop="removeGeo(code)"
          >
            <CloseIcon class="size-3.5" :stroke-width="2.5" />
          </button>
        </template>
      </UiBadge>
      <input
        ref="searchInputRef"
        v-model="search"
        type="text"
        :placeholder="model.length === 0 ? 'Наприклад: UK, DE, PT' : 'Пошук...'"
        :class="[UI_FIELD_CONTROL_BASE_CLASS, 'w-auto min-w-20 flex-1']"
        @focus="openDropdown"
      />
    </div>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <UiPopover
        v-if="isOpen"
        class="absolute z-50 top-full left-0 w-full mt-1.5 max-h-70 overflow-y-auto"
      >
        <template v-if="hasResults">
          <!-- Popular -->
          <template v-if="popularFiltered.length">
            <div :class="UI_POPOVER_HEADER_CLASS">Популярні</div>
            <UiListItem
              v-for="geo in popularFiltered"
              :key="geo.code"
              :selected="isSelected(geo.code)"
              @click="toggleGeo(geo.code)"
            >
              <span class="font-medium">{{ geo.code }}</span>
              <span class="text-ink-700 ml-1.5">{{ geo.name }}</span>
              <template v-if="isSelected(geo.code)" #trailing>
                <CheckIcon class="size-4 shrink-0 text-ink-900" />
              </template>
            </UiListItem>
          </template>

          <!-- Other -->
          <template v-if="otherFiltered.length">
            <div :class="UI_POPOVER_HEADER_CLASS">Інші</div>
            <UiListItem
              v-for="geo in otherFiltered"
              :key="geo.code"
              :selected="isSelected(geo.code)"
              @click="toggleGeo(geo.code)"
            >
              <span class="font-medium">{{ geo.code }}</span>
              <span class="text-ink-700 ml-1.5">{{ geo.name }}</span>
              <template v-if="isSelected(geo.code)" #trailing>
                <CheckIcon class="size-4 shrink-0 text-ink-900" />
              </template>
            </UiListItem>
          </template>
        </template>

        <p v-else class="p-4 text-center text-sm/4 text-ink-700">
          Нічого не знайдено
        </p>
      </UiPopover>
    </Transition>
  </div>
</template>
