import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "tests",
  // The entry is about eight seconds of animation before the ring answers to
  // anything, and most of these wait for it.
  timeout: 150_000,
  expect: { timeout: 20_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One at a time: each spec holds a WebGL context, and the runners this has
  // to pass on are drawing them in software.
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Every px figure in ring/params.js is quoted at this width, and the band
    // logic steps at 1024 and again at 640 — so this is the one viewport where
    // the layout is exactly as authored.
    viewport: { width: 1512, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // These runners have no GPU. Without this, WebGL is refused, the
      // renderer throws before the canvas is appended, and every failure looks
      // like a blank page rather than a missing driver.
      args: ["--enable-unsafe-swiftshader"],
    },
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run build && npm run serve",
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
  },
});
