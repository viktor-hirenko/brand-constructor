/**
 * Title of the attention banner the Author sees on a returned brief:
 * «1 секція потребує уваги», «2 секції потребують уваги», «5 секцій
 * потребують уваги». The verb agrees with the number like the noun does —
 * it was «потребують» for every count, «1 секція потребують» (H-46, U-05).
 */
export function attentionBannerTitle(n: number): string {
  const one = n % 10 === 1 && n % 100 !== 11
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
  const noun = one ? 'секція' : few ? 'секції' : 'секцій'
  const verb = one ? 'потребує' : 'потребують'
  return `${n} ${noun} ${verb} уваги`
}
