import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { existsSync } from "node:fs";

// Reuse a repository-local installation when present; CI can use Playwright's default.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(path.resolve(".cache/playwright"))) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve(".cache/playwright");
}

const backend = path.resolve("../backend/backend");
const python = process.env.SALMOTRACK_TEST_PYTHON || (process.platform === "win32" ? path.resolve("../backend/.venv/Scripts/python.exe") : "python");

export default defineConfig({
  testDir: "./e2e", workers: 1, timeout: 90000,
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.SALMOTRACK_E2E_EXTERNAL_SERVERS === "1" ? [] : [
    { command: `"${python}" scripts/seed_browser_test.py && "${python}" -m uvicorn scripts.browser_test_app:app --host 127.0.0.1 --port 8000`,
      cwd: backend, url: "http://localhost:8000/health", reuseExistingServer: false,
      env: { DATABASE_URL: "sqlite+aiosqlite:///./.cache/browser-test.sqlite", DATABASE_URL_SYNC: "sqlite:///./.cache/browser-test.sqlite",
        SECRET_KEY: "browser-tests-only-not-production", ENVIRONMENT: "test", PYTHONIOENCODING: "utf-8", CORS_ORIGINS: '["http://localhost:4173"]' } },
    { command: "npm run preview -- --host localhost --port 4173", url: "http://localhost:4173", reuseExistingServer: false },
  ],
});
