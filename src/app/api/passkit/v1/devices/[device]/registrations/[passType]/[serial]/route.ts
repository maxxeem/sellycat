import { authToken, checkPass, registerDevice, unregisterDevice, validDevice, validPassType } from "@/lib/wallet/webservice";

type Ctx = { params: Promise<{ device: string; passType: string; serial: string }> };

/** A device starts holding a pass (Apple Wallet web service). */
export async function POST(request: Request, { params }: Ctx) {
  const { device, passType, serial } = await params;
  if (!validPassType(passType) || !validDevice(device)) return new Response(null, { status: 404 });
  const pass = await checkPass(serial, authToken(request));
  if (!pass) return new Response(null, { status: 401 });
  const body = (await request.json().catch(() => null)) as { pushToken?: unknown } | null;
  if (typeof body?.pushToken !== "string" || !body.pushToken) return new Response(null, { status: 400 });
  const r = await registerDevice(device, body.pushToken, serial, pass.tenantId);
  return new Response(null, { status: r === "created" ? 201 : 200 });
}

/** The pass was removed from the device. */
export async function DELETE(request: Request, { params }: Ctx) {
  const { device, passType, serial } = await params;
  if (!validPassType(passType) || !validDevice(device)) return new Response(null, { status: 404 });
  if (!(await checkPass(serial, authToken(request)))) return new Response(null, { status: 401 });
  await unregisterDevice(device, serial);
  return new Response(null, { status: 200 });
}
