import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  clearExtensionStorage,
  launchExtension,
  runPagination,
  sendToContent,
  startServer,
  tabIdByUrl,
} from "./helpers.js";

const extensionPath = path.resolve("extension");
const fixtureRoot = path.resolve("tests/fixtures");
const FORMULA_TITLE = '=HYPERLINK("https://evil.example","Click")';

let server;
let context;
let sw;
let extensionId;

async function openFixture(pathname) {
  const page = await context.newPage();
  await page.goto(`${server.origin}${pathname}`);
  const tabId = await tabIdByUrl(sw, pathname);
  expect(tabId).toBeTruthy();
  return { page, tabId };
}

test.beforeAll(async () => {
  server = await startServer(fixtureRoot);
  const launched = await launchExtension(extensionPath);
  context = launched.context;
  sw = launched.sw;
  extensionId = launched.extensionId;
});

test.afterAll(async () => {
  await context?.close();
  await server?.close();
});

test.beforeEach(async () => {
  await clearExtensionStorage(sw);
});

test("Blocks extracts every row in the picked list", async () => {
  const { page, tabId } = await openFixture("/grid.html");
  const preview = await sendToContent(sw, tabId, {
    type: "OMNI_PREVIEW_LISTS",
  });
  expect(preview.ok).toBeTruthy();
  expect(preview.selections[0].itemCount).toBe(6);

  const result = await sendToContent(sw, tabId, {
    type: "OMNI_RUN_EXTRACT",
    mode: "blocks",
    selections: [preview.selections[0]],
  });
  expect(result.ok).toBeTruthy();
  expect(result.rows.map((row) => row.title)).toEqual([
    "Widget One",
    "Widget Two",
    "Widget Three",
    "Widget Four",
    "Widget Five",
    "Widget Six",
  ]);
  await page.close();
});

test("Full page does not navigate away when the grid has no load-more control", async () => {
  const { page, tabId } = await openFixture("/grid.html");
  const before = page.url();
  const result = await sendToContent(sw, tabId, {
    type: "OMNI_RUN_EXTRACT",
    mode: "full-page",
  });
  expect(result.ok).toBeTruthy();
  expect(page.url()).toBe(before);
  expect(result.rows).toHaveLength(6);
  expect(result.rows.map((row) => row.title)).toContain("Widget Six");
  await page.close();
});

test("Full page clicks a real Load more button and grows the list", async () => {
  const { page, tabId } = await openFixture("/load-more.html");
  const before = page.url();
  const result = await sendToContent(sw, tabId, {
    type: "OMNI_RUN_EXTRACT",
    mode: "full-page",
  });
  expect(result.ok).toBeTruthy();
  expect(page.url()).toBe(before);
  expect(result.rows.map((row) => row.title)).toEqual(
    expect.arrayContaining(["Widget One", "Widget 7", "Widget 8", "Widget 9"]),
  );
  expect(result.rows.length).toBeGreaterThanOrEqual(9);
  await page.close();
});

test("Pages follows real Next links across document loads", async () => {
  const { page, tabId } = await openFixture("/pages/page1.html");
  const result = await runPagination(sw, {
    tabId,
    pagesAll: false,
    pageLimit: 5,
  });
  expect(result.ok).toBeTruthy();
  expect(result.pages).toHaveLength(3);
  expect(page.url()).toContain("/pages/page3.html");
  const titles = result.rows.map((row) => row.title);
  expect(titles).toEqual([
    "Alpha One",
    "Alpha Two",
    "Alpha Three",
    "Beta One",
    "Beta Two",
    "Beta Three",
    "Gamma One",
    "Gamma Two",
    "Gamma Three",
  ]);

  const stored = await sw.evaluate(async () =>
    chrome.storage.local.get(["datasets", "collections"]),
  );
  expect(stored.collections).toHaveLength(1);
  expect(stored.collections[0].pageCount).toBe(3);
  expect(stored.collections[0].datasetIds).toHaveLength(3);
  const referenced = new Set(stored.collections[0].datasetIds);
  expect(
    stored.datasets.filter((dataset) => referenced.has(dataset.id)),
  ).toHaveLength(3);

  const table = await context.newPage();
  await table.goto(`chrome-extension://${extensionId}/data/table.html`);
  await expect(table.locator("#grid")).toContainText("Alpha One");
  await expect(table.locator("#grid")).toContainText("Gamma Three");
  const [download] = await Promise.all([
    table.waitForEvent("download"),
    table.locator("#btn-export").click(),
  ]);
  const csv = fs.readFileSync(await download.path(), "utf8");
  expect(csv).toContain("Page");
  expect(csv).toContain("Alpha One");
  expect(csv).toContain("Beta Two");
  expect(csv).toContain("Gamma Three");
  await table.close();
  await page.close();
});

test("Pages respects the page limit", async () => {
  const { page, tabId } = await openFixture("/pages/page1.html");
  const result = await runPagination(sw, {
    tabId,
    pagesAll: false,
    pageLimit: 1,
  });
  expect(result.ok).toBeTruthy();
  expect(result.pages).toHaveLength(1);
  expect(result.rows.map((row) => row.title)).toEqual([
    "Alpha One",
    "Alpha Two",
    "Alpha Three",
  ]);
  expect(page.url()).toContain("/pages/page1.html");
  await page.close();
});

test("Pages still walks in-page Next buttons without a reload", async () => {
  const { page, tabId } = await openFixture("/spa.html");
  const before = page.url();
  const result = await runPagination(sw, {
    tabId,
    pagesAll: false,
    pageLimit: 5,
  });
  expect(result.ok).toBeTruthy();
  expect(page.url()).toBe(before);
  expect(result.pages).toHaveLength(2);
  expect(result.rows.map((row) => row.title)).toEqual([
    "Spa One",
    "Spa Two",
    "Spa Three",
    "Spa Four",
    "Spa Five",
    "Spa Six",
  ]);
  await page.close();
});

test("CSV neutralizes formula titles and drops javascript links", async () => {
  const { page, tabId } = await openFixture("/formula.html");
  const preview = await sendToContent(sw, tabId, {
    type: "OMNI_PREVIEW_LISTS",
  });
  const result = await sendToContent(sw, tabId, {
    type: "OMNI_RUN_EXTRACT",
    mode: "blocks",
    selections: [preview.selections[0]],
  });
  expect(result.ok).toBeTruthy();
  const formula = result.rows.find((row) => row.title === FORMULA_TITLE);
  expect(formula).toBeTruthy();
  expect(formula.url).toBe("https://shop.example/item-1");
  expect(JSON.stringify(formula)).not.toContain("javascript:");

  await sw.evaluate(
    async (payload) => {
      await globalThis.OmniStorage.saveDataset({
        pageTitle: "Formula",
        pageUrl: payload.pageUrl,
        rows: payload.rows,
        paradigm: "blocks",
      });
    },
    { pageUrl: page.url(), rows: result.rows },
  );

  const table = await context.newPage();
  await table.goto(`chrome-extension://${extensionId}/data/table.html`);
  await expect(table.locator("#grid")).toContainText(FORMULA_TITLE);
  const hrefs = await table
    .locator("#grid a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(hrefs).toContain("https://shop.example/item-1");
  expect(
    hrefs.some((href) => String(href).startsWith("javascript:")),
  ).toBeFalsy();

  const csv = await table.evaluate(async () => {
    const stored = await chrome.storage.local.get([
      "datasets",
      "activeDatasetId",
    ]);
    const dataset = stored.datasets.find(
      (item) => item.id === stored.activeDatasetId,
    );
    return globalThis.OmniCsv.toCsv(dataset.rows, [
      { key: "image", label: "Image" },
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "price", label: "Price" },
      { key: "url", label: "URL" },
    ]);
  });
  expect(csv).toContain(`'=HYPERLINK`);
  expect(csv).not.toContain(`"=HYPERLINK`);

  const [download] = await Promise.all([
    table.waitForEvent("download"),
    table.locator("#btn-export").click(),
  ]);
  const downloaded = fs.readFileSync(await download.path(), "utf8");
  expect(downloaded).toContain(`'=HYPERLINK`);
  await table.close();
  await page.close();
});

test("referenced datasets survive the loose-dataset cap", async () => {
  const summary = await sw.evaluate(async () => {
    const collectionId = "col_eviction";
    for (let i = 0; i < 120; i += 1) {
      await globalThis.OmniStorage.appendPaginationPage(
        { collectionId, baseTitle: "Bulk" },
        {
          pageIndex: i + 1,
          pageUrl: "https://example.com/list",
          pageTitle: "Bulk",
          rows: [
            {
              title: `Item ${i}`,
              url: `https://example.com/items/${i}`,
              description: "",
              price: "",
              image: "",
            },
          ],
        },
      );
    }
    for (let i = 0; i < 105; i += 1) {
      await globalThis.OmniStorage.saveDataset({
        pageTitle: `Loose ${i}`,
        pageUrl: "https://example.com/loose",
        rows: [{ title: `Loose ${i}`, url: `https://example.com/loose/${i}` }],
        paradigm: "blocks",
      });
    }
    const stored = await chrome.storage.local.get(["datasets", "collections"]);
    const collection = stored.collections.find(
      (item) => item.id === collectionId,
    );
    const referenced = new Set(collection.datasetIds);
    return {
      pageCount: collection.pageCount,
      referenced: stored.datasets.filter((dataset) =>
        referenced.has(dataset.id),
      ).length,
      loose: stored.datasets.filter((dataset) => !referenced.has(dataset.id))
        .length,
    };
  });
  expect(summary.pageCount).toBe(120);
  expect(summary.referenced).toBe(120);
  expect(summary.loose).toBe(100);
});
