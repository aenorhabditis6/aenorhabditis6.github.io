import { expect, test } from "@playwright/test";
import { watchConsole } from "./helpers.mjs";

// The tap card is opened by people who will not open it twice, so the two
// things checked here are the ones a tap depends on: /r/ (what the tags are
// locked to) still lands on it, and the event greeting turns on and off with
// the clock rather than with a deploy.
test.describe("the tap card", () => {
  test("/r/ lands on /hi/", async ({ page }) => {
    await page.goto("/r/");
    await expect(page).toHaveURL(/\/hi\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Xinming (Tina) Shen",
    );
  });

  test("greets only while an event is on", async ({ page }) => {
    const problems = watchConsole(page);
    await page.clock.setFixedTime(new Date("2026-10-28T12:00:00-07:00"));
    await page.goto("/hi/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Nice to meet you/)).toHaveCount(0);

    await page.clock.setFixedTime(new Date("2026-11-05T10:15:00-08:00"));
    await page.reload();
    await expect(page.getByText(/Nice to meet you/)).toHaveText(
      "Nice to meet you at ICME Career Forum",
    );
    expect(problems).toEqual([]);
  });

  test("the contact card is a vCard", async ({ request }) => {
    const res = await request.get("/tina.vcf");
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toMatch(/^BEGIN:VCARD\r\n/);
    expect(body).toContain("FN:Xinming (Tina) Shen\r\n");
    expect(body).toContain("linkedin.com/in/tinashen26/");
  });

  test("fits a phone without sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/hi/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // The ring's globals make body a one-screen scroll box. Here the
    // document itself has to scroll, or the work list is cut off at the fold.
    const scroll = await page.evaluate(() => ({
      body: getComputedStyle(document.body).overflowY,
      page: document.scrollingElement.scrollHeight > window.innerHeight,
    }));
    expect(scroll).toEqual({ body: "visible", page: true });
  });
});
