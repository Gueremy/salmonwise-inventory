import { test, expect, type Page } from "@playwright/test";

async function loginAndPrepare(page: Page) {
  await page.goto("/");
  await page.getByLabel("Correo electronico").fill("browser@example.cl");
  await page.getByLabel("Contrasena").fill("BrowserTest123!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/operario/);
  await page.getByRole("button", { name: /Preparar dispositivo/ }).click();
  await expect(page.getByText(/Listo sin conexión hasta/)).toBeVisible();
}

async function queueReceipt(page: Page, notes: string) {
  await page.getByRole("button", { name: "Registrar Entrada", exact: true }).click();
  await page.getByLabel("Ubicación de destino").click();
  await page.getByRole("option", { name: "P0002", exact: true }).click();
  await page.getByLabel("Ítem", { exact: true }).click();
  await page.getByRole("option", { name: /Insumo privado de prueba/ }).click();
  await page.getByLabel("Cantidad", { exact: true }).fill("1");
  await page.getByLabel("Observaciones").fill(notes);
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
}

test("reabre otra pestaña sin red, vence a las 72 h y conserva la cola", async ({ page, context }) => {
  await loginAndPrepare(page);
  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto("/operario");
  await expect(reopened.getByText("P0001", { exact: true })).toBeVisible();
  await page.close();
  await queueReceipt(reopened, "Antes de vencer");
  await expect(reopened.getByRole("dialog")).toHaveCount(0);
  await expect(reopened.getByRole("button", { name: /1 Pendiente/ })).toBeVisible();
  await reopened.clock.install();
  await reopened.clock.setSystemTime(Date.now() + 73 * 3600000);
  await queueReceipt(reopened, "Después de vencer");
  await expect(reopened.getByRole("alert")).toContainText(/permiso offline venció/);
  await reopened.getByRole("button", { name: "Cancelar", exact: true }).click();
  await reopened.clock.setSystemTime(Date.now());
  await context.setOffline(false);
  await expect(reopened.getByRole("button", { name: /1 Pendiente/ })).toHaveCount(0, { timeout: 20000 });
});

test("dos pestañas respetan el bloqueo de sincronización y aplican una sola operación", async ({ page, context }, info) => {
  await loginAndPrepare(page);
  await context.setOffline(true);
  const marker = `Dos pestañas ${info.project.name}-${Date.now()}`;
  await queueReceipt(page, marker);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const second = await context.newPage();
  await second.goto("/operario");
  await expect(second.getByRole("button", { name: /1 Pendiente/ })).toBeVisible();
  await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem("axious.user")!);
    const org = JSON.parse(localStorage.getItem("axious.org")!);
    const state = window as unknown as { syncLockAcquired: boolean; releaseSyncLock: () => void };
    void navigator.locks.request(`salmotrack-sync:${org.id}:${user.id}`, async () => {
      state.syncLockAcquired = true;
      await new Promise<void>((resolve) => { state.releaseSyncLock = resolve; });
    });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as {syncLockAcquired: boolean}).syncLockAcquired)).toBe(true);
  const sends: string[] = [];
  context.on("request", (request) => {
    if (request.url().endsWith("/movimientos/sync")) sends.push(...request.postDataJSON().movimientos.map((row: {uuid_local: string}) => row.uuid_local));
  });
  await context.setOffline(false);
  await Promise.all([page, second].map((tab) => expect(tab.getByText("ONLINE", { exact: true })).toBeVisible()));
  expect(sends).toHaveLength(0);
  await page.evaluate(() => (window as unknown as {releaseSyncLock: () => void}).releaseSyncLock());
  await Promise.all([page, second].map((tab) => tab.getByRole("button", { name: /1 Pendiente/ }).click()));
  await Promise.all([page, second].map((tab) => expect(tab.getByRole("button", { name: /1 Pendiente/ })).toHaveCount(0, { timeout: 20000 })));
  expect(sends).toHaveLength(1);
  const ledger = await page.evaluate(async () => (await fetch("http://localhost:8000/api/v2/movimientos/", {
    headers: { Authorization: `Bearer ${localStorage.getItem("axious.accessToken")}` },
  })).json());
  expect(ledger.items.filter((row: {observaciones: string}) => row.observaciones === marker)).toHaveLength(1);
});

test("una cuenta de menor alcance no ve ubicaciones ni envía la cola de la anterior", async ({ page, context }) => {
  await loginAndPrepare(page);
  await context.setOffline(true);
  await queueReceipt(page, "Cola privada de la cuenta anterior");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByTitle("Cerrar sesión").click();
  await context.setOffline(false);
  await page.getByLabel("Correo electronico").fill("browser-limited@example.cl");
  await page.getByLabel("Contrasena").fill("BrowserTest123!");
  const sends: string[] = [];
  context.on("request", (request) => { if (request.url().endsWith("/movimientos/sync")) sends.push(request.postData()!); });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByText("P0099", { exact: true })).toBeVisible();
  await expect(page.getByText("P0001", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Pendiente/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Preparar dispositivo/ }).click();
  await expect(page.getByText(/Listo sin conexión hasta/)).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("P0099", { exact: true })).toBeVisible();
  await expect(page.getByText("P0001", { exact: true })).toHaveCount(0);
  expect(sends).toEqual([]);
});

test("resuelve la etiqueta estable por ingreso manual y URL directa sin red", async ({ page, context }) => {
  await loginAndPrepare(page);
  const id = await page.evaluate(async () => {
    const response = await fetch("http://localhost:8000/api/v2/ubicaciones/?page=1&size=100", {
      headers: { Authorization: `Bearer ${localStorage.getItem("axious.accessToken")}` },
    });
    return (await response.json()).items.find((row: {codigo: string}) => row.codigo === "P0001").id;
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Escanear QR", exact: true }).click();
  await page.getByLabel("Código manual (Ubicación o Ítem)").fill(`salmotrack:location:${id}`);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`focus=${id}`));
  await expect(page.getByRole("heading", { name: "P0001", exact: true })).toBeVisible();
  await page.goto(`/locations/${id}`);
  await expect(page).toHaveURL(new RegExp(`focus=${id}`));
  await expect(page.getByRole("heading", { name: "P0001", exact: true })).toBeVisible();
});
