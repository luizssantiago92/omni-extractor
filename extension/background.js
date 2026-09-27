importScripts("shared/version.js", "shared/storage.js");

const PAGINATION_SESSION_KEY = "omniPaginationRun";

async function enableSidePanelClick() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch {
    /* Ignore if the side panel API is unavailable. */
  }
}

chrome.runtime.onInstalled.addListener(() => {
  enableSidePanelClick();
});

enableSidePanelClick();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readPaginationRun() {
  const stored = await chrome.storage.session.get(PAGINATION_SESSION_KEY);
  return stored[PAGINATION_SESSION_KEY] || null;
}

async function writePaginationRun(run) {
  await chrome.storage.session.set({ [PAGINATION_SESSION_KEY]: run });
}

async function isPaginationStopped() {
  const run = await readPaginationRun();
  return run?.stop === true;
}

async function ensureContentScript(tabId) {
  const version = globalThis.OMNI_LIST_EXTRACTOR_VERSION;
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "OMNI_PING" });
    if (ping?.ok && ping.version >= version) return;
  } catch {
    /* Cold tab, or the previous document was discarded. */
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["shared/version.js", "content/list-extractor.js"],
  });
}

function urlsMatch(actual, expected) {
  try {
    const left = new URL(actual);
    const right = new URL(expected);
    return (
      left.origin === right.origin &&
      left.pathname === right.pathname &&
      left.search === right.search
    );
  } catch {
    return false;
  }
}

async function waitForTabNavigation(tabId, url) {
  let settled = false;
  let resolveDone;
  let rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  let timer;
  const finish = (err) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    chrome.tabs.onUpdated.removeListener(onUpdated);
    if (err) rejectDone(err);
    else resolveDone();
  };
  const consider = (tab) => {
    if (!tab || tab.id !== tabId) return;
    if (tab.status !== "complete" || !tab.url) return;
    if (!urlsMatch(tab.url, url)) return;
    finish();
  };
  function onUpdated(id, info, tab) {
    if (id !== tabId) return;
    if (info.status === "complete") consider(tab);
  }
  timer = setTimeout(() => {
    finish(new Error("Timed out waiting for the next page to load"));
  }, 20000);
  chrome.tabs.onUpdated.addListener(onUpdated);
  try {
    const tab = await chrome.tabs.update(tabId, { url });
    consider(tab);
  } catch (err) {
    finish(err);
  }
  await done;
}

async function publishProgress(pages, page) {
  const count = pages.reduce((sum, item) => sum + (item.rows?.length || 0), 0);
  const thumbs = (page.rows || [])
    .slice(-8)
    .map((row) => row.image)
    .filter(Boolean);
  try {
    await chrome.runtime.sendMessage({
      type: "OMNI_EXTRACT_PROGRESS",
      count,
      thumbs,
      pageIndex: page.pageIndex,
      pageCount: pages.length,
    });
  } catch {
    /* Side panel may be closed; the run still continues. */
  }
}

async function runPagination(opts) {
  const tabId = opts?.tabId;
  if (!tabId) {
    return { ok: false, error: "No tab to paginate" };
  }
  const pagesAll =
    opts.pagesAll === true || opts.pageLimit == null || opts.pageLimit === "";
  const maxPages = pagesAll
    ? 200
    : Math.min(500, Math.max(1, Number(opts.pageLimit) || 5));
  const collectionId = `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const run = {
    id: collectionId,
    collectionId,
    tabId,
    stop: false,
    status: "running",
    baseTitle: "",
    pages: [],
  };
  await writePaginationRun(run);

  const pages = [];
  let error = "";
  let quota = false;
  let lastDatasetId = null;

  try {
    for (let index = 0; index < maxPages; index += 1) {
      if (await isPaginationStopped()) break;

      await ensureContentScript(tabId);
      const snap = await chrome.tabs.sendMessage(tabId, {
        type: "OMNI_PAGE_SNAPSHOT",
        actionSelector: opts.actionSelector || null,
      });
      if (!snap?.ok) throw new Error(snap?.error || "Could not read this page");

      const page = {
        pageIndex: index + 1,
        pageUrl: snap.pageUrl,
        pageTitle: snap.pageTitle,
        rows: snap.rows || [],
      };
      if (!run.baseTitle) run.baseTitle = snap.pageTitle || "List";
      pages.push(page);

      const saved = await globalThis.OmniStorage.appendPaginationPage(
        { collectionId, baseTitle: run.baseTitle },
        page,
      );
      lastDatasetId = saved.dataset.id;
      run.pages = pages;
      run.baseTitle = saved.collection.title;
      await writePaginationRun(run);
      await publishProgress(pages, page);

      if (await isPaginationStopped()) break;
      if (index + 1 >= maxPages) break;
      if (!snap.next) break;

      if (snap.next.kind === "navigate") {
        if (!snap.next.href) break;
        await waitForTabNavigation(tabId, snap.next.href);
        await sleep(120);
      } else {
        await ensureContentScript(tabId);
        const activated = await chrome.tabs.sendMessage(tabId, {
          type: "OMNI_ACTIVATE_SPA_NEXT",
          actionSelector: opts.actionSelector || null,
        });
        if (!activated?.ok || !activated.changed) break;
      }
    }
  } catch (err) {
    quota = Boolean(err?.quota) || globalThis.OmniStorage.isQuotaError(err);
    error = quota
      ? globalThis.OmniStorage.QUOTA_MESSAGE
      : String(err?.message || err);
  }

  const stopped = await isPaginationStopped();
  await writePaginationRun({
    ...run,
    pages,
    status: error ? "error" : stopped ? "stopped" : "done",
    stop: stopped,
  });

  const rows = pages.flatMap((page) => page.rows || []);
  return {
    ok: !error,
    error: error || undefined,
    quota,
    stopped,
    paradigm: "pagination",
    pages,
    rows,
    pageTitle: run.baseTitle || pages[0]?.pageTitle || "",
    pageUrl: pages[0]?.pageUrl || "",
    pageCount: pages.length,
    totalRows: rows.length,
    collectionId: pages.length ? collectionId : null,
    lastDatasetId,
  };
}

globalThis.__omniRunPagination = runPagination;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_DATA_TABLE") {
    const url = chrome.runtime.getURL("data/table.html");
    (async () => {
      try {
        const tab = await chrome.tabs.create({ url });
        sendResponse({ ok: true, tabId: tab.id });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message?.type === "OMNI_PAGINATION_START") {
    (async () => {
      try {
        const result = await runPagination(message);
        sendResponse(result);
      } catch (err) {
        const quota =
          Boolean(err?.quota) || globalThis.OmniStorage.isQuotaError(err);
        sendResponse({
          ok: false,
          quota,
          error: quota
            ? globalThis.OmniStorage.QUOTA_MESSAGE
            : String(err?.message || err),
        });
      }
    })();
    return true;
  }

  if (message?.type === "OMNI_PAGINATION_STOP") {
    (async () => {
      const run = await readPaginationRun();
      if (run) {
        run.stop = true;
        await writePaginationRun(run);
        if (run.tabId) {
          try {
            await chrome.tabs.sendMessage(run.tabId, {
              type: "OMNI_STOP_EXTRACT",
            });
          } catch {
            /* The document may already be going away. */
          }
        }
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  return false;
});
