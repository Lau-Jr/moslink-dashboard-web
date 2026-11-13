import { Banknote, CalendarRange, CheckCircle2, Repeat, Ticket, Users } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useReport } from "@/api/hooks";
import type { ProfileRow } from "@/api/types";
import { BarList, DailyRevenueChart, HourlyRevenueChart } from "@/components/charts";
import { Card, ErrorBanner, KpiCard, RouterState, Spinner } from "@/components/ui";
import { addDays, formatDay, formatNumber, formatTZS, percent, todayYmd } from "@/lib/format";
import { UNASSIGNED, siteLabel, useSiteColors, useSiteParam } from "@/lib/site";

const PRESETS = [
  { key: "today", label: "Today", range: (t: string) => [t, t] },
  { key: "7d", label: "7 days", range: (t: string) => [addDays(t, -6), t] },
  { key: "30d", label: "30 days", range: (t: string) => [addDays(t, -29), t] },
  { key: "month", label: "This month", range: (t: string) => [`${t.slice(0, 8)}01`, t] },
  { key: "last-month", label: "Last month", range: (t: string) => {
      const firstThis = `${t.slice(0, 8)}01`;
      const lastPrev = addDays(firstThis, -1);
      return [`${lastPrev.slice(0, 8)}01`, lastPrev];
    } },
] as const;

function ProfileTable({ rows, countLabel, valueLabel }: { rows: ProfileRow[]; countLabel: string; valueLabel: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">No data in this range.</p>;
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <table className="table-base">
      <thead>
        <tr>
          <th>Package</th>
          <th className="text-right">{countLabel}</th>
          <th className="text-right">{valueLabel}</th>
          <th className="text-right">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.profile ?? r.label}>
            <td>{r.label}</td>
            <td className="text-right tabular-nums">{formatNumber(r.count)}</td>
            <td className="text-right tabular-nums">{formatTZS(r.value)}</td>
            <td className="text-right tabular-nums text-muted">{total ? percent((100 * r.value) / total) : "—"}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="font-semibold">
          <td className="px-3 py-2.5">Total</td>
          <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(rows.reduce((s, r) => s + r.count, 0))}</td>
          <td className="px-3 py-2.5 text-right tabular-nums">{formatTZS(total)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

export function ReportsPage() {
  const [site, setSite] = useSiteParam();
  const [params, setParams] = useSearchParams();
  const today = todayYmd();
  const end = params.get("end") || today;
  const start = params.get("start") || addDays(end, -6);
  const { colorOf, nameOf, order } = useSiteColors();
  const { data, error, isPending, isFetching, refetch } = useReport(site, start, end);

  const setRange = (s: string, e: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("start", s);
        p.set("end", e);
        return p;
      },
      { replace: true },
    );

  const activePreset = PRESETS.find((p) => {
    const [s, e] = p.range(today);
    return s === start && e === end;
  })?.key;

  const stackSites = useMemo(() => {
    const keys = new Set<string>();
    for (const d of data?.daily ?? []) for (const [k, v] of Object.entries(d.by_site)) if (v > 0) keys.add(k);
    const rank = (k: string) => (k === UNASSIGNED ? 1e6 : order.indexOf(k) >= 0 ? order.indexOf(k) : 1e5);
    return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }, [data, order]);

  const k = data?.kpis;
  const siteRows = (data?.sites ?? []).filter((r) => !site || r.site === site);

  return (
    <div className="space-y-5">
      <div className="card no-print flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setRange(...(p.range(today) as [string, string]))}
              aria-pressed={activePreset === p.key}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                activePreset === p.key ? "border-primary bg-primary/15 text-primary" : "border-line text-ink-soft hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label>
            <span className="label">From</span>
            <input type="date" className="input py-1.5" value={start} max={end} onChange={(e) => e.target.value && setRange(e.target.value, end)} />
          </label>
          <label>
            <span className="label">To</span>
            <input type="date" className="input py-1.5" value={end} min={start} max={today} onChange={(e) => e.target.value && setRange(start, e.target.value)} />
          </label>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted">
          {isFetching && <Spinner />}
          <CalendarRange className="h-4 w-4" />
          {formatDay(start)} – {formatDay(end)} · {siteLabel(site, nameOf)}
        </div>
      </div>

      <ErrorBanner error={error} onRetry={() => refetch()} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard loading={isPending} tone="blue" icon={<Banknote className="h-5 w-5" />} label="Revenue (payments)" value={formatTZS(k?.cash_revenue)} hint={k ? `avg ${formatTZS(k.avg_daily_revenue)} / day` : undefined} />
        <KpiCard loading={isPending} tone="purple" icon={<Repeat className="h-5 w-5" />} label="Voucher revenue" value={formatTZS(k?.voucher_revenue)} hint="value of vouchers first used in range" />
        <KpiCard loading={isPending} tone="cyan" icon={<CheckCircle2 className="h-5 w-5" />} label="Payment success" value={percent(k?.payments.success_rate)} hint={k ? `${k.payments.completed} of ${k.payments.total} payments` : undefined} />
        <KpiCard loading={isPending} tone="green" icon={<Users className="h-5 w-5" />} label="Paying customers" value={formatNumber(k?.unique_customers)} hint="distinct phone numbers" />
        <KpiCard loading={isPending} tone="orange" icon={<Ticket className="h-5 w-5" />} label="Vouchers created" value={formatNumber(k?.vouchers_created)} hint={k ? `${k.vouchers_sold} sold · ${k.created_still_unused} still unused` : undefined} />
        <KpiCard loading={isPending} tone="red" icon={<Ticket className="h-5 w-5" />} label="Vouchers activated" value={formatNumber(k?.vouchers_used)} hint={k ? `${k.online_now} online now` : undefined} />
      </div>

      {data && <DailyRevenueChart data={data.daily} sites={stackSites} colorOf={colorOf} nameOf={nameOf} />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Revenue by site">
          {siteRows.length ? (
            <BarList
              items={siteRows.map((r) => ({
                key: r.site,
                label: (
                  <button className="hover:underline" onClick={() => setSite(r.site)}>
                    {r.name}
                  </button>
                ),
                value: r.cash_revenue,
                color: colorOf(r.site),
                sub: `${r.payments.completed} payments · ${r.vouchers_sold} vouchers sold · success ${percent(r.payments.success_rate)}`,
              }))}
            />
          ) : (
            <p className="py-6 text-center text-sm text-muted">No sites yet.</p>
          )}
        </Card>
        {data && <HourlyRevenueChart data={data.hourly} title="Revenue by hour of day" />}
      </div>

      <Card title="Site comparison" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="table-base table-responsive">
            <thead>
              <tr>
                <th>Site</th>
                <th>Router</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Payments</th>
                <th className="text-right">Success</th>
                <th className="text-right">Vouchers sold</th>
                <th className="text-right">Voucher revenue</th>
                <th className="text-right">Online now</th>
              </tr>
            </thead>
            <tbody>
              {(data?.sites ?? []).map((r) => (
                <tr key={r.site} className={site && r.site !== site ? "opacity-50" : undefined}>
                  <td data-label="Site">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span className="h-2 w-2 rounded-full" style={{ background: colorOf(r.site) }} aria-hidden />
                      {r.name}
                    </span>
                  </td>
                  <td data-label="Router">{r.site === UNASSIGNED ? <span className="text-muted">—</span> : <RouterState online={r.router?.online} error={r.router?.error} />}</td>
                  <td data-label="Revenue" className="text-right font-medium tabular-nums">{formatTZS(r.cash_revenue)}</td>
                  <td data-label="Payments" className="text-right tabular-nums">{r.payments.completed} / {r.payments.total}</td>
                  <td data-label="Success" className="text-right tabular-nums">{percent(r.payments.success_rate)}</td>
                  <td data-label="Vouchers sold" className="text-right tabular-nums">{r.vouchers_sold}</td>
                  <td data-label="Voucher revenue" className="text-right tabular-nums">{formatTZS(r.voucher_revenue)}</td>
                  <td data-label="Online now" className="text-right tabular-nums">{r.online_users}</td>
                </tr>
              ))}
            </tbody>
            {data && data.sites.length > 1 && (
              <tfoot>
                <tr className="font-semibold">
                  <td className="px-3 py-2.5">All sites</td>
                  <td />
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatTZS(data.sites.reduce((s, r) => s + r.cash_revenue, 0))}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{data.sites.reduce((s, r) => s + r.payments.completed, 0)}</td>
                  <td />
                  <td className="px-3 py-2.5 text-right tabular-nums">{data.sites.reduce((s, r) => s + r.vouchers_sold, 0)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatTZS(data.sites.reduce((s, r) => s + r.voucher_revenue, 0))}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{data.sites.reduce((s, r) => s + r.online_users, 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Payments by package" bodyClass="p-0 overflow-x-auto">
          <ProfileTable rows={data?.cash_by_package ?? []} countLabel="Payments" valueLabel="Revenue" />
        </Card>
        <Card title="Voucher revenue by package (first use)" bodyClass="p-0 overflow-x-auto">
          <ProfileTable rows={data?.revenue_by_profile ?? []} countLabel="Activated" valueLabel="Value" />
        </Card>
        <Card title="Vouchers created by package" bodyClass="p-0 overflow-x-auto">
          <ProfileTable rows={data?.creation_by_profile ?? []} countLabel="Created" valueLabel="Face value" />
        </Card>
      </div>
    </div>
  );
}
