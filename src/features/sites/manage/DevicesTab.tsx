import { Ban, LogOut, Search, ShieldCheck, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { useBlockMac, useKickDevice, useRouterDevices } from "@/api/hooks";
import type { RouterDevice } from "@/api/types";
import { useToast } from "@/components/Toast";
import { Card, ConfirmDialog, EmptyState, ErrorBanner, Pill, Spinner } from "@/components/ui";
import { formatBytes, formatDuration } from "@/lib/format";

type Pending = { kind: "kick" | "block" | "unblock"; device: RouterDevice };

const label = (d: RouterDevice) => d.hostname || d.ip || d.mac;

export function DevicesTab({ code }: { code: string }) {
  const { data, error, isPending, refetch } = useRouterDevices(code);
  const kick = useKickDevice(code);
  const block = useBlockMac(code);
  const toast = useToast();
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data ?? [];
    return (data ?? []).filter((d) =>
      [d.mac, d.ip, d.hostname, d.user].some((v) => v?.toLowerCase().includes(needle)),
    );
  }, [data, q]);
  const loggedIn = (data ?? []).filter((d) => d.active_id).length;

  const run = () => {
    if (!pending) return;
    const { kind, device } = pending;
    const done = (msg: string) => () => {
      toast("success", msg);
      setPending(null);
    };
    const fail = (e: unknown) => toast("error", (e as Error).message);
    if (kind === "kick") {
      kick.mutate(device.active_id!, { onSuccess: done(`Disconnected ${device.user}`), onError: fail });
    } else {
      block.mutate(
        { mac: device.mac, block: kind === "block" },
        { onSuccess: done(kind === "block" ? `Blocked ${label(device)}` : `Unblocked ${label(device)}`), onError: fail },
      );
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onRetry={() => refetch()} />
      <Card
        title={data ? `${data.length} devices · ${loggedIn} logged in` : "Devices"}
        bodyClass="p-0"
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input w-56 pl-8"
              placeholder="IP, MAC, name, voucher"
              aria-label="Search devices"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      >
        <p className="border-b border-line px-4 py-2 text-xs text-muted">
          Every device holding a DHCP address, including ones that haven't logged in or are on a network with the hotspot turned off.
          Blocking only takes effect where the hotspot is enabled.
        </p>
        {isPending ? (
          <div className="flex justify-center p-10 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !rows.length ? (
          <EmptyState icon={<Smartphone className="h-8 w-8" />} title={q ? "No matching devices" : "No devices connected"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base table-responsive">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>MAC</th>
                  <th>Status</th>
                  <th className="text-right">Uptime</th>
                  <th className="text-right">Data ↓ / ↑</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.mac}>
                    <td data-label="Device">
                      <span className="font-medium">{d.hostname ?? <span className="text-muted">Unknown</span>}</span>
                      <span className="block font-mono text-xs text-muted">{d.ip ?? "—"}</span>
                    </td>
                    <td data-label="MAC" className="font-mono text-xs">{d.mac}</td>
                    <td data-label="Status">
                      {d.blocked ? (
                        <Pill className="border-danger/30 text-danger">{d.blocked_by_app ? "Blocked" : "Blocked on router"}</Pill>
                      ) : d.active_id ? (
                        <span className="inline-flex flex-col">
                          <Pill className="border-success/30 text-success">Logged in</Pill>
                          <span className="mt-0.5 font-mono text-xs text-muted">{d.user}</span>
                        </span>
                      ) : (
                        <Pill>Not logged in</Pill>
                      )}
                    </td>
                    <td data-label="Uptime" className="text-right tabular-nums">
                      {d.active_id ? formatDuration(d.uptime_seconds) : "—"}
                      {d.time_left && <span className="block text-xs text-muted">{d.time_left} left</span>}
                    </td>
                    <td data-label="Data ↓ / ↑" className="text-right text-xs tabular-nums">
                      {d.active_id ? `${formatBytes(d.bytes_out)} / ${formatBytes(d.bytes_in)}` : "—"}
                    </td>
                    <td data-label="Actions" className="text-right">
                      <div className="inline-flex gap-1.5">
                        {d.active_id && (
                          <button className="btn-ghost btn-sm" onClick={() => setPending({ kind: "kick", device: d })}>
                            <LogOut className="h-3.5 w-3.5" /> Kick
                          </button>
                        )}
                        {!d.blocked && (
                          <button className="btn-ghost btn-sm text-danger" onClick={() => setPending({ kind: "block", device: d })}>
                            <Ban className="h-3.5 w-3.5" /> Block
                          </button>
                        )}
                        {d.blocked_by_app && (
                          <button className="btn-ghost btn-sm" onClick={() => setPending({ kind: "unblock", device: d })}>
                            <ShieldCheck className="h-3.5 w-3.5" /> Unblock
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
      </Card>

      <ConfirmDialog
        open={!!pending}
        danger={pending?.kind !== "unblock"}
        busy={kick.isPending || block.isPending}
        title={
          pending?.kind === "kick" ? "Disconnect this session?" : pending?.kind === "block" ? "Block this device?" : "Unblock this device?"
        }
        confirmLabel={pending?.kind === "kick" ? "Kick" : pending?.kind === "block" ? "Block" : "Unblock"}
        message={
          pending && (
            <>
              <span className="font-medium">{label(pending.device)}</span> <span className="font-mono text-xs">({pending.device.mac})</span>
              <br />
              {pending.kind === "kick" &&
                "They're logged out now. Their voucher still works, so they can log in again."}
              {pending.kind === "block" && "The device is logged out and can't use the hotspot until you unblock it."}
              {pending.kind === "unblock" && "The device can use the hotspot again."}
            </>
          )
        }
        onConfirm={run}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
