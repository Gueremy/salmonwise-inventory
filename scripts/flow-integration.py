"""Flujo real de movimiento online y cola offline sobre una organización de QA.

SALMO_QA_EMAIL=... SALMO_QA_PASSWORD=... python scripts/flow-integration.py
Requiere datos de catálogo, al menos una ubicación y el módulo offline_sync.
"""
import asyncio
import json
import os

from playwright.async_api import async_playwright, expect


async def fill_entry(page, quantity):
    await page.get_by_role("button", name="Registrar Entrada").click()
    dialog = page.get_by_role("dialog")
    try:
        await expect(dialog.get_by_role("combobox").first).not_to_have_text("Selecciona tipo", timeout=15000)
    except AssertionError:
        print(json.dumps({"form_error": await dialog.inner_text(),
                          "online": await page.evaluate("navigator.onLine")}))
        raise
    await expect(dialog.get_by_role("combobox")).to_have_count(4, timeout=15000)
    await dialog.get_by_role("combobox").nth(1).click()
    await expect(page.get_by_role("option").first).to_be_visible(timeout=10000)
    await page.get_by_role("option").first.click()
    await dialog.get_by_role("combobox").nth(2).click()
    await page.get_by_role("option").first.click()
    await dialog.get_by_role("spinbutton").fill(str(quantity))
    return dialog


async def fill_stock_operation(page, action, type_name, origin, destination, quantity=1):
    await page.get_by_role("button", name=action).click()
    dialog = page.get_by_role("dialog")
    await expect(dialog.get_by_label("Tipo de movimiento")).to_have_text(type_name)
    await dialog.get_by_label("Ubicación de origen").click()
    await page.get_by_role("option", name=origin).click()
    if destination:
        await dialog.get_by_label("Ubicación de destino").click()
        await page.get_by_role("option", name=destination).click()
    await dialog.get_by_label("Ítem", exact=True).click()
    await page.get_by_role("option").first.click()
    await dialog.get_by_label("Cantidad").fill(str(quantity))
    return dialog


async def main():
    base_url = os.environ.get("SALMO_FRONT_URL", "http://localhost:5173")
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=os.environ.get("SALMO_CHROMIUM_PATH", "/usr/bin/chromium"),
            args=["--no-sandbox"],
        )
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto(base_url)
        await page.get_by_label("Correo electronico").fill(os.environ["SALMO_QA_EMAIL"])
        await page.get_by_label("Contrasena").fill(os.environ["SALMO_QA_PASSWORD"])
        await page.get_by_role("button", name="Ingresar").click()
        await page.wait_for_url("**/dashboard")
        await page.goto(f"{base_url}/operario")
        await expect(page.get_by_role("button", name="Registrar Entrada")).to_be_enabled()

        dialog = await fill_entry(page, 1)
        async with page.expect_response(lambda response: response.request.method == "POST"
                                        and "/api/v2/movimientos/solicitudes" in response.url) as created:
            await dialog.get_by_role("button", name="Registrar", exact=True).click()
        online_response = await created.value
        assert online_response.status == 201, await online_response.text()
        await expect(dialog).not_to_be_visible()

        if os.environ.get("SALMO_QA_EXTENDED") == "1":
            origin = os.environ.get("SALMO_QA_LOCATION_CODE", "RACK-A-01")
            destination = os.environ.get("SALMO_QA_DESTINATION_CODE", "RACK-B-01")
            dialog = await fill_stock_operation(page, "Registrar Salida", "Salida QA por etapas", origin, None)
            async with page.expect_response(lambda response: response.request.method == "POST"
                                            and "/api/v2/movimientos/solicitudes" in response.url) as submitted:
                await dialog.get_by_role("button", name="Registrar", exact=True).click()
            request = await (await submitted.value).json()
            assert request["estado"] == "revision", request
            await page.goto(f"{base_url}/movements", wait_until="networkidle")
            for expected_stage in ("autorizacion", None):
                await page.locator("tbody tr").first.click()
                async with page.expect_response(lambda response: response.request.method == "PATCH"
                                                and f"/solicitudes/{request['id']}/aprobar" in response.url) as approved:
                    await page.get_by_role("button", name="Aprobar movimiento").click()
                stage_response = await (await approved.value).json()
                if expected_stage:
                    assert stage_response["estado"] == expected_stage, stage_response
                else:
                    assert stage_response["efecto_stock"] == "salida", stage_response
            await page.goto(f"{base_url}/operario", wait_until="networkidle")
            dialog = await fill_stock_operation(page, "Traslado", "Traslado QA", origin, destination)
            async with page.expect_response(lambda response: response.request.method == "POST"
                                            and "/api/v2/movimientos/solicitudes" in response.url) as transferred:
                await dialog.get_by_role("button", name="Registrar", exact=True).click()
            transfer_response = await transferred.value
            assert transfer_response.status == 201, await transfer_response.text()
            transfer_request = await transfer_response.json()
            assert transfer_request["estado"] == "aprobada", transfer_request
            confirmed = await page.evaluate("""async ({requestId, apiUrl}) => {
                const token = localStorage.getItem('axious.accessToken');
                const response = await fetch(`${apiUrl}/api/v2/movimientos/?page=1&size=100`,
                                             {headers: {Authorization: `Bearer ${token}`}});
                return (await response.json()).items.some(item => item.id_solicitud === requestId);
            }""", {"requestId": transfer_request["id"],
                     "apiUrl": os.environ.get("SALMO_API_URL", "http://localhost:18000")})
            assert confirmed, "El traslado no apareció en el libro confirmado"

        dialog = await fill_entry(page, 2)
        await context.set_offline(True)
        await expect(page.get_by_text("OFFLINE", exact=True)).to_be_visible()
        await dialog.get_by_role("button", name="Registrar", exact=True).click()
        await expect(dialog).not_to_be_visible()
        await expect(page.get_by_role("button", name="1 Pendiente")).to_be_visible(timeout=10000)

        async def block_sync(route):
            await route.abort()

        await context.route("**/api/v2/movimientos/sync", block_sync)
        await context.set_offline(False)
        await page.wait_for_timeout(700)
        await page.reload()
        await expect(page.get_by_role("button", name="1 Pendiente")).to_be_visible(timeout=10000)
        await context.unroute("**/api/v2/movimientos/sync", block_sync)
        async with page.expect_response(lambda response: response.request.method == "POST"
                                        and "/api/v2/movimientos/sync" in response.url) as synced:
            await page.get_by_role("button", name="1 Pendiente").click()
        sync_response = await synced.value
        assert sync_response.status == 200, await sync_response.text()
        result = await sync_response.json()
        assert result["total"] == 1, result
        assert result["sincronizados"] + result["pendientes"] == 1, result
        await expect(page.get_by_role("button", name="1 Pendiente")).not_to_be_visible(timeout=10000)

        await context.set_offline(True)
        await expect(page.get_by_role("button", name="Registrar Entrada")).to_be_enabled()
        for quantity in (1, 99999):
            dialog = await fill_entry(page, quantity)
            await dialog.get_by_role("button", name="Registrar", exact=True).click()
            await expect(dialog).not_to_be_visible()
        await expect(page.get_by_role("button", name="2 Pendientes")).to_be_visible(timeout=10000)
        async with page.expect_response(lambda response: response.request.method == "POST"
                                        and "/api/v2/movimientos/sync" in response.url) as mixed:
            await context.set_offline(False)
        mixed_result = await (await mixed.value).json()
        assert mixed_result["sincronizados"] == 1, mixed_result
        assert mixed_result["rechazados"] == 1, mixed_result
        await expect(page.get_by_role("button", name="1 rechazado")).to_be_visible(timeout=10000)

        await page.get_by_role("button", name="Escanear QR").click()
        location_code = os.environ.get("SALMO_QA_LOCATION_CODE", "RACK-A-01")
        await page.get_by_label("Código manual (Ubicación o Ítem)").fill(location_code)
        await page.get_by_role("dialog").get_by_role("button", name="Buscar").click()
        await expect(page.get_by_text(f"Ubicación encontrada: {location_code}")).to_be_visible()
        await page.evaluate("localStorage.setItem('axious.accessToken', 'expired-test-token')")
        await page.goto(f"{base_url}/dashboard")
        await expect(page.get_by_role("heading", name="Ingresar")).to_be_visible(timeout=15000)
        print(json.dumps({"online_status": online_response.status,
                          "extended_movements": os.environ.get("SALMO_QA_EXTENDED") == "1",
                          "offline_sync": result["resultados"][0]["estado"],
                          "offline_after_reload": "ok", "mixed_rejected": mixed_result["rechazados"],
                          "qr_manual": "ok", "expired_session": "logged_out"}))
        await browser.close()


asyncio.run(main())
