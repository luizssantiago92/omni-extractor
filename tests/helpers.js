import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

export function startServer(root) {
  const rootPath = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.normalize(path.join(rootPath, pathname));
    if (!file.startsWith(rootPath)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

async function waitForServiceWorker(context) {
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
  }
  return worker;
}

function launchArgs(extensionPath) {
  return [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--headless=new",
    "--no-first-run",
    "--disable-default-apps",
    "--disable-gpu",
  ];
}

async function openExtensionContext(userDataDir, extensionPath) {
  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    acceptDownloads: true,
    viewport: { width: 1280, height: 800 },
    args: launchArgs(extensionPath),
  });
}

/**
 * Headless Chromium never resolves the optional-host permission bubble, so the
 * suite grants the fixture origin the same way a user clicking Allow would:
 * write it into the unpacked extension's granted host list while Chrome is
 * closed, then relaunch that profile.
 */
function grantOptionalHostAccess(userDataDir, extensionPath, origins) {
  const prefsPath = path.join(userDataDir, "Default", "Preferences");
  const data = JSON.parse(fs.readFileSync(prefsPath, "utf8"));
  const settings = data.extensions?.settings ?? {};
  const wanted = path.resolve(extensionPath);
  const match = Object.values(settings).find(
    (ext) =>
      ext.location === 8 && ext.path && path.resolve(ext.path) === wanted,
  );
  if (!match) {
    throw new Error(
      "Unpacked extension was not registered in the test profile",
    );
  }
  for (const key of ["granted_permissions", "active_permissions"]) {
    const bucket = match[key] || {
      api: [],
      explicit_host: [],
      manifest_permissions: [],
      scriptable_host: [],
    };
    bucket.explicit_host = [
      ...new Set([...(bucket.explicit_host || []), ...origins]),
    ];
    match[key] = bucket;
  }
  fs.writeFileSync(prefsPath, JSON.stringify(data));
}

export async function launchExtension(extensionPath) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "omni-ext-"));
  const warmup = await openExtensionContext(userDataDir, extensionPath);
  await waitForServiceWorker(warmup);
  await warmup.close();
  grantOptionalHostAccess(userDataDir, extensionPath, ["http://127.0.0.1/*"]);
  const context = await openExtensionContext(userDataDir, extensionPath);
  const sw = await waitForServiceWorker(context);
  const extensionId = new URL(sw.url()).host;
  return { context, sw, extensionId, userDataDir };
}

export async function clearExtensionStorage(sw) {
  await sw.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
  });
}

export async function tabIdByUrl(sw, part) {
  return sw.evaluate(async (needle) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((item) => (item.url || "").includes(needle));
    return tab?.id ?? null;
  }, part);
}

export async function sendToContent(sw, tabId, message) {
  return sw.evaluate(
    async ({ tabId: id, message: payload }) => {
      try {
        const ping = await chrome.tabs.sendMessage(id, { type: "OMNI_PING" });
        if (
          !ping?.ok ||
          ping.version < globalThis.OMNI_LIST_EXTRACTOR_VERSION
        ) {
          throw new Error("stale content script");
        }
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: id },
          files: ["shared/version.js", "content/list-extractor.js"],
        });
      }
      return chrome.tabs.sendMessage(id, payload);
    },
    { tabId, message },
  );
}

export async function runPagination(sw, opts) {
  return sw.evaluate(
    (payload) => globalThis.__omniRunPagination(payload),
    opts,
  );
}
