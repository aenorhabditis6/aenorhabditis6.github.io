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
    // Above the 1024 band step, so the full layout is on screen, but no wider
    // than it needs to be: the ring is one full-screen fragment shader and
    // these runners rasterise it on the CPU, so every pixel is paid for twice
    // — once in the shader and again in how long the entry takes to finish.
    viewport: { width: 1280, height: 800 },
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
