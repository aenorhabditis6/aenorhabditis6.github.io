import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";

/**
 * The plate painters, running in the page.
 *
 * `ring/plates.js` imports nothing and touches nothing but `document`, so the
 * source can be injected as a module and asked for its export directly. That
 * is deliberately cheaper than the alternatives: no test-only route in the
 * app, no hook hanging off `window` in production code, and the file under
 * test is the file that ships.
 */
export async function loadPlates(page) {
  await page.goto("/");
  const src = await readFile("components/ring/plates.js", "utf8");
  await page.addScriptTag({
    type: "module",
    content: `${src}\nglobalThis.__PLATES = PLATES;`,
  });
  await page.waitForFunction(() => !!globalThis.__PLATES);
}

/**
 * Per-plate statistics, measured in the page at a size the atlas would
 * recognise. `blocks` is an 8x6 grid of mean luminance — coarse enough to be
 * stable across machines, fine enough that two different drawings cannot
 * collide, and the thing that tells a picture apart from an empty cell with
 * grain on it.
 */
export function plateStats(page, w = 240, h = 160) {
  return page.evaluate(
    ([W, H]) => {
      const COLS = 8;
      const ROWS = 6;
      const out = [];

      for (const [name, paint] of Object.entries(globalThis.__PLATES)) {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        paint(ctx, W, H);
        const d = ctx.getImageData(0, 0, W, H).data;

        const blocks = new Array(COLS * ROWS).fill(0);
        const counts = new Array(COLS * ROWS).fill(0);
        let sum = 0;
        for (let y = 0; y < H; y++) {
          const by = Math.min(ROWS - 1, Math.floor((y / H) * ROWS));
          for (let x = 0; x < W; x++) {
            const l = (d[(y * W + x) * 4] + d[(y * W + x) * 4 + 1] + d[(y * W + x) * 4 + 2]) / 3; // prettier-ignore
            const bx = Math.min(COLS - 1, Math.floor((x / W) * COLS));
            blocks[by * COLS + bx] += l;
            counts[by * COLS + bx]++;
            sum += l;
          }
        }
        for (let i = 0; i < blocks.length; i++) blocks[i] /= counts[i];

        const mean = sum / (W * H);
        const bMean = blocks.reduce((a, b) => a + b, 0) / blocks.length;
        const spread = Math.sqrt(
          blocks.reduce((a, b) => a + (b - bMean) ** 2, 0) / blocks.length,
        );
        out.push({ name, mean, spread, blocks });
      }
      return out;
    },
    [w, h],
  );
}

/**
 * How much of a screenshot is drawn on. The page is #fafafa, so anything
 * meaningfully darker is the ring — which makes this the one assertion that
 * catches a shader that failed to compile. GLSL is compiled at runtime, so
 * that failure builds clean and shows up only as a blank page.
 */
export async function inkFraction(page, png) {
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    for (let i = 0; i < d.length; i += 4) {
      if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 210) ink++;
    }
    return ink / (d.length / 4);
  }, png.toString("base64"));
}

/** Console errors and the atlas's own warnings, collected from first paint. */
export function watchConsole(page) {
  const problems = [];
  page.on("console", (msg) => {
    const text = msg.text();
    // A painter that throws is caught and logged rather than left to strand
    // the entry, so this is the only place it surfaces.
    if (msg.type() === "error" || text.includes("[atlas]")) problems.push(text);
  });
  page.on("pageerror", (err) => problems.push(String(err)));
  return problems;
}

// The app's own live region. Next renders a route announcer of its own, so
// this cannot just be [aria-live] — that matches both.
export const LIVE = 'div.sr-only[aria-live="polite"]';

/**
 * The entry runs for about eight seconds and nothing answers until it lands.
 * The live region is written the first time a card is announced, which happens
 * on the first frame after the ring is interactive — so it is the one signal
 * that means "settled" rather than "probably long enough by now".
 */
export async function ringReady(page) {
  await expect(page.locator(LIVE)).not.toHaveText("", { timeout: 90_000 });
}

/** What the page currently says is in front, read the way a reader would. */
export async function frontCard(page) {
  return page.evaluate((live) => {
    const lit =
      [...document.querySelectorAll('ul[aria-label="Projects"] li li')] // prettier-ignore
        .filter((li) => li.style.opacity === "1")
        .map((li) => li.textContent);
    const heads =
      [...document.querySelectorAll('ul[aria-label="Projects"] > li > div')] // prettier-ignore
        .filter((d) => d.style.opacity === "1")
        .map((d) => d.textContent);
    const note = [...document.querySelectorAll("div")].find((d) =>
      d.className.includes("pointer-events-none fixed z-10"),
    );
    const open = [...document.querySelectorAll('ul[aria-label="Projects"] ul')] // prettier-ignore
      .filter((u) => u.style.height !== "0px" && u.style.height !== "")
      .map((u) => u.children.length);
    return {
      announced: document.querySelector(live)?.textContent ?? "",
      plate: lit[0] ?? null,
      work: heads[0] ?? null,
      note: note?.innerText ?? "",
      noteShown: note ? getComputedStyle(note).display !== "none" : false,
      openRows: open,
    };
  }, LIVE);
}

/**
 * Turns the ring and waits for it to land somewhere new.
 *
 * **One event, not a run of notches.** Wheel input adds to a velocity that
 * the damping bleeds off between frames, and the ring snaps back to the slot
 * it was on as soon as that velocity falls under `snapFrom`. Notches sent one
 * await at a time are spaced out by whole frames — each one has decayed by
 * two thirds before the next arrives, the sum never clears the threshold, and
 * the ring twitches and settles exactly where it started. A real flick
 * arrives far faster than that, so this delivers it as a single delta.
 *
 * 1000px is worth about 1.7 slots of coast at the default `scrollSpeed`,
 * which lands on a new card without racing past several.
 *
 * The cursor is parked in a corner first: the pointer softens the field
 * around itself and lights a particle pass, and these runners draw in
 * software.
 */
export async function turnUntilChange(page, delta = 1000) {
  const before = (await page.locator(LIVE).textContent()) ?? "";
  await page.mouse.move(60, 60);
  await page.mouse.wheel(0, delta);
  await expect(page.locator(LIVE)).not.toHaveText(before, { timeout: 45_000 });
}
