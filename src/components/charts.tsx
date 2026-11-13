import { BarChart3, Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { formatCompact, formatDay, formatNumber, formatTZS } from "@/lib/format";
import { Card, SegmentedControl } from "./ui";

const AXIS = { stroke: "var(--chart-axis)", fontSize: 11, tickLine: false, axisLine: false } as const;

/** Every chart ships with a table view (accessibility, exact numbers, CVD). */
export function ChartCard({ title, legend, chart, table, actions }: {
  title: string;
  legend?: ReactNode;
  chart: ReactNode;
  table: ReactNode;
  actions?: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card
      title={title}
      actions={
        <>
          {actions}
          <SegmentedControl
            ariaLabel={`${title} view`}
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: <BarChart3 className="h-3.5 w-3.5" aria-label="Chart" /> },
              { value: "table", label: <Table2 className="h-3.5 w-3.5" aria-label="Table" /> },
            ]}
          />
        </>
      }
    >
      {view === "chart" ? (
        <>
          {legend}
          <div className="h-64 w-full">{chart}</div>
        </>
      ) : (
        <div className="max-h-72 overflow-auto">{table}</div>
      )}
    </Card>
  );
}

export function Legend({ items }: { items: { key: string; label: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label="Legend">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <div className="mb-1 font-semibold text-ink">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-ink-soft">
          {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} aria-hidden />}
          <span className="flex-1">{r.label}</span>
          <span className="font-medium tabular-nums text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// --- revenue by hour (single series: the card title names it, no legend) -------------------
export function HourlyRevenueChart({ data, title = "Revenue by hour" }: {
  data: { hour: number; revenue: number; transactions: number }[];
  title?: string;
}) {
  const rows = data.map((d) => ({ ...d, label: `${String(d.hour).padStart(2, "0")}:00` }));
  return (
    <ChartCard
      title={title}
      chart={
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" {...AXIS} interval={2} />
            <YAxis {...AXIS} width={44} tickFormatter={formatCompact} />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)" }}
              content={({ active, payload }: TooltipProps<number, string>) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={`${payload[0].payload.label}–${String((payload[0].payload.hour + 1) % 24).padStart(2, "0")}:00`}
                    rows={[
                      { label: "Revenue", value: formatTZS(payload[0].payload.revenue) },
                      { label: "Payments", value: formatNumber(payload[0].payload.transactions) },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="revenue" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <table className="table-base">
          <thead>
            <tr>
              <th>Hour</th>
              <th className="text-right">Payments</th>
              <th className="text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter((r) => r.transactions > 0).map((r) => (
              <tr key={r.hour}>
                <td>{r.label}</td>
                <td className="text-right tabular-nums">{formatNumber(r.transactions)}</td>
                <td className="text-right tabular-nums">{formatTZS(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}

// --- daily revenue stacked by site ------------------------------------------------------------
export function DailyRevenueChart({ data, sites, colorOf, nameOf }: {
  data: { date: string; cash_revenue: number; by_site: Record<string, number> }[];
  sites: string[];
  colorOf: (code: string) => string;
  nameOf: (code: string) => string;
}) {
  const rows = data.map((d) => ({ date: d.date, label: formatDay(d.date), total: d.cash_revenue, ...d.by_site }));
  const legend = sites.map((s) => ({ key: s, label: nameOf(s), color: colorOf(s) }));
  return (
    <ChartCard
      title="Revenue per day, by site"
      legend={<Legend items={legend} />}
      chart={
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" {...AXIS} minTickGap={12} />
            <YAxis {...AXIS} width={44} tickFormatter={formatCompact} />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)" }}
              content={({ active, payload }: TooltipProps<number, string>) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={`${payload[0].payload.label} · ${formatTZS(payload[0].payload.total)}`}
                    rows={[...payload].reverse().filter((p) => Number(p.value) > 0).map((p) => ({
                      label: nameOf(String(p.dataKey)),
                      value: formatTZS(Number(p.value)),
                      color: colorOf(String(p.dataKey)),
                    }))}
                  />
                ) : null
              }
            />
            {sites.map((s, i) => (
              <Bar
                key={s}
                dataKey={s}
                stackId="rev"
                fill={colorOf(s)}
                stroke="var(--chart-surface)"
                strokeWidth={1}
                radius={i === sites.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <table className="table-base">
          <thead>
            <tr>
              <th>Day</th>
              {sites.map((s) => (
                <th key={s} className="text-right">
                  {nameOf(s)}
                </th>
              ))}
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td>{formatDay(d.date)}</td>
                {sites.map((s) => (
                  <td key={s} className="text-right tabular-nums">
                    {formatNumber(d.by_site[s] ?? 0)}
                  </td>
                ))}
                <td className="text-right font-medium tabular-nums">{formatNumber(d.cash_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}

/** Horizontal magnitude bars with direct labels: one row per item, no chart lib needed. */
export function BarList({ items, format = formatTZS }: {
  items: { key: string; label: ReactNode; value: number; color?: string; sub?: ReactNode }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-ink-soft">{i.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{format(i.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-3">
            <div
              className="h-2 rounded-full"
              style={{ width: `${(i.value / max) * 100}%`, background: i.color ?? "var(--series-1)", minWidth: i.value > 0 ? 4 : 0 }}
            />
          </div>
          {i.sub && <div className="mt-1 text-xs text-muted">{i.sub}</div>}
        </li>
      ))}
    </ul>
  );
}
