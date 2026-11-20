import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

/*
 * UI primitives for Sellycat's own surfaces (adapted from SwypeCast's admin ui.tsx).
 * Brand rule: primary buttons are coral with ink text (never white text on coral).
 */
export const inputClass =
  "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-muted focus:border-ink focus:ring-2 focus:ring-accent/30 disabled:opacity-60 sm:text-sm";

const btn = "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-button px-4 text-base font-semibold leading-5 transition disabled:opacity-60 sm:text-sm";
export const buttonClass = {
  primary: `${btn} bg-accent text-on-accent shadow-card hover:brightness-95 active:brightness-90`,
  dark: `${btn} bg-ink text-surface-2 hover:opacity-90`,
  secondary: `${btn} border border-line bg-surface-2 text-ink hover:bg-surface`,
  danger: `${btn} border border-danger/50 text-danger hover:bg-danger/10`,
  ghost: `${btn} font-medium text-muted hover:bg-surface hover:text-ink`,
};

export const linkClass = "font-medium text-accent-text underline-offset-2 hover:underline";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

/** Dropdown in the product's look (see select.tsx); takes <option> children like a native select. */
export { Select } from "./select";

export function Card({ children, className = "", title, description, actions }: { children: ReactNode; className?: string; title?: string; description?: string; actions?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-card border border-line bg-surface-2 shadow-card ${className}`}>
      {title ? (
        <header className="flex flex-col gap-1 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="text-sm text-muted">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

const BADGE_TONES = {
  neutral: "bg-line text-ink",
  green: "bg-success/15 text-success",
  amber: "bg-warn/15 text-warn",
  red: "bg-danger/15 text-danger",
  coral: "bg-accent/15 text-accent-text",
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const tones = { info: "border-line bg-surface text-ink", error: "border-danger/40 bg-danger/10 text-danger", success: "border-success/40 bg-success/10 text-success", warning: "border-warn/40 bg-warn/10 text-warn" };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-input border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line px-6 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-full overflow-x-auto rounded-card border border-line bg-surface-2">
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  );
}
export const thClass = "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted";
export const tdClass = "border-t border-line px-4 py-3 align-middle";

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-input bg-line/60 ${className}`} />;
}
