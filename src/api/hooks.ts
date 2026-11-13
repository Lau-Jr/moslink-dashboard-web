import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Health,
  Overview,
  Package,
  Page,
  Report,
  Session,
  Site,
  SiteParam,
  RouterStatus,
  Transaction,
  User,
  Voucher,
  VoucherPage,
} from "./types";

export const LIVE_REFRESH_MS = 15_000;

const site = (s: SiteParam) => s ?? "all";

// --- auth -----------------------------------------------------------------------
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api.get<{ user: User }>("/auth/me", undefined, signal).then((r) => r.user),
    retry: false,
    staleTime: Infinity,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string }) => api.post<{ user: User }>("/auth/login", body),
    onSuccess: (r) => {
      // Never qc.clear() here: it detaches the mounted useMe observer and the UI wouldn't update.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      qc.setQueryData(["me"], r.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSettled: () => {
      qc.setQueryData(["me"], null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    },
  });
}

// --- reference --------------------------------------------------------------------
export function usePackages() {
  return useQuery({
    queryKey: ["packages"],
    queryFn: ({ signal }) => api.get<{ packages: Package[]; max_bulk: number }>("/packages", undefined, signal),
    staleTime: 60 * 60_000,
  });
}

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: ({ signal }) => api.get<{ sites: Site[] }>("/sites", undefined, signal).then((r) => r.sites),
    staleTime: 30_000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.get<Health>("/health", undefined, signal),
    refetchInterval: 60_000,
  });
}

// --- live ---------------------------------------------------------------------------
export function useOverview(s: SiteParam) {
  return useQuery({
    queryKey: ["overview", site(s)],
    queryFn: ({ signal }) => api.get<Overview>("/overview", { site: site(s) }, signal),
    refetchInterval: LIVE_REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

export function useSessions(s: SiteParam) {
  return useQuery({
    queryKey: ["sessions", site(s)],
    queryFn: ({ signal }) =>
      api.get<{ sessions: Session[]; routers: RouterStatus[] }>("/sessions", { site: site(s) }, signal),
    refetchInterval: LIVE_REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

function invalidateLive(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ["sessions", "overview", "vouchers", "health", "sites"]) qc.invalidateQueries({ queryKey: [key] });
}

export function useKick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, site }: { code: string; site?: string | null }) =>
      api.post<{ removed: number }>(`/sessions/${encodeURIComponent(code)}/kick`, { site: site ?? null }),
    onSuccess: () => invalidateLive(qc),
  });
}

// --- vouchers -------------------------------------------------------------------------
export interface VoucherQuery {
  site: SiteParam;
  status?: string | null;
  q?: string;
  page: number;
  pageSize: number;
}

export function useVouchers(p: VoucherQuery) {
  return useQuery({
    queryKey: ["vouchers", site(p.site), p.status ?? "", p.q ?? "", p.page, p.pageSize],
    queryFn: ({ signal }) =>
      api.get<VoucherPage>(
        "/vouchers",
        { site: site(p.site), status: p.status, q: p.q, page: p.page, page_size: p.pageSize },
        signal,
      ),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useCreateVouchers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      body: { kind: "paid"; value: number; count: number; site: string | null } | { kind: "staff"; label: string; site: string | null },
    ) =>
      body.kind === "staff"
        ? api.post<{ vouchers: Voucher[] }>("/vouchers/staff", { label: body.label, site: body.site })
        : api.post<{ vouchers: Voucher[] }>("/vouchers", { value: body.value, count: body.count, site: body.site }),
    onSuccess: () => invalidateLive(qc),
  });
}

export function useDisableVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ voucher: Voucher; kicked: number }>(`/vouchers/${id}/disable`),
    onSuccess: () => invalidateLive(qc),
  });
}

// --- reports / payments ---------------------------------------------------------------------
export function useReport(s: SiteParam, start: string, end: string) {
  return useQuery({
    queryKey: ["report", site(s), start, end],
    queryFn: ({ signal }) => api.get<Report>("/reports", { site: site(s), start, end }, signal),
    placeholderData: keepPreviousData,
  });
}

export interface TransactionQuery {
  site: SiteParam;
  status?: string | null;
  q?: string;
  start: string;
  end: string;
  page: number;
  pageSize: number;
}

export function useTransactions(p: TransactionQuery) {
  return useQuery({
    queryKey: ["transactions", site(p.site), p.status ?? "", p.q ?? "", p.start, p.end, p.page, p.pageSize],
    queryFn: ({ signal }) =>
      api.get<Page<Transaction>>(
        "/transactions",
        { site: site(p.site), status: p.status, q: p.q, start: p.start, end: p.end, page: p.page, page_size: p.pageSize },
        signal,
      ),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

// --- sites admin ------------------------------------------------------------------------------
export type SiteInput = Partial<Pick<Site, "name" | "location" | "api_host" | "api_port" | "is_active">> & {
  code?: string;
};

export function useSaveSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, isNew, data }: { code: string; isNew: boolean; data: SiteInput }) =>
      isNew
        ? api.post<{ site: Site }>("/sites", { ...data, code })
        : api.patch<{ site: Site }>(`/sites/${encodeURIComponent(code)}`, data),
    onSuccess: () => invalidateLive(qc),
  });
}

export function useTestSite() {
  return useMutation({
    mutationFn: (code: string) =>
      api.post<{ online: boolean; latency_ms: number | null; identity: string | null; error: string | null }>(
        `/sites/${encodeURIComponent(code)}/test`,
      ),
  });
}
