const TZ = "Africa/Dar_es_Salaam";

const tzs = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const formatNumber = (n: number | null | undefined) => tzs.format(n ?? 0);
export const formatTZS = (n: number | null | undefined) => `TZS ${tzs.format(n ?? 0)}`;
export const formatCompact = (n: number | null | undefined) => compact.format(n ?? 0);

export function formatBytes(bytes: number | null | undefined): string {
  const b = bytes ?? 0;
  if (b < 1024) return `${b} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = b / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

/** RouterOS tx-rate is bits/s (sometimes "12.3Mbps" text). */
export function formatRate(rate: number | string | null | undefined): string {
  if (rate === null || rate === undefined || rate === "" || rate === 0 || rate === "0") return "—";
  if (typeof rate === "string" && /[a-z]/i.test(rate)) return rate;
  const bps = Number(rate);
  if (!Number.isFinite(bps) || bps <= 0) return "—";
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1e3)} kbps`;
}

export function formatDuration(seconds: number | null | undefined): string {
  let s = Math.max(0, Math.floor(seconds ?? 0));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const shortDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short" });

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

export function formatTime(iso: string | null | undefined): string {
  return iso ? timeFmt.format(new Date(iso)) : "";
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? `${formatDate(iso)} ${formatTime(iso)}` : "—";
}

/** "2026-11-13" -> "13 Nov" (a calendar date, no timezone shift). */
export function formatDay(ymd: string): string {
  return shortDay.format(new Date(`${ymd}T00:00:00Z`));
}

/** Today's date in Tanzania, as YYYY-MM-DD. */
export function todayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function percent(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${n.toFixed(n % 1 ? 1 : 0)}%`;
}
