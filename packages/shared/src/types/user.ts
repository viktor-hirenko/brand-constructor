import { USER_ROLES } from '../constants/roles';

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}
