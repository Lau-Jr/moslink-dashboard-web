import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSites } from "@/api/hooks";
import type { SiteParam } from "@/api/types";

export const UNASSIGNED = "unassigned";
export const SERIES_COUNT = 8;

/** The selected site lives in the URL (?site=) so links and reloads keep it. */
export function useSiteParam(): [SiteParam, (site: SiteParam) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("site");
  const site = raw && raw !== "all" ? raw : null;
  const setSite = useCallback(
    (next: SiteParam) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next) p.set("site", next);
          else p.delete("site");
          p.delete("page");
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [site, setSite];
}

/**
 * Color follows the site, never its rank: slot = position in the site registry
 * (creation order), so filtering never repaints the survivors. Past 8 sites and
 * for "unassigned" the neutral "other" color is used.
 */
export function useSiteColors() {
  const { data: sites } = useSites();
  return useMemo(() => {
    const order = (sites ?? []).map((s) => s.code);
    const colorOf = (code: string) => {
      const i = order.indexOf(code);
      return i >= 0 && i < SERIES_COUNT ? `var(--series-${i + 1})` : "var(--series-other)";
    };
    const nameOf = (code: string) =>
      code === UNASSIGNED ? "Unassigned / Admin" : (sites ?? []).find((s) => s.code === code)?.name ?? code;
    return { order, colorOf, nameOf };
  }, [sites]);
}

export function siteLabel(code: SiteParam, nameOf: (c: string) => string): string {
  return code ? nameOf(code) : "All sites";
}
