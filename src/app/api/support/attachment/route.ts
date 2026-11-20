import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ATTACHMENT_MAX, ATTACHMENT_TYPES } from "@/lib/support/rules";
import { attachmentUpload } from "@/lib/support/support";

/** Signed upload URL for a support attachment (private bucket, one folder per person). */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { type?: string; size?: number };
  const ext = body.type ? ATTACHMENT_TYPES[body.type] : undefined;
  if (!ext) return NextResponse.json({ error: "type" }, { status: 400 });
  if (!(Number(body.size) > 0) || Number(body.size) > ATTACHMENT_MAX) return NextResponse.json({ error: "size" }, { status: 400 });
  const signed = await attachmentUpload(user.id, ext);
  if (!signed) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json(signed);
}
