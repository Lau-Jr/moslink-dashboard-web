import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSessions } from "@/api/hooks";
import type { RouterStatus } from "@/api/types";
import { Card, ErrorBanner, Pill, Spinner } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { useSiteColors, useSiteParam } from "@/lib/site";
import { SessionsTable } from "./SessionsTable";

export function RouterErrors({ routers }: { routers: RouterStatus[] }) {
  const down = routers.filter((r) => !r.online);
  if (!down.length) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {down.length === 1 ? "1 router is" : `${down.length} routers are`} unreachable, so their sessions are missing:{" "}
        {down.map((r) => `${r.name} (${r.error ?? "no response"})`).join(", ")}
      </div>
    </div>
  );
}

export function SessionsPage() {
  const [site] = useSiteParam();
  const { data, error, isPending, isFetching, refetch } = useSessions(site);
  const { colorOf } = useSiteColors();
  const [q, setQ] = useState("");

  const sessions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = data?.sessions ?? [];
    return needle
      ? all.filter((s) => [s.voucher, s.ip, s.mac, s.site_name, s.plan_label].some((f) => f?.toLowerCase().includes(needle)))
      : all;
  }, [data, q]);

  const traffic = sessions.reduce((sum, s) => sum + s.bytes_in + s.bytes_out, 0);

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onRetry={() => refetch()} />
      {data && <RouterErrors routers={data.routers} />}

      {data && data.routers.length > 1 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.routers.map((r) => (
            <div key={r.site} className="card p-3">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: colorOf(r.site) }} aria-hidden />
                <span className="truncate">{r.name}</span>
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{r.online ? r.sessions : "—"}</div>
              <div className={r.online ? "text-xs text-success" : "text-xs text-danger"}>
                {r.online ? `online · ${r.latency_ms ?? "?"} ms` : "router offline"}
              </div>
            </div>
          ))}
        </div>
      )}

      <Card
        title={
          <span className="flex items-center gap-2">
            Active sessions <Pill>{sessions.length} online</Pill>
            {traffic > 0 && <span className="text-xs font-normal text-muted">{formatBytes(traffic)} transferred</span>}
          </span>
        }
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
              <input className="input w-56 pl-8" placeholder="Voucher, IP, MAC…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
              {isFetching ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </>
        }
        bodyClass="p-0"
      >
        {isPending ? (
          <div className="flex justify-center p-10 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <SessionsTable sessions={sessions} showSite={!site} />
        )}
      </Card>
      <p className="text-xs text-muted">Refreshes every 15 seconds.</p>
    </div>
  );
}
