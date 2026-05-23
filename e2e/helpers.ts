import { expect, type Page } from "@playwright/test";

export async function startManualChineseSet(page: Page, setName: string) {
  await page.goto("/sets/new");
  await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill(setName);
  await page.getByText("Add Manually").click();
  await page.getByRole("combobox").selectOption("chinese");
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

export async function addStandardChineseCards(page: Page) {
  await page.getByPlaceholder("Enter character...").fill("好");
  await page.getByPlaceholder("Enter pinyin...").fill("hǎo");
  await page.getByPlaceholder("Enter meaning...").fill("good");
  await page.getByRole("button", { name: "Add Card" }).click();
  await expect(page.getByText("1 card added")).toBeVisible();

  await page.getByPlaceholder("Enter character...").fill("你");
  await page.getByPlaceholder("Enter pinyin...").fill("nǐ");
  await page.getByPlaceholder("Enter meaning...").fill("you");
  await page.getByRole("button", { name: "Add Card" }).click();
  await expect(page.getByText("2 cards added")).toBeVisible();
}

export async function finishManualSetCreation(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Configure the role and TTS")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Create Set" }).click();
  await expect(page.getByText("Set created!")).toBeVisible({ timeout: 15000 });
  await page.getByRole("link", { name: "View Set" }).click();
  await page.waitForURL(/\/sets\/(?!new$)[^/]+$/, { timeout: 10000 });
}

export async function createManualChineseSet(page: Page, setName: string) {
  await startManualChineseSet(page, setName);
  await addStandardChineseCards(page);
  await finishManualSetCreation(page);
}
