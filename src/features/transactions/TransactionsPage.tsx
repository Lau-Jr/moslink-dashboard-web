import clsx from "clsx";
import { CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTransactions } from "@/api/hooks";
import { Card, EmptyState, ErrorBanner, Pagination, Pill, Spinner } from "@/components/ui";
import { addDays, formatDate, formatTime, formatTZS, todayYmd } from "@/lib/format";
import { useSiteColors, useSiteParam } from "@/lib/site";

const STATUS = [
  { key: "", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
] as const;

const PAGE_SIZE = 50;

function PaymentStatus({ status }: { status: string }) {
  if (status === "COMPLETED")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
        <Clock3 className="h-3.5 w-3.5" /> Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
      <XCircle className="h-3.5 w-3.5" /> {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function TransactionsPage() {
  const [site] = useSiteParam();
  const { colorOf } = useSiteColors();
  const today = todayYmd();
  const [start, setStart] = useState(addDays(today, -6));
  const [end, setEnd] = useState(today);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [site, status, q, start, end]);

  const { data, error, isPending, isFetching, refetch } = useTransactions({ site, status, q, start, end, page, pageSize: PAGE_SIZE });

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onRetry={() => refetch()} />
      <Card
        bodyClass="p-0"
        title={
          <span className="flex items-center gap-2">
            Payments {data && <Pill>{data.total}</Pill>} {isFetching && !isPending && <Spinner className="text-muted" />}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
              {STATUS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  aria-pressed={status === s.key}
                  className={clsx("rounded-md px-2.5 py-1 text-xs font-medium", status === s.key ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <input type="date" aria-label="From" className="input w-auto py-1.5" value={start} max={end} onChange={(e) => e.target.value && setStart(e.target.value)} />
            <input type="date" aria-label="To" className="input w-auto py-1.5" value={end} min={start} max={today} onChange={(e) => e.target.value && setEnd(e.target.value)} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
              <input className="input w-52 pl-8" placeholder="Phone or reference…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search payments" />
            </div>
          </div>
        }
      >
        {isPending ? (
          <div className="flex justify-center p-10 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !data?.items.length ? (
          <EmptyState title="No payments in this range" hint="Change the dates, status or site." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base table-responsive">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Phone</th>
                  <th className="text-right">Amount</th>
                  {!site && <th>Site</th>}
                  <th>Status</th>
                  <th>Voucher</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Time" className="whitespace-nowrap">
                      {formatDate(t.created_at)}
                      <span className="block text-xs text-muted">{formatTime(t.created_at)}</span>
                    </td>
                    <td data-label="Phone" className="font-mono">{t.phone ?? "—"}</td>
                    <td data-label="Amount" className="text-right tabular-nums">
                      {formatTZS(t.amount)}
                      {t.plan_label && <span className="block text-xs text-muted">{t.plan_label}</span>}
                    </td>
                    {!site && (
                      <td data-label="Site">
                        {t.site ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(t.site) }} aria-hidden />
                            {t.site_name}
                          </span>
                        ) : (
                          <span className="text-muted">Unknown</span>
                        )}
                      </td>
                    )}
                    <td data-label="Status" title={t.message ?? undefined}>
                      <PaymentStatus status={t.payment_status} />
                      {t.message && t.payment_status !== "COMPLETED" && <span className="block max-w-[220px] truncate text-xs text-muted">{t.message}</span>}
                    </td>
                    <td data-label="Voucher" className="font-mono font-semibold">{t.voucher_code ?? <span className="font-sans font-normal text-muted">—</span>}</td>
                    <td data-label="Reference" className="text-xs text-muted">
                      <div className="font-mono">{t.txn_id}</div>
                      {t.order_id && <div className="font-mono">{t.order_id}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
