import { ArrowLeft, Power } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useRebootRouter, useSites } from "@/api/hooks";
import { useToast } from "@/components/Toast";
import { EmptyState, Modal, Notice, RouterState, SegmentedControl, Spinner } from "@/components/ui";
import { DevicesTab } from "./manage/DevicesTab";
import { HotspotTab } from "./manage/HotspotTab";
import { OverviewTab } from "./manage/OverviewTab";

type Tab = "overview" | "hotspot" | "devices";
const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "hotspot", label: "Hotspot" },
  { value: "devices", label: "Devices" },
];

function RebootDialog({ code, open, onClose }: { code: string; open: boolean; onClose: () => void }) {
  const reboot = useRebootRouter(code);
  const toast = useToast();
  const [typed, setTyped] = useState("");

  const close = () => {
    setTyped("");
    reboot.reset();
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    reboot.mutate(typed.trim(), {
      onSuccess: () => {
        toast("success", `${code} is rebooting. It usually comes back within 1–2 minutes.`);
        close();
      },
    });
  };

  return (
    <Modal open={open} title="Reboot router" onClose={close}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-soft">
          Every user on this site loses internet until the router is back up, usually 1–2 minutes. Type{" "}
          <code className="font-mono font-semibold text-ink">{code}</code> to confirm.
        </p>
        {reboot.error && <Notice kind="error">{(reboot.error as Error).message}</Notice>}
        <input
          className="input font-mono"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label="Site code"
          autoComplete="off"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn-danger" disabled={typed.trim() !== code || reboot.isPending}>
            {reboot.isPending ? <Spinner /> : <Power className="h-4 w-4" />} Reboot
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SiteManagePage() {
  const { code = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? "overview") as Tab;
  const { data: sites, isPending } = useSites();
  const [rebooting, setRebooting] = useState(false);
  const site = sites?.find((s) => s.code === code);

  const back = (
    <Link to="/sites" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> Sites
    </Link>
  );

  if (isPending) {
    return (
      <div className="flex justify-center p-10 text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!site?.registered || !site.api_host) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          title={site ? "Router API not set up" : "Site not found"}
          hint={site ? "Set the RouterOS API host for this site on the Sites page first." : `No site with code ${code}.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink">{site.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="font-mono">{site.code}</span>
            <span className="font-mono">
              {site.api_host}:{site.api_port ?? 8728}
            </span>
            {site.location && <span>{site.location}</span>}
            <RouterState online={site.router?.online} error={site.router?.error} />
          </div>
        </div>
        <button className="btn-danger" onClick={() => setRebooting(true)}>
          <Power className="h-4 w-4" /> Reboot
        </button>
      </div>

      <SegmentedControl
        ariaLabel="Router section"
        value={tab}
        options={TABS}
        onChange={(t) => setParams(t === "overview" ? {} : { tab: t }, { replace: true })}
      />

      {tab === "overview" && <OverviewTab code={code} />}
      {tab === "hotspot" && <HotspotTab code={code} />}
      {tab === "devices" && <DevicesTab code={code} />}

      <RebootDialog code={code} open={rebooting} onClose={() => setRebooting(false)} />
    </div>
  );
}
