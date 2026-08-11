import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;
const startServer = `PORT=${PORT} HOSTNAME=127.0.0.1 npm run start:standalone`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  /* Three viewports, because "responsive" is a claim that has to be checked at
     the sizes people actually hold, not inferred from the class names. */
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "webkit" } },
    { name: "tablet", use: { ...devices["iPad Mini"], browserName: "webkit" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } },
  ],

  webServer: {
    command: process.env["CI"]
      ? startServer
      : `npm run build && ${startServer}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
