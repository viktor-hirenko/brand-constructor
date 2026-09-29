import { describe, expect, it } from 'vitest'
import { ApiError } from '@/composables/useApi'
import { describeApiError } from '@/utils/apiErrorText'

/*
 * Every worker message the Admin can meet on its eight former `alert()`
 * places, quoted from `packages/worker/src`, and the words a person sees.
 */

const api = (message: string, status: number, details?: Record<string, string[]>) =>
  new ApiError(message, status, details)

describe('describeApiError — known worker messages', () => {
  it.each([
    ['Cannot modify a concept that is used in a brand', 409, 'Концепт не можна змінити'],
    ['Cannot delete a concept used in a brand. Archive it instead.', 409, 'Концепт не можна змінити'],
    ['Cannot delete: PR package is referenced by a brand', 409, 'Пакет не можна видалити'],
    ['Forbidden', 403, 'Немає прав'],
    ['Forbidden: insufficient permissions for this library', 403, 'Немає прав'],
    ['Forbidden: you can only delete your own assets', 403, 'Немає прав'],
    ['Forbidden: only admin can manage users', 403, 'Немає прав'],
    ['Cannot delete yourself', 400, 'Не можна видалити себе'],
    ['Unsupported file type. Allowed: PNG, JPEG, WebP.', 400, 'Картинка не підходить'],
    ['User with this email already exists', 409, 'Така пошта вже є'],
    ['Another user with this email already exists', 409, 'Така пошта вже є'],
    ['Brand not found', 404, 'Запис уже видалено'],
    ['Asset not found', 404, 'Запис уже видалено'],
    ['CSRF: token mismatch', 403, 'Сторінка застаріла'],
  ])('%s → %s', (message, status, title) => {
    expect(describeApiError(api(message, status), 'save').title).toBe(title)
  })

  it('says the file numbers back in plain words', () => {
    const t = describeApiError(
      api(
        'Asset validation failed: File too large: 12.4MB (max 10MB); Image too small: 800x600 (minimum 1200x900)',
        400,
      ),
      'upload',
    )
    expect(t.title).toBe('Картинка не підходить')
    expect(t.body).toContain('12.4 МБ')
    expect(t.body).toContain('10 МБ')
    expect(t.body).toContain('800×600')
    expect(t.body).toContain('1200×900')
  })

  it('names the aspect ratio it got and the one it needs', () => {
    const t = describeApiError(
      api('Asset validation failed: Wrong aspect ratio: 4:3 (expected ~16:9, tolerance ±1%)', 400),
      'upload',
    )
    expect(t.body).toContain('4:3')
    expect(t.body).toContain('16:9')
  })

  it('lists the form fields the worker rejected', () => {
    const t = describeApiError(
      api('Validation failed', 400, { email: ['Invalid email'], name: ['Required'] }),
      'save',
    )
    expect(t.title).toBe('Перевірте форму')
    expect(t.body).toContain('пошта')
    expect(t.body).toContain('назва')
  })

  it('reads a lost network as such', () => {
    expect(describeApiError(new TypeError('Failed to fetch'), 'save').title).toBe('Немає звʼязку')
  })
})

describe('describeApiError — anything else', () => {
  it('falls back to what the person was doing', () => {
    expect(describeApiError(api('Something odd', 500), 'save').title).toBe('Не вдалося зберегти')
    expect(describeApiError(api('Something odd', 500), 'delete').title).toBe('Не вдалося видалити')
    expect(describeApiError(api('Something odd', 500), 'upload').title).toBe(
      'Не вдалося завантажити',
    )
    expect(describeApiError(undefined, 'save').body).toContain('Спробуйте ще раз')
  })

  it("keeps the worker's words only as the detail, with the status", () => {
    const t = describeApiError(api('Cannot modify a concept that is used in a brand', 409), 'save')
    expect(t.detail).toBe('HTTP 409 · Cannot modify a concept that is used in a brand')
    expect(t.title).not.toMatch(/[A-Za-z]{4,}/)
    expect(t.body).not.toMatch(/Cannot|Forbidden|Payload/)
  })
})
