import type { StatusPillTone } from '@/components/ui/statusPillBadge'

export interface BrandBriefStatusBadgeMeta {
  label: string
  tone: StatusPillTone
}

export function resolveBrandBriefStatusBadge(
  status: string
): BrandBriefStatusBadgeMeta | null {
  switch (status) {
    case 'submitted':
      return { label: 'На розгляді', tone: 'brief-submitted' }
    case 'needs_revision':
      return { label: 'Потрібно доопрацювати', tone: 'brief-revision' }
    case 'approved':
      return { label: 'Затверджено', tone: 'brief-approved' }
    default:
      return null
  }
}
