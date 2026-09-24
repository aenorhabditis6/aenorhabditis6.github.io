import { expect, test } from "@playwright/test";
import { loadPlates, plateStats } from "./helpers.mjs";

/**
 * The art, checked as pixels.
 *
 * This is the half of the repo that neither the build nor eslint can see: a
 * painter draws into a canvas, and one that quietly puts almost nothing there
 * is a valid program. It has happened — the random walk was written with a
 * step size that carried it off its own cell, and the card shipped as an empty
 * green rectangle that looked deliberate.
 */
test.describe("plates", () => {
  test("every plate paints a distinct picture", async ({ page }) => {
    await loadPlates(page);
    const stats = await plateStats(page);

    expect(stats).toHaveLength(18);

    for (const { name, mean, spread } of stats) {
      // Not black, not blown out. Both ends matter: the cards sit on a near
      // white page, and either extreme reads as a mistake rather than as art.
      expect(mean, `${name} mean luminance`).toBeGreaterThan(6);
      expect(mean, `${name} mean luminance`).toBeLessThan(200);

      // The one that catches an empty cell. Grain and a vignette give any
      // plate some per-pixel variance, so the measurement has to be of
      // structure across the cell rather than of noise within it.
      expect(spread, `${name} spatial contrast`).toBeGreaterThan(6);
    }

    // No two the same. Dealing the wrong art to a card, or pointing two rows
    // at one painter, is otherwise invisible: the ring still turns and every
    // card still has a picture on it.
    for (let i = 0; i < stats.length; i++) {
      for (let j = i + 1; j < stats.length; j++) {
        const distance = Math.sqrt(
          stats[i].blocks.reduce(
            (acc, v, k) => acc + (v - stats[j].blocks[k]) ** 2,
            0,
          ) / stats[i].blocks.length,
        );
        expect(
          distance,
          `${stats[i].name} vs ${stats[j].name}`,
        ).toBeGreaterThan(4);
      }
    }
  });

  test("the same seed paints the same plate twice", async ({ page }) => {
    await loadPlates(page);
    const first = await plateStats(page);
    const second = await plateStats(page);

    // Every painter is seeded, and the walk picks its own seed by measuring
    // eight candidates. A reload that reshuffles the art is a different set of
    // cards, not the same ones again.
    for (let i = 0; i < first.length; i++) {
      expect(second[i].name).toBe(first[i].name);
      for (let k = 0; k < first[i].blocks.length; k++) {
        expect(second[i].blocks[k]).toBeCloseTo(first[i].blocks[k], 4);
      }
    }
  });
});
