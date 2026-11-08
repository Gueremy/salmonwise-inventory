import { describe, it, expect } from "vitest";
import { locationQrValue, parseLocationQr } from "@/lib/locationQr";
describe("QR ubicaciones", () => {
 it("resuelve identificadores y enlaces sin incluir datos empresariales", () => {
  expect(parseLocationQr(locationQrValue("location-1"))).toEqual({id:"location-1"});
  expect(parseLocationQr("https://example.cl/locations/location-1")).toEqual({id:"location-1"});
  expect(parseLocationQr("app-3d-salmonera://container?id=old-id")).toEqual({id:"old-id"});
 });
 it("no navega a URLs externas arbitrarias", () => {
  expect(parseLocationQr("https://example.cl/evil")).toEqual({});
  expect(parseLocationQr("A-001")).toEqual({code:"A-001"});
 });
});
