(() => {
  const state = {
    view: "home",
    listSelected: false,
    loadMoreMode: "auto-scroll",
    selection: null,
    actionLabel: "",
    extracting: false,
    lastDatasetId: null,
    lastCount: 0,
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
    stepLoad: document.getElementById("step-load"),
    selectIdle: document.getElementById("select-idle"),
    selectDone: document.getElementById("select-done"),
    itemCountBadge: document.getElementById("item-count-badge"),
    selectPath: document.getElementById("select-path"),
    pickerBanner: document.getElementById("picker-banner"),
    buttonBanner: document.getElementById("button-banner"),
    btnPickAction: document.getElementById("btn-pick-action"),
    actionHint: document.getElementById("action-hint"),
    listSteps: document.getElementById("list-steps"),
    completePanel: document.getElementById("complete-panel"),
    completeN: document.getElementById("complete-n"),
    thumbGrid: document.getElementById("thumb-grid"),
    progressBox: document.getElementById("progress-box"),
    progressCount: document.getElementById("progress-count"),
    datasetList: document.getElementById("dataset-list"),
  };

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function ensureContentScript(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "OMNI_PING" });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/list-extractor.js"],
      });
    }
  }

  async function sendToTab(message) {
    const tab = await activeTab();
    if (!tab?.id) throw new Error("Nenhuma aba ativa");
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      throw new Error("Abra uma página http(s) para extrair");
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
      el.classList.toggle("is-active", key === navKey);
    });
    els.footList.hidden =
      name !== "list" || !els.completePanel.classList.contains("is-hidden");
    if (name === "data") renderDatasets();
    renderListState();
  }

  function needsActionPicker() {
    return state.loadMoreMode === "pagination" || state.loadMoreMode === "load-more";
  }

  function renderListState() {
    const selected = state.listSelected;
    els.selectIdle.classList.toggle("is-hidden", selected);
    els.selectDone.classList.toggle("is-hidden", !selected);
    els.stepLoad.classList.toggle("is-dim", !selected);
    els.btnStart.disabled = !selected || state.extracting;
    const count = state.selection?.itemCount ?? 0;
    els.itemCountBadge.textContent = `${count} itens`;
    els.selectPath.textContent = state.selection?.containerPath || "";

    const showAction = selected && needsActionPicker();
    els.btnPickAction.classList.toggle("is-hidden", !showAction);
    els.actionHint.classList.toggle("is-hidden", !showAction || !state.actionLabel);
    if (state.actionLabel) {
      els.actionHint.textContent = `Botão: ${state.actionLabel}`;
    }
  }

  function setLoadMode(mode) {
    state.loadMoreMode = mode;
    document.querySelectorAll(".mode-card").forEach((card) => {
      const on = card.dataset.mode === mode;
      card.classList.toggle("is-selected", on);
      card.setAttribute("aria-checked", on ? "true" : "false");
    });
    if (!needsActionPicker()) {
      state.actionLabel = "";
      if (state.selection) delete state.selection.actionSelector;
    }
    renderListState();
  }

  function showComplete(count, thumbs) {
    els.listSteps.classList.add("is-hidden");
    els.completePanel.classList.remove("is-hidden");
    els.footList.hidden = true;
    els.completeN.textContent = String(count);
    els.thumbGrid.innerHTML = "";
    (thumbs || []).slice(0, 8).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      els.thumbGrid.appendChild(img);
    });
  }

  function resetComplete() {
    els.listSteps.classList.remove("is-hidden");
    els.completePanel.classList.add("is-hidden");
    els.footList.hidden = state.view !== "list";
  }

  async function saveDataset(payload) {
    const id = `ds_${Date.now()}`;
    const dataset = {
      id,
      createdAt: new Date().toISOString(),
      tool: "list",
      title: payload.pageTitle || "Lista",
      pageUrl: payload.pageUrl || "",
      rows: payload.rows || [],
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

  async function renderDatasets() {
    const { datasets = [] } = await chrome.storage.local.get("datasets");
    els.datasetList.innerHTML = "";
    if (!datasets.length) {
      els.datasetList.innerHTML = `<div class="empty-card">Nenhum dataset ainda.</div>`;
      return;
    }
    datasets.slice(0, 20).forEach((ds) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dataset-item";
      btn.innerHTML = `<strong>${escapeHtml(ds.title)}</strong><span>${ds.rows?.length || 0} linhas · ${new Date(ds.createdAt).toLocaleString()}</span>`;
      btn.addEventListener("click", async () => {
        await chrome.storage.local.set({ activeDatasetId: ds.id });
        chrome.runtime.sendMessage({ type: "OPEN_DATA_TABLE" });
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

  document.getElementById("open-list-extractor").addEventListener("click", () => {
    resetComplete();
    setView("list");
  });

  document.getElementById("back-home").addEventListener("click", () => setView("home"));

  Object.entries(navButtons).forEach(([key, el]) => {
    el.addEventListener("click", () => setView(key));
  });

  document.getElementById("btn-select-list").addEventListener("click", async () => {
    try {
      els.pickerBanner.classList.remove("is-hidden");
      await sendToTab({ type: "OMNI_START_LIST_PICKER" });
    } catch (err) {
      els.pickerBanner.classList.add("is-hidden");
      alert(String(err.message || err));
    }
  });

  document.getElementById("btn-reselect").addEventListener("click", async () => {
    state.listSelected = false;
    state.selection = null;
    state.actionLabel = "";
    resetComplete();
    renderListState();
    try {
      await sendToTab({ type: "OMNI_CANCEL_PICKER" });
    } catch {
      /* ignore */
    }
  });

  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (!state.listSelected) return;
      setLoadMode(card.dataset.mode);
    });
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
    if (!state.listSelected || state.extracting) return;
    state.extracting = true;
    els.progressBox.classList.remove("is-hidden");
    els.progressCount.textContent = "0";
    els.btnStart.disabled = true;
    try {
      await sendToTab({ type: "OMNI_SET_SELECTION", selection: state.selection });
      const result = await sendToTab({
        type: "OMNI_RUN_EXTRACT",
        mode: state.loadMoreMode,
        selection: state.selection,
      });
      if (!result?.ok) throw new Error(result?.error || "Falha na extração");
      const ds = await saveDataset(result);
      state.lastCount = ds.rows.length;
      state.lastThumbs = ds.rows.map((r) => r.image).filter(Boolean);
      showComplete(state.lastCount, state.lastThumbs);
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
    chrome.runtime.sendMessage({ type: "OPEN_DATA_TABLE" });
  });

  document.getElementById("btn-new-run").addEventListener("click", () => {
    resetComplete();
    renderListState();
  });

  document.getElementById("btn-open-table").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_DATA_TABLE" });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "OMNI_LIST_SELECTED") {
      els.pickerBanner.classList.add("is-hidden");
      state.selection = msg.selection;
      state.listSelected = true;
      renderListState();
    }
    if (msg?.type === "OMNI_BUTTON_SELECTED") {
      els.buttonBanner.classList.add("is-hidden");
      state.actionLabel = msg.label || "selecionado";
      state.selection = {
        ...(state.selection || {}),
        actionSelector: msg.actionSelector,
      };
      renderListState();
    }
    if (msg?.type === "OMNI_PICKER_CANCELLED") {
      els.pickerBanner.classList.add("is-hidden");
      els.buttonBanner.classList.add("is-hidden");
    }
    if (msg?.type === "OMNI_EXTRACT_PROGRESS") {
      els.progressCount.textContent = String(msg.count || 0);
      if (msg.thumbs?.length) state.lastThumbs = msg.thumbs;
    }
  });

  setView("home");
  setLoadMode("auto-scroll");
})();
