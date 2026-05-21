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

export const BRAND_APPROVAL_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.HEAD_DHC,
  USER_ROLES.CPO_CEO,
] as const;

/** Roles allowed to start the multi-step brief wizard and create a new brand (POST /brands). */
export const BRAND_BRIEF_CREATOR_ROLES = [
  USER_ROLES.PRODUCT_OWNER,
  USER_ROLES.ADMIN,
  USER_ROLES.HEAD_DHC,
  USER_ROLES.CPO_CEO,
] as const;

export function isBrandBriefCreatorRole(role: string): boolean {
  return (BRAND_BRIEF_CREATOR_ROLES as readonly string[]).includes(role);
}
