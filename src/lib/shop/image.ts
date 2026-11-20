import { getImageProps } from "next/image";

/**
 * Responsive `src`/`srcSet`/`sizes` for pictures from our public storage, served through the
 * Next image optimizer (WebP, sized to the screen) instead of the original upload, which can be
 * several MB. Anything else (SVG, blob: previews, external URLs) is returned unchanged.
 */
export function shopImage(src: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!src.startsWith("https://") || !src.includes("/storage/v1/object/public/") || /\.svg$/i.test(src)) return { src };
  const { props } = getImageProps({ src, alt: "", fill: true, sizes });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}
