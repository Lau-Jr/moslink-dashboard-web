import { Check, Copy, Printer, Ticket, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useCreateVouchers, usePackages, useSites } from "@/api/hooks";
import type { Voucher } from "@/api/types";
import { Modal, Notice, SegmentedControl, Spinner } from "@/components/ui";
import { formatTZS } from "@/lib/format";
import { UNASSIGNED } from "@/lib/site";

type Kind = "paid" | "staff";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Printable slips (opens a small window; the dashboard page itself isn't printed). */
export function printVouchers(vouchers: Voucher[]) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  const slips = vouchers
    .map(
      (v) => `<div class="slip"><div class="brand">MOSLINK WiFi</div><div class="code">${escapeHtml(v.code)}</div>
      <div class="plan">${escapeHtml(v.value ? `${v.plan_label} · TZS ${v.value.toLocaleString()}` : `${v.plan_label}${v.label ? ` · ${v.label}` : ""}`)}</div></div>`,
    )
    .join("");
  w.document.write(`<!doctype html><html><head><title>Vouchers</title><style>
    body{font-family:system-ui,sans-serif;margin:16px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .slip{border:1px dashed #888;border-radius:8px;padding:12px;text-align:center;break-inside:avoid}
    .brand{font-size:11px;letter-spacing:.1em;color:#555}.code{font:700 22px ui-monospace,Consolas,monospace;letter-spacing:.15em;margin:6px 0}
    .plan{font-size:12px;color:#333}</style></head><body><div class="grid">${slips}</div>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

export function CreateVoucherDialog({ open, onClose, defaultSite, initialKind = "paid" }: {
  open: boolean;
  onClose: () => void;
  defaultSite: string | null;
  initialKind?: Kind;
}) {
  const { data: pkgs } = usePackages();
  const { data: sites } = useSites();
  const create = useCreateVouchers();
  const registered = (sites ?? []).filter((s) => s.registered);

  const [kind, setKind] = useState<Kind>(initialKind);
  const [value, setValue] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const [label, setLabel] = useState("");
  const [site, setSite] = useState("");
  const [created, setCreated] = useState<Voucher[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setCreated(null);
    setCount(1);
    setLabel("");
    create.reset();
    const preset = defaultSite && defaultSite !== UNASSIGNED && registered.some((s) => s.code === defaultSite) ? defaultSite : "";
    setSite(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (value === null && pkgs?.packages.length) setValue(pkgs.packages[0].value);
  }, [pkgs, value]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body =
      kind === "staff"
        ? ({ kind, label: label.trim(), site: site || null } as const)
        : ({ kind, value: value ?? 0, count, site: site || null } as const);
    create.mutate(body, { onSuccess: (r) => setCreated(r.vouchers) });
  };

  const copyAll = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.map((v) => v.code).join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: codes are still visible to copy by hand */
    }
  };

  const maxBulk = pkgs?.max_bulk ?? 200;
  const pkg = pkgs?.packages.find((p) => p.value === value);

  return (
    <Modal open={open} onClose={onClose} title={created ? "Vouchers created" : "Create vouchers"} wide={!!created && created.length > 1}>
      {created ? (
        <div className="space-y-4">
          <Notice kind="success">
            {created.length === 1 ? "1 voucher" : `${created.length} vouchers`} ready
            {created[0]?.site_name ? ` for ${created[0].site_name}` : ""}.
          </Notice>
          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
            {created.map((v) => (
              <div key={v.code} className="rounded-lg border border-dashed border-line bg-surface-2 p-3 text-center">
                <div className="font-mono text-lg font-bold tracking-[0.15em]">{v.code}</div>
                <div className="text-xs text-muted">{v.value ? `${v.plan_label} · ${formatTZS(v.value)}` : v.label || v.plan_label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" onClick={copyAll}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy codes"}
            </button>
            <button className="btn-ghost" onClick={() => printVouchers(created)}>
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button className="btn-ghost" onClick={() => setCreated(null)}>
              Create more
            </button>
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <SegmentedControl
            ariaLabel="Voucher type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "paid", label: <span className="flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5" />Package</span> },
              { value: "staff", label: <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />Staff / Family</span> },
            ]}
          />
          {create.error && <Notice kind="error">{(create.error as Error).message}</Notice>}

          {kind === "paid" ? (
            <>
              <div>
                <span className="label">Package</span>
                <div className="grid grid-cols-2 gap-2">
                  {(pkgs?.packages ?? []).map((p) => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setValue(p.value)}
                      aria-pressed={value === p.value}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        value === p.value ? "border-primary bg-primary/10" : "border-line bg-surface-2 hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-semibold">{p.label}</div>
                      <div className="text-xs text-muted">{formatTZS(p.value)}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="count">
                  How many (1–{maxBulk})
                </label>
                <input
                  id="count"
                  type="number"
                  min={1}
                  max={maxBulk}
                  required
                  className="input"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(maxBulk, Number(e.target.value) || 1)))}
                />
                {pkg && count > 1 && <p className="mt-1 text-xs text-muted">Face value {formatTZS(pkg.value * count)}</p>}
              </div>
            </>
          ) : (
            <div>
              <label className="label" htmlFor="staff-label">
                Who is it for?
              </label>
              <input
                id="staff-label"
                className="input"
                maxLength={100}
                required
                placeholder="e.g. Front desk, Mama Neema"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted">Free of charge and never expires. Disable it when no longer needed.</p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="voucher-site">
              Site
            </label>
            <select id="voucher-site" className="input" value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">No site (admin)</option>
              {registered.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Used for reporting only. Vouchers work on every router.</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={create.isPending || (kind === "paid" && value === null)}>
              {create.isPending && <Spinner />}
              {kind === "staff" ? "Create staff voucher" : count > 1 ? `Create ${count} vouchers` : "Create voucher"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
