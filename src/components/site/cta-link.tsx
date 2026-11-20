"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { scrollToAnchor } from "./site-header";

/** Call-to-action link: an anchor on this page (#warteliste) glides there, anything else navigates. */
export function CtaLink({ href, className, testId, children }: { href: string; className: string; testId?: string; children: ReactNode }) {
  const anchor = href.startsWith("/#") ? href.slice(2) : null;
  return (
    <Link href={href} className={className} data-testid={testId} onClick={anchor ? (e) => scrollToAnchor(anchor, e) : undefined}>
      {children}
    </Link>
  );
}
