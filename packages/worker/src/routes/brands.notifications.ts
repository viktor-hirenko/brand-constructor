import type { BrandNotificationData } from '../utils/slack'
import {
  asIdArray,
  firstId,
  flattenCeoCommentsToValues,
  parseCeoCommentsFromRow,
  type BrandRow,
} from '../utils/brands'

/**
 * Reads every piece of data the Slack message builders need to render a brand
 * notification (concept name, naming names, PR-package details, resolved
 * components, basics comment, CEO comments) and returns the flat
 * `BrandNotificationData` payload.
 *
 * Used by `PATCH /:id/status` for both the submitted/needs_revision branch
 * and the approved branch. When `ceoSelectionsOverride` is provided, the
 * caller's freshly-validated selections take precedence over the row's
 * persisted `ceo_selections` JSON (used in the approve path so we render the
 * selections as they exist *after* the batch UPDATE).
 */
export async function collectBrandNotificationData(
  db: D1Database,
  brand: BrandRow,
  constructorUrl: string,
  ceoSelectionsOverride?: Record<string, string | string[]>
): Promise<BrandNotificationData> {
  const ceoSel: Record<string, string | string[]> =
    ceoSelectionsOverride ??
    (() => {
      try {
        return JSON.parse(brand.ceo_selections || '{}')
      } catch {
        return {}
      }
    })()

  const finalConceptId = firstId(ceoSel.concept) || brand.concept_id || null
  const finalExtIds: string[] = (() => {
    const overrideIds = asIdArray(ceoSel.externalNaming)
    if (overrideIds.length > 0) return overrideIds
    try {
      return JSON.parse(brand.external_naming_ids || '[]')
    } catch {
      return []
    }
  })()
  const finalIntId = firstId(ceoSel.internalNaming) || brand.internal_naming_id || null

  const [conceptRow, intNamingRow, prPackageRow] = await Promise.all([
    finalConceptId
      ? db
          .prepare('SELECT name FROM concepts WHERE id = ?')
          .bind(finalConceptId)
          .first<{ name: string }>()
      : null,
    finalIntId
      ? db
          .prepare('SELECT name FROM internal_namings WHERE id = ?')
          .bind(finalIntId)
          .first<{ name: string }>()
      : null,
    brand.pr_package_id
      ? db
          .prepare(
            'SELECT name, timeline, teams_involved, components_list, requirements FROM pr_packages WHERE id = ?'
          )
          .bind(brand.pr_package_id)
          .first<{
            name: string
            timeline: string
            teams_involved: string
            components_list: string
            requirements: string
          }>()
      : null,
  ])

  let extNamingNames: string[] = []
  if (finalExtIds.length > 0) {
    const placeholders = finalExtIds.map(() => '?').join(',')
    const extRows = await db
      .prepare(`SELECT name FROM external_namings WHERE id IN (${placeholders})`)
      .bind(...finalExtIds)
      .all<{ name: string }>()
    extNamingNames = extRows.results.map(r => r.name)
  }

  let brandBasicsComment: string | null = null

  try {
    const stepData = brand.step_data ? JSON.parse(brand.step_data) : null
    if (stepData?.brandBasics?.comment) {
      brandBasicsComment = stepData.brandBasics.comment
    }
  } catch {
    /* step_data parse failure is non-critical */
  }

  // Slack notifications consume the flat `Record<string, string>` shape — drop
  // resolved/resolvedAt metadata before forwarding.
  const ceoCommentsForSlack = flattenCeoCommentsToValues(parseCeoCommentsFromRow(brand.ceo_comments))
  const ceoComments: Record<string, string> | null =
    Object.keys(ceoCommentsForSlack).length > 0 ? ceoCommentsForSlack : null

  let rawSelections: Record<string, string> = {}
  try {
    rawSelections = brand.component_selections ? JSON.parse(brand.component_selections) : {}
  } catch {
    rawSelections = {}
  }

  const resolvedComponents: Array<{ typeName: string; variantName: string }> = []
  const selectionEntries = Object.entries(rawSelections)
  if (selectionEntries.length > 0) {
    const typeIds = selectionEntries.map(([typeId]) => typeId)
    const variantIds = selectionEntries.map(([, variantId]) => variantId)

    const [typeRows, variantRows] = await Promise.all([
      db
        .prepare(
          `SELECT id, name, sort_order FROM component_types WHERE id IN (${typeIds.map(() => '?').join(',')})`
        )
        .bind(...typeIds)
        .all<{ id: string; name: string; sort_order: number }>(),
      db
        .prepare(
          `SELECT id, name FROM component_variants WHERE id IN (${variantIds.map(() => '?').join(',')})`
        )
        .bind(...variantIds)
        .all<{ id: string; name: string }>(),
    ])

    const typeMap = new Map(typeRows.results.map(r => [r.id, r]))
    const variantMap = new Map(variantRows.results.map(r => [r.id, r.name]))

    const sorted = selectionEntries
      .map(([typeId, variantId]) => ({
        typeId,
        variantId,
        sortOrder: typeMap.get(typeId)?.sort_order ?? 99,
        typeName: typeMap.get(typeId)?.name ?? typeId,
        variantName: variantMap.get(variantId) ?? variantId,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (const item of sorted) {
      resolvedComponents.push({ typeName: item.typeName, variantName: item.variantName })
    }
  }

  return {
    brandId: brand.id,
    internalName: brand.internal_name || brand.id,
    geo: brand.geo || null,
    launchDate: brand.launch_date || null,
    mode: brand.mode || null,
    conceptName: conceptRow?.name || null,
    externalNamingNames: extNamingNames,
    internalNamingName: intNamingRow?.name || null,
    prPackageName: prPackageRow?.name || null,
    legalLanding: Boolean(brand.legal_landing),
    partnerLanding: Boolean(brand.partner_landing),
    delegateToDesigners: Boolean(brand.delegate_to_designers),
    developmentDeadline: brand.development_deadline || null,
    constructorUrl,

    brandBasicsComment,
    conceptComment: brand.concept_comment || null,
    externalNamingComment: brand.external_naming_comment || null,
    internalNamingComment: brand.internal_naming_comment || null,
    prPackageComment: brand.pr_package_comment || null,
    deliverablesComment: brand.deliverables_comment || null,
    componentsComment: brand.components_comment || null,

    resolvedComponents,
    ceoComments,

    prPackageTimeline: prPackageRow?.timeline || null,
    prPackageTeamsInvolved: prPackageRow?.teams_involved || null,
    prPackageComponentsList: prPackageRow?.components_list || null,
    prPackageRequirements: prPackageRow?.requirements || null,
  }
}
