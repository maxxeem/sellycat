"use client";

import { Check, ChevronDown } from "lucide-react";
import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";

export type SelectOption = { value: string; label: ReactNode; disabled?: boolean };

/** <option> children (as used with a native select) → options; lets callers keep their markup. */
function optionsFrom(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>;
    if (el.type === "option") out.push({ value: String(el.props.value ?? ""), label: el.props.children, disabled: el.props.disabled });
    else if (el.props.children) out.push(...optionsFrom(el.props.children));
  });
  return out;
}

const text = (n: ReactNode): string => (typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(text).join("") : isValidElement(n) ? text((n.props as { children?: ReactNode }).children) : "");

const TRIGGER = {
  md: "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-base sm:text-sm",
  sm: "rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm",
} as const;

/**
 * Dropdown in the product's look (never the system menu): a button with the current choice and a
 * listbox popup, keyboard operable (arrows, Home/End, Enter, Escape, type to jump). Takes
 * <option> children like a native select. With `name` it submits a hidden input, so it works in
 * plain forms; `onChange` gets `{ target: { value } }` like the native event.
 */
export function Select({
  children,
  options: given,
  value: controlled,
  defaultValue,
  onChange,
  name,
  disabled,
  size = "md",
  className = "",
  placeholder,
  id,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: {
  children?: ReactNode;
  options?: SelectOption[];
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  disabled?: boolean;
  size?: keyof typeof TRIGGER;
  className?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  "aria-label"?: string;
  "data-testid"?: string;
}) {
  const options = given ?? optionsFrom(children);
  const [own, setOwn] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const value = controlled !== undefined ? String(controlled) : own;
  const current = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ up: boolean; right: boolean }>({ up: false, right: false });
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => {
    if (disabled) return;
    const r = trigger.current?.getBoundingClientRect();
    if (r) setPlace({ up: window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom, right: r.left + 260 > window.innerWidth });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
    requestAnimationFrame(() => list.current?.focus());
  };
  const pick = (o: SelectOption | undefined) => {
    if (!o || o.disabled) return;
    if (controlled === undefined) setOwn(o.value);
    if (o.value !== value) onChange?.({ target: { value: o.value, name } });
    setOpen(false);
    trigger.current?.focus();
  };
  const move = (from: number, step: number) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (from + step * i + options.length) % options.length;
      if (!options[next].disabled) return next;
    }
    return from;
  };
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((a) => move(a, 1));
    else if (e.key === "ArrowUp") setActive((a) => move(a, -1));
    else if (e.key === "Home") setActive(move(-1, 1));
    else if (e.key === "End") setActive(move(options.length, -1));
    else if (e.key === "Enter" || e.key === " ") pick(options[active]);
    else if (e.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
    } else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const now = e.timeStamp;
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = options.findIndex((o) => !o.disabled && text(o.label).toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={box} className={`relative ${size === "md" ? "block" : "inline-block"} ${className}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            show();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        data-testid={testId}
        data-value={value}
        className={`${TRIGGER[size]} flex w-full items-center gap-2 text-left text-ink outline-none transition hover:border-ink focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 ${open ? "border-ink ring-2 ring-accent/30" : ""}`}
      >
        <span className={`min-w-0 flex-1 truncate ${current ? "" : "text-muted"}`}>{current?.label ?? placeholder ?? "–"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className={`absolute z-50 max-h-72 min-w-full w-max max-w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface-2 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] outline-none ${place.up ? "bottom-full mb-2" : "top-full mt-2"} ${place.right ? "right-0" : "left-0"}`}
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={`${o.value}-${i}`}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ${i === active ? "bg-surface" : ""} ${selected ? "font-semibold" : ""} ${o.disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <Check className={`h-4 w-4 shrink-0 text-accent-text ${selected ? "" : "invisible"}`} aria-hidden />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
