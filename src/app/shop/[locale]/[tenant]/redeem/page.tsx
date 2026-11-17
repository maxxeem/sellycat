import { redirect } from "next/navigation";

export function generateStaticParams() {
  return [{ tenant: "00000000-0000-0000-0000-000000000000" }];
}

/** The redemption app moved to /scan. */
export default function RedeemMoved() {
  redirect("/scan");
}
