/** Fills {placeholders}: fmt("Hello {name}", { name: "Jan" }). Own module so client code can use it without both dictionaries. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
