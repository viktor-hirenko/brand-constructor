#!/usr/bin/env node
/**
 * One-shot cognitive-model naming migration.
 * Run from packages/constructor: node scripts/naming-migration.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(__dirname, '..')

const fileRenames = [
  ['src/stores/constructor/useSupervisorAlternativeDraft.ts', 'src/stores/constructor/useSupervisorAlternativeDraft.ts'],
  ['src/utils/supervisorRevisionGate.ts', 'src/utils/supervisorRevisionGate.ts'],
  ['tests/unit/utils/supervisorRevisionGate.test.ts', 'tests/unit/utils/supervisorRevisionGate.test.ts'],
  ['src/components/constructor/review/SupervisorCommentCard.vue', 'src/components/constructor/review/SupervisorCommentCard.vue'],
  ['src/components/constructor/review/ApplySupervisorVariantButton.vue', 'src/components/constructor/review/ApplySupervisorVariantButton.vue'],
  ['src/components/constructor/review/SupervisorActionsFooter.vue', 'src/components/constructor/review/SupervisorActionsFooter.vue'],
  ['src/components/constructor/review/AuthorActionsFooter.vue', 'src/components/constructor/review/AuthorActionsFooter.vue'],
  ['src/components/constructor/edit-flow/SupervisorCommentReadonly.vue', 'src/components/constructor/edit-flow/SupervisorCommentReadonly.vue'],
  ['src/stories/review/SupervisorCommentCard.stories.ts', 'src/stories/review/SupervisorCommentCard.stories.ts'],
  ['src/stories/review/SupervisorActionsFooter.stories.ts', 'src/stories/review/SupervisorActionsFooter.stories.ts'],
  ['src/stories/review/AuthorActionsFooter.stories.ts', 'src/stories/review/AuthorActionsFooter.stories.ts'],
]

/** Longest-first replacements across source files */
const replacements = [
  // Route paths & names (before partial ceo/po matches)
  ['alternative-selection-concept-external-naming', 'alternative-selection-concept-external-naming'],
  ['alternative-selection-external-naming', 'alternative-selection-external-naming'],
  ['alternative-selection-internal-naming', 'alternative-selection-internal-naming'],
  ['revision-response-concept-external-naming', 'revision-response-concept-external-naming'],
  ['alternative-selection-concept', 'alternative-selection-concept'],
  ['revision-response-external-naming', 'revision-response-external-naming'],
  ['revision-response-internal-naming', 'revision-response-internal-naming'],
  ['alternative-selection/', 'alternative-selection/'],
  ['revision-response/', 'revision-response/'],
  ['revision-response-concept', 'revision-response-concept'],

  // CSS class prefixes
  ['alternative-selection-external-naming-step', 'alternative-selection-external-naming-step'],
  ['alternative-selection-internal-naming-step', 'alternative-selection-internal-naming-step'],
  ['alternative-selection-concept-step', 'alternative-selection-concept-step'],
  ['revision-response-external-naming-view', 'revision-response-external-naming-view'],
  ['revision-response-internal-naming-view', 'revision-response-internal-naming-view'],
  ['revision-response-concept-view', 'revision-response-concept-view'],

  // Storage / envelope
  ['BriefSupervisorAlternativeEnvelope', 'BriefSupervisorAlternativeEnvelope'],
  ['writeSupervisorAlternativeDraft', 'writeSupervisorAlternativeDraft'],
  ['readSupervisorAlternativeDraft', 'readSupervisorAlternativeDraft'],
  ['clearSupervisorAlternativeDraft', 'clearSupervisorAlternativeDraft'],
  ['restoreSupervisorAlternativeDraftFromStorage', 'restoreSupervisorAlternativeDraftFromStorage'],
  ['supervisor-alternative', 'supervisor-alternative'],

  // Draft store (long names first)
  ['SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT', 'SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT'],
  ['seedSupervisorAlternativeExternalNamingChained', 'seedSupervisorAlternativeExternalNamingChained'],
  ['supervisorAlternativeDraftInProgress', 'supervisorAlternativeDraftInProgress'],
  ['toggleSupervisorAlternativeExternalNaming', 'toggleSupervisorAlternativeExternalNaming'],
  ['setSupervisorAlternativeExternalNamingIds', 'setSupervisorAlternativeExternalNamingIds'],
  ['setSupervisorAlternativeConceptPreview', 'setSupervisorAlternativeConceptPreview'],
  ['setSupervisorAlternativeInternalNaming', 'setSupervisorAlternativeInternalNaming'],
  ['selectSupervisorAlternativeConcept', 'selectSupervisorAlternativeConcept'],
  ['setSupervisorAlternativeConcept', 'setSupervisorAlternativeConcept'],
  ['seedSupervisorAlternativeFromBrand', 'seedSupervisorAlternativeFromBrand'],
  ['resetSupervisorAlternativeDraft', 'resetSupervisorAlternativeDraft'],
  ['resetSupervisorAlternativeSlice', 'resetSupervisorAlternativeSlice'],
  ['useSupervisorAlternativeDraft', 'useSupervisorAlternativeDraft'],
  ['SupervisorAlternativeSection', 'SupervisorAlternativeSection'],
  ['supervisorAlternativeDraft', 'supervisorAlternativeDraft'],
  ['SupervisorAlternativeDraft', 'SupervisorAlternativeDraft'],

  // Guards & route meta params
  ['supervisorAlternativeGuard', 'supervisorAlternativeGuard'], // temp to avoid double-replace
  ['supervisorAlternativeGuard', 'supervisorAlternativeGuard'],
  ['authorRevisionGuard', 'authorRevisionGuard'],
  ['authorRevisionGuard', 'authorRevisionGuard'],

  // Restore guard temps
  ['supervisorAlternativeGuard', 'supervisorAlternativeGuard'],
  ['authorRevisionGuard', 'authorRevisionGuard'],
  ['routeIsAlternativeSelection', 'routeIsAlternativeSelection'],
  ['routeIsAuthorRevision', 'routeIsAuthorRevision'],
  ['route.meta.alternativeSelection', 'route.meta.alternativeSelection'],
  ['route.meta.authorRevision', 'route.meta.authorRevision'],
  ['meta.alternativeSelection', 'meta.alternativeSelection'],
  ['meta.authorRevision', 'meta.authorRevision'],
  ['alternativeSelection: true', 'alternativeSelection: true'],
  ['authorRevision: true', 'authorRevision: true'],
  ['supervisorOnly: true', 'supervisorOnly: true'],

  // Utils module
  ['@/utils/supervisorRevisionGate', '@/utils/supervisorRevisionGate'],
  ['supervisorRevisionGate', 'supervisorRevisionGate'],
  ['isSupervisorChoiceAnAlternative', 'isSupervisorChoiceAnAlternative'],
  ['SupervisorRevisionGateInput', 'SupervisorRevisionGateInput'],
  ['AuthorLibrarySelections', 'AuthorLibrarySelections'],
  ['SUPERVISOR_LIBRARY_KEYS', 'SUPERVISOR_LIBRARY_KEYS'],
  ['SupervisorLibraryTab', 'SupervisorLibraryTab'],

  // Store review slice public API
  ['saveSupervisorCommentResolvedErrorSection', 'saveSupervisorCommentResolvedErrorSection'],
  ['saveSupervisorCommentResolvedLoading', 'saveSupervisorCommentResolvedLoading'],
  ['saveSupervisorCommentResolvedError', 'saveSupervisorCommentResolvedError'],
  ['isSupervisorCommentResolveLoading', 'isSupervisorCommentResolveLoading'],
  ['setSupervisorCommentResolved', 'setSupervisorCommentResolved'],
  ['saveSupervisorSelectionsError', 'saveSupervisorSelectionsError'],
  ['applySupervisorConceptAndExternal', 'applySupervisorConceptAndExternal'],
  ['isApplyingSupervisorVariant', 'isApplyingSupervisorVariant'],
  ['applySupervisorVariantError', 'applySupervisorVariantError'],
  ['setSupervisorSelectionValue', 'setSupervisorSelectionValue'],
  ['brandSupervisorSelections', 'brandSupervisorSelections'],
  ['brandSupervisorComments', 'brandSupervisorComments'],
  ['setSupervisorCommentValue', 'setSupervisorCommentValue'],
  ['saveSupervisorSelections', 'saveSupervisorSelections'],
  ['applySupervisorVariant', 'applySupervisorVariant'],
  ['loadSupervisorReviewData', 'loadSupervisorReviewData'],

  // Composables & views — review mode string literals (specific contexts only)
  ["reviewMode: 'author-submitted'", "reviewMode: 'author-submitted'"],
  ["| 'author-submitted'", "| 'author-submitted'"],
  ["return 'author-submitted'", "return 'author-submitted'"],
  ["reviewMode: 'author-returned'", "reviewMode: 'author-returned'"],
  ["| 'author-returned'", "| 'author-returned'"],
  ["return 'author-returned'", "return 'author-returned'"],
  ["reviewMode: 'author-draft'", "reviewMode: 'author-draft'"],
  ["| 'author-draft'", "| 'author-draft'"],
  ["return 'author-draft'", "return 'author-draft'"],
  ["reviewMode: 'supervisor'", "reviewMode: 'supervisor'"],
  ["| 'supervisor'", "| 'supervisor'"],
  ["return 'supervisor'", "return 'supervisor'"],
  ["case 'author-submitted'", "case 'author-submitted'"],
  ["case 'author-returned'", "case 'author-returned'"],
  ["case 'author-draft'", "case 'author-draft'"],
  ["case 'supervisor'", "case 'supervisor'"],

  // Events (kebab-case)
  ['start-supervisor-alternative', 'start-supervisor-alternative'],
  ['general-supervisor-comment-update', 'general-supervisor-comment-update'],
  ['unresolve-supervisor-comment', 'unresolve-supervisor-comment'],
  ['resolve-supervisor-comment', 'resolve-supervisor-comment'],
  ['update:supervisor-comment', 'update:supervisor-comment'],
  ['apply-supervisor-variant', 'apply-supervisor-variant'],

  // Props (kebab-case in templates)
  ['is-supervisor-internal-applied', 'is-supervisor-internal-applied'],
  ['is-supervisor-external-applied', 'is-supervisor-external-applied'],
  ['is-supervisor-concept-applied', 'is-supervisor-concept-applied'],
  ['supervisor-internal-name-for-review', 'supervisor-internal-name-for-review'],
  ['supervisor-external-items-for-review', 'supervisor-external-items-for-review'],
  ['review-supervisor-concept-for-block', 'review-supervisor-concept-for-block'],
  ['apply-supervisor-loading', 'apply-supervisor-loading'],
  ['supervisor-frozen-view', 'supervisor-frozen-view'],
  ['is-author-returned-view', 'is-author-returned-view'],
  ['is-author-owner', 'is-author-owner'],

  // Composables — function & variable names (long first)
  ['startSupervisorAlternativeBySection', 'startSupervisorAlternativeBySection'],
  ['handleGeneralSupervisorCommentUpdate', 'handleGeneralSupervisorCommentUpdate'],
  ['handleSupervisorCommentUnresolve', 'handleSupervisorCommentUnresolve'],
  ['handleSupervisorCommentResolve', 'handleSupervisorCommentResolve'],
  ['handleSupervisorCommentBySection', 'handleSupervisorCommentBySection'],
  ['getSectionSupervisorCommentValue', 'getSectionSupervisorCommentValue'],
  ['isSectionSupervisorCommentResolved', 'isSectionSupervisorCommentResolved'],
  ['nonEmptySupervisorComments', 'nonEmptySupervisorComments'],
  ['flattenSupervisorCommentsForPdf', 'flattenSupervisorCommentsForPdf'],
  ['handleApplySupervisorVariant', 'handleApplySupervisorVariant'],
  ['supervisorInternalNameForReview', 'supervisorInternalNameForReview'],
  ['supervisorExternalItemsForReview', 'supervisorExternalItemsForReview'],
  ['reviewSupervisorConceptForBlock', 'reviewSupervisorConceptForBlock'],
  ['isSupervisorInternalApplied', 'isSupervisorInternalApplied'],
  ['isSupervisorExternalApplied', 'isSupervisorExternalApplied'],
  ['isSupervisorConceptApplied', 'isSupervisorConceptApplied'],
  ['isAuthorReturnedView', 'isAuthorReturnedView'],
  ['supervisorFrozenView', 'supervisorFrozenView'],
  ['applySupervisorLoading', 'applySupervisorLoading'],
  ['isAuthorOwner', 'isAuthorOwner'],
  ['isSupervisorView', 'isSupervisorView'],
  ['authorLibrarySelections', 'authorLibrarySelections'],

  // Component file references
  ['ApplySupervisorVariantButton', 'ApplySupervisorVariantButton'],
  ['SupervisorCommentReadonly', 'SupervisorCommentReadonly'],
  ['SupervisorActionsFooter', 'SupervisorActionsFooter'],
  ['AuthorActionsFooter', 'AuthorActionsFooter'],
  ['SupervisorCommentCard', 'SupervisorCommentCard'],

  // Component index categories
  ['views-alternative-selection', 'views-alternative-selection'],
  ['views-revision-response', 'views-revision-response'],
  ['alternative-selection', 'alternative-selection'],

  // resolve params interface fields in comments
  ['`/alternative-selection/*`', '`/alternative-selection/*`'],
  ['`/revision-response/*`', '`/revision-response/*`'],

  // Revision view local vars (author not po)
  ['authorOriginalPickIds', 'authorOriginalPickIds'],
  ['authorOriginalNamings', 'authorOriginalNamings'],
  ['authorOriginalNaming', 'authorOriginalNaming'],
  ['authorOriginalId', 'authorOriginalId'],
  ['hasFetchedAuthorConcept', 'hasFetchedAuthorConcept'],
  ['authorConceptId', 'authorConceptId'],

  // Utils input field rename
  ['authorSelections:', 'authorSelections:'],
  ['authorSelections,', 'authorSelections,'],
  ['authorSelections)', 'authorSelections)'],
  ['authorSelections }', 'authorSelections }'],
  ['poSelections\n', 'authorSelections\n'],
  ['input.authorSelections', 'input.authorSelections'],

  // auth — prefer isSupervisor (after isSupervisorView rename)
  ['authStore.isSupervisor', 'authStore.isSupervisor'],
  ['!auth.isSupervisor', '!auth.isSupervisor'],
  ['auth.isSupervisor', 'auth.isSupervisor'],
]

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      walkFiles(full, acc)
    } else if (/\.(ts|vue|js|mjs|html)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

// Rename files
for (const [from, to] of fileRenames) {
  const fromPath = path.join(pkgRoot, from)
  const toPath = path.join(pkgRoot, to)
  if (fs.existsSync(fromPath)) {
    fs.mkdirSync(path.dirname(toPath), { recursive: true })
    fs.renameSync(fromPath, toPath)
    console.log(`Renamed: ${from} → ${to}`)
  } else if (fs.existsSync(toPath)) {
    console.log(`Already renamed: ${to}`)
  } else {
    console.warn(`Missing: ${from}`)
  }
}

const dirs = [
  path.join(pkgRoot, 'src'),
  path.join(pkgRoot, 'tests'),
  path.join(pkgRoot, 'scripts'),
  path.join(pkgRoot, 'docs'),
]

const files = dirs.flatMap(d => walkFiles(d))
let changed = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  const original = content
  for (const [from, to] of replacements) {
    content = content.split(from).join(to)
  }
  if (content !== original) {
    fs.writeFileSync(file, content)
    changed++
    console.log(`Updated: ${path.relative(pkgRoot, file)}`)
  }
}

console.log(`\nDone. ${changed} files updated.`)
