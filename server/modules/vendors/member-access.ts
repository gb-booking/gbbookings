import { VendorMemberModel } from '../../models/vendor-member.model.js';

// Which partner-team roles may use each area. The services check these, and the partner dashboard shows only these areas.
export const MEMBER_ACCESS = {
  listings: ['owner', 'manager', 'listings'],
  reservations: ['owner', 'manager', 'reservations'],
  reports: ['owner', 'manager', 'finance'],
  team: ['owner'],
  business: ['owner'],
} as const;

export type MemberArea = keyof typeof MEMBER_ACCESS;

export const canAccess = (role: string, area: MemberArea) => (MEMBER_ACCESS[area] as readonly string[]).includes(role);
export const accessFor = (role: string) => (Object.keys(MEMBER_ACCESS) as MemberArea[]).filter((area) => canAccess(role, area));

/** The businesses whose `area` this user may work in. Every partner service scopes its queries to these; empty means no access. */
export async function vendorIdsFor(userId: string, area: MemberArea) {
  const memberships = await VendorMemberModel.find({ userId, status: 'active', deletedAt: null, role: { $in: MEMBER_ACCESS[area] } }).select('vendorId').lean() as any[];
  return memberships.map((membership) => membership.vendorId);
}
