export const USER_ROLES = {
  ADMIN: 'admin',
  HEAD_DHC: 'head_dhc',
  PRODUCT_OWNER: 'product_owner',
  CPO_CEO: 'cpo_ceo',
  STRATEGY_IDENTITY: 'strategy_identity',
  UI_DESIGNER: 'ui_designer',
  PR_MARKETING: 'pr_marketing',
  PRODUCT_DESIGNER: 'product_designer',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.HEAD_DHC]: 'Head of DHC',
  [USER_ROLES.PRODUCT_OWNER]: 'Product Owner',
  [USER_ROLES.CPO_CEO]: 'CPO / CEO',
  [USER_ROLES.STRATEGY_IDENTITY]: 'Strategy & Identity',
  [USER_ROLES.UI_DESIGNER]: 'UI Designer',
  [USER_ROLES.PR_MARKETING]: 'PR & Marketing',
  [USER_ROLES.PRODUCT_DESIGNER]: 'Product Designer',
};

export const LIBRARY_WRITE_PERMISSIONS: Record<string, string[]> = {
  concepts: [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC, USER_ROLES.STRATEGY_IDENTITY],
  external_namings: [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC, USER_ROLES.STRATEGY_IDENTITY],
  internal_namings: [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC, USER_ROLES.STRATEGY_IDENTITY],
  pr_packages: [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC, USER_ROLES.PR_MARKETING],
  component_types: [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC, USER_ROLES.UI_DESIGNER],
  component_variants: [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC, USER_ROLES.UI_DESIGNER],
};

export const ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC] as const;

/**
 * Who works the Orders page — briefs `in_work` and what the teams made for them
 * (brief-orders plan, phase 2a). Strategy fulfils the orders; Admin and Head of
 * DHC administer the libraries the orders land in. The page gives them only
 * what the bc-strategy order message already carries, never the whole brief.
 */
export const ORDER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.HEAD_DHC,
  USER_ROLES.STRATEGY_IDENTITY,
] as const;

export function isOrderRole(role: string): boolean {
  return (ORDER_ROLES as readonly string[]).includes(role);
}

/**
 * Roles that see the library tabs of the Admin (Concepts, Namings, PR Packages,
 * UI Components). Product Owner and CPO/CEO work only with briefs — they still
 * pick library items inside the brief itself, which reads the API directly.
 * Team request, 29.09.2026: docs/design-audit/admin-role-tabs.md.
 */
export const LIBRARY_TAB_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.HEAD_DHC,
  USER_ROLES.STRATEGY_IDENTITY,
  USER_ROLES.UI_DESIGNER,
  USER_ROLES.PR_MARKETING,
  USER_ROLES.PRODUCT_DESIGNER,
] as const;

/**
 * Roles that can approve / send back a submitted brief.
 * Per PRD v2 §2 (Етап 2: CEO Approval) — ONLY CPO/CEO. Admin and Head of DHC
 * are library administrators and do not act on briefs.
 */
export const BRAND_APPROVAL_ROLES = [USER_ROLES.CPO_CEO] as const;

/**
 * Roles allowed to start the multi-step brief wizard and create a new brand
 * (POST /brands). Per PRD v2 §1.3 the customer is the Product Owner.
 */
export const BRAND_BRIEF_CREATOR_ROLES = [USER_ROLES.PRODUCT_OWNER] as const;

export function isBrandBriefCreatorRole(role: string): boolean {
  return (BRAND_BRIEF_CREATOR_ROLES as readonly string[]).includes(role);
}
