import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Inbox, Loader2, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { VoucherStatusKey } from "@/api/types";

export function Card({ title, actions, children, className, bodyClass }: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(bodyClass ?? "p-4")}>{children}</div>
    </section>
  );
}

const TONES = {
  blue: "bg-primary/15 text-primary",
  green: "bg-success/15 text-success",
  orange: "bg-warning/15 text-warning",
  purple: "bg-purple/15 text-purple",
  cyan: "bg-cyan/15 text-cyan",
  red: "bg-danger/15 text-danger",
} as const;

export type Tone = keyof typeof TONES;

export function KpiCard({ label, value, hint, icon, tone = "blue", loading }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  loading?: boolean;
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-1 truncate text-2xl font-semibold tabular-nums text-ink">
          {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-surface-3" /> : value}
        </div>
        {hint && <div className="mt-0.5 truncate text-xs text-muted">{hint}</div>}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<VoucherStatusKey, string> = {
  online: "bg-success/15 text-success border-success/30",
  unused: "bg-primary/15 text-primary border-primary/30",
  valid: "bg-cyan/15 text-cyan border-cyan/30",
  expired: "bg-surface-3 text-muted border-line",
  disabled: "bg-danger/15 text-danger border-danger/30",
  staff: "bg-purple/15 text-purple border-purple/30",
};

export function StatusBadge({ status, label }: { status: VoucherStatusKey; label?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
      {status === "online" && <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />}
      {label ?? status}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink-soft", className)}>
      {children}
    </span>
  );
}

/** Up/down state: always icon-or-dot + text, never color alone. */
export function RouterState({ online, error }: { online: boolean | undefined; error?: string | null }) {
  if (online === undefined) return <span className="text-xs text-muted">Not configured</span>;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium", online ? "text-success" : "text-danger")} title={error ?? undefined}>
      <span className={clsx("h-2 w-2 rounded-full", online ? "bg-success" : "bg-danger")} aria-hidden />
      {online ? "Router online" : "Router offline"}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("h-4 w-4 animate-spin", className)} aria-label="Loading" />;
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="text-muted">{icon ?? <Inbox className="h-8 w-8" />}</div>
      <div className="font-medium text-ink-soft">{title}</div>
      {hint && <div className="max-w-sm text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{(error as Error).message || "Something went wrong"}</span>
      {onRetry && (
        <button className="btn-ghost btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted no-print">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} / {pages}
        </span>
        <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx("card max-h-[92vh] w-full overflow-auto shadow-pop outline-none", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button className="rounded p-1 text-muted hover:bg-surface-3 hover:text-ink" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/** In-app confirm (no window.confirm, which blocks the page). */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, busy, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="text-sm text-ink-soft">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Notice({ kind, children, onClose }: { kind: "success" | "error"; children: ReactNode; onClose?: () => void }) {
  return (
    <div
      role="status"
      className={clsx(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        kind === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      {kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <span className="flex-1">{children}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
