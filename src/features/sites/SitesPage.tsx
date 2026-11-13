import { Pencil, Plug, Plus, Router as RouterIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useSaveSite, useSites, useTestSite } from "@/api/hooks";
import type { Site } from "@/api/types";
import { useToast } from "@/components/Toast";
import { Card, EmptyState, ErrorBanner, Modal, Notice, Pill, RouterState, Spinner } from "@/components/ui";
import { useSiteColors } from "@/lib/site";

function SiteForm({ site, onClose }: { site: Site | null; onClose: () => void }) {
  // site === null -> new; site.registered === false -> register a code seen on payments
  const isNew = !site || !site.registered;
  const save = useSaveSite();
  const toast = useToast();
  const [code, setCode] = useState(site?.code ?? "");
  const [name, setName] = useState(site?.registered ? site.name : "");
  const [location, setLocation] = useState(site?.location ?? "");
  const [host, setHost] = useState(site?.api_host ?? "");
  const [port, setPort] = useState(String(site?.api_port ?? 8728));
  const [active, setActive] = useState(site?.is_active ?? true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        code: code.trim(),
        isNew,
        data: { name: name.trim() || code.trim(), location: location.trim() || null, api_host: host.trim() || null, api_port: Number(port) || 8728, is_active: active },
      },
      {
        onSuccess: () => {
          toast("success", isNew ? "Site added" : "Site saved");
          onClose();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {save.error && <Notice kind="error">{(save.error as Error).message}</Notice>}
      <div>
        <label className="label" htmlFor="site-code">
          Site code (X-Router-ID)
        </label>
        <input
          id="site-code"
          className="input font-mono"
          required
          pattern="[A-Za-z0-9._\-]{1,64}"
          disabled={!!site}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="site-kariakoo-01"
        />
        <p className="mt-1 text-xs text-muted">Must match exactly what this router's captive portal sends; payments are matched to sites by it.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="site-name">
            Display name
          </label>
          <input id="site-name" className="input" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kariakoo" />
        </div>
        <div>
          <label className="label" htmlFor="site-location">
            Location
          </label>
          <input id="site-location" className="input" maxLength={150} value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="site-host">
            RouterOS API host
          </label>
          <input id="site-host" className="input font-mono" value={host} onChange={(e) => setHost(e.target.value)} placeholder="10.10.0.1" />
        </div>
        <div>
          <label className="label" htmlFor="site-port">
            Port
          </label>
          <input id="site-port" type="number" min={1} max={65535} className="input" value={port} onChange={(e) => setPort(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted">
        Login comes from the server's <code className="font-mono">.env</code>: <code className="font-mono">ROUTER_{"<CODE>"}_USER</code> /{" "}
        <code className="font-mono">_PASS</code> (code in capitals, other characters as <code>_</code>), else <code className="font-mono">ROUTER_USER</code> /{" "}
        <code className="font-mono">ROUTER_PASS</code>.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
        Active (poll this router for sessions)
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending && <Spinner />}
          {isNew ? "Add site" : "Save"}
        </button>
      </div>
    </form>
  );
}

function TestButton({ code }: { code: string }) {
  const test = useTestSite();
  const toast = useToast();
  useEffect(() => {
    if (!test.data) return;
    toast(test.data.online ? "success" : "error", test.data.online
      ? `Connected to ${test.data.identity ?? code} in ${test.data.latency_ms} ms`
      : `Cannot reach ${code}: ${test.data.error}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test.data]);
  return (
    <button className="btn-ghost btn-sm" onClick={() => test.mutate(code, { onError: (e) => toast("error", (e as Error).message) })} disabled={test.isPending}>
      {test.isPending ? <Spinner /> : <Plug className="h-3.5 w-3.5" />} Test
    </button>
  );
}

export function SitesPage() {
  const { data: sites, error, isPending, refetch } = useSites();
  const { colorOf } = useSiteColors();
  const [editing, setEditing] = useState<Site | null | undefined>(undefined); // undefined = closed, null = new

  const unregistered = (sites ?? []).filter((s) => !s.registered && !s.api_host);

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onRetry={() => refetch()} />
      {unregistered.length > 0 && (
        <Notice kind="error">
          {unregistered.length === 1 ? "1 site sends payments" : `${unregistered.length} sites send payments`} but is not set up yet:{" "}
          {unregistered.map((s) => s.code).join(", ")}. Add it so its live sessions and router health show up.
        </Notice>
      )}
      <Card
        title="Sites"
        bodyClass="p-0"
        actions={
          <button className="btn-primary" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" /> Add site
          </button>
        }
      >
        {isPending ? (
          <div className="flex justify-center p-10 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !sites?.length ? (
          <EmptyState icon={<RouterIcon className="h-8 w-8" />} title="No sites yet" hint="Add each MikroTik router with the same code its captive portal sends as X-Router-ID." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base table-responsive">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Code</th>
                  <th>API</th>
                  <th>Status</th>
                  <th className="text-right">Sessions</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.code} className={s.is_active === false ? "opacity-60" : undefined}>
                    <td data-label="Site">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(s.code) }} aria-hidden />
                        {s.name}
                      </span>
                      {s.location && <span className="block text-xs text-muted">{s.location}</span>}
                    </td>
                    <td data-label="Code" className="font-mono text-xs">{s.code}</td>
                    <td data-label="API" className="font-mono text-xs">
                      {s.api_host ? `${s.api_host}:${s.api_port ?? 8728}` : <span className="font-sans text-muted">not set</span>}
                    </td>
                    <td data-label="Status">
                      {!s.registered ? (
                        <Pill className="border-warning/30 text-warning">{s.api_host ? "From .env (ROUTER_IP)" : "Not set up"}</Pill>
                      ) : s.is_active === false ? (
                        <Pill>Inactive</Pill>
                      ) : (
                        <RouterState online={s.router?.online} error={s.router?.error} />
                      )}
                      {s.router?.error && <span className="block max-w-[260px] truncate text-xs text-muted">{s.router.error}</span>}
                    </td>
                    <td data-label="Sessions" className="text-right tabular-nums">{s.router?.online ? s.router.sessions : "—"}</td>
                    <td data-label="Actions" className="text-right">
                      <div className="inline-flex gap-1.5">
                        {s.registered && s.api_host && <TestButton code={s.code} />}
                        <button className="btn-ghost btn-sm" onClick={() => setEditing(s)}>
                          {s.registered ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {s.registered ? "Edit" : "Set up"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={editing !== undefined} title={editing?.registered ? `Edit ${editing.name}` : "Add site"} onClose={() => setEditing(undefined)}>
        {editing !== undefined && <SiteForm key={editing?.code ?? "new"} site={editing} onClose={() => setEditing(undefined)} />}
      </Modal>
    </div>
  );
}
