import { addDays, formatBytes, formatDuration, formatRate, formatTZS, percent, todayYmd } from "./format";

describe("format", () => {
  it("formats money", () => {
    expect(formatTZS(25000)).toBe("TZS 25,000");
    expect(formatTZS(null)).toBe("TZS 0");
  });
  it("formats bytes, durations and rates", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatDuration(3723)).toBe("1h 2m");
    expect(formatDuration(2 * 86400 + 3600)).toBe("2d 1h");
    expect(formatRate(12_500_000)).toBe("12.5 Mbps");
    expect(formatRate(0)).toBe("—");
    expect(formatRate("5Mbps")).toBe("5Mbps");
  });
  it("does calendar math without timezone drift", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("uses Tanzania's date for today", () => {
    // 22:30 UTC on 13 Nov is already 14 Nov in Dar es Salaam (UTC+3)
    expect(todayYmd(new Date("2026-11-13T22:30:00Z"))).toBe("2026-11-14");
  });
  it("formats percentages", () => {
    expect(percent(80)).toBe("80%");
    expect(percent(66.7)).toBe("66.7%");
    expect(percent(null)).toBe("—");
  });
});
