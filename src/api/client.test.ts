import { api, ApiError, buildUrl, UNAUTHORIZED_EVENT } from "./client";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("builds urls and drops empty params", () => {
    expect(buildUrl("/vouchers", { site: "all", q: "", status: null, page: 2 })).toBe("/api/admin/vouchers?site=all&page=2");
  });

  it("sends the CSRF header and JSON body", async () => {
    const fetch = mockFetch(201, { vouchers: [] });
    await api.post("/vouchers", { value: 1000 });
    const [, init] = fetch.mock.calls[0];
    expect(init.headers["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(init.credentials).toBe("same-origin");
    expect(JSON.parse(init.body)).toEqual({ value: 1000 });
  });

  it("raises the server's error message", async () => {
    mockFetch(400, { error: "Unknown package" });
    await expect(api.post("/vouchers", { value: 1 })).rejects.toEqual(new ApiError("Unknown package", 400));
  });

  it("announces 401s so the app can show the login page", async () => {
    mockFetch(401, { error: "Authentication required" });
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    await expect(api.get("/overview")).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("does not announce 401 from /auth/* (would loop the auth check)", async () => {
    mockFetch(401, { error: "Authentication required" });
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });
});
