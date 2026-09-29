/**
 * The question a changed brief form asks before it closes — DP-15450
 * `Concept Selection 7`: «При закритті через × / «Скасувати» показувати
 * підтвердження про втрату незбережених даних».
 *
 * **This copy is not hers.** Unlike the exit question (`5374:25673`,
 * `5387:89270`), this one is drawn nowhere — not on the bug board, not on the
 * key-screens canvas `5382:36911`. It borrows her exit question's shape and
 * its «Залишитись», and says what her line says: the typed answers go. Waiting
 * for the owner's word; replace here, and only here, when it comes.
 */
export const BRIEF_FORM_DISCARD_CONFIRM_COPY = {
  title: 'Закрити без збереження?',
  body: 'Введені дані не буде збережено.',
  cancelLabel: 'Залишитись',
  primaryLabel: 'Закрити',
} as const
