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

    // Three plates to a work, so leaving the one it started in takes at most
    // three landings — six is slack, not hope.
    let crossed = null;
    for (let i = 0; i < 6 && !crossed; i++) {
      await turnUntilChange(page);
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
