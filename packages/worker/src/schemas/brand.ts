import { z } from 'zod'

const newConceptBriefSchema = z
  .object({
    isNewGeo: z.boolean().nullable(),
    geoInfo: z.string(),
    needsGeoResearch: z.boolean().nullable(),
    conceptFeedback: z.string(),
    trafficTeamInfo: z.string(),
    competitors: z.string(),
    keepProductConnection: z.boolean().nullable(),
    connectedProducts: z.string(),
    namingLanguage: z.string(),
    desiredWordsInName: z.string(),
    domainZones: z.array(z.string()),
    domainBudget: z.number().nullable(),
    namingDeadline: z.string(),
    additionalGeoInfo: z.string(),
  })
  .passthrough()

const newNamingBriefSchema = z
  .object({
    isNewGeo: z.boolean().nullable(),
    namingFeedback: z.string(),
    trafficTeamInfo: z.string(),
    needsGeoResearch: z.boolean().nullable(),
    namingLanguage: z.string(),
    desiredWordsInName: z.string(),
    domainZones: z.array(z.string()),
    wordsToAvoid: z.string(),
    domainBudget: z.number().nullable(),
    namingDeadline: z.string(),
    additionalGeoInfo: z.string(),
  })
  .passthrough()

/**
 * Permissive schema for the full BrandStepData JSON blob.
 * Uses passthrough() at every level so legacy drafts with extra or missing
 * optional fields are never rejected.
 */
const brandStepDataSchema = z
  .object({
    stepLayoutVersion: z.union([z.literal(1), z.literal(2)]).optional(),
    brandBasics: z
      .object({
        geo: z.array(z.string()),
        launchDate: z.string(),
        linkedProduct: z.string(),
        comment: z.string(),
      })
      .passthrough()
      .optional(),
    mode: z.enum(['light', 'dark']).nullable().optional(),
    concept: z
      .object({
        selectedId: z.string().nullable(),
        comment: z.string(),
      })
      .passthrough()
      .optional(),
    externalNaming: z
      .object({
        selectedIds: z.array(z.string()),
        comment: z.string(),
      })
      .passthrough()
      .optional(),
    internalNaming: z
      .object({
        selectedId: z.string().nullable(),
        comment: z.string(),
      })
      .passthrough()
      .optional(),
    marketingPackage: z
      .object({
        selectedId: z.string().nullable(),
        comment: z.string(),
      })
      .passthrough()
      .optional(),
    deliverables: z
      .object({
        legalLanding: z.boolean(),
        partnerLanding: z.boolean(),
      })
      .passthrough()
      .optional(),
    visualComponents: z
      .object({
        selections: z.record(z.string()),
        delegateToDesigners: z.boolean(),
        comment: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

/**
 * Shared fields for both create and update brand payloads.
 * All fields are optional — create and update accept the same partial shape.
 */
export const brandPayloadSchema = z.object({
  internalName: z.string().max(300).nullish(),
  geo: z.string().max(500).optional(),
  launchDate: z.string().max(30).optional(),
  mode: z.enum(['light', 'dark']).nullish(),
  conceptId: z.string().max(100).nullish(),
  conceptComment: z.string().max(5000).optional(),
  externalNamingIds: z.array(z.string().max(100)).max(3).optional(),
  externalNamingComment: z.string().max(5000).optional(),
  internalNamingId: z.string().max(100).nullish(),
  internalNamingComment: z.string().max(5000).optional(),
  prPackageId: z.string().max(100).nullish(),
  prPackageComment: z.string().max(5000).optional(),
  legalLanding: z.boolean().optional(),
  partnerLanding: z.boolean().optional(),
  deliverablesComment: z.string().max(5000).optional(),
  componentSelections: z.record(z.string()).optional(),
  componentsComment: z.string().max(5000).optional(),
  delegateToDesigners: z.boolean().optional(),
  newConceptBrief: newConceptBriefSchema.nullish(),
  developmentDeadline: z.string().max(30).optional(),
  newNamingBrief: newNamingBriefSchema.nullish(),
  stepData: brandStepDataSchema.optional(),
  currentStep: z.number().int().min(1).max(8).optional(),
})

export const createBrandSchema = brandPayloadSchema
export const updateBrandSchema = brandPayloadSchema
