import { Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useRouterHotspot, useSetHotspot, useSetTrial } from "@/api/hooks";
import type { HotspotProfile, HotspotServer } from "@/api/types";
import { useToast } from "@/components/Toast";
import { Card, ConfirmDialog, EmptyState, ErrorBanner, Pill, Spinner } from "@/components/ui";

const DURATION_RE = /^(\d{1,5}[wdhms]){1,5}$/;

function TrialRow({ code, profile, servers }: { code: string; profile: HotspotProfile; servers: HotspotServer[] }) {
  const setTrial = useSetTrial(code);
  const toast = useToast();
  const [limit, setLimit] = useState(profile.trial_uptime_limit ?? "1d");
  const usedBy = servers.filter((s) => s.profile === profile.name).map((s) => s.name);
  const validLimit = DURATION_RE.test(limit.trim());

  const apply = (enabled: boolean) =>
    setTrial.mutate(
      { id: profile.id, enabled, uptime_limit: enabled ? limit.trim() : undefined },
      {
        onSuccess: () => toast("success", enabled ? `Free trial on for ${profile.name} (${limit.trim()})` : `Free trial off for ${profile.name}`),
        onError: (e) => toast("error", (e as Error).message),
      },
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-medium">
          {profile.name}
          {profile.trial ? <Pill className="border-success/30 text-success">Free trial on</Pill> : <Pill>Free trial off</Pill>}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          Login: {profile.login_by.join(", ") || "—"}
          {usedBy.length > 0 && <> · used by {usedBy.join(", ")}</>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`trial-${profile.id}`}>
          Trial length
        </label>
        <input
          id={`trial-${profile.id}`}
          className="input w-24 font-mono"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="1d"
          title="How long each device gets: 30m, 12h, 1d, 1d12h"
          aria-invalid={!validLimit}
        />
        {profile.trial ? (
          <>
            <button className="btn-ghost btn-sm" disabled={!validLimit || setTrial.isPending} onClick={() => apply(true)}>
              Update
            </button>
            <button className="btn-ghost btn-sm" disabled={setTrial.isPending} onClick={() => apply(false)}>
              {setTrial.isPending && <Spinner />} Turn off
            </button>
          </>
        ) : (
          <button className="btn-primary btn-sm" disabled={!validLimit || setTrial.isPending} onClick={() => apply(true)}>
            {setTrial.isPending && <Spinner />} Turn on
          </button>
        )}
      </div>
    </div>
  );
}

export function HotspotTab({ code }: { code: string }) {
  const { data, error, isPending, refetch } = useRouterHotspot(code);
  const setHotspot = useSetHotspot(code);
  const toast = useToast();
  const [disabling, setDisabling] = useState<HotspotServer | null>(null);

  const toggle = (server: HotspotServer, enabled: boolean) =>
    setHotspot.mutate(
      { id: server.id, enabled },
      {
        onSuccess: () => {
          toast("success", `${server.name} ${enabled ? "enabled" : "disabled"}`);
          setDisabling(null);
        },
        onError: (e) => toast("error", (e as Error).message),
      },
    );

  if (isPending) {
    return (
      <div className="flex justify-center p-10 text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onRetry={() => refetch()} />
      {data && (
        <>
          <Card title="Hotspot servers" bodyClass="p-0">
            {!data.servers.length ? (
              <EmptyState title="No hotspot servers on this router" />
            ) : (
              <ul className="divide-y divide-line">
                {data.servers.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        {s.disabled ? <WifiOff className="h-4 w-4 text-danger" /> : <Wifi className="h-4 w-4 text-success" />}
                        {s.name}
                        {s.disabled ? <Pill className="border-danger/30 text-danger">Disabled</Pill> : <Pill className="border-success/30 text-success">Enabled</Pill>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        Interface {s.interface} · profile {s.profile}
                        {s.address_pool && <> · pool {s.address_pool}</>}
                      </div>
                    </div>
                    {s.disabled ? (
                      <button className="btn-primary btn-sm" disabled={setHotspot.isPending} onClick={() => toggle(s, true)}>
                        Enable
                      </button>
                    ) : (
                      <button className="btn-ghost btn-sm" disabled={setHotspot.isPending} onClick={() => setDisabling(s)}>
                        Disable
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Free trial" bodyClass="p-0">
            <p className="border-b border-line px-4 py-3 text-xs text-muted">
              For free access, turn on the trial instead of disabling the hotspot. Each device gets a free login for the chosen time.
              The login page shows a free-trial link, and trial users appear in Live Sessions as <code className="font-mono">T-&lt;MAC&gt;</code>.
            </p>
            {!data.profiles.length ? (
              <EmptyState title="No hotspot profiles" />
            ) : (
              <div className="divide-y divide-line">
                {data.profiles.map((p) => (
                  <TrialRow key={p.id} code={code} profile={p} servers={data.servers} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!disabling}
        danger
        title={`Disable ${disabling?.name ?? "hotspot"}?`}
        confirmLabel="Disable hotspot"
        busy={setHotspot.isPending}
        message={
          <>
            Everyone on <span className="font-medium">{disabling?.interface}</span> gets internet <strong>without logging in or paying</strong>,
            and they won't appear in Live Sessions. To give free access you can still track, use the free trial below instead.
          </>
        }
        onConfirm={() => disabling && toggle(disabling, false)}
        onCancel={() => setDisabling(null)}
      />
    </div>
  );
}
