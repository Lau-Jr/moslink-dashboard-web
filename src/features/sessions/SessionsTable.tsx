import { Power, Wifi } from "lucide-react";
import { useState } from "react";
import { useKick } from "@/api/hooks";
import type { Session } from "@/api/types";
import { useToast } from "@/components/Toast";
import { ConfirmDialog, EmptyState, Pill } from "@/components/ui";
import { formatBytes, formatDuration, formatRate } from "@/lib/format";
import { useSiteColors } from "@/lib/site";

export function SessionsTable({ sessions, showSite, compact }: { sessions: Session[]; showSite: boolean; compact?: boolean }) {
  const kick = useKick();
  const toast = useToast();
  const { colorOf } = useSiteColors();
  const [target, setTarget] = useState<Session | null>(null);

  if (!sessions.length) {
    return <EmptyState icon={<Wifi className="h-8 w-8" />} title="Nobody is connected right now" hint="Sessions appear here as soon as a voucher logs in." />;
  }

  const confirmKick = () => {
    if (!target) return;
    kick.mutate(
      { code: target.voucher, site: target.site },
      {
        onSuccess: (r) => {
          toast("success", r.removed ? `${target.voucher} disconnected` : `${target.voucher} was no longer online`);
          setTarget(null);
        },
        onError: (e) => toast("error", (e as Error).message),
      },
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-base table-responsive">
          <thead>
            <tr>
              <th>Voucher</th>
              {showSite && <th>Site</th>}
              <th>Plan</th>
              {!compact && <th>IP / MAC</th>}
              <th>Online for</th>
              {!compact && <th className="text-right">Data used</th>}
              {!compact && <th className="text-right">Rate</th>}
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={`${s.site}-${s.voucher}-${s.mac}`}>
                <td data-label="Voucher" className="font-mono font-semibold">
                  {s.voucher}
                </td>
                {showSite && (
                  <td data-label="Site">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: colorOf(s.site) }} aria-hidden />
                      {s.site_name}
                    </span>
                  </td>
                )}
                <td data-label="Plan">
                  <Pill>{s.plan_label}</Pill>
                </td>
                {!compact && (
                  <td data-label="IP / MAC" className="text-xs text-ink-soft">
                    <div className="font-mono">{s.ip}</div>
                    <div className="font-mono text-muted">{s.mac}</div>
                  </td>
                )}
                <td data-label="Online for" className="tabular-nums">
                  {formatDuration(s.uptime_seconds)}
                  {!compact && s.time_left && <div className="text-xs text-muted">{s.time_left} left</div>}
                </td>
                {!compact && (
                  <td data-label="Data used" className="text-right text-xs tabular-nums">
                    ↓ {formatBytes(s.bytes_out)}
                    <div className="text-muted">↑ {formatBytes(s.bytes_in)}</div>
                  </td>
                )}
                {!compact && (
                  <td data-label="Rate" className="text-right tabular-nums">
                    {formatRate(s.speed)}
                  </td>
                )}
                <td data-label="Action" className="text-right">
                  <button className="btn-danger btn-sm" onClick={() => setTarget(s)}>
                    <Power className="h-3.5 w-3.5" />
                    Kick
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!target}
        title="Disconnect session?"
        message={
          <>
            <span className="font-mono font-semibold">{target?.voucher}</span> will be disconnected from {target?.site_name}. The voucher stays valid and can
            log in again; use <em>Disable</em> on the Vouchers page to block it.
          </>
        }
        confirmLabel="Kick"
        danger
        busy={kick.isPending}
        onConfirm={confirmKick}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
