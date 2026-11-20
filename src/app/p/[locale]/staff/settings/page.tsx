import { redirect } from "next/navigation";

/** The signup switch moved to Access (mode, codes, waitlist). */
export default function SettingsPage() {
  redirect("/admin/access");
}
