/** Error messages from devices (Apple Wallet web service); kept short in the server log. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { logs?: unknown } | null;
  const logs = Array.isArray(body?.logs) ? body.logs.slice(0, 10).map((l) => String(l).slice(0, 300)) : [];
  if (logs.length) console.warn("[passkit]", logs.join(" | "));
  return new Response(null, { status: 200 });
}
