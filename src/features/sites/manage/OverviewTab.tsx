import clsx from "clsx";
import { Clock, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useRef } from "react";
import { useRouterOverview } from "@/api/hooks";
import type { RouterInterface } from "@/api/types";
import { Card, ErrorBanner, KpiCard } from "@/components/ui";
import { formatBytes, formatDuration, formatRate } from "@/lib/format";

type Sample = { rx: number; tx: number; at: number };
type Rates = Record<string, { rx: number; tx: number }>;

/** Live rates from byte counters: (bytes now − bytes at last poll) × 8 / seconds between polls. */
function useRates(interfaces: RouterInterface[] | undefined, fetchedAt: number): Rates {
  const prev = useRef<Record<string, Sample>>({});
  const last = useRef<{ at: number; rates: Rates }>({ at: 0, rates: {} });
  if (!interfaces || fetchedAt === last.current.at) return last.current.rates;

  const rates: Rates = {};
  for (const i of interfaces) {
    const p = prev.current[i.name];
    const secs = p ? (fetchedAt - p.at) / 1000 : 0;
    // A counter that went down means the router rebooted or reset it: no rate this round.
    if (p && secs > 0 && i.rx_bytes >= p.rx && i.tx_bytes >= p.tx) {
      rates[i.name] = { rx: ((i.rx_bytes - p.rx) * 8) / secs, tx: ((i.tx_bytes - p.tx) * 8) / secs };
    }
    prev.current[i.name] = { rx: i.rx_bytes, tx: i.tx_bytes, at: fetchedAt };
  }
  last.current = { at: fetchedAt, rates };
  return rates;
}

export function OverviewTab({ code }: { code: string }) {
  const { data, error, isPending, refetch, dataUpdatedAt } = useRouterOverview(code);
  const rates = useRates(data?.interfaces, dataUpdatedAt);
  const memUsed = data ? data.total_memory - data.free_memory : 0;
  const memPct = data?.total_memory ? Math.round((memUsed / data.total_memory) * 100) : 0;
  const interfaces = [...(data?.interfaces ?? [])].sort((a, b) => Number(b.running) - Number(a.running));

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onRetry={() => refetch()} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Uptime"
          tone="green"
          icon={<Clock className="h-5 w-5" />}
          loading={isPending}
          value={data ? formatDuration(data.uptime_seconds) : "—"}
          hint={data?.identity ?? undefined}
        />
        <KpiCard
          label="CPU"
          tone={data && data.cpu_load >= 80 ? "red" : "blue"}
          icon={<Cpu className="h-5 w-5" />}
          loading={isPending}
          value={data ? `${data.cpu_load}%` : "—"}
          hint={data?.cpu_count ? `${data.cpu_count} core${data.cpu_count > 1 ? "s" : ""}` : undefined}
        />
        <KpiCard
          label="Memory"
          tone={memPct >= 85 ? "red" : "purple"}
          icon={<MemoryStick className="h-5 w-5" />}
          loading={isPending}
          value={data ? `${memPct}%` : "—"}
          hint={data ? `${formatBytes(memUsed)} of ${formatBytes(data.total_memory)}` : undefined}
        />
        <KpiCard
          label="RouterOS"
          tone="cyan"
          icon={<HardDrive className="h-5 w-5" />}
          loading={isPending}
          value={data?.version?.split(" ")[0] ?? "—"}
          hint={[data?.model, data?.serial].filter(Boolean).join(" · ") || undefined}
        />
      </div>

      <Card title="Interfaces" bodyClass="p-0" actions={<span className="text-xs text-muted">Updates every 5 s</span>}>
        <div className="overflow-x-auto">
          <table className="table-base table-responsive">
            <thead>
              <tr>
                <th>Interface</th>
                <th>Type</th>
                <th className="text-right">Rx rate</th>
                <th className="text-right">Tx rate</th>
                <th className="text-right">Total rx / tx</th>
              </tr>
            </thead>
            <tbody>
              {interfaces.map((i) => (
                <tr key={i.id ?? i.name} className={i.disabled ? "opacity-50" : undefined}>
                  <td data-label="Interface">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span className={clsx("h-2 w-2 rounded-full", i.running ? "bg-success" : "bg-surface-3")} aria-hidden />
                      {i.name}
                      <span className="sr-only">{i.running ? "(running)" : "(down)"}</span>
                    </span>
                    {i.comment && <span className="block text-xs text-muted">{i.comment}</span>}
                  </td>
                  <td data-label="Type" className="text-xs text-muted">
                    {i.disabled ? "disabled" : i.type}
                  </td>
                  <td data-label="Rx rate" className="text-right tabular-nums">
                    {formatRate(rates[i.name]?.rx)}
                  </td>
                  <td data-label="Tx rate" className="text-right tabular-nums">
                    {formatRate(rates[i.name]?.tx)}
                  </td>
                  <td data-label="Total rx / tx" className="text-right text-xs tabular-nums text-muted">
                    {formatBytes(i.rx_bytes)} / {formatBytes(i.tx_bytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
