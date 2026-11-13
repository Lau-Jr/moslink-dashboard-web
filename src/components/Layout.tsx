import clsx from "clsx";
import {
  Activity,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Router as RouterIcon,
  Sun,
  Ticket,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useHealth, useLogout, useMe, useSites } from "@/api/hooks";
import { UNASSIGNED, useSiteColors, useSiteParam } from "@/lib/site";
import { readStorage, writeStorage } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

export const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, subtitle: "Live operations across your sites" },
  { to: "/sessions", label: "Live Sessions", icon: Activity, subtitle: "Who is connected right now, per router" },
  { to: "/vouchers", label: "Vouchers", icon: Ticket, subtitle: "Inventory, status and voucher actions" },
  { to: "/reports", label: "Reports", icon: BarChart3, subtitle: "Revenue and sales by site, package and day" },
  { to: "/transactions", label: "Payments", icon: CreditCard, subtitle: "Mobile-money payments from the captive portals" },
  { to: "/sites", label: "Sites", icon: RouterIcon, subtitle: "Routers, their API access and health" },
] as const;

const MOBILE_NAV = NAV.slice(0, 4);

/** Keep ?site= when moving between pages. */
function useNavHref() {
  const { search } = useLocation();
  const site = new URLSearchParams(search).get("site");
  return (to: string) => (site ? `${to}?site=${encodeURIComponent(site)}` : to);
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit" }).format(now);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Dar_es_Salaam", weekday: "short", month: "short", day: "numeric" }).format(now);
  return (
    <div className="hidden text-right leading-tight md:block" aria-live="off">
      <div className="text-sm font-semibold tabular-nums">{time}</div>
      <div className="text-xs text-muted">{day}</div>
    </div>
  );
}

export function SiteSwitcher() {
  const [site, setSite] = useSiteParam();
  const { data: sites } = useSites();
  const { colorOf } = useSiteColors();
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Site</span>
      {site && site !== UNASSIGNED && <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(site) }} aria-hidden />}
      <select
        className="input w-auto min-w-[150px] max-w-[220px] py-1.5"
        value={site ?? "all"}
        onChange={(e) => setSite(e.target.value === "all" ? null : e.target.value)}
      >
        <option value="all">All sites</option>
        {(sites ?? []).map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
            {s.registered ? "" : " (not set up)"}
          </option>
        ))}
        <option value={UNASSIGNED}>Unassigned / Admin</option>
      </select>
    </label>
  );
}

function StatusDots({ collapsed }: { collapsed: boolean }) {
  const { data, isError } = useHealth();
  const routers = data?.routers ?? [];
  const up = routers.filter((r) => r.online).length;
  const items = [
    { label: "API", ok: !isError && !!data },
    { label: "Database", ok: data?.database === "ok" },
    { label: routers.length ? `Routers ${up}/${routers.length}` : "Routers", ok: routers.length > 0 && up === routers.length, warn: up > 0 && up < routers.length },
  ];
  return (
    <div className={clsx("space-y-1.5 rounded-lg bg-surface-2 p-3 text-xs", collapsed && "lg:hidden")}>
      <div className="mb-1 font-medium uppercase tracking-wide text-muted">System status</div>
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-ink-soft">
          <span className={clsx("h-2 w-2 rounded-full", !data ? "bg-muted" : i.ok ? "bg-success" : i.warn ? "bg-warning" : "bg-danger")} aria-hidden />
          <span className="flex-1">{i.label}</span>
          <span className="text-muted">{!data ? "…" : i.ok ? "OK" : i.warn ? "Partial" : "Down"}</span>
        </div>
      ))}
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const href = useNavHref();
  const [theme, toggleTheme] = useTheme();
  const [collapsed, setCollapsed] = useState(() => readStorage("moslink-nav-collapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me } = useMe();
  const logout = useLogout();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  const current = NAV.find((n) => (n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to))) ?? NAV[0];
  useEffect(() => {
    document.title = `${current.label} · MOSLINK Admin`;
  }, [current.label]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      writeStorage("moslink-nav-collapsed", c ? "0" : "1");
      return !c;
    });

  const navLink = (item: (typeof NAV)[number], compact: boolean): ReactNode => (
    <NavLink
      key={item.to}
      to={href(item.to)}
      end={item.to === "/"}
      title={compact ? item.label : undefined}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-primary/15 text-primary" : "text-ink-soft hover:bg-surface-3 hover:text-ink",
          compact && "lg:justify-center lg:px-0",
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      <span className={clsx(compact && "lg:hidden")}>{item.label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen">
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={clsx(
          "no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-20",
        )}
      >
        <div className={clsx("flex h-16 items-center gap-3 border-b border-line px-4", collapsed && "lg:justify-center lg:px-0")}>
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
          <div className={clsx("leading-tight", collapsed && "lg:hidden")}>
            <div className="font-bold tracking-wide">MOSLINK</div>
            <div className="text-xs text-muted">Admin Panel</div>
          </div>
          <button className="ml-auto rounded p-1 text-muted hover:text-ink lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{NAV.map((n) => navLink(n, collapsed))}</nav>
        <div className="space-y-2 border-t border-line p-3">
          <StatusDots collapsed={collapsed} />
          <button
            className={clsx("btn-ghost w-full", collapsed && "lg:px-0")}
            onClick={() => logout.mutate()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className={clsx(collapsed && "lg:hidden")}>Sign out{me ? ` (${me.username})` : ""}</span>
          </button>
        </div>
      </aside>

      <div className={clsx("flex min-h-screen flex-col transition-[padding]", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur">
          <button className="rounded p-1.5 text-ink-soft hover:bg-surface-3 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <button className="hidden rounded p-1.5 text-ink-soft hover:bg-surface-3 lg:block" onClick={toggleCollapsed} aria-label="Collapse sidebar">
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">{current.label}</h1>
            <p className="hidden truncate text-xs text-muted sm:block">{current.subtitle}</p>
          </div>
          {current.to !== "/sites" && <SiteSwitcher />}
          <Clock />
          <button className="rounded-lg border border-line p-2 text-ink-soft hover:bg-surface-3" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-4 border-t border-line bg-surface lg:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={href(item.to)}
            end={item.to === "/"}
            className={({ isActive }) => clsx("flex flex-col items-center justify-center gap-1 text-[11px]", isActive ? "text-primary" : "text-muted")}
          >
            <item.icon className="h-5 w-5" />
            {item.label.replace("Live ", "")}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
