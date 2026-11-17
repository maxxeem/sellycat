import "server-only";
import http2 from "node:http2";
import { appleConfig } from "./config";

/**
 * Tells iPhones that a pass changed (empty push to Apple's push service with the pass
 * certificate). The phone then asks our web service for the new pass.
 * Returns the push tokens Apple no longer accepts (to forget them).
 */
export async function pushPassUpdates(pushTokens: string[]): Promise<{ sent: number; gone: string[] }> {
  const cfg = appleConfig();
  if (!cfg || !pushTokens.length) return { sent: 0, gone: [] };
  const session = http2.connect("https://api.push.apple.com", { cert: cfg.signerCert, key: cfg.signerKey });
  session.on("error", (e) => console.warn("[apns]", e.message));
  const gone: string[] = [];
  let sent = 0;
  try {
    await Promise.all(
      [...new Set(pushTokens)].map(
        (token) =>
          new Promise<void>((resolve) => {
            const req = session.request({ ":method": "POST", ":path": `/3/device/${encodeURIComponent(token)}`, "apns-topic": cfg.passTypeIdentifier, "apns-push-type": "background", "content-type": "application/json" });
            req.setTimeout(10_000, () => req.close());
            req.on("response", (headers) => {
              const status = Number(headers[":status"]);
              if (status === 200) sent += 1;
              else if (status === 410 || status === 400) gone.push(token);
            });
            req.on("close", () => resolve());
            req.on("error", () => resolve());
            req.end("{}");
          }),
      ),
    );
  } finally {
    session.close();
  }
  return { sent, gone };
}
