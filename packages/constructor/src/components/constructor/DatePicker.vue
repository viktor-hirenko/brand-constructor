<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

const model = defineModel<string>({ required: true });

const isOpen = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const popoverStyle = ref({ top: '0px', left: '0px' });

const MONTH_NAMES = [
  'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
  'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
];
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];

const today = new Date();
today.setHours(0, 0, 0, 0);

const viewYear = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());

watch(isOpen, (open) => {
  if (open && model.value) {
    const d = new Date(model.value + 'T00:00:00');
    viewYear.value = d.getFullYear();
    viewMonth.value = d.getMonth();
  } else if (open) {
    viewYear.value = today.getFullYear();
    viewMonth.value = today.getMonth();
  }
});

const monthLabel = computed(() => `${MONTH_NAMES[viewMonth.value]} ${viewYear.value}`);

interface DayCell {
  date: Date;
  day: number;
  isOutside: boolean;
  isToday: boolean;
  isSelected: boolean;
  dateStr: string;
}

const calendarDays = computed((): DayCell[][] => {
  const year = viewYear.value;
  const month = viewMonth.value;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const prefixDays = startDow - 1;

  const totalDays = lastDay.getDate();
  const totalCells = Math.ceil((prefixDays + totalDays) / 7) * 7;

  const weeks: DayCell[][] = [];
  let week: DayCell[] = [];

  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, 1 - prefixDays + i);
    const dateStr = formatISO(date);
    const isOutside = date.getMonth() !== month;

    week.push({
      date,
      day: date.getDate(),
      isOutside,
      isToday: dateStr === formatISO(today),
      isSelected: dateStr === model.value,
      dateStr,
    });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  return weeks;
});

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return formatted.replace(/\s*р\.$/, '');
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value--;
  } else {
    viewMonth.value--;
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value++;
  } else {
    viewMonth.value++;
  }
}

function selectDay(cell: DayCell) {
  model.value = cell.dateStr;
  isOpen.value = false;
}

function updatePopoverPosition() {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const popoverHeight = 340;
  const spaceBelow = window.innerHeight - rect.bottom;

  if (spaceBelow >= popoverHeight + 8) {
    popoverStyle.value = {
      top: `${rect.bottom + 6}px`,
      left: `${rect.left}px`,
    };
  } else {
    popoverStyle.value = {
      top: `${rect.top - popoverHeight - 6}px`,
      left: `${rect.left}px`,
    };
  }
}

async function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await nextTick();
    updatePopoverPosition();
  }
}
</script>

<template>
  <div class="relative">
    <!-- Trigger button -->
    <button
      ref="triggerRef"
      type="button"
      class="w-full px-4 py-3 bg-input border border-black/10 rounded-[10px] text-left flex items-center justify-between min-h-[50px] transition-all hover:border-black/20"
      :class="isOpen ? 'ring-2 ring-primary/20' : ''"
      @click="toggle"
    >
      <span :class="model ? 'font-medium text-foreground' : 'text-foreground/50'">
        {{ model ? formatDisplay(model) : 'Виберіть дату' }}
      </span>
      <svg
        class="size-4 text-muted-foreground shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M8 2v4" /><path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
      </svg>
    </button>

    <!-- Teleported to body to escape overflow clipping -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9998]"
        @click="isOpen = false"
      />

      <!-- Calendar popover -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="isOpen"
          class="fixed z-[9999] bg-card border border-border rounded-lg shadow-lg p-4"
          :style="popoverStyle"
        >
          <!-- Header: month navigation -->
          <div class="flex justify-center pt-1 relative items-center mb-4">
            <div class="text-sm font-medium" aria-live="polite">
              {{ monthLabel }}
            </div>
            <button
              type="button"
              class="absolute left-1 h-7 w-7 inline-flex items-center justify-center rounded-md opacity-50 hover:opacity-100 hover:bg-accent transition-colors"
              aria-label="Попередній місяць"
              @click="prevMonth"
            >
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              class="absolute right-1 h-7 w-7 inline-flex items-center justify-center rounded-md opacity-50 hover:opacity-100 hover:bg-accent transition-colors"
              aria-label="Наступний місяць"
              @click="nextMonth"
            >
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <!-- Weekday headers -->
          <table class="w-full border-collapse" role="grid">
            <thead>
              <tr class="flex">
                <th
                  v-for="wd in WEEKDAYS"
                  :key="wd"
                  scope="col"
                  class="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center"
                >
                  {{ wd }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(week, wi) in calendarDays" :key="wi" class="flex w-full mt-2">
                <td
                  v-for="cell in week"
                  :key="cell.dateStr"
                  class="h-9 w-9 text-center text-sm p-0 relative"
                  role="presentation"
                >
                  <button
                    type="button"
                    class="h-9 w-9 p-0 font-normal rounded-md transition-colors"
                    :class="[
                      cell.isSelected
                        ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                        : cell.isToday && !cell.isOutside
                          ? 'bg-accent text-accent-foreground'
                          : cell.isOutside
                            ? 'text-muted-foreground opacity-50 hover:bg-accent/50'
                            : 'hover:bg-accent hover:text-accent-foreground',
                    ]"
                    @click="selectDay(cell)"
                  >
                    {{ cell.day }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
