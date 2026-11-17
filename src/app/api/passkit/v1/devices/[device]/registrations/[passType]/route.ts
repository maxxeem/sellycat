import { changedSince, validDevice, validPassType } from "@/lib/wallet/webservice";

/** Which of this device's passes changed since the last tag. */
export async function GET(request: Request, { params }: { params: Promise<{ device: string; passType: string }> }) {
  const { device, passType } = await params;
  if (!validPassType(passType) || !validDevice(device)) return new Response(null, { status: 404 });
  const result = await changedSince(device, new URL(request.url).searchParams.get("passesUpdatedSince"));
  return result ? Response.json(result) : new Response(null, { status: 204 });
}
