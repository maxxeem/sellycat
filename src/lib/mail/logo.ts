import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { MAIL_LOGO } from "./templates";

/** Address of a shop's logo for mails: on its header band or on white. `v` changes with the logo. */
export function mailLogoUrl(base: string, tenantId: string, logo: string | null, on: "band" | "light"): string | null {
  return logo ? `${base}/api/deal-alert/logo/${tenantId}?on=${on}&v=2${createHash("sha256").update(logo).digest("hex").slice(0, 12)}` : null;
}

/**
 * The whole logo, in its own proportions, at the left of a transparent picture of exactly the size
 * the mails show (twice, for sharp screens). Mail clients handle max-width badly and squash wide
 * logos; with a fixed size nothing can be distorted.
 */
export const boxLogo = (data: Buffer): Promise<Buffer> =>
  sharp(data)
    .resize({ width: MAIL_LOGO.width * 2, height: MAIL_LOGO.height * 2, fit: "contain", position: "left", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png({ palette: false })
    .toBuffer();
