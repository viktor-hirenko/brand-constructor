<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import ChevronLeftIcon from '@/components/icons/ChevronLeftIcon.vue'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPopover from '@/components/ui/UiPopover.vue'
import { UI_FIELD_ICON_CLASS, resolveUiFieldSurfaceClasses } from '@/components/ui/uiField'

/**
 * Phase 11 put the trigger and the popover on the kit.
 *
 * The trigger is the kit Dropdown, and the kit spells a Dropdown as an Input:
 * `get_variable_defs 3446:5801` returns the Input tokens verbatim
 * (`input/bg/default`, `input/border/default`, `input/border/focused`,
 * `radius/input`) plus the list tokens, and `get_metadata 5562:49232` measures
 * the field at 48 — the same box as a text field. So it takes
 * `resolveUiFieldSurfaceClasses` with `focusWithin: false`, because here the
 * surface IS the focusable control.
 *
 * The calendar grid itself is left alone: the kit draws no calendar, and
 * inventing one would be redesign, not вынос. Recorded in the task document.
 */

const props = defineProps<{
  minDate?: string
}>()

const model = defineModel<string>({ required: true })

/**
 * `blur` — the person is done with the field: the calendar closed (a day
 * picked, the trigger pressed again, a click outside), or focus left the
 * trigger while the calendar was shut (Tab past it). Step 1 shows «Вкажіть
 * дату запуску» on it when no day was picked (H-38).
 */
const emit = defineEmits<{ blur: [] }>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const popoverRef = ref<HTMLElement | ComponentPublicInstance | null>(null)
const triggerClass = computed(() =>
  resolveUiFieldSurfaceClasses({ focusWithin: false, focused: isOpen.value })
)
const popoverStyle = ref({ top: '0px', left: '0px' })

const MONTH_NAMES = [
  'січень',
  'лютий',
  'березень',
  'квітень',
  'травень',
  'червень',
  'липень',
  'серпень',
  'вересень',
  'жовтень',
  'листопад',
  'грудень',
]
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд']

const today = new Date()
today.setHours(0, 0, 0, 0)

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

watch(isOpen, open => {
  if (open && model.value) {
    const d = new Date(model.value + 'T00:00:00')
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  } else if (open) {
    viewYear.value = today.getFullYear()
    viewMonth.value = today.getMonth()
  }

  if (open) {
    // Defer so the opening click does not immediately close the popover.
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleDocumentPointerDown)
    })
  } else {
    document.removeEventListener('mousedown', handleDocumentPointerDown)
    emit('blur')
  }
})

/** While the calendar is open the trigger loses focus to its days — that is not leaving. */
function handleTriggerBlur() {
  if (!isOpen.value) emit('blur')
}

function popoverElement(): HTMLElement | null {
  const value = popoverRef.value
  if (!value) return null
  return value instanceof HTMLElement ? value : (value.$el as HTMLElement)
}

function handleDocumentPointerDown(event: MouseEvent) {
  if (!isOpen.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (containerRef.value?.contains(target)) return
  if (popoverElement()?.contains(target)) return
  isOpen.value = false
}

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
})

const monthLabel = computed(() => `${MONTH_NAMES[viewMonth.value]} ${viewYear.value}`)

interface DayCell {
  date: Date
  day: number
  isOutside: boolean
  isToday: boolean
  isSelected: boolean
  dateStr: string
}

const calendarDays = computed((): DayCell[][] => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startDow = firstDay.getDay()
  if (startDow === 0) startDow = 7
  const prefixDays = startDow - 1

  const totalDays = lastDay.getDate()
  const totalCells = Math.ceil((prefixDays + totalDays) / 7) * 7

  const weeks: DayCell[][] = []
  let week: DayCell[] = []

  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, 1 - prefixDays + i)
    const dateStr = formatISO(date)
    const isOutside = date.getMonth() !== month

    week.push({
      date,
      day: date.getDate(),
      isOutside,
      isToday: dateStr === formatISO(today),
      isSelected: dateStr === model.value,
      dateStr,
    })

    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  return weeks
})

function formatISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  return formatted.replace(/\s*р\.$/, '')
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

const minDateObj = computed(() => {
  if (!props.minDate) return null
  const d = new Date(props.minDate + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  return d
})

function isDayDisabled(cell: DayCell): boolean {
  if (!minDateObj.value) return false
  return cell.date < minDateObj.value
}

function selectDay(cell: DayCell) {
  if (isDayDisabled(cell)) return
  model.value = cell.dateStr
  isOpen.value = false
}

function updatePopoverPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const popoverHeight = 340
  const spaceBelow = window.innerHeight - rect.bottom

  if (spaceBelow >= popoverHeight + 8) {
    popoverStyle.value = {
      top: `${rect.bottom + 6}px`,
      left: `${rect.left}px`,
    }
  } else {
    popoverStyle.value = {
      top: `${rect.top - popoverHeight - 6}px`,
      left: `${rect.left}px`,
    }
  }
}

async function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await nextTick()
    updatePopoverPosition()
  }
}
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Kit Dropdown trigger = kit Input surface, 48 tall — see the note in <script>. -->
    <button
      ref="triggerRef"
      type="button"
      :class="[triggerClass, 'justify-between text-left']"
      @click="toggle"
      @blur="handleTriggerBlur"
    >
      <span
        class="min-w-0 flex-1 truncate text-base"
        :class="model ? 'text-ink-900' : 'text-ink-600'"
      >
        {{ model ? formatDisplay(model) : 'Виберіть дату' }}
      </span>
      <CalendarIcon :class="UI_FIELD_ICON_CLASS" />
    </button>

    <!-- Teleported to body to escape overflow clipping -->
    <Teleport to="body">
      <!-- Calendar popover -->
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
          ref="popoverRef"
          class="fixed z-[10000] p-4"
          :style="popoverStyle"
        >
          <!-- Header: month navigation -->
          <div class="flex justify-center pt-1 relative items-center mb-4">
            <div class="text-sm font-medium" aria-live="polite">
              {{ monthLabel }}
            </div>
            <!-- Kit icon button `3333:5541`, Solid S. These sit on the white
                 popover, so Solid rather than Glass; the 16 glyph they already
                 carried is the S size, and the box grows 28 → 32. The kit has
                 no half-opacity resting state, so the old `opacity-50` idle
                 goes: Solid is legible at full strength.
                 The calendar day cells are NOT icon buttons — they belong to
                 the Input/Dropdown work of phase 11. -->
            <UiIconButton
              variant="solid"
              size="S"
              class="absolute left-1"
              aria-label="Попередній місяць"
              @click="prevMonth"
            >
              <template #default="{ iconClass }">
                <ChevronLeftIcon :class="iconClass" />
              </template>
            </UiIconButton>
            <UiIconButton
              variant="solid"
              size="S"
              class="absolute right-1"
              aria-label="Наступний місяць"
              @click="nextMonth"
            >
              <template #default="{ iconClass }">
                <ChevronRightIcon :class="iconClass" />
              </template>
            </UiIconButton>
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
                      isDayDisabled(cell)
                        ? 'text-muted-foreground opacity-30 cursor-not-allowed'
                        : cell.isSelected
                          ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                          : cell.isToday && !cell.isOutside
                            ? 'bg-accent text-accent-foreground'
                            : cell.isOutside
                              ? 'text-muted-foreground opacity-50 hover:bg-accent/50'
                              : 'hover:bg-accent hover:text-accent-foreground',
                    ]"
                    :disabled="isDayDisabled(cell)"
                    @click="selectDay(cell)"
                  >
                    {{ cell.day }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </UiPopover>
      </Transition>
    </Teleport>
  </div>
</template>
