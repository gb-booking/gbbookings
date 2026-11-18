import type { UserRole } from '../../models/user.model.js';

// Built-in roles map to these in code. Custom staff roles (CustomRole model) pick from the same list.
export const permissionDescriptions = {
  'profile:read': 'Read the current user profile.',
  'profile:update': 'Update the current user profile.',
  'booking:read:own': 'Read bookings owned by the current user or vendor.',
  'booking:manage:own': 'Manage bookings owned by the current user or vendor.',
  'listing:read': 'Read marketplace listings.',
  'listing:manage:own': 'Manage listings owned by the current vendor.',
  'vendor:manage:own': 'Manage the current vendor organization.',
  'support:manage': 'Manage assigned support operations.',
  'user:manage': 'Manage marketplace users.',
  'vendor:manage': 'Review and manage all vendors.',
  'listing:moderate': 'Approve, reject, or suspend marketplace listings.',
  'booking:read': 'Read all marketplace bookings.',
  'booking:manage': 'Manage all marketplace bookings.',
  'finance:manage': 'Manage financial operations, refunds, and payouts.',
  'fraud:review': 'Review fraud risk cases.',
  'crm:read': 'Read customer records, value and loyalty.',
  'audit:read': 'Read security and operational audit records.',
} satisfies Record<string, string>;

export type PermissionKey = keyof typeof permissionDescriptions;
export const permissionKeys = Object.keys(permissionDescriptions) as PermissionKey[];

const signedIn: PermissionKey[] = ['profile:read', 'profile:update', 'listing:read'];

export const rolePermissions: Record<UserRole, readonly PermissionKey[]> = {
  customer: [...signedIn, 'booking:read:own', 'booking:manage:own'],
  vendor_owner: [...signedIn, 'booking:read:own', 'booking:manage:own', 'listing:manage:own', 'vendor:manage:own'],
  vendor_staff: [...signedIn, 'booking:read:own', 'booking:manage:own', 'listing:manage:own'],
  // Super Admin: everything.
  admin: permissionKeys,
  // Approves listings and partners, runs bookings, complaints and reviews. No money settings.
  operations_manager: [...signedIn, 'vendor:manage', 'listing:moderate', 'booking:read', 'booking:manage', 'support:manage', 'audit:read'],
  // Refunds, payouts, commission, transactions and fraud. Reads bookings to check them, cannot change them.
  finance_manager: [...signedIn, 'finance:manage', 'booking:read', 'fraud:review', 'audit:read'],
  // Tickets, reported chats and customer records; reads bookings to answer guests.
  support_agent: [...signedIn, 'support:manage', 'booking:read', 'crm:read'],
  // The rest comes from the user's custom role.
  custom_staff: signedIn,
};

/** `extra`: permissions from a custom role, loaded with the session. */
export function hasPermission(roles: UserRole[], permission: PermissionKey, extra: readonly string[] = []) {
  return extra.includes(permission) || roles.some((role) => rolePermissions[role]?.includes(permission));
}

export const permissionsOf = (roles: UserRole[], extra: readonly string[] = []) =>
  [...new Set([...roles.flatMap((role) => rolePermissions[role] ?? []), ...extra])] as PermissionKey[];
