/**
 * Dataset retention for chrome.storage.local.
 * Referenced collection pages are never evicted; loose datasets stay capped.
 */
(function initOmniStorage(root) {
  const MAX_LOOSE_DATASETS = 100;
  const MAX_COLLECTIONS = 50;
  const QUOTA_MESSAGE =
    "Browser storage is full, so this dataset was not saved. Export a CSV and remove old datasets from the Ship, then try again.";

  function isQuotaError(err) {
    const msg = String(err?.message || err || "");
    return /quota|QUOTA_BYTES|kQuotaBytes/i.test(msg);
  }

  function quotaError() {
    const error = new Error(QUOTA_MESSAGE);
    error.quota = true;
    return error;
  }

  function safeHttpUrl(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function sanitizeRow(row) {
    const links = Array.isArray(row?.links)
      ? row.links.map(safeHttpUrl).filter(Boolean)
      : [];
    const images = Array.isArray(row?.images)
      ? row.images.map(safeHttpUrl).filter(Boolean)
      : [];
    const url = safeHttpUrl(row?.url) || links[0] || "";
    const image = safeHttpUrl(row?.image) || images[0] || "";
    return {
      title: row?.title || "",
      description: row?.description || "",
      price: row?.price || "",
      url,
      image,
      texts: Array.isArray(row?.texts) ? row.texts : [],
      links,
      images,
    };
  }

  function makeDataset(payload) {
    return {
      id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      tool: "list",
      title: payload.pageTitle || "List",
      pageUrl: safeHttpUrl(payload.pageUrl),
      rows: (payload.rows || []).map(sanitizeRow),
      paradigm: payload.paradigm || "blocks",
      collectionId: payload.collectionId || null,
      pageIndex: payload.pageIndex || null,
    };
  }

  function trimStore(datasets, collections) {
    const cols = (collections || []).slice(0, MAX_COLLECTIONS);
    const referenced = new Set();
    for (const col of cols) {
      for (const id of col.datasetIds || []) referenced.add(id);
    }
    const kept = [];
    let loose = 0;
    for (const ds of datasets || []) {
      if (referenced.has(ds.id)) {
        kept.push(ds);
        continue;
      }
      if (loose >= MAX_LOOSE_DATASETS) continue;
      loose += 1;
      kept.push(ds);
    }
    return { datasets: kept, collections: cols };
  }

  async function readStore() {
    const stored = await chrome.storage.local.get([
      "datasets",
      "collections",
      "activeDatasetId",
      "activeCollectionId",
    ]);
    return {
      datasets: stored.datasets || [],
      collections: stored.collections || [],
      activeDatasetId: stored.activeDatasetId || null,
      activeCollectionId: stored.activeCollectionId || null,
    };
  }

  async function writeStore(datasets, collections, extra) {
    const trimmed = trimStore(datasets, collections);
    try {
      await chrome.storage.local.set({
        datasets: trimmed.datasets,
        collections: trimmed.collections,
        ...extra,
      });
    } catch (err) {
      if (isQuotaError(err)) throw quotaError();
      throw err;
    }
    return trimmed;
  }

  async function saveDataset(payload) {
    const dataset = makeDataset(payload);
    const stored = await readStore();
    const datasets = [dataset, ...stored.datasets];
    await writeStore(datasets, stored.collections, {
      activeDatasetId: dataset.id,
      activeCollectionId: null,
    });
    return dataset;
  }

  async function appendPaginationPage(run, page) {
    const stored = await readStore();
    const datasets = stored.datasets.slice();
    const collections = stored.collections.slice();
    let collection = collections.find((col) => col.id === run.collectionId);
    if (!collection) {
      collection = {
        id: run.collectionId,
        createdAt: new Date().toISOString(),
        tool: "list",
        title: run.baseTitle || page.pageTitle || "List",
        pageUrl: safeHttpUrl(page.pageUrl),
        datasetIds: [],
        pageCount: 0,
        totalRows: 0,
      };
      collections.unshift(collection);
    }
    const dataset = makeDataset({
      pageTitle: `${collection.title} · p.${page.pageIndex}`,
      pageUrl: page.pageUrl,
      rows: page.rows || [],
      paradigm: "pagination",
      collectionId: collection.id,
      pageIndex: page.pageIndex,
    });
    datasets.unshift(dataset);
    collection.datasetIds = [...(collection.datasetIds || []), dataset.id];
    collection.pageCount = collection.datasetIds.length;
    collection.totalRows = (collection.totalRows || 0) + dataset.rows.length;
    if (!collection.pageUrl) collection.pageUrl = dataset.pageUrl;
    await writeStore(datasets, collections, {
      activeDatasetId: dataset.id,
      activeCollectionId: collection.id,
    });
    return { dataset, collection };
  }

  root.OmniStorage = {
    MAX_LOOSE_DATASETS,
    MAX_COLLECTIONS,
    QUOTA_MESSAGE,
    isQuotaError,
    safeHttpUrl,
    sanitizeRow,
    trimStore,
    saveDataset,
    appendPaginationPage,
  };
})(globalThis);
