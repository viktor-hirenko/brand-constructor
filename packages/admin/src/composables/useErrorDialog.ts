import { ref } from 'vue'
import { describeApiError, type ErrorAction, type ErrorText } from '@/utils/apiErrorText'

/**
 * The one error window of the Admin, in place of the browser's `alert()`.
 *
 * Module-level state, so any view can raise it without passing props, and
 * `ErrorDialog.vue` in `App.vue` is the single place that draws it.
 */
const current = ref<ErrorText | null>(null)

export function useErrorDialog() {
  return {
    current,
    /** Show what went wrong with `action`, in plain words. */
    showError(err: unknown, action: ErrorAction): void {
      current.value = describeApiError(err, action)
    },
    closeError(): void {
      current.value = null
    },
  }
}
