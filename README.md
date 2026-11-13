# MOSLINK Admin Dashboard (web)

Standalone React + TypeScript admin dashboard for MOSLINK hotspots. It replaces the Jinja pages in
`moslink-main-app` (templates/ + static/). All data comes from the Flask JSON API at `/api/admin`
(`moslink-main-app/routes/admin_api.py`), and every page can be filtered per site (router).

Stack: Vite, React 18, TypeScript, React Router, TanStack Query, Tailwind CSS, Recharts, Vitest.

## Pages
| Page | What it does |
|---|---|
| Overview | KPIs for today (online users, revenue, vouchers sold, payment success, peak hour, data), one card per site with router up/down, revenue by hour, live sessions, quick voucher creation. Refreshes every 15 s. |
| Live Sessions | Active hotspot sessions on every router (site, voucher, IP/MAC, uptime, data, rate), with Kick. A warning appears when a router is unreachable. |
| Vouchers | Status chips with counts, server-side search, pagination, site column, Kick / Disable, CSV export, print. Create single, bulk (up to 200) or staff vouchers; the codes are shown with copy/print. |
| Reports | Date presets or a custom range: revenue and voucher KPIs, revenue per day stacked by site, revenue by hour, site comparison, package tables. Every chart has a table view. |
| Payments | Mobile-money transactions with status, site, date and search filters, and the voucher each one produced. |
| Sites | Router registry (code = the `X-Router-ID` the captive portal sends), RouterOS API host/port, active flag, connectivity test. Flags sites that send payments but aren't set up yet. |

The site switcher in the top bar (`?site=` in the URL) drives every page: **All sites**, one site, or
**Unassigned / Admin** (staff/admin vouchers and payments without a site).

## Develop
```bash
npm install
cp .env.example .env.local      # VITE_API_TARGET=http://localhost:5000
npm run dev                     # http://localhost:5173, /api proxied to Flask
```
Sign in with the backend's `ADMIN_USER` / `ADMIN_PASS`.

```bash
npm run typecheck
npm test
npm run build                   # -> dist/
```

## Deploy
Serve `dist/` and proxy `/api/` to Flask **on the same origin**: auth is the Flask session cookie,
and `/api/admin` deliberately has no CORS. See `nginx.conf.example`. Behind HTTPS, set
`SESSION_COOKIE_SECURE=1` in the backend `.env`.

## Backend prerequisites (moslink-main-app)
1. Run `migrations/2026_11_routers_sites.sql` on the database **before** deploying the backend code.
   It creates `routers`, adds `vouchers.router_site`, and backfills sites from transactions.
2. In the Sites page, set each router's API host.
3. Router credentials go in the backend `.env`: `ROUTER_<CODE>_USER` / `ROUTER_<CODE>_PASS`. Take the
   code in capitals and replace any other characters with `_` (e.g. `ROUTER_SITE_KARIAKOO_01_USER`).
   If those aren't set, `ROUTER_USER` / `ROUTER_PASS` are used. While no site has an API host,
   the legacy `ROUTER_IP` router is used under the code in `ROUTER_SITE` (default `default`).
