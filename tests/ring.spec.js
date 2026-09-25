import { expect, test } from "@playwright/test";
import {
  frontCard,
  inkFraction,
  ringReady,
  turnUntilChange,
  watchConsole,
} from "./helpers.mjs";

test.describe("the ring", () => {
  test("draws, and says what it is drawing", async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto("/");
    await ringReady(page);

    // GLSL is compiled at runtime. A typo in the shader builds clean, lints
    // clean, and leaves a page that is entirely background — so the only
    // honest check is how much of the screen ended up drawn on.
    const ink = await inkFraction(page, await page.screenshot());
    expect(ink, "fraction of the page drawn on").toBeGreaterThan(0.02);

    // The three faces are looked up by name in ring/params.js. A name with no
    // matching @font-face falls back to system sans in silence, and after a
    // move that is exactly how a broken font URL presents.
    const fonts = await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => ["Satoshi", "Geist"].includes(f.family))
        .map((f) => `${f.family}:${f.status}`),
    );
    expect(fonts.sort()).toEqual([
      "Geist:loaded",
      "Satoshi:loaded",
      "Satoshi:loaded",
    ]);

    const front = await frontCard(page);
    expect(front.announced).toContain(front.plate);
    expect(front.announced).toContain(front.work);
    expect(front.note).toContain(front.work);

    expect(problems).toEqual([]);
  });

  test("turning it moves the card, the column and the note together", async ({
    page,
  }) => {
    await page.goto("/");
    await ringReady(page);
    const start = await frontCard(page);
    const backdrop = page.locator("[data-work]");
    await expect(backdrop).toHaveAttribute("data-work", "venus");
    await expect(backdrop).toHaveCSS("background-color", "rgb(231, 176, 110)");

    // Backwards, which crosses a work boundary in one landing rather than
    // three: the entry parks on the first card of the first work, so forwards
    // is two more plates of the same work before anything changes. On a
    // runner drawing this in software each landing is tens of seconds, and
    // three of them is the difference between passing and running out of
    // budget. The loop is slack for a flick that lands short.
    let crossed = null;
    for (let i = 0; i < 4 && !crossed; i++) {
      await turnUntilChange(page, -1000);
      const now = await frontCard(page);
      if (now.work && now.work !== start.work) crossed = now;
    }

    expect(crossed, "the ring never left its first work").not.toBeNull();
    expect(crossed.plate).not.toBe(start.plate);
    // The note belongs to the work, not the card, so this is the change that
    // proves it followed rather than that it merely exists.
    expect(crossed.note).not.toBe(start.note);
    expect(crossed.note).toContain(crossed.work);
    // Exactly one work is open, and it is holding its three plates.
    expect(crossed.openRows).toEqual([3]);
    const colors = {
      "NASA VfOx": "rgb(231, 176, 110)",
      "Stanford RSL": "rgb(117, 198, 200)",
      "Johns Hopkins": "rgb(176, 150, 217)",
      "Beller Group": "rgb(156, 189, 114)",
      "Backside of the Moon": "rgb(128, 157, 188)",
      ASTRA: "rgb(215, 154, 137)",
    };
    await expect(backdrop).toHaveCSS("background-color", colors[crossed.work]);
  });

  test("sheds the note, then the column, as it narrows", async ({ page }) => {
    await page.goto("/");
    await ringReady(page);
    expect((await frontCard(page)).noteShown).toBe(true);

    // The narrow band re-proportions the ring up and bumps the type 1.5x,
    // which leaves a paragraph about four words to a line. The note goes and
    // the column keeps the six works without opening any of them.
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(400);
    const narrow = await frontCard(page);
    expect(narrow.noteShown).toBe(false);
    expect(narrow.openRows).toEqual([]);
    await expect(page.locator('ul[aria-label="Projects"] > li')).toHaveCount(6);

    // Tight: the name in the corner is the only label left.
    await page.setViewportSize({ width: 520, height: 800 });
    await page.waitForTimeout(400);
    expect((await frontCard(page)).noteShown).toBe(false);
    await expect(page.locator('ul[aria-label="Projects"]')).toBeHidden();
  });

  test("the other route still renders", async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto("/observatory/");
    await expect(page.locator(".observatory")).toBeVisible();
    expect(problems).toEqual([]);
  });
});
