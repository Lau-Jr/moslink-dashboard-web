import clsx from "clsx";
import { Ban, Download, Plus, Power, Printer, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { buildUrl } from "@/api/client";
import { useDisableVoucher, useKick, useVouchers } from "@/api/hooks";
import type { Voucher, VoucherStatusKey } from "@/api/types";
import { useToast } from "@/components/Toast";
import { Card, ConfirmDialog, EmptyState, ErrorBanner, Pagination, Pill, Spinner, StatusBadge } from "@/components/ui";
import { formatDate, formatTZS, formatTime } from "@/lib/format";
import { useSiteColors, useSiteParam } from "@/lib/site";
import { CreateVoucherDialog } from "./CreateVoucherDialog";

const FILTERS: { key: VoucherStatusKey | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "online", label: "Online" },
  { key: "unused", label: "Unused" },
  { key: "valid", label: "Valid" },
  { key: "expired", label: "Expired" },
  { key: "staff", label: "Staff" },
  { key: "disabled", label: "Disabled" },
];

const PAGE_SIZE = 50;

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function DateCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-muted">—</span>;
  return (
    <span className="whitespace-nowrap">
      {formatDate(iso)}
      <span className="block text-xs text-muted">{formatTime(iso)}</span>
    </span>
  );
}

export function VouchersPage() {
  const [site] = useSiteParam();
  const { colorOf } = useSiteColors();
  const toast = useToast();
  const [status, setStatus] = useState<VoucherStatusKey | "all">("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [disabling, setDisabling] = useState<Voucher | null>(null);
  const [kicking, setKicking] = useState<Voucher | null>(null);

  useEffect(() => setPage(1), [site, status, q]);

  const { data, error, isPending, isFetching, refetch } = useVouchers({
    site,
    status: status === "all" ? null : status,
    q,
    page,
    pageSize: PAGE_SIZE,
  });
  const disable = useDisableVoucher();
  const kick = useKick();

  const exportHref = buildUrl("/vouchers/export.csv", { site: site ?? "all", status: status === "all" ? null : status, q });

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onRetry={() => refetch()} />

      <div className="no-print flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = data?.counts[f.key];
          if (f.key === "disabled" && !count && status !== "disabled") return null;
          return (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              aria-pressed={status === f.key}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                status === f.key ? "border-primary bg-primary/15 text-primary" : "border-line bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {f.label}
              {count !== undefined && <span className="ml-1.5 tabular-nums opacity-80">{count}</span>}
            </button>
          );
        })}
      </div>

      <Card
        bodyClass="p-0"
        title={
          <span className="flex items-center gap-2">
            Voucher inventory {data && <Pill>{data.total}</Pill>} {isFetching && !isPending && <Spinner className="text-muted" />}
          </span>
        }
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
              <input
                className="input w-60 pl-8"
                placeholder="Code, phone, label, txn…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search vouchers"
              />
            </div>
            <a className="btn-ghost" href={exportHref} download>
              <Download className="h-4 w-4" /> CSV
            </a>
            <button className="btn-ghost" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </button>
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
        }
      >
        {isPending ? (
          <div className="flex justify-center p-10 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !data?.items.length ? (
          <EmptyState title="No vouchers match" hint={q ? `Nothing found for "${q}".` : "Try another status or site."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base table-responsive">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Phone / label</th>
                  <th>Package</th>
                  {!site && <th>Site</th>}
                  <th>Status</th>
                  <th>Created</th>
                  <th>First used</th>
                  <th className="no-print text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <tr key={v.id}>
                    <td data-label="Code" className="font-mono font-semibold">
                      {v.code}
                    </td>
                    <td data-label="Phone / label">
                      {v.profile === "VOUCHER_STAFF" ? <Pill>{v.label || "Unnamed"}</Pill> : v.phone || <span className="text-muted">—</span>}
                    </td>
                    <td data-label="Package">
                      {v.value ? formatTZS(v.value) : "No charge"}
                      <span className="block text-xs text-muted">{v.plan_label}</span>
                    </td>
                    {!site && (
                      <td data-label="Site">
                        {v.site ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(v.site) }} aria-hidden />
                            {v.site_name}
                          </span>
                        ) : (
                          <span className="text-muted">Admin</span>
                        )}
                      </td>
                    )}
                    <td data-label="Status">
                      <StatusBadge status={v.status.key} label={v.status.label} />
                      {v.status.detail && <span className="mt-0.5 block text-xs text-muted">{v.status.detail}</span>}
                    </td>
                    <td data-label="Created">
                      <DateCell iso={v.created_at} />
                    </td>
                    <td data-label="First used">
                      <DateCell iso={v.used_at} />
                    </td>
                    <td data-label="Actions" className="no-print text-right">
                      <div className="inline-flex gap-1.5">
                        {v.status.key === "online" && (
                          <button className="btn-ghost btn-sm" onClick={() => setKicking(v)}>
                            <Power className="h-3.5 w-3.5" /> Kick
                          </button>
                        )}
                        {v.status.key !== "disabled" && v.status.key !== "expired" && (
                          <button className="btn-danger btn-sm" onClick={() => setDisabling(v)}>
                            <Ban className="h-3.5 w-3.5" /> Disable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />}
      </Card>

      <CreateVoucherDialog open={creating} defaultSite={site} onClose={() => setCreating(false)} />

      <ConfirmDialog
        open={!!disabling}
        title="Disable voucher?"
        message={
          <>
            <span className="font-mono font-semibold">{disabling?.code}</span> will no longer be able to log in, and any live session is disconnected. This
            cannot be undone.
          </>
        }
        confirmLabel="Disable"
        danger
        busy={disable.isPending}
        onCancel={() => setDisabling(null)}
        onConfirm={() =>
          disabling &&
          disable.mutate(disabling.id, {
            onSuccess: () => {
              toast("success", `${disabling.code} disabled`);
              setDisabling(null);
            },
            onError: (e) => toast("error", (e as Error).message),
          })
        }
      />
      <ConfirmDialog
        open={!!kicking}
        title="Disconnect session?"
        message={
          <>
            <span className="font-mono font-semibold">{kicking?.code}</span> is disconnected but stays valid and can log in again.
          </>
        }
        confirmLabel="Kick"
        danger
        busy={kick.isPending}
        onCancel={() => setKicking(null)}
        onConfirm={() =>
          kicking &&
          kick.mutate(
            { code: kicking.code },
            {
              onSuccess: () => {
                toast("success", `${kicking.code} disconnected`);
                setKicking(null);
              },
              onError: (e) => toast("error", (e as Error).message),
            },
          )
        }
      />
    </div>
  );
}
