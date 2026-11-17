/**
 * What a scanner or a person typed: the check link of the QR code (/v/<token>), a bare token,
 * or a voucher code (also from a barcode). Pure and tested.
 */
export type ScanInput = { kind: "token"; token: string } | { kind: "code"; code: string } | { kind: "empty" };

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

export function parseScan(raw: string): ScanInput {
  const text = raw.trim().slice(0, 500);
  if (!text) return { kind: "empty" };
  const link = text.match(/\/v\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  if (link) return { kind: "token", token: link[1] };
  // Readable codes have dashes every four characters and no lowercase; tokens are long and mixed.
  if (TOKEN.test(text) && /[a-z]/.test(text) && /[A-Z0-9]/.test(text) && text.length >= 22) return { kind: "token", token: text };
  return { kind: "code", code: text.slice(0, 120) };
}
