// Response shapes of the Flask /api/admin endpoints (moslink-main-app/routes/admin_api.py).

export type SiteParam = string | null; // null = all sites; "unassigned" = no site

export interface User {
  username: string;
}

export interface RouterStatus {
  site: string;
  name: string;
  host: string;
  online: boolean;
  sessions: number;
  latency_ms: number | null;
  error: string | null;
}

export interface Session {
  site: string;
  site_name: string;
  voucher: string;
  ip: string;
  mac: string;
  profile: string;
  plan_label: string;
  time: string;
  uptime_seconds: number;
  idle_time: string;
  time_left: string;
  bytes_in: number;
  bytes_out: number;
  speed: number | string;
}

export interface PaymentSummary {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  success_rate: number | null;
}

export interface SiteRow {
  site: string;
  name: string;
  registered: boolean;
  is_active: boolean | null;
  router: { online: boolean; error: string | null; latency_ms: number | null } | null;
  online_users: number;
  cash_revenue: number;
  voucher_revenue: number;
  vouchers_sold: number;
  payments: PaymentSummary;
}

export interface HourSlot {
  hour: number;
  revenue: number;
  transactions: number;
}

export interface Overview {
  site: string;
  date: string;
  kpis: {
    online_users: number;
    cash_revenue_today: number;
    voucher_revenue_today: number;
    vouchers_sold_today: number;
    vouchers_created_today: number;
    vouchers_activated_today: number;
    payments_today: PaymentSummary;
    unique_customers_today: number;
    active_plans: number;
    traffic_bytes: { in: number; out: number };
    peak_hour: { hour: number; label: string; transactions: number; days: number } | null;
  };
  hourly_today: HourSlot[];
  sites: SiteRow[];
  routers: RouterStatus[];
}

export interface ProfileRow {
  profile: string;
  label: string;
  count: number;
  value: number;
}

export interface DailyRow {
  date: string;
  cash_revenue: number;
  payments: number;
  voucher_revenue: number;
  vouchers_created: number;
  by_site: Record<string, number>;
}

export interface Report {
  site: string;
  start: string;
  end: string;
  days: number;
  kpis: {
    cash_revenue: number;
    avg_daily_revenue: number;
    voucher_revenue: number;
    payments: PaymentSummary;
    unique_customers: number;
    vouchers_created: number;
    vouchers_sold: number;
    vouchers_used: number;
    created_still_unused: number;
    online_now: number;
  };
  daily: DailyRow[];
  hourly: HourSlot[];
  revenue_by_profile: ProfileRow[];
  creation_by_profile: ProfileRow[];
  cash_by_package: (ProfileRow & { value: number })[];
  sites: SiteRow[];
}

export type VoucherStatusKey = "online" | "unused" | "valid" | "expired" | "disabled" | "staff";

export interface Voucher {
  id: number;
  code: string;
  value: number;
  profile: string;
  plan_label: string;
  phone: string | null;
  label: string | null;
  site: string | null;
  site_name: string | null;
  txn_id: string | null;
  created_at: string | null;
  used_at: string | null;
  status: { key: VoucherStatusKey; label: string; detail: string };
  expires_at: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface VoucherPage extends Page<Voucher> {
  counts: Record<VoucherStatusKey | "all", number>;
}

export interface Transaction {
  id: number;
  txn_id: string;
  order_id: string | null;
  phone: string | null;
  amount: number;
  plan_label: string | null;
  payment_status: string;
  push_status: string | null;
  message: string | null;
  site: string | null;
  site_name: string | null;
  created_at: string | null;
  voucher_code: string | null;
}

export interface Site {
  code: string;
  name: string;
  location: string | null;
  api_host: string | null;
  api_port: number | null;
  is_active: boolean | null;
  registered: boolean;
  created_at: string | null;
  router: { online: boolean; error: string | null; latency_ms: number | null; sessions: number } | null;
}

export interface Package {
  value: number;
  profile: string;
  label: string;
  seconds: number | null;
}

// --- router management (/sites/<code>/router/*) ---------------------------------------------
export interface RouterInterface {
  id: string;
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  comment: string | null;
  rx_bytes: number;
  tx_bytes: number;
}

export interface RouterOverview {
  identity: string | null;
  uptime: string;
  uptime_seconds: number;
  version: string | null;
  board_name: string | null;
  model: string | null;
  serial: string | null;
  architecture: string | null;
  cpu_load: number;
  cpu_count: number | null;
  free_memory: number;
  total_memory: number;
  free_hdd: number;
  total_hdd: number;
  interfaces: RouterInterface[];
}

export interface HotspotServer {
  id: string;
  name: string;
  interface: string;
  profile: string;
  address_pool: string | null;
  disabled: boolean;
}

export interface HotspotProfile {
  id: string;
  name: string;
  login_by: string[];
  trial: boolean;
  trial_uptime_limit: string | null;
  trial_user_profile: string | null;
}

export interface HotspotState {
  servers: HotspotServer[];
  profiles: HotspotProfile[];
}

export interface RouterDevice {
  mac: string;
  ip: string | null;
  hostname: string | null;
  lease_server: string | null;
  active_id: string | null;
  user: string | null;
  uptime: string | null;
  uptime_seconds: number;
  time_left: string | null;
  bytes_in: number;
  bytes_out: number;
  blocked: boolean;
  block_id: string | null;
  blocked_by_app: boolean;
}

export interface Health {
  database: "ok" | "unavailable";
  radius: string;
  routers: RouterStatus[];
}
