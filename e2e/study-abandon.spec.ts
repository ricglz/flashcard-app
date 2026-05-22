import { test, expect } from "./fixtures";
import {
  getLatestStudySessionState,
  seedFlashcardSet,
} from "./seed";

test.describe("Study session — abandon", () => {
  test("abandons a newly started session", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.stack ?? error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        pageErrors.push(message.text());
      }
    });

    const seeded = await seedFlashcardSet({
      name: "E2E Abandon Seeded Set",
      cards: [
        { front: "好", back: "good" },
        { front: "你", back: "you" },
      ],
    });

    await page.goto(`/study/${seeded.setId}`);
    await expect(page.getByRole("heading", { name: "Study: E2E Abandon Seeded Set" })).toBeVisible();

    const startButton = page.getByRole("button", { name: "Start New Session" });
    await expect(startButton).toBeEnabled();
    await startButton.click();
    await expect(page).toHaveURL(/\/study\/[^/]+\/session\?sessionId=/);
    await expect(
      page.getByRole("heading", { name: "Study session error" }),
      pageErrors.join("\n\n"),
    ).toHaveCount(0);
    await expect(page.getByText("1 / 2")).toBeVisible();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Abandon this session?");
      await dialog.accept();
    });
    await page.getByRole("button", { name: "Abandon" }).click();
    await page.waitForURL(`/study/${seeded.setId}`);

    await expect(page.getByRole("button", { name: "Start New Session" })).toBeVisible();
    await expect(page.getByText(/active session/)).toHaveCount(0);
    await expect
      .poll(async () => (await getLatestStudySessionState(seeded.setId))?.status, {
        timeout: 15_000,
      })
      .toBe("abandoned");
  });
});
