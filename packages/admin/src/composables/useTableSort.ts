import { ref, computed, type Ref, type ComputedRef } from 'vue'

type SortDirection = 'asc' | 'desc'

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc != null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  const dir = direction === 'asc' ? 1 : -1

  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b) * dir
  }

  if (a < b) return -1 * dir
  if (a > b) return 1 * dir
  return 0
}

export function useTableSort<T>(
  data: Ref<T[]> | ComputedRef<T[]>,
  defaultField: string = 'created_at',
  defaultDirection: SortDirection = 'desc',
) {
  const sortField = ref(defaultField)
  const sortDirection = ref<SortDirection>(defaultDirection)

  function toggleSort(field: string) {
    if (sortField.value === field) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortDirection.value = 'asc'
    }
  }

  function setSort(field: string, direction: SortDirection) {
    sortField.value = field
    sortDirection.value = direction
  }

  const sortedData = computed<T[]>(() => {
    const arr = [...data.value]
    const field = sortField.value
    const dir = sortDirection.value

    return arr.sort((a, b) =>
      compareValues(getNestedValue(a, field), getNestedValue(b, field), dir),
    )
  })

  return {
    sortField: computed(() => sortField.value),
    sortDirection: computed(() => sortDirection.value),
    sortedData,
    toggleSort,
    setSort,
  }
}
