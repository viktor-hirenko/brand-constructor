/**
 * Tone map for `StatusPillBadge.vue` — the brief-status adapter over `UiBadge`.
 *
 * The component name and its `tone` vocabulary are kept so the 19 review files
 * do not get renamed for the sake of a rename (DP-15258 phase 7). What changed
 * underneath is the paint: every tone now resolves to one of the six kit tones
 * of Figma `3453:1619` instead of its own hand-mixed pair.
 *
 * Before → after, all four verified against the redrawn canvas `5382:36911`:
 *
 * | tone              | was                          | now (kit)       |
 * |-------------------|------------------------------|-----------------|
 * | brief-submitted   | `#d7ecff` / `#0048ef` + border| blue            |
 * | brief-revision    | `#fff9db` / `#916c00` + border| amber           |
 * | brief-approved    | `#f0fdf4` / `#15803d`         | green           |
 * | section-attention | `#fff9db` / `#936c00` + border| amber           |
 *
 * The two near-identical ambers (`#916c00` vs `#936c00`) collapse into one, and
 * the hairline border disappears — the kit badge has no border slot on any tone.
 */
import type { UiBadgeTone } from '@/components/ui/uiBadge'

export type StatusPillLeading = 'none' | 'attention'

export type StatusPillTone =
  | 'brief-submitted'
  | 'brief-revision'
  | 'brief-approved'
  | 'section-attention'

export interface StatusPillToneMeta {
  tone: UiBadgeTone
  leading: StatusPillLeading
}

export function resolveStatusPillTone(tone: StatusPillTone): StatusPillToneMeta {
  switch (tone) {
    case 'brief-submitted':
      return { tone: 'blue', leading: 'none' }
    case 'brief-revision':
      return { tone: 'amber', leading: 'none' }
    case 'brief-approved':
      return { tone: 'green', leading: 'none' }
    case 'section-attention':
      return { tone: 'amber', leading: 'attention' }
  }
}
