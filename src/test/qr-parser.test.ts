import { describe, expect, it } from "vitest";
import { parseContainerQr } from "@/lib/qr";

const ID = "550e8400-e29b-41d4-a716-446655440000";

describe("parseContainerQr", () => {
  it("accepts a direct container id", () => {
    expect(parseContainerQr(ID)).toBe(ID);
  });

  it("accepts the AXIOUS application URI", () => {
    expect(parseContainerQr(`app-3d-salmonera://container?id=${ID}`)).toBe(ID);
  });

  it("rejects unknown or malformed QR values", () => {
    expect(parseContainerQr("https://example.com/?id=" + ID)).toBeNull();
    expect(parseContainerQr("not-an-id")).toBeNull();
  });
});
