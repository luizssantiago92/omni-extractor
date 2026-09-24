(() => {
  const MODE_COPY = {
    blocks: "Select one or more list blocks on the page.",
    "full-page": "Extracts the dominant list, including load-more / infinite scroll.",
    pagination: "Walks pages automatically. Each page becomes a dataset in a collection.",
    filter: "Keeps items whose title matches a letter or word. Use ; for multiple terms.",
  };

  const WALLPAPER_SCENES = [
    "../icons/wallpapers/wallpaper-scene-hologram.png",
    "../icons/wallpapers/wallpaper-scene-arrival.png",
    "../icons/wallpapers/wallpaper-scene-voyage.png",
    "../icons/wallpapers/wallpaper-scene-bridge.png",
  ];

  (function startWallpaperCycle() {
    const sceneA = document.getElementById("ambient-scene-a");
    const sceneB = document.getElementById("ambient-scene-b");
    if (!sceneA || !sceneB || WALLPAPER_SCENES.length < 2) return;

    let index = 0;
    let showingA = true;
    let swapping = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    WALLPAPER_SCENES.forEach((src) => {
      const preload = new Image();
      preload.src = src;
    });

    sceneA.src = WALLPAPER_SCENES[0];
    sceneB.src = WALLPAPER_SCENES[1];
    sceneA.classList.add("is-active");
    sceneB.classList.remove("is-active");

    if (reduceMotion) return;

    function waitImage(img) {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });
    }

    setInterval(async () => {
      if (swapping) return;
      swapping = true;
      try {
        index = (index + 1) % WALLPAPER_SCENES.length;
        const nextSrc = WALLPAPER_SCENES[index];
        const incoming = showingA ? sceneB : sceneA;
        const outgoing = showingA ? sceneA : sceneB;
        if (incoming.getAttribute("src") !== nextSrc) {
          incoming.src = nextSrc;
          await waitImage(incoming);
        }
        incoming.classList.add("is-active");
        outgoing.classList.remove("is-active");
        showingA = !showingA;
      } finally {
        swapping = false;
      }
    }, 5000);
  })();

  const TOKEN_MAX = 32;

  const state = {
    view: "home",
    mode: "blocks",
    pagesAll: true,
    pageLimit: 5,
    filterRaw: "",
    selections: [],
    excludedKeys: [],
    selectionDone: false,
    picking: false,
    focusOn: false,
    actionLabel: "",
    actionSelector: null,
    extracting: false,
    lastDatasetId: null,
    lastCollectionId: null,
    lastCount: 0,
    lastPageCount: 0,
    lastThumbs: [],
  };

  const views = {
    home: document.getElementById("view-home"),
    list: document.getElementById("view-list"),
    data: document.getElementById("view-data"),
    cloud: document.getElementById("view-cloud"),
  };

  const navButtons = {
    home: document.getElementById("nav-home"),
    data: document.getElementById("nav-data"),
    cloud: document.getElementById("nav-cloud"),
  };

  const els = {
    footList: document.getElementById("foot-list"),
    btnStart: document.getElementById("btn-start"),
    listWorkspace: document.getElementById("list-workspace"),
    modeCaption: document.getElementById("mode-caption"),
    selectStage: document.getElementById("select-stage"),
    btnSelectList: document.getElementById("btn-select-list"),
    selectCoreTitle: document.getElementById("select-core-title"),
    selectCoreHint: document.getElementById("select-core-hint"),
    selectionTray: document.getElementById("selection-tray"),
    trayTitle: document.getElementById("tray-title"),
    trayMeta: document.getElementById("tray-meta"),
    trayEmpty: document.getElementById("tray-empty"),
    trayActions: document.getElementById("tray-actions"),
    blockChipList: document.getElementById("block-chip-list"),
    previewMosaic: document.getElementById("preview-mosaic"),
    noSelectHint: document.getElementById("no-select-hint"),
    btnDoneBlocks: document.getElementById("btn-done-blocks"),
    rescuedDetail: document.getElementById("rescued-detail"),
    btnFocusEye: document.getElementById("btn-focus-eye"),
    pickerBanner: document.getElementById("picker-banner"),
    buttonBanner: document.getElementById("button-banner"),
    btnPickAction: document.getElementById("btn-pick-action"),
    actionHint: document.getElementById("action-hint"),
    paginationControls: document.getElementById("pagination-controls"),
    filterControls: document.getElementById("filter-controls"),
    filterTokens: document.getElementById("filter-tokens"),
    filterHint: document.getElementById("filter-hint"),
    tokenChipList: document.getElementById("token-chip-list"),
    pageLimit: document.getElementById("page-limit"),
    btnPagesAll: document.getElementById("btn-pages-all"),
    completePanel: document.getElementById("complete-panel"),
    completeN: document.getElementById("complete-n"),
    completeUnit: document.getElementById("complete-unit"),
    thumbGrid: document.getElementById("thumb-grid"),
    progressBox: document.getElementById("progress-box"),
    progressCount: document.getElementById("progress-count"),
    datasetList: document.getElementById("dataset-list"),
    dataBadge: document.getElementById("data-badge"),
    btnFootData: document.getElementById("btn-foot-data"),
    btnFootCloud: document.getElementById("btn-foot-cloud"),
  };

  function rowKey(row) {
    return `${row.url || ""}|${row.title || ""}|${row.image || ""}`;
  }

  function rawItemCount() {
    return state.selections.reduce((n, s) => n + (s.itemCount || 0), 0);
  }

  function totalItems() {
    const raw = rawItemCount();
    if (!state.excludedKeys.length) return raw;
    return Math.max(0, raw - state.excludedKeys.length);
  }

  function collectPreviewItems(limit = 80) {
    const out = [];
    const seen = new Set();
    const excluded = new Set(state.excludedKeys);
    state.selections.forEach((sel, blockIndex) => {
      for (const row of sel.preview || []) {
        const key = rowKey(row);
        if (excluded.has(key) || seen.has(key)) continue;
        seen.add(key);
        out.push({ ...row, key, blockIndex });
        if (out.length >= limit) return out;
      }
    });
    return out;
  }

  async function setFocusMode(on) {
    state.focusOn = !!on && state.selections.length > 0;
    if (els.btnFocusEye) {
      els.btnFocusEye.classList.toggle("is-on", state.focusOn);
      els.btnFocusEye.setAttribute("aria-pressed", state.focusOn ? "true" : "false");
    }
    try {
      await sendToTab({
        type: "OMNI_FOCUS_SELECTION",
        on: state.focusOn,
        selections: state.selections,
      });
    } catch {
      /* ignore */
    }
  }

  function parseFilterTokens(raw) {
    const parts = String(raw || "")
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);
    const tokens = [];
    const invalid = [];
    for (const part of parts) {
      if (/\s/.test(part) || part.length > TOKEN_MAX) {
        invalid.push(part);
        continue;
      }
      tokens.push(part);
    }
    return { tokens, invalid };
  }

  function canStart() {
    if (state.extracting) return false;
    if (state.mode === "blocks") {
      return state.selectionDone && state.selections.length > 0 && totalItems() > 0;
    }
    if (state.mode === "filter") {
      const { tokens, invalid } = parseFilterTokens(state.filterRaw);
      return tokens.length > 0 && invalid.length === 0;
    }
    return true;
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function ensureContentScript(tabId) {
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { type: "OMNI_PING" });
      if (!ping?.ok || (ping.version && ping.version < 12)) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content/list-extractor.js"],
        });
      }
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/list-extractor.js"],
      });
    }
  }

  async function sendToTab(message) {
    const tab = await activeTab();
    if (!tab?.id) throw new Error("No active tab");
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      throw new Error("Open an http(s) page to extract");
    }
    await ensureContentScript(tab.id);
    return chrome.tabs.sendMessage(tab.id, message);
  }

  function setView(name) {
    state.view = name;
    Object.entries(views).forEach(([key, el]) => {
      el.classList.toggle("is-visible", key === name);
    });
    const navKey = name === "list" ? "home" : name;
    Object.entries(navButtons).forEach(([key, el]) => {
      const on = key === navKey;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    els.footList.hidden =
      name !== "list" || !els.completePanel.classList.contains("is-hidden");
    if (name === "data") renderDatasets();
    renderListState();
    if (typeof onTipContextChanged === "function") onTipContextChanged();
  }

  function renderBlockChips() {
    els.blockChipList.innerHTML = "";
    state.selections.forEach((sel, i) => {
      const li = document.createElement("li");
      li.className = "block-chip";
      const label = document.createElement("span");
      label.textContent = `Block ${i + 1} · ${sel.itemCount || 0} items`;
      const x = document.createElement("button");
      x.type = "button";
      x.className = "block-chip-x";
      x.title = "Remove block";
      x.setAttribute("aria-label", `Remove block ${i + 1}`);
      x.textContent = "×";
      x.addEventListener("click", async (e) => {
        e.stopPropagation();
        state.selections.splice(i, 1);
        if (!state.selections.length) {
          resetBlockSelection();
          await setFocusMode(false);
          try {
            await sendToTab({ type: "OMNI_CANCEL_PICKER" });
          } catch {
            /* ignore */
          }
        } else {
          try {
            await sendToTab({ type: "OMNI_SET_SELECTION", selections: state.selections });
            if (state.focusOn) await setFocusMode(true);
          } catch {
            /* ignore */
          }
        }
        renderListState();
      });
      li.appendChild(label);
      li.appendChild(x);
      els.blockChipList.appendChild(li);
    });
  }

  function renderRescuedDetail() {
    if (!els.rescuedDetail) return;
    const rows = collectPreviewItems(24);
    const show = state.mode === "blocks" && rows.length > 0 && (state.picking || state.selectionDone);
    els.rescuedDetail.classList.toggle("is-hidden", !show);
    els.rescuedDetail.innerHTML = "";
    if (!show) return;
    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "rescued-row";
      if (row.image) {
        const img = document.createElement("img");
        img.src = row.image;
        img.alt = "";
        item.appendChild(img);
      } else {
        const ph = document.createElement("div");
        ph.className = "rescued-row-fallback";
        item.appendChild(ph);
      }
      const copy = document.createElement("div");
      copy.className = "rescued-row-copy";
      const title = document.createElement("span");
      title.className = "rescued-row-title";
      title.textContent = row.title || row.url || "Item";
      const meta = document.createElement("span");
      meta.className = "rescued-row-meta";
      meta.textContent = `Block ${(row.blockIndex || 0) + 1}`;
      copy.appendChild(title);
      copy.appendChild(meta);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "rescued-remove";
      rm.title = "Remove from selection";
      rm.setAttribute("aria-label", "Remove item");
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        if (!state.excludedKeys.includes(row.key)) state.excludedKeys.push(row.key);
        renderListState();
      });
      item.appendChild(copy);
      item.appendChild(rm);
      els.rescuedDetail.appendChild(item);
    });
  }

  function renderPreviewMosaic() {
    const previews = collectPreviewItems(8);
    els.previewMosaic.innerHTML = "";
    if (!previews.length) {
      els.previewMosaic.classList.add("is-hidden");
      return;
    }
    els.previewMosaic.classList.remove("is-hidden");
    const shown = previews.slice(0, 4);
    shown.forEach((row) => {
      const tile = document.createElement("div");
      tile.className = "preview-tile";
      if (row.image) {
        const img = document.createElement("img");
        img.src = row.image;
        img.alt = "";
        tile.appendChild(img);
      } else {
        const text = document.createElement("div");
        text.className = "preview-tile-text";
        text.textContent = row.title || row.description || "Item";
        tile.appendChild(text);
      }
      els.previewMosaic.appendChild(tile);
    });
    const total = totalItems();
    if (total > shown.length) {
      const more = document.createElement("p");
      more.className = "preview-more";
      more.textContent = `${total} items rescued · showing ${shown.length} preview${shown.length === 1 ? "" : "s"}`;
      els.previewMosaic.appendChild(more);
    } else {
      const note = document.createElement("p");
      note.className = "preview-more";
      note.textContent = `${total} item${total === 1 ? "" : "s"} rescued from selection`;
      els.previewMosaic.appendChild(note);
    }
  }

  function renderPaginationControls() {
    const show = state.mode === "pagination";
    els.paginationControls.classList.toggle("is-hidden", !show);
    if (!show) return;
    els.btnPagesAll.classList.toggle("is-active", state.pagesAll);
    els.btnPagesAll.setAttribute("aria-pressed", state.pagesAll ? "true" : "false");
    els.pageLimit.disabled = state.pagesAll;
    els.pageLimit.value = String(state.pageLimit);
    els.actionHint.classList.toggle("is-hidden", !state.actionLabel);
    if (state.actionLabel) els.actionHint.textContent = `Button: ${state.actionLabel}`;
  }

  function renderFilterControls() {
    const show = state.mode === "filter";
    els.filterControls.classList.toggle("is-hidden", !show);
    if (!show) return;
    if (els.filterTokens.value !== state.filterRaw) {
      els.filterTokens.value = state.filterRaw;
    }
    const { tokens, invalid } = parseFilterTokens(state.filterRaw);
    els.tokenChipList.innerHTML = "";
    tokens.forEach((t) => {
      const li = document.createElement("li");
      li.className = "token-chip";
      li.textContent = t;
      els.tokenChipList.appendChild(li);
    });
    invalid.forEach((t) => {
      const li = document.createElement("li");
      li.className = "token-chip is-invalid";
      li.textContent = `${t} · invalid`;
      els.tokenChipList.appendChild(li);
    });
    if (invalid.length) {
      els.filterHint.textContent = "Each term must be one letter or one word (no spaces). Separate with ;";
    } else if (!tokens.length) {
      els.filterHint.innerHTML =
        'Letters or single words only · separate with <strong>;</strong> · no phrases';
    } else {
      els.filterHint.textContent = `${tokens.length} filter term${tokens.length === 1 ? "" : "s"} · match any in the title`;
    }
  }

  function renderListState() {
    const isBlocks = state.mode === "blocks";
    const isFilter = state.mode === "filter";
    const needsPick = isBlocks;
    const nBlocks = state.selections.length;
    const nItems = totalItems();

    els.modeCaption.textContent = MODE_COPY[state.mode] || "";

    els.selectStage.classList.toggle("is-guide", !needsPick);
    els.selectStage.classList.remove("is-passive");
    els.btnSelectList.disabled = state.extracting;
    els.btnSelectList.classList.toggle("is-picking", isBlocks && state.picking);
    els.btnSelectList.classList.toggle("is-ready", isBlocks && state.selectionDone);
    els.btnSelectList.classList.toggle("is-guide", !needsPick);
    els.btnSelectList.setAttribute(
      "aria-pressed",
      isBlocks && state.picking ? "true" : "false"
    );

    if (!needsPick) {
      els.selectCoreTitle.textContent = "Ready";
      if (isFilter) {
        els.selectCoreHint.textContent = "Set filter · then Start";
      } else if (state.mode === "pagination") {
        els.selectCoreHint.textContent = "Just hit Start below";
      } else {
        els.selectCoreHint.textContent = "Just hit Start below";
      }
      els.btnSelectList.title = "No page pick needed — use Start extraction";
    } else if (state.picking) {
      els.selectCoreTitle.textContent = "Cancel";
      els.selectCoreHint.textContent = "Tap to stop picking";
      els.btnSelectList.title = "Cancel selection";
    } else if (state.selectionDone) {
      els.selectCoreTitle.textContent = "Selected";
      els.selectCoreHint.textContent = "Start when ready";
      els.btnSelectList.title = "Selection locked — tap to pick more";
    } else {
      els.selectCoreTitle.textContent = "Select";
      els.selectCoreHint.textContent = "Tap to pick";
      els.btnSelectList.title = "Select list blocks on the page";
    }

    const showChips = isBlocks && nBlocks > 0;
    els.trayEmpty.classList.toggle("is-hidden", showChips || !isBlocks);
    els.blockChipList.classList.toggle("is-hidden", !showChips);
    els.noSelectHint.classList.toggle("is-hidden", isBlocks);
    els.trayActions.classList.toggle("is-hidden", !isBlocks || nBlocks < 1);

    if (isFilter) {
      const { tokens } = parseFilterTokens(state.filterRaw);
      els.selectionTray.classList.add("is-filter-only");
      els.trayTitle.textContent = "Filter";
      els.trayMeta.textContent = tokens.length ? `${tokens.length} term${tokens.length === 1 ? "" : "s"}` : "Empty";
      els.trayEmpty.classList.add("is-hidden");
      els.previewMosaic.classList.add("is-hidden");
      els.previewMosaic.innerHTML = "";
      els.noSelectHint.classList.add("is-hidden");
      els.blockChipList.classList.add("is-hidden");
      els.trayActions.classList.add("is-hidden");
      if (els.rescuedDetail) {
        els.rescuedDetail.classList.add("is-hidden");
        els.rescuedDetail.innerHTML = "";
      }
    } else if (!isBlocks) {
      els.selectionTray.classList.remove("is-filter-only");
      els.trayTitle.textContent = state.mode === "pagination" ? "Pagination" : "Full page";
      els.trayMeta.textContent = "Auto";
      els.trayEmpty.classList.add("is-hidden");
      els.previewMosaic.classList.add("is-hidden");
      els.previewMosaic.innerHTML = "";
      els.noSelectHint.classList.remove("is-hidden");
      els.noSelectHint.textContent = "No picking needed — hit Start extraction.";
      if (els.rescuedDetail) {
        els.rescuedDetail.classList.add("is-hidden");
        els.rescuedDetail.innerHTML = "";
      }
    } else {
      els.selectionTray.classList.remove("is-filter-only");
      els.trayTitle.textContent = state.picking || state.selectionDone ? "Rescued items" : "Selection";
      els.trayMeta.textContent =
        nBlocks === 0
          ? "Empty"
          : `${nBlocks} block${nBlocks === 1 ? "" : "s"} · ${nItems} items`;
      els.trayEmpty.textContent = state.picking
        ? "Keep clicking blocks on the page…"
        : "Nothing selected yet.";
      els.noSelectHint.classList.add("is-hidden");
      if (showChips) {
        renderPreviewMosaic();
        renderRescuedDetail();
      } else {
        els.previewMosaic.classList.add("is-hidden");
        els.previewMosaic.innerHTML = "";
        if (els.rescuedDetail) {
          els.rescuedDetail.classList.add("is-hidden");
          els.rescuedDetail.innerHTML = "";
        }
      }
    }

    els.btnDoneBlocks.disabled = nBlocks < 1 || state.extracting;
    els.btnDoneBlocks.textContent = state.selectionDone ? "Locked" : "Done";
    els.btnDoneBlocks.classList.toggle("is-locked", state.selectionDone);
    els.btnDoneBlocks.title = state.selectionDone
      ? "Unlock to select more blocks"
      : "Lock selection and enable Start";
    if (els.btnFocusEye) {
      els.btnFocusEye.classList.toggle("is-on", state.focusOn);
      els.btnFocusEye.disabled = nBlocks < 1;
      els.btnFocusEye.setAttribute("aria-pressed", state.focusOn ? "true" : "false");
    }
    renderBlockChips();
    els.btnStart.disabled = !canStart();

    updateFootGate();
    renderPaginationControls();
    renderFilterControls();
    renderDataBadge();
  }

  /** Start / Data / Cloud stay hidden until there is something to extract. */
  function updateFootGate() {
    let hasSelection = true;
    if (state.mode === "blocks") hasSelection = state.selections.length > 0;
    else if (state.mode === "filter") {
      hasSelection = parseFilterTokens(state.filterRaw).tokens.length > 0;
    }
    els.footList.classList.toggle("is-awaiting", !hasSelection && !state.extracting);
  }

  function renderDataBadge() {
    const n = state.mode === "blocks" ? totalItems() : 0;
    if (!els.dataBadge) return;
    if (n > 0) {
      els.dataBadge.textContent = n > 99 ? "99+" : String(n);
      els.dataBadge.classList.remove("is-hidden");
    } else {
      els.dataBadge.classList.add("is-hidden");
    }
  }

  function resetBlockSelection() {
    state.selections = [];
    state.excludedKeys = [];
    state.selectionDone = false;
    state.picking = false;
    state.focusOn = false;
    state.actionLabel = "";
    state.actionSelector = null;
    if (els.btnFocusEye) {
      els.btnFocusEye.classList.remove("is-on");
      els.btnFocusEye.setAttribute("aria-pressed", "false");
    }
  }

  function setMode(mode) {
    const next = mode || "blocks";
    const modeChanged = next !== state.mode;
    if (modeChanged) {
      setFocusMode(false).catch(() => {});
      resetBlockSelection();
      sendToTab({ type: "OMNI_CANCEL_PICKER" }).catch(() => {});
      els.pickerBanner.classList.add("is-hidden");
      els.buttonBanner.classList.add("is-hidden");
    }
    state.mode = next;
    document.querySelectorAll(".mode-orb").forEach((btn) => {
      const on = btn.dataset.mode === state.mode;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
    renderListState();
    if (modeChanged && typeof onTipContextChanged === "function") onTipContextChanged();
  }

  function showComplete(count, thumbs, pageCount = 0) {
    els.listWorkspace.classList.add("is-hidden");
    els.completePanel.classList.remove("is-hidden");
    els.footList.hidden = true;
    els.completeN.textContent = String(count);
    if (els.completeUnit) {
      els.completeUnit.textContent =
        pageCount > 1
          ? `items · ${pageCount} pages (collection)`
          : "items extracted";
    }
    els.thumbGrid.innerHTML = "";
    (thumbs || []).slice(0, 8).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      els.thumbGrid.appendChild(img);
    });
  }

  function resetComplete() {
    els.listWorkspace.classList.remove("is-hidden");
    els.completePanel.classList.add("is-hidden");
    els.footList.hidden = state.view !== "list";
  }

  async function saveDataset(payload) {
    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dataset = {
      id,
      createdAt: new Date().toISOString(),
      tool: "list",
      title: payload.pageTitle || "List",
      pageUrl: payload.pageUrl || "",
      rows: payload.rows || [],
      paradigm: payload.paradigm || state.mode,
      collectionId: payload.collectionId || null,
      pageIndex: payload.pageIndex || null,
    };
    const stored = await chrome.storage.local.get(["datasets", "activeDatasetId"]);
    const datasets = stored.datasets || [];
    datasets.unshift(dataset);
    await chrome.storage.local.set({
      datasets: datasets.slice(0, 100),
      activeDatasetId: id,
    });
    state.lastDatasetId = id;
    return dataset;
  }

  async function savePaginationCollection(payload) {
    const collectionId = `col_${Date.now()}`;
    const datasetIds = [];
    const baseTitle = payload.pageTitle || "List";
    for (const page of payload.pages || []) {
      const ds = await saveDataset({
        pageTitle: `${baseTitle} · p.${page.pageIndex}`,
        pageUrl: page.pageUrl || payload.pageUrl,
        rows: page.rows || [],
        paradigm: "pagination",
        collectionId,
        pageIndex: page.pageIndex,
      });
      datasetIds.push(ds.id);
      await new Promise((r) => setTimeout(r, 2));
    }
    const collection = {
      id: collectionId,
      createdAt: new Date().toISOString(),
      tool: "list",
      title: baseTitle,
      pageUrl: payload.pageUrl || "",
      datasetIds,
      pageCount: datasetIds.length,
      totalRows: (payload.rows || []).length,
    };
    const stored = await chrome.storage.local.get("collections");
    const collections = stored.collections || [];
    collections.unshift(collection);
    await chrome.storage.local.set({ collections: collections.slice(0, 50) });
    state.lastCollectionId = collectionId;
    return collection;
  }

  async function openDataTable(datasetId) {
    const payload = {};
    if (datasetId) payload.activeDatasetId = datasetId;
    if (Object.keys(payload).length) await chrome.storage.local.set(payload);
    chrome.runtime.sendMessage({ type: "OPEN_DATA_TABLE" });
  }

  async function renderDatasets() {
    const { datasets = [], collections = [] } = await chrome.storage.local.get([
      "datasets",
      "collections",
    ]);
    els.datasetList.innerHTML = "";
    if (!datasets.length && !collections.length) {
      els.datasetList.innerHTML = `<div class="empty-card"><strong>No datasets</strong><span>Extract a list to see data here.</span></div>`;
      return;
    }

    collections.slice(0, 10).forEach((col) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dataset-item dataset-collection";
      btn.title = "Open collection in table";
      btn.innerHTML = `<strong>${escapeHtml(col.title)}</strong><span>Collection · ${col.pageCount || 0} pages · ${col.totalRows || 0} items · ${new Date(col.createdAt).toLocaleString()}</span>`;
      btn.addEventListener("click", async () => {
        const firstId =
          col.datasetIds?.[0] ||
          datasets.find((d) => d.collectionId === col.id)?.id ||
          null;
        await openDataTable(firstId);
      });
      els.datasetList.appendChild(btn);
    });

    datasets.slice(0, 20).forEach((ds) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dataset-item";
      btn.title = "Open dataset in table";
      const pageBit = ds.pageIndex ? ` · p.${ds.pageIndex}` : "";
      btn.innerHTML = `<strong>${escapeHtml(ds.title)}</strong><span>${ds.rows?.length || 0} rows${pageBit} · ${new Date(ds.createdAt).toLocaleString()}</span>`;
      btn.addEventListener("click", async () => {
        await openDataTable(ds.id);
      });
      els.datasetList.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const TIP_POOLS = {
    home: [
      { text: "Hey captain — open List Extractor when you’re ready to pull lists from this page." },
      { text: "Data keeps your saved sets local. Tap me anytime if you want another tip." },
      { text: "Cloud sync is coming later. For now, extract freely — no account needed." },
    ],
    list: [
      {
        text: "Tap Select, click lists on the page, then Done to lock them in.",
        image: "../icons/tips/tip-select.png",
      },
      {
        text: "Need more blocks? Tap Locked to unlock, pick again, then Done.",
        image: "../icons/tips/tip-done.png",
      },
      { text: "Start stays off until your selection is Locked — I wait with you." },
      {
        text: "Peek with the eye by Select — I spotlight what you picked.",
        image: "../icons/tips/tip-eye.png",
      },
    ],
    "list:blocks": [
      {
        text: "Blocks mode: pick one or more list regions, then lock with Done.",
        image: "../icons/tips/tip-select.png",
      },
      {
        text: "While Locked, Start is ready. Unlock anytime to add more blocks.",
        image: "../icons/tips/tip-done.png",
      },
      {
        text: "Use the eye to dim the page and focus your selection.",
        image: "../icons/tips/tip-eye.png",
      },
    ],
    "list:filter": [
      {
        text: "Filter keeps titles that match your words. Separate terms with ;",
        image: "../icons/tips/tip-filter.png",
      },
      { text: "Single words or letters only — no spaces inside a term." },
      { text: "When your tokens look good, hit Start — no page picking needed." },
    ],
    "list:full-page": [
      { text: "Full page finds the main list and keeps loading more as the page grows." },
      { text: "Great for infinite scroll — sit back while I gather items." },
      { text: "After extraction, open Data to review and export CSV." },
    ],
    "list:pagination": [
      { text: "Pages walks Next for you — set a limit or take them all." },
      { text: "Optional: pick the Next button so I know where to click." },
      { text: "Each page becomes a dataset inside one collection." },
    ],
    data: [
      { text: "Tap a dataset or collection to open the full table." },
      { text: "Export CSV from the table whenever you need a file." },
      { text: "Everything here stays in your browser until you clear it." },
    ],
    cloud: [
      { text: "Cloud is on the roadmap — extract locally for now." },
      { text: "When sync lands, it’ll be optional. You’re the captain." },
      { text: "Need a tip? Tap me and I’ll keep talking." },
    ],
  };

  const tipEls = {
    banner: document.getElementById("tip-banner"),
    text: document.getElementById("tip-text"),
    caret: document.getElementById("tip-caret"),
    visual: document.getElementById("tip-visual"),
    visualSoft: document.getElementById("tip-visual-soft"),
    visualFocus: document.getElementById("tip-visual-focus"),
    mascot: document.getElementById("btn-mascot-tip"),
  };

  let tipIndex = 0;
  let tipGeneration = 0;
  let tipTypeTimer = null;
  let tipHoldTimer = null;
  let tipBusy = false;
  let tipContextKey = null;

  function clearTipTimers() {
    if (tipTypeTimer) {
      clearTimeout(tipTypeTimer);
      tipTypeTimer = null;
    }
    if (tipHoldTimer) {
      clearTimeout(tipHoldTimer);
      tipHoldTimer = null;
    }
  }

  function currentTipPool() {
    if (state.view === "list") {
      const keyed = TIP_POOLS[`list:${state.mode}`];
      if (keyed?.length) return keyed;
      return TIP_POOLS.list;
    }
    return TIP_POOLS[state.view] || TIP_POOLS.home;
  }

  function tipContextSignature() {
    return state.view === "list" ? `list:${state.mode}` : state.view;
  }

  function setTipEmpty(empty) {
    tipEls.banner?.classList.toggle("is-empty", !!empty);
  }

  function showTipVisual(tip) {
    if (!tipEls.visual || !tipEls.visualSoft || !tipEls.visualFocus) return;
    if (tip?.image) {
      tipEls.visualSoft.src = tip.image;
      tipEls.visualFocus.src = tip.image;
      tipEls.visual.classList.remove("is-hidden");
      tipEls.banner?.classList.add("has-visual");
    } else {
      tipEls.visual.classList.add("is-hidden");
      tipEls.banner?.classList.remove("has-visual");
      tipEls.visualSoft.removeAttribute("src");
      tipEls.visualFocus.removeAttribute("src");
    }
  }

  function typeTipText(fullText, generation) {
    return new Promise((resolve) => {
      if (!tipEls.text || !tipEls.caret) {
        resolve();
        return;
      }
      tipEls.text.textContent = "";
      tipEls.caret.classList.remove("is-done");
      let i = 0;
      const stepMs = 26;

      const tick = () => {
        if (generation !== tipGeneration) {
          resolve();
          return;
        }
        i += 1;
        tipEls.text.textContent = fullText.slice(0, i);
        if (i >= fullText.length) {
          tipEls.caret.classList.add("is-done");
          resolve();
          return;
        }
        tipTypeTimer = setTimeout(tick, stepMs);
      };
      tipTypeTimer = setTimeout(tick, stepMs);
    });
  }

  function holdTip(ms, generation) {
    return new Promise((resolve) => {
      tipHoldTimer = setTimeout(() => resolve(), ms);
    });
  }

  function hideTipBubble() {
    if (tipEls.text) tipEls.text.textContent = "";
    tipEls.caret?.classList.add("is-done");
    showTipVisual(null);
    setTipEmpty(true);
  }

  async function speakTip(tip, generation, { dwellMs = 2200 } = {}) {
    if (!tip || generation !== tipGeneration) return;
    setTipEmpty(false);
    showTipVisual(tip);
    await typeTipText(tip.text, generation);
    if (generation !== tipGeneration) return;
    await holdTip(dwellMs, generation);
    if (generation !== tipGeneration) return;
    hideTipBubble();
  }

  /** Auto burst: up to 3 tips, then keep slot empty (layout reserved). */
  async function runTipBurst(count = 3) {
    const generation = ++tipGeneration;
    clearTipTimers();
    tipBusy = true;
    tipContextKey = tipContextSignature();
    try {
      const pool = currentTipPool();
      if (!pool.length) {
        hideTipBubble();
        return;
      }
      for (let n = 0; n < count; n += 1) {
        if (generation !== tipGeneration) return;
        const tip = pool[tipIndex % pool.length];
        tipIndex = (tipIndex + 1) % pool.length;
        await speakTip(tip, generation, { dwellMs: 1800 });
        if (generation !== tipGeneration) return;
        if (n < count - 1) await holdTip(280, generation);
      }
      if (generation !== tipGeneration) return;
      hideTipBubble();
    } finally {
      if (generation === tipGeneration) tipBusy = false;
    }
  }

  /** Single tip on mascot click — interrupts any burst, then stops. */
  async function speakOneTipFromMascot() {
    const generation = ++tipGeneration;
    clearTipTimers();
    tipBusy = true;
    tipContextKey = tipContextSignature();
    try {
      const pool = currentTipPool();
      if (!pool.length) return;
      const tip = pool[tipIndex % pool.length];
      tipIndex = (tipIndex + 1) % pool.length;
      await speakTip(tip, generation, { dwellMs: 2400 });
    } finally {
      if (generation === tipGeneration) tipBusy = false;
    }
  }

  function onTipContextChanged() {
    const next = tipContextSignature();
    if (next === tipContextKey) return;
    tipIndex = 0;
    runTipBurst(3);
  }

  tipEls.mascot?.addEventListener("click", (e) => {
    e.stopPropagation();
    speakOneTipFromMascot();
  });

  const NOTICES = [
    {
      id: "n1",
      title: "List Extractor ready",
      body: "Four modes: Filter, Blocks, Full page, Pages.",
      unread: true,
    },
    {
      id: "n2",
      title: "Datasets stay local",
      body: "Everything is saved in your browser until you export.",
      unread: true,
    },
    {
      id: "n3",
      title: "Cloud coming later",
      body: "Sync will be optional — no account required to extract.",
      unread: true,
    },
  ];

  function renderNotifications() {
    const list = document.getElementById("notify-list");
    const badge = document.getElementById("notify-badge");
    if (!list) return;
    list.innerHTML = "";
    const unread = NOTICES.filter((n) => n.unread).length;
    if (badge) {
      badge.textContent = unread > 9 ? "9+" : String(unread);
      badge.classList.toggle("is-hidden", unread === 0);
    }
    if (!NOTICES.length) {
      list.innerHTML = `<li class="flyout-empty">No notifications</li>`;
      return;
    }
    NOTICES.forEach((n) => {
      const li = document.createElement("li");
      li.className = `flyout-item${n.unread ? " is-unread" : ""}`;
      li.innerHTML = `<span class="flyout-dot" aria-hidden="true"></span><div><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.body)}</span></div>`;
      li.addEventListener("click", () => {
        n.unread = false;
        renderNotifications();
      });
      list.appendChild(li);
    });
  }

  function closeFlyouts() {
    document.getElementById("notify-panel")?.classList.add("is-hidden");
    document.getElementById("settings-panel")?.classList.add("is-hidden");
    document.getElementById("btn-notify")?.classList.remove("is-open");
    document.getElementById("btn-settings")?.classList.remove("is-open");
    document.getElementById("btn-notify")?.setAttribute("aria-expanded", "false");
    document.getElementById("btn-settings")?.setAttribute("aria-expanded", "false");
  }

  document.getElementById("btn-notify")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("notify-panel");
    const open = panel && !panel.classList.contains("is-hidden");
    closeFlyouts();
    if (!open && panel) {
      panel.classList.remove("is-hidden");
      document.getElementById("btn-notify")?.classList.add("is-open");
      document.getElementById("btn-notify")?.setAttribute("aria-expanded", "true");
      renderNotifications();
    }
  });

  document.getElementById("btn-settings")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("settings-panel");
    const open = panel && !panel.classList.contains("is-hidden");
    closeFlyouts();
    if (!open && panel) {
      panel.classList.remove("is-hidden");
      document.getElementById("btn-settings")?.classList.add("is-open");
      document.getElementById("btn-settings")?.setAttribute("aria-expanded", "true");
    }
  });

  document.getElementById("btn-notify-clear")?.addEventListener("click", () => {
    NOTICES.forEach((n) => {
      n.unread = false;
    });
    renderNotifications();
  });

  // Capture phase: buttons that stopPropagation() must still dismiss open menus
  document.addEventListener(
    "pointerdown",
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("#notify-panel, #settings-panel, #btn-notify, #btn-settings")) return;
      closeFlyouts();
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeFlyouts();
  });

  renderNotifications();

  async function goBackToMenu() {
    try {
      await setFocusMode(false);
      await sendToTab({ type: "OMNI_CANCEL_PICKER" });
      await sendToTab({ type: "OMNI_FOCUS_SELECTION", on: false });
    } catch {
      /* ignore */
    }
    resetBlockSelection();
    resetComplete();
    els.pickerBanner.classList.add("is-hidden");
    els.buttonBanner.classList.add("is-hidden");
    setView("home");
  }

  document.getElementById("open-list-extractor").addEventListener("click", () => {
    resetComplete();
    setView("list");
  });

  document.getElementById("back-home").addEventListener("click", () => {
    goBackToMenu();
  });
  document.getElementById("back-from-data")?.addEventListener("click", () => setView("home"));
  document.getElementById("back-from-cloud")?.addEventListener("click", () => setView("home"));

  Object.entries(navButtons).forEach(([key, el]) => {
    if (!el) return;
    el.addEventListener("click", () => setView(key));
  });

  document.querySelectorAll(".mode-orb").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  if (!els.btnSelectList || !els.btnDoneBlocks || !els.btnStart) {
    console.error("[Omni] Critical sidepanel controls missing from DOM");
    return;
  }

  els.btnSelectList.addEventListener("click", async () => {
    if (state.extracting) return;

    // Filter / Full page / Pages — guide only: nudge toward Start
    if (state.mode !== "blocks") {
      els.btnStart?.focus();
      els.btnStart?.classList.add("is-nudge");
      window.setTimeout(() => els.btnStart?.classList.remove("is-nudge"), 900);
      return;
    }

    // Blocks: second click while picking cancels selection mode
    if (state.picking) {
      state.picking = false;
      els.pickerBanner.classList.add("is-hidden");
      renderListState();
      try {
        await sendToTab({ type: "OMNI_CANCEL_PICKER" });
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const keep = state.selections.length > 0;
      state.picking = true;
      state.selectionDone = false;
      if (!keep) {
        state.selections = [];
        state.excludedKeys = [];
      }
      els.pickerBanner.classList.remove("is-hidden");
      renderListState();
      await sendToTab({
        type: "OMNI_START_LIST_PICKER",
        multi: true,
        keepSelections: keep,
      });
      if (keep) {
        await sendToTab({ type: "OMNI_SET_SELECTION", selections: state.selections });
      }
    } catch (err) {
      state.picking = false;
      els.pickerBanner.classList.add("is-hidden");
      renderListState();
      alert(String(err.message || err));
    }
  });

  els.btnDoneBlocks.addEventListener("click", async () => {
    if (!state.selections.length) return;
    if (state.selectionDone) {
      state.selectionDone = false;
      state.picking = true;
      els.pickerBanner.classList.remove("is-hidden");
      renderListState();
      try {
        await sendToTab({
          type: "OMNI_START_LIST_PICKER",
          multi: true,
          keepSelections: true,
        });
        await sendToTab({ type: "OMNI_SET_SELECTION", selections: state.selections });
      } catch (err) {
        alert(String(err.message || err));
      }
      return;
    }
    state.picking = false;
    state.selectionDone = true;
    els.pickerBanner.classList.add("is-hidden");
    try {
      await sendToTab({ type: "OMNI_FINISH_MULTI_PICK" });
    } catch {
      /* ignore */
    }
    renderListState();
  });

  document.getElementById("btn-reselect").addEventListener("click", async () => {
    await setFocusMode(false);
    resetBlockSelection();
    els.pickerBanner.classList.add("is-hidden");
    resetComplete();
    renderListState();
    try {
      await sendToTab({ type: "OMNI_CANCEL_PICKER" });
      await sendToTab({ type: "OMNI_FOCUS_SELECTION", on: false });
    } catch {
      /* ignore */
    }
  });

  els.btnFocusEye?.addEventListener("click", async () => {
    if (!state.selections.length) return;
    await setFocusMode(!state.focusOn);
  });

  document.getElementById("btn-info")?.addEventListener("click", () => {
    alert(
      "List Extractor\n\n• Blocks: click lists on the page, then Done to lock.\n• Locked: tap again to unlock and pick more.\n• Start extraction: available only while Locked.\n• Eye: dim the page and spotlight your selection.\n• Filter / Full page / Pages: other extract modes.",
    );
  });

  document.getElementById("btn-refresh")?.addEventListener("click", async () => {
    await setFocusMode(false);
    resetBlockSelection();
    els.pickerBanner.classList.add("is-hidden");
    els.buttonBanner.classList.add("is-hidden");
    resetComplete();
    renderListState();
    try {
      await sendToTab({ type: "OMNI_CANCEL_PICKER" });
      await sendToTab({ type: "OMNI_FOCUS_SELECTION", on: false });
      const tab = await activeTab();
      if (tab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content/list-extractor.js"],
        });
      }
    } catch {
      /* ignore */
    }
  });

  document.getElementById("btn-close")?.addEventListener("click", async () => {
    await setFocusMode(false);
    try {
      await sendToTab({ type: "OMNI_CANCEL_PICKER" });
      await sendToTab({ type: "OMNI_FOCUS_SELECTION", on: false });
    } catch {
      /* ignore */
    }
    resetBlockSelection();
    resetComplete();
    setView("home");
  });

  els.btnPagesAll.addEventListener("click", () => {
    state.pagesAll = !state.pagesAll;
    renderPaginationControls();
  });

  els.pageLimit.addEventListener("change", () => {
    const n = Number(els.pageLimit.value);
    state.pageLimit = Number.isFinite(n) && n >= 1 ? Math.min(500, Math.floor(n)) : 5;
    state.pagesAll = false;
    renderPaginationControls();
  });

  els.filterTokens.addEventListener("input", () => {
    state.filterRaw = els.filterTokens.value;
    renderFilterControls();
    els.btnStart.disabled = !canStart();
    updateFootGate();
    if (state.mode === "filter") {
      const { tokens } = parseFilterTokens(state.filterRaw);
      els.trayMeta.textContent = tokens.length
        ? `${tokens.length} term${tokens.length === 1 ? "" : "s"}`
        : "Empty";
    }
  });

  els.btnPickAction.addEventListener("click", async () => {
    try {
      els.buttonBanner.classList.remove("is-hidden");
      await sendToTab({ type: "OMNI_START_BUTTON_PICKER" });
    } catch (err) {
      els.buttonBanner.classList.add("is-hidden");
      alert(String(err.message || err));
    }
  });

  els.btnStart.addEventListener("click", async () => {
    if (!canStart()) return;
    state.extracting = true;
    els.progressBox.classList.remove("is-hidden");
    els.progressCount.textContent = "0";
    els.btnStart.disabled = true;
    try {
      const payload = {
        type: "OMNI_RUN_EXTRACT",
        mode: state.mode,
        paradigm: state.mode,
        selections: state.mode === "blocks" ? state.selections : undefined,
        actionSelector: state.actionSelector || undefined,
        pagesAll: state.mode === "pagination" ? state.pagesAll : false,
        pageLimit:
          state.mode === "pagination" && !state.pagesAll ? state.pageLimit : undefined,
        filterTokens:
          state.mode === "filter" ? parseFilterTokens(state.filterRaw).tokens : undefined,
        excludeKeys: state.mode === "blocks" ? state.excludedKeys : undefined,
      };
      const result = await sendToTab(payload);
      if (!result?.ok) throw new Error(result?.error || "Extraction failed");
      if (state.excludedKeys.length && Array.isArray(result.rows)) {
        const ex = new Set(state.excludedKeys);
        result.rows = result.rows.filter((r) => !ex.has(rowKey(r)));
      }

      let pageCount = 0;
      if (result.paradigm === "pagination" && Array.isArray(result.pages) && result.pages.length) {
        const col = await savePaginationCollection(result);
        pageCount = col.pageCount;
        state.lastCount = col.totalRows;
      } else {
        const ds = await saveDataset(result);
        state.lastCount = ds.rows.length;
      }
      state.lastPageCount = pageCount;
      state.lastThumbs = (result.rows || []).map((r) => r.image).filter(Boolean);
      showComplete(state.lastCount, state.lastThumbs, pageCount);
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      state.extracting = false;
      els.progressBox.classList.add("is-hidden");
      renderListState();
    }
  });

  document.getElementById("btn-stop").addEventListener("click", async () => {
    try {
      await sendToTab({ type: "OMNI_STOP_EXTRACT" });
    } catch {
      /* ignore */
    }
  });

  document.getElementById("btn-view-data").addEventListener("click", () => {
    openDataTable(state.lastDatasetId);
  });

  document.getElementById("btn-new-run").addEventListener("click", () => {
    resetComplete();
    renderListState();
  });

  document.getElementById("btn-open-table").addEventListener("click", () => {
    openDataTable();
  });

  els.btnFootData?.addEventListener("click", () => {
    setView("data");
  });

  els.btnFootCloud?.addEventListener("click", (e) => {
    e.preventDefault();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "OMNI_BLOCK_ADDED" || msg?.type === "OMNI_LIST_SELECTED") {
      const sel = msg.selection;
      if (!sel) return;
      const dup = state.selections.some((s) => s.containerPath === sel.containerPath);
      if (!dup) state.selections.push(sel);
      state.picking = true;
      state.selectionDone = false;
      renderListState();
    }
    if (msg?.type === "OMNI_BUTTON_SELECTED") {
      els.buttonBanner.classList.add("is-hidden");
      state.actionLabel = msg.label || "selected";
      state.actionSelector = msg.actionSelector;
      renderListState();
    }
    if (msg?.type === "OMNI_PICKER_CANCELLED") {
      els.pickerBanner.classList.add("is-hidden");
      els.buttonBanner.classList.add("is-hidden");
      if (state.picking && !state.selectionDone) {
        state.picking = false;
        if (!state.selections.length) resetBlockSelection();
      }
      renderListState();
    }
    if (msg?.type === "OMNI_EXTRACT_PROGRESS") {
      const pageBit = msg.pageIndex ? ` · p.${msg.pageIndex}` : "";
      els.progressCount.textContent = `${msg.count || 0}${pageBit}`;
      if (msg.thumbs?.length) state.lastThumbs = msg.thumbs;
    }
  });

  setView("home");
  setMode("blocks");
})();
