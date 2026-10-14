"""Smoke real escritorio/móvil. Requiere Playwright y una cuenta de QA existente.

SALMO_QA_EMAIL=... SALMO_QA_PASSWORD=... python scripts/smoke-integration.py
Opcionales: SALMO_FRONT_URL, SALMO_CHROMIUM_PATH.
"""
import asyncio
import json
import os
import re

from playwright.async_api import async_playwright, expect


async def main():
    base_url = os.environ.get("SALMO_FRONT_URL", "http://localhost:5173")
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=os.environ.get("SALMO_CHROMIUM_PATH", "/usr/bin/chromium"),
            headless=True, args=["--no-sandbox"],
        )
        stored_state = None
        for width in (1440, 390):
            context = await browser.new_context(viewport={"width": width, "height": 900}, storage_state=stored_state)
            page = await context.new_page()
            errors = []
            api_errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("response", lambda response: api_errors.append(response.status)
                    if "/api/" in response.url and response.status >= 400 else None)
            if stored_state is None:
                await page.goto(base_url, wait_until="domcontentloaded")
                await page.get_by_label("Correo electronico").fill(os.environ["SALMO_QA_EMAIL"])
                await page.get_by_label("Contrasena").fill(os.environ["SALMO_QA_PASSWORD"])
                await expect(page.get_by_role("button", name="Ingresar")).to_be_enabled(timeout=15000)
                await page.get_by_role("button", name="Ingresar").click()
            else:
                await page.goto(f"{base_url}/dashboard", wait_until="domcontentloaded")
            await expect(page).to_have_url(re.compile(r"/dashboard"), timeout=15000)
            if width == 390:
                await page.get_by_role("button", name="Abrir menú").click()
                await page.get_by_role("link", name="Movimientos").click()
                await expect(page).to_have_url(re.compile(r"/movements"))
                await expect(page.get_by_role("button", name="Abrir menú")).to_be_visible()
            for path in ("/sites", "/movements", "/reconciliation", "/reports",
                         "/alerts", "/gerencia", "/reconciliation/import", "/layout"):
                await page.goto(f"{base_url}{path}", wait_until="networkidle")
                await expect(page.locator("body")).not_to_be_empty()
                if width == 390:
                    assert await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            assert not errors, errors
            assert not api_errors, api_errors
            print(json.dumps({"viewport": width, "pages": 8, "javascript_errors": 0, "api_errors": 0}))
            stored_state = await context.storage_state()
            await context.close()
        await browser.close()


asyncio.run(main())
