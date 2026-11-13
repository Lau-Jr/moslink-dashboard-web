import clsx from "clsx";
import { ArrowRight, Banknote, Clock3, Gauge, Plus, ReceiptText, Ticket, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOverview, useSessions } from "@/api/hooks";
import type { SiteRow } from "@/api/types";
import { HourlyRevenueChart } from "@/components/charts";
import { Card, ErrorBanner, KpiCard, RouterState } from "@/components/ui";
import { formatBytes, formatNumber, formatTZS, percent } from "@/lib/format";
import { UNASSIGNED, siteLabel, useSiteColors, useSiteParam } from "@/lib/site";
import { CreateVoucherDialog } from "@/features/vouchers/CreateVoucherDialog";
import { RouterErrors } from "@/features/sessions/SessionsPage";
import { SessionsTable } from "@/features/sessions/SessionsTable";

function SiteCard({ row, color, selected, onSelect }: { row: SiteRow; color: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={clsx("card w-full p-4 text-left transition-colors hover:border-primary/50", selected && "border-primary")}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
        <span className="truncate font-semibold">{row.name}</span>
      </div>
      <div className="mt-1">
        {row.site === UNASSIGNED ? (
          <span className="text-xs text-muted">Admin vouchers and payments without a site</span>
        ) : (
          <RouterState online={row.router?.online} error={row.router?.error} />
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Online</dt>
          <dd className="text-lg font-semibold tabular-nums">{row.online_users}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Sold</dt>
          <dd className="text-lg font-semibold tabular-nums">{row.vouchers_sold}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Payments</dt>
          <dd className="text-lg font-semibold tabular-nums">{row.payments.completed}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-line pt-2 text-sm">
        <span className="text-muted">Today </span>
        <span className="font-semibold tabular-nums">{formatTZS(row.cash_revenue)}</span>
      </div>
    </button>
  );
}

export function OverviewPage() {
  const [site, setSite] = useSiteParam();
  const { search } = useLocation();
  const { data, error, isPending, refetch } = useOverview(site);
  const sessions = useSessions(site);
  const { colorOf, nameOf } = useSiteColors();
  const [dialog, setDialog] = useState<null | "paid" | "staff">(null);
  const k = data?.kpis;

  return (
    <div className="space-y-5">
      <ErrorBanner error={error} onRetry={() => refetch()} />
      {data && !site && <RouterErrors routers={data.routers} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard loading={isPending} tone="green" icon={<Users className="h-5 w-5" />} label="Online users" value={formatNumber(k?.online_users)} hint={k ? `${k.active_plans} plan${k.active_plans === 1 ? "" : "s"} in use` : undefined} />
        <KpiCard loading={isPending} tone="blue" icon={<Banknote className="h-5 w-5" />} label="Revenue today" value={formatTZS(k?.cash_revenue_today)} hint={k ? `${formatNumber(k.unique_customers_today)} paying customers` : undefined} />
        <KpiCard loading={isPending} tone="purple" icon={<Ticket className="h-5 w-5" />} label="Vouchers sold today" value={formatNumber(k?.vouchers_sold_today)} hint={k ? `${k.vouchers_activated_today} activated · ${k.vouchers_created_today} created` : undefined} />
        <KpiCard loading={isPending} tone="cyan" icon={<ReceiptText className="h-5 w-5" />} label="Payment success" value={percent(k?.payments_today.success_rate)} hint={k ? `${k.payments_today.completed} ok · ${k.payments_today.failed} failed · ${k.payments_today.pending} pending` : undefined} />
        <KpiCard loading={isPending} tone="orange" icon={<Clock3 className="h-5 w-5" />} label="Peak hour" value={k?.peak_hour?.label ?? "—"} hint={k?.peak_hour ? `busiest over the last ${k.peak_hour.days} days` : "not enough payments yet"} />
        <KpiCard loading={isPending} tone="red" icon={<Gauge className="h-5 w-5" />} label="Data in sessions" value={formatBytes((k?.traffic_bytes.in ?? 0) + (k?.traffic_bytes.out ?? 0))} hint="current sessions, both directions" />
      </div>

      {!site && data && data.sites.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">Sites today</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.sites.map((row) => (
              <SiteCard key={row.site} row={row} color={colorOf(row.site)} selected={false} onSelect={() => setSite(row.site)} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {data && <HourlyRevenueChart data={data.hourly_today} title={`Revenue by hour today · ${siteLabel(site, nameOf)}`} />}
          <Card
            title={`Live sessions · ${siteLabel(site, nameOf)}`}
            actions={
              <Link to={`/sessions${search}`} className="btn-ghost btn-sm">
                All sessions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
            bodyClass="p-0"
          >
            <SessionsTable sessions={(sessions.data?.sessions ?? []).slice(0, 8)} showSite={!site} compact />
          </Card>
        </div>

        <Card title="Quick actions">
          <div className="space-y-2">
            <button className="btn-primary w-full justify-start" onClick={() => setDialog("paid")}>
              <Plus className="h-4 w-4" /> Create vouchers
            </button>
            <button className="btn-ghost w-full justify-start" onClick={() => setDialog("staff")}>
              <UserRound className="h-4 w-4" /> Staff / family voucher
            </button>
            <Link to={`/vouchers${search}`} className="btn-ghost w-full justify-start">
              <Ticket className="h-4 w-4" /> Manage vouchers
            </Link>
            <Link to={`/reports${search}`} className="btn-ghost w-full justify-start">
              <Banknote className="h-4 w-4" /> Reports
            </Link>
          </div>
          {k && (
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Voucher revenue (by first use)</dt>
                <dd className="font-medium tabular-nums">{formatTZS(k.voucher_revenue_today)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Payments today</dt>
                <dd className="font-medium tabular-nums">{k.payments_today.total}</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      <CreateVoucherDialog open={!!dialog} initialKind={dialog ?? "paid"} defaultSite={site} onClose={() => setDialog(null)} />
    </div>
  );
}
