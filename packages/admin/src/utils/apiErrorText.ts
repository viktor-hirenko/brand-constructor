/**
 * Plain-words text for an Admin action that failed.
 *
 * The worker answers errors in developer English ("Forbidden: insufficient
 * permissions for this library", "Asset validation failed: …"), and eight
 * places in the Admin showed that text raw in the browser's own `alert()` —
 * one of them with a "Payload sent: {…}" debug line. People read that as the
 * site being broken. This turns the worker's text into a title and a sentence
 * in Ukrainian (the owner's choice, 29.09) and keeps the original only as
 * `detail`, shown folded under «Технічні деталі».
 *
 * Pure on purpose: the Admin's tests run in node and cannot mount a component.
 * Rules match on the worker's own words, quoted from `packages/worker/src`.
 */

export type ErrorAction = 'save' | 'delete' | 'upload'

export interface ErrorText {
  title: string
  body: string
  /** The worker's own words, for whoever debugs it. Never the request body. */
  detail: string
}

const FALLBACK_TITLE: Record<ErrorAction, string> = {
  save: 'Не вдалося зберегти',
  delete: 'Не вдалося видалити',
  upload: 'Не вдалося завантажити',
}

const FALLBACK_BODY =
  'Спробуйте ще раз. Якщо повториться — надішліть знімок цього вікна адміністратору.'

/** Field names the worker reports in `details`, as a person reads them. */
const FIELD_LABELS: Record<string, string> = {
  name: 'назва',
  email: 'пошта',
  role: 'роль',
  description: 'опис',
  mode: 'тема',
  number: 'номер',
  teams_involved: 'команди',
  requirements: 'вимоги',
  goals: 'цілі',
  components_list: 'компоненти',
  timeline: 'терміни',
  expenses: 'витрати',
}

interface FailureLike {
  message: string
  status?: number
  details?: Record<string, string[]>
  isNetwork: boolean
}

function readFailure(err: unknown): FailureLike {
  if (err instanceof Error) {
    const withExtras = err as Error & { status?: number; details?: Record<string, string[]> }
    return {
      message: err.message,
      status: withExtras.status,
      details: withExtras.details,
      // `fetch` itself rejects with a TypeError when the network is gone;
      // the wording differs per browser.
      isNetwork:
        err instanceof TypeError &&
        /Failed to fetch|NetworkError|Load failed|network/i.test(err.message),
    }
  }
  return { message: typeof err === 'string' ? err : '', isNetwork: false }
}

/** One rule per kind of problem with an uploaded image. */
function describeImageProblem(part: string): string | null {
  let m: RegExpExecArray | null
  if (/Unsupported file type|File type ".*" not allowed/.test(part)) {
    return 'Завантажте картинку у форматі PNG, JPEG або WebP.'
  }
  if ((m = /File too large: ([\d.]+)MB \(max (\d+)MB\)/.exec(part))) {
    return `Файл завеликий: ${m[1]} МБ, а можна щонайбільше ${m[2]} МБ. Стисніть картинку.`
  }
  if ((m = /Image too small: (\d+)x(\d+) \(minimum (\d+)x(\d+)\)/.exec(part))) {
    return `Картинка замала: ${m[1]}×${m[2]}, а потрібно щонайменше ${m[3]}×${m[4]}.`
  }
  if ((m = /Wrong aspect ratio: (\S+) \(expected ~(\S+?),/.exec(part))) {
    return `У картинки пропорції ${m[1]}, а потрібно ${m[2]}. Обріжте картинку або змініть поле пропорцій.`
  }
  if (/Could not read image dimensions/.test(part)) {
    return 'Не вдалося прочитати картинку. Спробуйте інший файл.'
  }
  return null
}

function describeKnown(f: FailureLike): Omit<ErrorText, 'detail'> | null {
  const msg = f.message

  if (f.isNetwork) {
    return { title: 'Немає звʼязку', body: 'Перевірте інтернет і спробуйте ще раз.' }
  }
  if (/^CSRF/.test(msg)) {
    return { title: 'Сторінка застаріла', body: 'Оновіть сторінку і повторіть дію.' }
  }

  // Locked by an approved brand.
  if (/concept (that is )?used in a brand/.test(msg)) {
    return {
      title: 'Концепт не можна змінити',
      body:
        'Його вже використано в затвердженому бренді, тому редагування закрите — щоб затверджений бриф не змінився. Для нової версії створіть новий концепт.',
    }
  }
  // A PR package stays editable; only deletion is refused while a brief picks it.
  if (/PR package is referenced by a brand/.test(msg)) {
    return {
      title: 'Пакет не можна видалити',
      body: 'Пакет вибрано в брифах, тому видалити його не можна — інакше бриф залишиться без пакета. Змінювати пакет можна.',
    }
  }

  // Rights.
  if (/only delete your own assets/.test(msg)) {
    return { title: 'Немає прав', body: 'Видаляти можна лише картинки, які ви завантажили самі.' }
  }
  if (/insufficient permissions/.test(msg)) {
    return {
      title: 'Немає прав',
      body: 'Ваша роль не може змінювати цей розділ. Якщо доступ потрібен — зверніться до адміністратора.',
    }
  }
  if (/^Forbidden$|admin access required|only admin can manage users/.test(msg)) {
    return { title: 'Немає прав', body: 'Ця дія доступна лише адміністратору.' }
  }
  if (/Cannot delete yourself/.test(msg)) {
    return {
      title: 'Не можна видалити себе',
      body: 'Попросіть іншого адміністратора, якщо це справді потрібно.',
    }
  }

  // The image itself.
  if (/^Asset validation failed: /.test(msg)) {
    const parts = msg
      .replace(/^Asset validation failed: /, '')
      .split('; ')
      .map(describeImageProblem)
      .filter((x): x is string => x !== null)
    if (parts.length > 0) return { title: 'Картинка не підходить', body: parts.join(' ') }
  }
  const single = describeImageProblem(msg)
  if (single) return { title: 'Картинка не підходить', body: single }

  // Duplicates and the form.
  if (/with this email already exists/.test(msg)) {
    return { title: 'Така пошта вже є', body: 'Користувач з цією поштою вже існує. Знайдіть його у списку.' }
  }
  if (/^Validation failed/.test(msg)) {
    const fields = Object.keys(f.details ?? {}).map((k) => FIELD_LABELS[k] ?? k)
    return {
      title: 'Перевірте форму',
      body:
        fields.length > 0
          ? `Не заповнено або заповнено неправильно: ${fields.join(', ')}.`
          : 'Деякі поля заповнено неправильно.',
    }
  }

  // Someone else got there first.
  if (/not found$/i.test(msg) || f.status === 404) {
    return {
      title: 'Запис уже видалено',
      body: 'Можливо, його видалив хтось інший. Оновіть сторінку.',
    }
  }

  return null
}

export function describeApiError(err: unknown, action: ErrorAction): ErrorText {
  const f = readFailure(err)
  const known = describeKnown(f)
  const detail = [f.status ? `HTTP ${f.status}` : null, f.message || null]
    .filter(Boolean)
    .join(' · ')
  return {
    title: known?.title ?? FALLBACK_TITLE[action],
    body: known?.body ?? FALLBACK_BODY,
    detail,
  }
}
