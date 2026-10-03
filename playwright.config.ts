import { defineConfig, devices } from "@playwright/test";

const PORT = 3211;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Mock AI + local storage: no keys, no cost, no external services.
    command: `pnpm next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { MOCK_AI: "1", IMAGE_MODE: "dual", DATABASE_URL: "", BLOB_READ_WRITE_TOKEN: "", UPSTASH_REDIS_REST_URL: "" },
  },
});
