/** Placeholder while a shop page streams in: keeps the page height, so the footer does not jump up. */
export function PageFallback() {
  return <div className="min-h-[70vh]" aria-busy="true" />;
}
