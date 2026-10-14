"""Audita pantallas principales con axe-core (WCAG 2.1 A/AA).

SALMO_QA_EMAIL=... SALMO_QA_PASSWORD=... python scripts/accessibility-audit.py
"""
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright


async def main():
    base_url = os.environ.get("SALMO_FRONT_URL", "http://localhost:5173")
    axe_path = Path(__file__).resolve().parent.parent / "node_modules/axe-core/axe.min.js"
    results = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=os.environ.get("SALMO_CHROMIUM_PATH", "/usr/bin/chromium"),
            args=["--no-sandbox"],
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto(base_url)

        async def check(path):
            await page.add_script_tag(path=str(axe_path))
            result = await page.evaluate("""async () => axe.run(document, {
                runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
            })""")
            for violation in result["violations"]:
                results.append({"path": path, "id": violation["id"],
                                "impact": violation["impact"],
                                "nodes": [{"target": node["target"], "html": node["html"][:260],
                                           "summary": node.get("failureSummary", "")[:240]}
                                          for node in violation["nodes"][:15]]})

        await check("/")
        await page.get_by_label("Correo electronico").fill(os.environ["SALMO_QA_EMAIL"])
        await page.get_by_label("Contrasena").fill(os.environ["SALMO_QA_PASSWORD"])
        await page.get_by_role("button", name="Ingresar").click()
        await page.wait_for_url("**/dashboard")
        for path in ("/dashboard", "/operario", "/movements", "/reconciliation/import"):
            await page.goto(f"{base_url}{path}", wait_until="networkidle")
            await check(path)
        await page.goto(f"{base_url}/operario", wait_until="networkidle")
        await page.get_by_role("button", name="Registrar Entrada").click()
        await check("/operario/movement-form")
        await page.get_by_role("dialog").get_by_role("button", name="Cancelar").click()
        await page.get_by_role("button", name="Escanear QR").click()
        await page.wait_for_timeout(250)
        await check("/operario/qr")
        await page.get_by_role("dialog").get_by_role("button", name="Close").click()
        await page.set_viewport_size({"width": 390, "height": 844})
        for path in ("/dashboard", "/operario"):
            await page.goto(f"{base_url}{path}", wait_until="networkidle")
            await check(f"{path}@390")
        print(json.dumps({"pages_checked": 9, "violations": results}, ensure_ascii=False))
        await browser.close()
    assert not results, f"Se encontraron {len(results)} infracciones WCAG"


asyncio.run(main())
