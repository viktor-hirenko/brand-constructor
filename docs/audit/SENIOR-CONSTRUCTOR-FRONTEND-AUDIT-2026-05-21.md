# Senior-Level Frontend/Constructor Audit — Brand Constructor

---

## Metadata

| Field | Value |
|---|---|
| **Title** | Senior-Level Frontend/Constructor Audit — `packages/constructor` (post-Phase 3 refactor) |
| **Date** | 2026-05-21 |
| **Scope** | `packages/constructor` only — views, components, composables, stores. No backend, no worker, no shared. |
| **Purpose** | Independent senior-level revision of the frontend constructor UI architecture after all enterprise-audit refactors were applied. Identify remaining duplications, dead code, missing BEM semantic layer, and safe next steps. |
| **Source / Context** | Follows up on `docs/audit/ENTERPRISE-AUDIT-2026-05-20.md` and its tracker `docs/audits/enterprise-audit-brand-constructor.md`. All 24 enterprise findings (F-01 → F-24) are closed. This document covers the **polish and DX layer** that was out of scope for the enterprise audit. |
| **Status** | ACTIVE — execution not started |
| **Last updated** | 2026-05-21 |

---

## How to use this file

1. **Source-of-truth for frontend/constructor polish** after the large Phase 3 enterprise refactor. Do not mix with `ENTERPRISE-AUDIT-2026-05-20.md`.
2. **Each new chat should read this file** before starting any PR from this roadmap.
3. **After each completed PR:** update the `Status` field of the corresponding roadmap section to `DONE` and fill in the "Actual commit / PR" note.
4. **If a PR is cancelled or no longer relevant:** set status to `SKIPPED` and write a one-line reason.
5. **If a PR needs runtime or product verification before starting:** set status to `NEEDS_VERIFICATION` and describe what needs to be checked.
6. **Do not delete the original audit sections (A–K)** below. They are the rationale behind every PR.

---

## Status Legend

| Status | Meaning |
|---|---|
| `TODO` | Not started |
| `IN_PROGRESS` | Analysis or implementation underway |
| `DONE` | Code merged, QA verified |
| `BLOCKED` | Waiting on product decision / external info |
| `NEEDS_VERIFICATION` | Needs grep/git-log/runtime confirmation before starting |
| `SKIPPED` | Confirmed irrelevant — reason recorded |

---

## Current Progress

- **Completed:** PR-1 ✅, PR-2 ✅, PR-4 ✅, PR-5 ✅, PR-6 ✅, PR-7 ✅, PR-8 ✅, PR-9 ✅
- **In progress:** —
- **Blocked:** PR-3 (awaiting product decision on LayoutBriefModal)
- **Needs verification:** —
- **Next recommended PR:** PR-10 (BEM classes on footers, modals, shells) — Wave 3 continues

---

## Roadmap — PR Tracking

> Each PR is independently mergeable. Execute in Wave order. Never batch multiple Waves into one PR.

---

### Wave 1 — Dead code & zero-risk wins

---

#### PR-1 — Delete `Step10ReviewScrollLayout.vue` if verified dead

- **Status:** `DONE` — deleted 2026-05-21, grep confirmed zero imports outside own file
- **Priority:** P0
- **Risk:** Low — only if confirmed unused
- **Recommended model:** Sonnet Thinking
- **Files / Areas:** `packages/constructor/src/components/constructor/Step10ReviewScrollLayout.vue`
- **Goal:** Remove leftover layout component from an early iteration of F-06 decomposition. It is not imported anywhere in the current codebase.
- **Notes:** Must confirm via `git log -- packages/constructor/src/components/constructor/Step10ReviewScrollLayout.vue` and project-wide grep before deleting. If any dynamic import or plugin uses it by string — do NOT delete.
- **Manual QA:**
  - [ ] Open Step 10 in all 5 modes: PO draft / PO submitted / PO returned-from-CEO / CEO finalize / approved
  - [ ] Confirm layout renders correctly in each mode
  - [ ] Confirm `Step10ReviewScrollLayout` does not appear in Vue DevTools component tree
  - [ ] `pnpm typecheck` passes
- **Suggested commit message:** `chore(constructor): remove dead Step10ReviewScrollLayout component`

---

#### PR-2 — Delete `ReturnedFromCeoBanner.vue` if verified dead

- **Status:** `DONE` — deleted 2026-05-21, grep confirmed zero imports outside own file
- **Priority:** P0
- **Risk:** Low — only if confirmed unused
- **Recommended model:** Sonnet Thinking
- **Files / Areas:** `packages/constructor/src/components/constructor/review/ReturnedFromCeoBanner.vue`
- **Goal:** Remove old banner component whose functionality is now fully covered by the `infoOverride='warning'` branch inside `ReviewHeader.vue`. Keeping it risks confusion — someone might accidentally re-add it instead of using `ReviewHeader`.
- **Notes:** Confirm no imports in project. The warning banner for "N секцій потребують уваги" is rendered via `ReviewHeader.vue:209-220` — verify visually that it appears in PO returned-from-CEO mode before deleting the banner component.
- **Manual QA:**
  - [ ] PO returned-from-CEO Step 10 — confirm the warning info block ("N секцій потребують уваги") renders via `ReviewHeader` (not via `ReturnedFromCeoBanner`)
  - [ ] `attentionCounter` number matches the actual number of unresolved/undecided sections
  - [ ] No visual regression on Step 10
- **Suggested commit message:** `chore(constructor): remove unused ReturnedFromCeoBanner (superseded by ReviewHeader infoOverride)`

---

#### PR-3 — Decide fate of `LayoutBriefModal.vue`

- **Status:** `NEEDS_VERIFICATION`
- **Priority:** P0
- **Risk:** Medium — product decision required
- **Recommended model:** Opus 4.7 (product decision, not a technical one)
- **Files / Areas:** `packages/constructor/src/components/constructor/layout/LayoutBriefModal.vue`, `packages/constructor/src/views/ConstructorLayout.vue` (line ~136 `activeBrief` ref, line ~623 usage)
- **Goal:** The `LayoutBriefModal` is imported and mounted in `ConstructorLayout.vue` with `v-model:kind="activeBrief"`, but `activeBrief.value` is never assigned — the modal has no trigger in the current codebase. Either: (a) find the intended UI trigger and wire it up, or (b) remove the modal and its import.
- **Notes:** DANGEROUS to delete without product confirmation — the modal may be intentionally "pre-built but not yet linked." Ask PM/product owner: "Is LayoutBriefModal supposed to be accessible from any button in the wizard, or is it deprecated?"
- **Manual QA (path a — keep and wire):**
  - [ ] Clicking the intended trigger opens the modal
  - [ ] All 8 wizard steps + Step 10 in all modes — modal does not appear unexpectedly
- **Manual QA (path b — delete):**
  - [ ] All 8 wizard steps + Step 10 — no broken references
  - [ ] `pnpm typecheck` passes
- **Suggested commit message (path b):** `chore(constructor): remove unreachable LayoutBriefModal (no UI trigger exists)`

---

#### PR-4 — Replace inline `SegmentedControl` in `CeoReselectConceptStep`

- **Status:** `DONE` — replaced 2026-05-21, `vue-tsc --noEmit` passes
- **Priority:** P0
- **Risk:** Very low
- **Recommended model:** Sonnet Thinking
- **Files / Areas:** `packages/constructor/src/views/ceo-reselect/CeoReselectConceptStep.vue` (lines ~124-154)
- **Goal:** `CeoReselectConceptStep.vue` implements its own inline segmented-control toggle (30 lines of duplicated class logic) for light/dark theme filtering instead of using the existing `SegmentedControl.vue` component already used in `PoEditConceptView.vue`. Replace inline markup with `<SegmentedControl v-model="localMode" :options="themeOptions" />`.
- **Notes:** Zero risk — `SegmentedControl` is already used identically in the parallel `PoEditConceptView`. Just consistency fix.
- **Manual QA:**
  - [ ] On `/constructor/brand/:id/ceo-reselect/concept` — light/dark toggle visually identical to `/constructor/brand/:id/po-edit/concept`
  - [ ] Switching toggle reloads/filters the concept grid correctly
  - [ ] No regression in `PoEditConceptView` (already uses the shared component)
- **Suggested commit message:** `refactor(constructor): use shared SegmentedControl in CeoReselectConceptStep`

---

#### PR-5 — Deduplicate CEO selection helpers in `useCeoApplyVariants`

- **Status:** `DONE` — replaced 2026-05-21 with aliased import from selectionHelpers, `vue-tsc --noEmit` passes
- **Priority:** P0
- **Risk:** Low
- **Recommended model:** Sonnet Thinking
- **Files / Areas:** `packages/constructor/src/composables/useCeoApplyVariants.ts` (lines ~79-89), `packages/constructor/src/stores/constructor/selectionHelpers.ts`
- **Goal:** `useCeoApplyVariants.ts` declares its own `ceoSelectionAsString` and `ceoSelectionAsArray` which are byte-for-byte copies of `readSelectionAsString` and `readSelectionAsArray` already exported from `stores/constructor/selectionHelpers.ts`. Import from the shared file, remove local copies.
- **Notes:** Used in `useCeoReview.ts` and `useCeoReselectDraft.ts` already correctly. This is just an oversight in `useCeoApplyVariants`.
- **Manual QA:**
  - [ ] PO returned-from-CEO Step 10 → apply CEO variant in Concept section → applied state renders correctly
  - [ ] Apply CEO variant in ExternalNaming section → applied state correct
  - [ ] Apply CEO variant in InternalNaming section → applied state correct
  - [ ] `pnpm typecheck` passes
- **Suggested commit message:** `refactor(constructor): import selection helpers from shared selectionHelpers in useCeoApplyVariants`

---

### Wave 2 — Small shared components

---

#### PR-6 — Extract `<ApplyCeoVariantButton>` shared component

- **Status:** `DONE` — extracted 2026-05-21, vue-tsc 0 errors, replaced in 3 consumer files
- **Priority:** P1
- **Risk:** Low
- **Recommended model:** Sonnet Thinking
- **Files / Areas:**
  - `packages/constructor/src/components/constructor/review/ReviewConceptBlock.vue` (lines ~215-223)
  - `packages/constructor/src/components/constructor/review/ReviewExternalNamingsList.vue` (lines ~83-91)
  - `packages/constructor/src/components/constructor/review/ReviewInternalNamingBlock.vue` (lines ~60-68)
  - New: `packages/constructor/src/components/constructor/review/ApplyCeoVariantButton.vue`
- **Goal:** Three review blocks contain byte-for-byte identical apply-button markup. Extract into `ApplyCeoVariantButton.vue`. Props: `loading: boolean`. Emits: `click`. Button text and classes stay inside the component — the text is always "Застосувати варіант CEO" / "Застосовується…".
- **Notes:** Business logic (what happens on click) stays in the parent blocks. This component is purely presentational. Do NOT merge with the applied-state label — that's different markup.
- **Manual QA:**
  - [ ] PO returned-from-CEO Step 10 → Concept block: click "Застосувати варіант CEO" → loading state visible → applied state ("Обраний концепт")
  - [ ] Same for ExternalNaming → "Обрані назви"
  - [ ] Same for InternalNaming → "Обрана назва"
  - [ ] Button is disabled after apply (no double-submit)
  - [ ] Visual diff before/after: zero
- **Suggested commit message:** `refactor(constructor): extract ApplyCeoVariantButton shared component`

---

#### PR-7 — Extract repeated inline SVG icons to icon components

- **Status:** `DONE` — extracted 2026-05-21; vue-tsc --noEmit 0 errors
- **Priority:** P1
- **Risk:** Low
- **Recommended model:** Sonnet Thinking
- **Files / Areas:**
  - New: `packages/constructor/src/components/icons/ChatBubbleIcon.vue`
  - New: `packages/constructor/src/components/icons/EyeIcon.vue`
  - Replace inline SVG in: `ReviewUnifiedView.vue` (~lines 622-636 and 654-666), `CeoCommentReadonly.vue` (~lines 18-30), `StepCommentField.vue` (~lines 48-60), `ReviewConceptBlock.vue` (eye × 3), `ReviewPrPackageBlock.vue` (eye), and optionally others
- **Goal:** The chat-bubble SVG path appears byte-for-byte in 4 components. The eye SVG appears in 4+ places. Extract each into a named icon component. Other icons (checkmark, warning, edit, calendar, globe) can follow in a later PR — start with just these two highest-frequency ones.
- **Notes:** Icon component accepts `class?: string` prop so Tailwind size classes can be passed from outside. Do NOT introduce an icon registry or index — keep it simple: one `.vue` file per icon.
- **Manual QA:**
  - [ ] Step 10 CEO mode — CEO comment bubble icons visible next to all comment blocks
  - [ ] PO edit/reselect concept preview buttons — eye icons visible on concept cards
  - [ ] Brief review screens — no broken icon slots
  - [ ] Visual diff: zero
- **Suggested commit message:** `refactor(constructor): extract ChatBubbleIcon and EyeIcon components`

---

#### PR-8 — Extract `usePoEditSnapshot` composable

- **Status:** `DONE` — extracted 2026-05-21 (Opus 4.7); raw `sessionStorage` calls removed from both PO-edit views, magic-string keys centralised in `usePoEditSnapshot(brandId)`, `goSave()` now clears the previously leaking `originalExternal` key via `clearAll()`, `vue-tsc --noEmit` passes
- **Priority:** P2
- **Risk:** Medium — touches edit-flow correctness
- **Recommended model:** Opus 4.7
- **Files / Areas:**
  - New: `packages/constructor/src/composables/usePoEditSnapshot.ts`
  - `packages/constructor/src/views/po-edit/PoEditConceptView.vue` (lines ~74-118)
  - `packages/constructor/src/views/po-edit/PoEditExternalNamingView.vue` (lines ~64-73)
- **Goal:** `sessionStorage` management (save/load/restore/clear of original PO selections before edit) is implemented with raw magic-strings scattered across two views. Extract into a composable `usePoEditSnapshot(brandId)` with public API: `saveOriginalConcept(id)`, `loadOriginalConcept()`, `saveOriginalExternal(ids)`, `restoreOriginalExternal(setter)`, `savePendingConcept(id)`, `loadPendingConcept()`, `clearAll()`. The edit flow logic itself stays in the views.
- **Notes:** High correctness requirement — the "Cancel" and "Back" navigation paths depend entirely on these sessionStorage values being correct. Test the multi-step restore path carefully (concept → external naming → back → concept restored).
- **Manual QA:**
  - [ ] PO returned → po-edit/concept → change concept → Next → po-edit/external-naming → Back → original concept is restored in UI and store
  - [ ] PO returned → po-edit/concept → change concept → Next → po-edit/external-naming → Cancel → Final review shows original concept + original external naming (both restored)
  - [ ] After successful save — sessionStorage does not accumulate stale keys
  - [ ] After clearing browser sessionStorage manually and re-opening po-edit — graceful fallback (no crash)
- **Suggested commit message:** `refactor(constructor): extract usePoEditSnapshot composable for sessionStorage-backed PO edit state`

---

### Wave 3 — Add BEM semantic classes (DOM navigation layer)

---

#### PR-9 — BEM classes on top review components

- **Status:** `DONE` — added 2026-05-21; BEM root + element + modifier classes added to ReviewSection, SectionCommentBlock, CeoCommentCard; vue-tsc --noEmit passes; zero visual changes
- **Priority:** P1 (after Wave 1 + Wave 2 are stable)
- **Risk:** Low — visual-only addition
- **Recommended model:** Sonnet Thinking
- **Files / Areas:**
  - `packages/constructor/src/components/constructor/review/ReviewSection.vue`
  - `packages/constructor/src/components/constructor/SectionCommentBlock.vue`
  - `packages/constructor/src/components/constructor/review/CeoCommentCard.vue`
- **Goal:** Add root BEM class + key structural element classes to the 3 most-used review components so that DevTools navigation becomes possible without relying on utility-class soup. **No visual changes. No removal of existing classes.**
- **Notes:** See section G below for the full BEM scheme. Add only root + header/body/actions/key-button per component. Do NOT add classes to `<svg>`, `<path>`, or every `<span>`.
- **Manual QA:**
  - [ ] DevTools → Step 10 in CEO mode → find `<section class="review-section ...">` for each of 7 sections
  - [ ] Section with unresolved CEO comment has `review-section--has-unresolved`
  - [ ] Section with amber highlight has `review-section--highlighted`
  - [ ] Visual diff between before/after: zero pixels difference
  - [ ] `pnpm typecheck` passes
- **Suggested commit message:** `style(constructor): add BEM semantic classes to ReviewSection, SectionCommentBlock, CeoCommentCard`

---

#### PR-10 — BEM classes on footers, modals, shells

- **Status:** `TODO`
- **Priority:** P1
- **Risk:** Low
- **Recommended model:** Sonnet Thinking
- **Files / Areas:**
  - `packages/constructor/src/components/constructor/review/PoActionsFooter.vue`
  - `packages/constructor/src/components/constructor/review/CeoActionsFooter.vue`
  - `packages/constructor/src/components/constructor/edit-flow/EditFlowFooter.vue`
  - `packages/constructor/src/components/constructor/edit-flow/EditFlowStepShell.vue`
  - `packages/constructor/src/components/ui/SimpleModal.vue`
  - `packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue` (root + key structural divs)
- **Goal:** Add root BEM classes and key element classes to footer and shell components. Especially important for `PoActionsFooter` and `CeoActionsFooter` where individual buttons need a deterministic class for automated/manual QA targeting.
- **Notes:** For `ReviewUnifiedView` only add root class + `__sections`, `__general-comment-ceo`, `__general-comment-po`, `__footer`. Mode modifier `review-unified-view--mode-ceo` etc.
- **Manual QA:**
  - [ ] DevTools on Step 10 PO submitted → find `po-actions-footer` with `__submit`, `__back`, `__share`, `__pdf` children
  - [ ] DevTools on Step 10 CEO finalize → find `ceo-actions-footer` with `__approve`, `__revise`
  - [ ] CEO actions footer with unresolved sections → `ceo-actions-footer--has-warning` present
  - [ ] All footer buttons still work (click test each)
  - [ ] Visual diff: zero
- **Suggested commit message:** `style(constructor): add BEM semantic classes to footer and shell components`

---

#### PR-11 — BEM classes on edit/reselect view roots and customer-pick components

- **Status:** `TODO`
- **Priority:** P1
- **Risk:** Low
- **Recommended model:** Sonnet Thinking
- **Files / Areas:**
  - `packages/constructor/src/views/po-edit/PoEditConceptView.vue` (root class `po-edit-concept-view`)
  - `packages/constructor/src/views/po-edit/PoEditExternalNamingView.vue` (root class `po-edit-external-view`)
  - `packages/constructor/src/views/po-edit/PoEditInternalNamingView.vue` (root class `po-edit-internal-view`)
  - `packages/constructor/src/views/ceo-reselect/CeoReselectConceptStep.vue` (root class `ceo-reselect-concept-step`)
  - `packages/constructor/src/views/ceo-reselect/CeoReselectExternalNamingStep.vue` (root class `ceo-reselect-external-step`)
  - `packages/constructor/src/views/ceo-reselect/CeoReselectInternalNamingStep.vue` (root class `ceo-reselect-internal-step`)
  - `packages/constructor/src/components/constructor/ceo-reselect/CustomerPickPreview.vue`
  - `packages/constructor/src/components/constructor/ceo-reselect/CustomerNamingsRow.vue`
  - `packages/constructor/src/components/constructor/ceo-reselect/CustomerInternalNamingPreview.vue`
  - `packages/constructor/src/components/constructor/review/ReviewHeader.vue`
- **Goal:** Root class on each view gives instant DevTools orientation. Customer-pick components get root + `__label`, `__card` for quick selection debugging.
- **Manual QA:**
  - [ ] Navigate to po-edit/concept → DevTools shows `po-edit-concept-view` as root wrapper
  - [ ] Navigate to ceo-reselect/concept → DevTools shows `ceo-reselect-concept-step`
  - [ ] In each view: loading spinner visible when fetching, error state visible when fetch fails (simulate with DevTools throttle)
  - [ ] Visual diff: zero
- **Suggested commit message:** `style(constructor): add BEM root classes to po-edit/ceo-reselect views and customer-pick components`

---

### Wave 4 — Optional async boundary (after Wave 1–3 stable)

---

#### PR-12 — Optional `EditFlowAsyncBoundary` or slots in `EditFlowStepShell`

- **Status:** `TODO`
- **Priority:** P2 (optional, do only if loading/error pattern diverges across views)
- **Risk:** Medium — touches all 6 edit/reselect views
- **Recommended model:** Opus 4.7
- **Files / Areas:**
  - `packages/constructor/src/components/constructor/edit-flow/EditFlowStepShell.vue` (option A: extend with loading/error props)
  - New: `packages/constructor/src/components/constructor/edit-flow/EditFlowAsyncBoundary.vue` (option B: separate component)
  - All 6 views in `po-edit/` and `ceo-reselect/`
- **Goal:** The loading spinner + error-with-retry pattern is repeated byte-for-byte in all 6 edit/reselect views. Centralize it either as extended slots in `EditFlowStepShell` (simpler) or a dedicated `EditFlowAsyncBoundary` wrapper (more reusable).
- **Notes:** Choose option A (extend `EditFlowStepShell`) unless the async boundary is needed elsewhere too. Props: `loading?: boolean; error?: string | null`. Emits: `retry`. Do not change retry semantics — each view has its own fetch logic.
- **Manual QA:**
  - [ ] In each of 6 views: simulate network error (DevTools → offline or block API request) → error state renders with "Спробувати знову" button
  - [ ] Click "Спробувати знову" → triggers correct re-fetch
  - [ ] Loading spinner visible during fetch
  - [ ] Success path renders data correctly
- **Suggested commit message:** `refactor(constructor): centralize loading/error pattern via EditFlowStepShell async slots`

---

### Wave 5 — Future / Not now

The following were analyzed but **explicitly not recommended** for implementation until there is a strong specific reason:

| Item | Reason for deferral |
|---|---|
| `<UiButton variant="primary\|secondary\|ghost">` | Mass-touch risk (4+ footers, 6+ views), no formal design system. Only after Figma tokens are formalized. |
| `<EditFlowSectionLabel>` thin wrapper | Overkill unless 3+ new occurrences of the label class appear in a single sprint. |
| Further `ReviewUnifiedView` mode-decomposition | Would recreate the 5-copy duplication problem. Current `reviewMode` discrimination is sufficient. |
| Merge `ReviewConceptBlock` / `ReviewExternalNamingsList` / `ReviewInternalNamingBlock` into one `<DualPickBlock>` | Images + prices + sold-state + single-name are fundamentally different units. Merging = god-component. |
| Merge `PoActionsFooter` + `CeoActionsFooter` + `EditFlowFooter` | Fundamentally different layouts (vertical vs horizontal) and business logic. Unification would add conditional complexity, not remove it. |
| Rename `useConstructorStore` | 30+ import sites, zero benefit. |
| Rewrite `useBrandData.ts` 17 setX mutators | Correct pattern for a wizard domain. Sane and easily testable as-is. |
| Separate `useCeoReselectDraft` back into main store | Transient draft semantics are correct and intentional. |

---

## Full Audit Report (sections A–K)

> The sections below are the **original senior-level analysis** that produced the roadmap above.
> Do not modify them. They are the permanent rationale for every PR decision.

---

### A. What was read

Fully read:

- `views/steps/Step10ReviewSubmit.vue` (490 lines)
- `views/ConstructorLayout.vue` (624 lines)
- `views/po-edit/{Concept,ExternalNaming,InternalNaming}View.vue` (3 files)
- `views/ceo-reselect/{Concept,ExternalNaming,InternalNaming}Step.vue` (3 files)
- All 14 components in `components/constructor/review/`
- All 3 components in `components/constructor/edit-flow/`
- All 6 components in `components/constructor/ceo-reselect/`
- `components/constructor/layout/{StepPreviewRightPanel,LayoutBriefModal,LayoutPreviewOverlays}.vue`
- `components/ui/{SegmentedControl,SimpleModal,SectionStatusBadge,UnresolvedDot}.vue`
- `components/constructor/{SectionCommentBlock,StepCommentField,BrandPreviewPanel,Step10ReviewScrollLayout}.vue`
- All 5 store slice files `stores/constructor/*`
- All 4 review/CEO composables in `composables/`
- Previous audit `docs/audit/ENTERPRISE-AUDIT-2026-05-20.md` in full (for cross-reference)

Checked via grep: `Step10ReviewScrollLayout`, `ReturnedFromCeoBanner`, `LayoutBriefModal`, `activeBrief =`, loading spinner class pattern, section label class pattern.

---

### B. General architectural impression

**The Phase 3 refactor was a very solid senior-level effort.** The key heavy enterprise findings are resolved:

| Finding | Previous state | Current state | Result |
|---|---|---|---|
| F-06 `Step10ReviewSubmit.vue` | 2463 lines | 490 lines, thin orchestrator over `ReviewUnifiedView` | ✅ closed |
| F-07 `ConstructorLayout.vue` | 1345 lines | 624 lines, sub-components extracted | ✅ closed |
| F-08 `constructor.ts` store | 1035 lines monolith | 5 domain slices + thin facade | ✅ closed, very clean |
| F-11 footer duplication | `PoEditFooter`/`CeoReselectFooter` identical | merged into `EditFlowFooter` + `EditFlowStepShell` | ✅ closed |
| F-12 manual fetch | raw fetch in store | `apiPut/apiPost/apiGet/apiPatch` | ✅ closed |
| F-13 duplicate data fetching | Step10 + Layout each fetched | `useLibrariesStore` shared | ✅ closed |
| F-14 `deep:true` watch + sync localStorage | every keystroke wrote | debounced 500ms | ✅ closed |
| F-15 `BrandPreviewPanel` `deep:true` | broad deep watch | narrow computed + targeted watch | ✅ closed |
| F-20 silent catches | bare `catch {}` | `logSilent('scope', err)` | ✅ mostly closed |

Architecture is now readable. `Step10ReviewSubmit` gathers context and delegates to `ReviewUnifiedView`, which delegates to presentational sub-components. CEO/PO routes are parallel but each has single responsibility. Stores and composables are domain-separated, cross-slice deps pass via explicit opts (no circular imports).

**Remaining concerns** are all minor polish items — enumerated in sections C through I.

---

### C. Suspicious areas and oddities

#### C-1. Dead code after refactoring (3 files)

1. **`Step10ReviewScrollLayout.vue`** — not imported anywhere; leftover from early F-06 iteration before `ReviewUnifiedView` absorbed the layout. NEEDS_VERIFICATION via `git log`.
2. **`ReturnedFromCeoBanner.vue`** — visually duplicates the `reviewMode='po-returned' + attentionCounter > 0` branch in `ReviewHeader.vue:209-220` (same warning icon, same `sectionWord(n)` logic, same copy text). Not used in `ReviewUnifiedView` template. NEEDS_VERIFICATION via grep.
3. **`LayoutBriefModal.vue`** — imported and mounted in `ConstructorLayout.vue:623` with `v-model:kind="activeBrief"`, but `activeBrief.value` is never assigned in the entire component. The modal has no trigger. Either wire it up or delete it — leaving it mounted-but-unreachable wastes bundle size and confuses readers.

#### C-2. Inline `SegmentedControl` copy in `CeoReselectConceptStep.vue`

`PoEditConceptView.vue:345-348` already uses `<SegmentedControl v-model="localMode" :options="themeOptions" />`. `CeoReselectConceptStep.vue:124-154` implements the same toggle inline with 30 lines of duplicated class logic. This is a one-line fix with zero risk.

#### C-3. Duplicate selection helpers in `useCeoApplyVariants`

`useCeoApplyVariants.ts:79-89` declares `ceoSelectionAsString` / `ceoSelectionAsArray` — byte-for-byte copies of `readSelectionAsString` / `readSelectionAsArray` in `stores/constructor/selectionHelpers.ts`. The store slices `useCeoReview` and `useCeoReselectDraft` already import from the shared file correctly. This is a 22-line oversight.

#### C-4. `ReviewUnifiedView.vue` is 727 lines — 7-fold `<SectionCommentBlock>` repetition

The file is architecturally clean (pure presentational) but 7 sections (basics → concept → externalNaming → internalNaming → marketingPackage → deliverables → visualComponents) are implemented as 7 copy-paste blocks of 14-25 lines each that differ only by `section-key`. This is ~180 lines of noise. See E-10 for the recommended approach (local array-config map, not a new shared component).

#### C-5. Chat-bubble SVG duplicated 4 times

The same `<path d="...">` (chat-bubble icon) appears verbatim in: `ReviewUnifiedView.vue:622-636`, `ReviewUnifiedView.vue:654-666`, `CeoCommentReadonly.vue:18-30`, `StepCommentField.vue:48-60`. Four locations, one path. If the design icon changes, it will need a grep hunt.

#### C-6. Loading/Error pattern repeated 6+ times

`<div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />` + "Спробувати знову" button appears in 10 files. In the 6 edit/reselect views it is literally the first child of the template. See PR-12 for optional centralization.

#### C-7. `sessionStorage` helpers for po-edit live directly in views

`PoEditConceptView.vue:74-118` and `PoEditExternalNamingView.vue:64-73` each implement raw `sessionStorage` operations with magic-string keys (`po_edit_original_concept_*`, etc.). This is a small state-machine (save/load/restore/clear) scattered across two views. See PR-8 for extraction into `usePoEditSnapshot`.

#### C-8. `stores/constructor/index.ts` public/internal boundary is convention-only

`index.ts:43-47` uses destructuring to separate facade-internal from public API (`resetSlice`, `loadWizard` treated as internal). This is documented by naming convention but not enforced by TypeScript. If someone adds a function with a non-matching name to `useBrandData`, it will silently leak into the public `useConstructorStore()`. Low risk, but worth noting for future contributors.

#### C-9. `useBrandData.ts` at 528 lines is still the largest slice

This is within acceptable bounds for a wizard-domain file with 17 granular mutators. The pattern is correct and testable. **Do not refactor for size's sake.**

#### C-10. `Step10ReviewSubmit.vue:248-275` uses deprecated `document.execCommand('copy')`

The modern API is `navigator.clipboard.writeText`. The current fallback is for old Safari. Not business-critical, can be left as-is unless browser support policy changes.

---

### D. Recurring UI patterns

| # | Pattern | Where it appears | Similarity |
|---|---|---|---|
| 1 | Apply CEO variant button (`h-12 rounded-xl border border-black/10` + disabled + "Застосувати варіант CEO") | `ReviewConceptBlock:215-223`, `ReviewExternalNamingsList:83-91`, `ReviewInternalNamingBlock:60-68` | Byte-for-byte |
| 2 | Applied-state header after CEO variant applied | `ReviewConceptBlock:227`, `ReviewExternalNamingsList:36-50`, `ReviewInternalNamingBlock:30-38` | Same pattern, different labels |
| 3 | PO + CEO dual layout (two cards/lists side by side) | `ReviewConceptBlock:112-213`, `ReviewExternalNamingsList:53-92`, `ReviewInternalNamingBlock:41-69`, `PoEditConceptView:269-335`, `CeoReselectConceptStep:120-178` | Same wrapper, different inner units (images vs lists vs single row) |
| 4 | Inline chat-bubble SVG + "Коментар…" label | `ReviewUnifiedView:621-639` (PO general), `ReviewUnifiedView:651-671` (CEO general), `CeoCommentReadonly:14-36`, `StepCommentField:46-71` | Byte-for-byte path |
| 5 | Grey PO comment card (`bg-[rgba(197,197,200,0.2)] rounded-lg p-4`) | `SectionCommentBlock:154-167`, `CeoCommentCard:30-42`, `ReviewUnifiedView:641-648`, `CeoCommentReadonly:37-41` | Same visual card, slightly different semantics |
| 6 | Loading spinner + Error with retry | All 3 `po-edit` views, all 3 `ceo-reselect` steps | Byte-for-byte |
| 7 | Section label `text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]` | 10+ locations in edit/reselect/CEO views | One class string, repeated ~20× |
| 8 | Primary button (`w-full h-12 rounded-xl bg-[#030213] text-white ... hover:opacity-90 disabled:opacity-50`) | `PoActionsFooter:51-59`, `CeoActionsFooter:27-48`, `EditFlowFooter:38-45`, `SimpleModal:60-68` | Same pattern |
| 9 | Secondary outlined button (`border border-black/10 text-foreground hover:bg-black/[0.02]`) | `PoActionsFooter:62-68`, `CeoActionsFooter:50-71`, `EditFlowFooter:30-37`, `ConstructorLayout:488-492` | Same pattern |
| 10 | `EditFlowStepShell` body structure | Already abstracted — used in all 6 edit views | Shared component exists — don't touch |
| 11 | Inline `SegmentedControl` for light/dark | `CeoReselectConceptStep:124-154` (inline) vs `PoEditConceptView:345-348` (uses shared component) | Inconsistency — fix in PR-4 |

---

### E. Shared component candidates table

| # | Pattern | Current locations | Similarity | Suggested abstraction | Props / slots / events | Risk | Priority |
|---|---|---|---|---|---|---|---|
| E-1 | Delete dead files | `Step10ReviewScrollLayout.vue`, `ReturnedFromCeoBanner.vue`, `LayoutBriefModal.vue` | Dead code | Delete after verification | — | Low (NEEDS_VERIFICATION) | P0 |
| E-2 | Inline `SegmentedControl` | `CeoReselectConceptStep:124-154` | Byte-for-byte duplicate of existing component | Replace with `<SegmentedControl />` | Existing component | Very low | P0 |
| E-3 | Selection helper copies | `useCeoApplyVariants:79-89` | Byte-for-byte with `selectionHelpers.ts` | Import from `selectionHelpers.ts` | — | Low | P0 |
| E-4 | Apply CEO variant button | `ReviewConceptBlock`, `ReviewExternalNamingsList`, `ReviewInternalNamingBlock` | Byte-for-byte | `ApplyCeoVariantButton.vue` | `props: { loading: boolean }` • `emits: { click: [] }` | Low | P1 |
| E-5 | Loading/error pattern in edit views | All 6 edit/reselect views | Byte-for-byte | Slots in `EditFlowStepShell` or `EditFlowAsyncBoundary` | `props: { loading, error }` • `emits: { retry }` | Medium | P2 |
| E-6 | sessionStorage PO edit helpers | `PoEditConceptView:74-118`, `PoEditExternalNamingView:64-73` | Byte-for-byte | `usePoEditSnapshot(brandId)` composable | Pure composable, no UI | Medium | P2 |
| E-7 | Inline SVG icons (chat-bubble, eye) | `ReviewUnifiedView` ×2, `CeoCommentReadonly`, `StepCommentField`, `ReviewConceptBlock` ×3, `ReviewPrPackageBlock` | Byte-for-byte path data | `ChatBubbleIcon.vue`, `EyeIcon.vue` | `props: { class?: string }` | Low | P1 |
| E-8 | Section label Tailwind class string | 10+ locations | One class string repeated | `EditFlowSectionLabel.vue` wrapper | default slot | Minimal, but may be overkill | P3 (do only if 3+ new occurrences appear) |
| E-9 | Full `SelectionStepLayout` with slots | po-edit + ceo-reselect views | Different inner content | NOT recommended — already partially addressed by `EditFlowStepShell` | — | High | **Do not do** |
| E-10 | 7× `SectionCommentBlock` in `ReviewUnifiedView` | `ReviewUnifiedView` template | Same props, same structure × 7 | Local array-config map **inside `ReviewUnifiedView`** (not a shared component) | — | Medium (CEO/PO flow correctness) | P2 |
| E-11 | Primary / secondary button class pattern | 4+ footers, 6+ views | Same pattern | `<UiButton variant>` | `props: { variant, loading?, disabled? }` • default slot | **High** — mass-touch | **P3 / Do not do now** |

---

### F. Where to add BEM / semantic classes

> Goal: DevTools navigability. Not a styling layer. All utility / Vuetify / Tailwind classes stay unchanged.

**High priority (P0) — do first:**
1. `ReviewSection.vue` → root `review-section` + `__header`, `__title`, `__indicators`, `__actions`, `__body`. Modifiers: `--highlighted`, `--has-unresolved`.
2. `SectionCommentBlock.vue` → root `section-comment` + `__po`, `__ceo-cta`, `__ceo-editor`, `__ceo-readonly`. Modifiers: `--highlighted`, `--always-expanded`.
3. `CeoCommentCard.vue` → root `ceo-comment-card` + `__body`, `__resolve-button`. Modifier: `--unresolved`.
4. `ReviewUnifiedView.vue` → root `review-unified-view` + `__sections`, `__general-comment`, `__general-comment-ceo`, `__footer`. Modifiers: `--mode-ceo`, `--mode-po-draft`, `--mode-po-returned`, `--mode-po-submitted`, `--mode-approved`.
5. `PoActionsFooter.vue` → root `po-actions-footer` + `__submit`, `__back`, `__share`, `__pdf`. Modifier: `--loading`.
6. `CeoActionsFooter.vue` → root `ceo-actions-footer` + `__approve`, `__revise`, `__warning`. Modifiers: `--loading`, `--has-warning`.
7. `EditFlowFooter.vue` → root `edit-flow-footer` + `__cancel`, `__primary`. Modifier: `--loading`.
8. `EditFlowStepShell.vue` → root `edit-flow-step-shell` + `__title`, `__subtitle`, `__body`, `__footer-slot`.

**Medium priority (P1):**
9. `ReviewHeader.vue` → root `review-header` + `__title-row`, `__title`, `__badge`, `__progress`, `__info-block`. Modifiers on info-block: `--warning`, `--check`.
10. `ReviewConceptBlock.vue`, `ReviewExternalNamingsList.vue`, `ReviewInternalNamingBlock.vue` → roots `review-concept-block`, `review-external-list`, `review-internal-block`. Modifiers: `--dual-view`, `--applied`, `--single`.
11. All 3 grid components → roots `concept-grid`, `external-naming-grid`, `internal-naming-grid` + `__card`. Modifiers on card: `--selected`, `--at-limit`, `--sold`.
12. All 6 edit/reselect view roots → e.g. `po-edit-concept-view`, `ceo-reselect-concept-step`.
13. `SimpleModal.vue` → root `simple-modal` + `__backdrop`, `__dialog`, `__title`, `__body`, `__actions`, `__cancel`, `__primary`.

**Low priority (P2):**
14. `ConstructorLayout.vue` → root `constructor-layout` + `__main-panel`, `__right-panel`, `__wizard-footer`, `__edit-mode-footer`.
15. Customer pick components → roots `customer-pick-preview`, `customer-namings-row`, `customer-internal-naming-preview`.
16. `ReviewSectionRow.vue` → root `review-section-row` + `__icon`, `__label`, `__value`.

**Never add BEM to:**
- `<span>`, `<svg>`, `<path>` inline elements
- Step 1-9 internals (not the center of complexity)
- `BrandPreviewPanel` internal image layers (have inline `style` positioning already)

---

### G. BEM naming strategy

**Conventions:**
- `block` = kebab-case, matches component semantic name (not necessarily file name)
- `__element` = block + `__` + noun (`header`, `title`, `body`, `actions`, `button`, `icon`, `label`, `value`, `card`, `list`, `row`)
- `--modifier` = current state from existing props/v-if (`--unresolved`, `--needs-choice`, `--applied`, `--highlighted`, `--loading`, `--disabled`, `--mode-ceo`, `--mode-po-returned`)

**Full examples for 7 key components:**

```
review-section
review-section__header
review-section__title
review-section__indicators
review-section__actions
review-section__edit-button
review-section__change-button
review-section__body
review-section__comment
review-section--highlighted
review-section--has-unresolved
review-section--needs-choice
review-section--borderless

section-comment
section-comment__po
section-comment__ceo-cta
section-comment__ceo-editor
section-comment__ceo-editor-label
section-comment__ceo-textarea
section-comment__ceo-readonly
section-comment--highlighted
section-comment--always-expanded

ceo-comment-card
ceo-comment-card__body
ceo-comment-card__label
ceo-comment-card__value
ceo-comment-card__resolve-button
ceo-comment-card--unresolved
ceo-comment-card--resolved

review-unified-view
review-unified-view__sections
review-unified-view__general-comment-ceo
review-unified-view__general-comment-po
review-unified-view__error
review-unified-view__footer
review-unified-view--mode-ceo
review-unified-view--mode-po-draft
review-unified-view--mode-po-returned
review-unified-view--mode-po-submitted
review-unified-view--mode-approved
review-unified-view--ceo-frozen

po-actions-footer
po-actions-footer__submit
po-actions-footer__back
po-actions-footer__share
po-actions-footer__pdf
po-actions-footer--loading

ceo-actions-footer
ceo-actions-footer__approve
ceo-actions-footer__revise
ceo-actions-footer__warning
ceo-actions-footer--loading
ceo-actions-footer--has-warning

edit-flow-footer
edit-flow-footer__cancel
edit-flow-footer__primary
edit-flow-footer--loading
```

**Rules:**
- Root is added **in addition to** existing Tailwind/Vuetify classes, never **instead of**
- Modifiers only mirror what already exists as props or `v-if` conditions
- BEM is the **navigation/debug layer** — not a styling layer — no new SCSS needed
- Do not create states that don't exist in the logic

---

### H. What NOT to touch

1. **Do NOT merge `PoActionsFooter` + `CeoActionsFooter` + `EditFlowFooter`** — fundamentally different layouts (vertical vs horizontal stacks) and business logic (submit/back/share/pdf vs approve/revise vs cancel/save).

2. **Do NOT decompose `ReviewUnifiedView.vue` into 5 mode-specific components** — would recreate the original Step10 duplication problem (5 copies of 7 sections drifting independently).

3. **Do NOT merge the 3 Review*Block components** — images + price-lists + single-row are fundamentally different visual units. A shared `<DualPickBlock>` would become a god-component that knows about images, prices, sold-state, and naming layout all at once.

4. **Do NOT extract `<UiButton>` now** — mass-touch (4+ footers, 6+ views), no formal design system. Benefit/risk ratio is negative until Figma tokens are formalized.

5. **Do NOT rewrite `useBrandData.ts`** — 17 granular mutators is the correct wizard-domain pattern. Sane, explicit, and easily testable.

6. **Do NOT return `useCeoReselectDraft` into the main store** — transient draft semantics are correct and intentional.

7. **Do NOT rename `useConstructorStore`** — 30+ import sites, zero real benefit.

8. **Do NOT further extract `SectionCommentBlock` repetition into a shared component** — any shared wrapper here would need CEO/PO/status awareness. If the `ReviewUnifiedView` section-loop noise bothers you, use a local array-config map inside the file, not a new shared component.

9. **Do NOT add snapshot tests for Slack or PDF rendering** — out of scope for this audit.

10. **Do NOT enforce TS `extractPublic<T>` on store facade** — convention-based public/internal separation is clear enough for the current team size.

---

### I. Safe staged roadmap

> Already captured in the Roadmap section above (PR-1 through PR-12). Summary order:

**Wave 1 (1 sprint):** PR-1 → PR-2 → PR-3 → PR-4 → PR-5
**Wave 2 (1 sprint):** PR-6 → PR-7 → PR-8
**Wave 3 (1–2 sprints, atomic PRs):** PR-9 → PR-10 → PR-11
**Wave 4 (optional, next quarter):** PR-12
**Wave 5 (not now):** See "What NOT to touch"

---

### J. Manual QA checklist — Golden path

> Apply this golden path check to every PR from Wave 1–3 as a baseline before merging.

**5 review modes on Step 10:**

- [ ] **PO Draft** — "Бриф готовий!" heading, all 7 sections clickable, edit button works on each section, footer shows submit + back + share + pdf
- [ ] **PO Submitted** — read-only, info block "Бриф на розгляді", no submit button, PDF button present
- [ ] **PO Returned-from-CEO** — info block "N секцій потребують уваги" (warning icon), `attentionCounter` matches actual count of unresolved + undecided sections, apply-CEO-variant buttons active where CEO has an alternative, resolve/unresolve toggles work on CEO comments
- [ ] **CEO Finalize** — "Затвердити" + "Повернути на доопрацювання" buttons active, CEO comment textarea auto-saves (debounced), all sections navigable
- [ ] **Approved** — fully read-only, PDF only, no CEO/edit buttons, no footer actions

**Edit/reselect basic flow:**
- [ ] PO returned → po-edit/concept → change selection → Next → po-edit/external-naming → Back → original concept restored
- [ ] PO returned → po-edit/concept → change selection → Next → Cancel → Final review shows original concept

**CEO reselect basic flow:**
- [ ] CEO finalize → ceo-reselect/concept → light/dark toggle filters concepts → select concept → Save → CEO selection reflected in Step 10

---

### K. Recommended model per PR

| PR | Effort | Risk | Recommended model | Rationale |
|---|---|---|---|---|
| PR-1 Delete `Step10ReviewScrollLayout` | XS | Low | Sonnet Thinking | Mechanical — grep + delete |
| PR-2 Delete `ReturnedFromCeoBanner` | XS | Low | Sonnet Thinking | Mechanical — grep + delete |
| PR-3 Decide `LayoutBriefModal` fate | S | Medium | **Opus 4.7** | Needs product decision, not just code |
| PR-4 Fix inline `SegmentedControl` | XS | Very low | Sonnet Thinking | Byte-for-byte replacement |
| PR-5 Deduplicate selection helpers | XS | Low | Sonnet Thinking | Byte-for-byte import fix |
| PR-6 `ApplyCeoVariantButton` | S | Low | Sonnet Thinking | 3 locations, trivial extraction |
| PR-7 Icon components | S | Low | Sonnet Thinking | Mechanical SVG extraction |
| PR-8 `usePoEditSnapshot` | M | **Medium** | **Opus 4.7** | sessionStorage + edit flow correctness |
| PR-9 BEM on review components | S | Low | Sonnet Thinking | Class addition only |
| PR-10 BEM on footers/shells/modals | S | Low | Sonnet Thinking | Class addition only |
| PR-11 BEM on view roots | M | Low | Sonnet Thinking | Class addition only |
| PR-12 Async boundary (optional) | M | Medium | **Opus 4.7** | All 6 edit views, retry semantics |

**Never use Auto / Composer for:**
- Any PR touching CEO/PO flow (PR-3, PR-6, PR-8, PR-12)
- Any architectural decision about shared components
- BEM additions in files you haven't fully read (always read the file first with Sonnet)
