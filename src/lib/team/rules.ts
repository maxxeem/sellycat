/**
 * Who may do what in a shop's team (pure, tested). Owners do everything; admins manage admins,
 * editors and redeemers but never owners; nobody changes their own role; the last owner stays.
 */
export const TEAM_ROLES = ["owner", "admin", "editor", "redeemer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export const isTeamRole = (v: unknown): v is TeamRole => TEAM_ROLES.some((r) => r === v);

const manages = (actor: string, role: TeamRole) => actor === "owner" || (actor === "admin" && role !== "owner");

/** May `actor` invite someone with `role`? */
export const canInvite = (actor: string, role: TeamRole) => manages(actor, role);

/** May `actor` change `target` (currently `from`) to `to`? */
export function canChangeRole(input: { actor: string; actorId: string; targetId: string; from: TeamRole; to: TeamRole; owners: number }): boolean {
  if (input.actorId === input.targetId) return false;
  if (!manages(input.actor, input.from) || !manages(input.actor, input.to)) return false;
  return !(input.from === "owner" && input.to !== "owner" && input.owners <= 1);
}

/** May `actor` remove `target` (role `role`)? Leaving yourself is fine unless you are the last owner. */
export function canRemove(input: { actor: string; actorId: string; targetId: string; role: TeamRole; owners: number }): boolean {
  if (input.role === "owner" && input.owners <= 1) return false;
  if (input.actorId === input.targetId) return true;
  return manages(input.actor, input.role);
}

/** Free seats under the plan limit (null limit = unlimited). */
export const seatsLeft = (limit: number | null, used: number) => (limit === null ? Infinity : Math.max(0, limit - used));

export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200;
