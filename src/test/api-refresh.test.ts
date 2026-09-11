import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshSession } from "@/lib/api";

describe("refreshSession", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("rotates and stores both tokens", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "access-new", refresh_token: "refresh-new" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const tokens = await refreshSession("refresh-old");

    expect(tokens.access_token).toBe("access-new");
    expect(localStorage.getItem("axious.accessToken")).toBe("access-new");
    expect(localStorage.getItem("axious.refreshToken")).toBe("refresh-new");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/refresh$/),
      expect.objectContaining({ body: JSON.stringify({ refresh_token: "refresh-old" }) }),
    );
  });
});
