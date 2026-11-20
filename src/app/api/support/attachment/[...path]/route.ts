import { NextResponse, type NextRequest } from "next/server";
import { attachmentLink } from "@/lib/support/support";

/** Opens an attachment for whoever may read its ticket (RLS: author, shop owners/admins, staff). */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/support/attachment/[...path]">) {
  const { path } = await ctx.params;
  const url = await attachmentLink(path.join("/"));
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url, 302);
}
