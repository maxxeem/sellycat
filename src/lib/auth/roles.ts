import type { Database } from "@/lib/supabase/types";

/** Member roles and their ladder (isomorphic: used by server checks and the dashboard menu). */
export type MemberRole = Database["public"]["Enums"]["member_role"];

/** Role ladder for dashboard permissions (redeemer/partner only use the redemption mode). */
const RANK: Record<MemberRole, number> = { owner: 4, admin: 3, editor: 2, redeemer: 1, partner: 1 };
export const roleAtLeast = (role: MemberRole, min: MemberRole) => RANK[role] >= RANK[min];
