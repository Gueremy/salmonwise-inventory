import { afterEach, expect, it, vi } from "vitest";
import { apiFetch, registerUnauthorizedHandler } from "@/api/client";

afterEach(() => vi.unstubAllGlobals());
it("renueva una vez y reenvía el mismo payload conservando el UUID", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response("{}", {status: 401}))
    .mockResolvedValueOnce(new Response('{"id":"saved"}'));
  vi.stubGlobal("fetch", fetch);
  const renew = vi.fn().mockResolvedValue("renewed-token");
  const unregister = registerUnauthorizedHandler(renew);
  try {
    const body = JSON.stringify({uuid_local:"same-operation",cantidad:2});
    expect(await apiFetch("/api/v2/movimientos/solicitudes", {token:"old-token",method:"POST",body})).toEqual({id:"saved"});
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].body).toBe(body);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer renewed-token");
  } finally { unregister(); }
});
