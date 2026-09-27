(async () => {
  const select = document.getElementById("dataset-select");
  const thead = document.querySelector("#grid thead");
  const tbody = document.querySelector("#grid tbody");
  const rowMeta = document.getElementById("row-meta");
  const empty = document.getElementById("empty");
  const grid = document.getElementById("grid");
  const csv = globalThis.OmniCsv;

  const COLUMNS = [
    { key: "image", label: "Image" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "price", label: "Price" },
    { key: "url", label: "URL" },
  ];

  let datasets = [];
  let collections = [];
  let activeDataset = null;
  let activeCollection = null;

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function datasetById(id) {
    return datasets.find((dataset) => dataset.id === id) || null;
  }

  function collectionRows(collection) {
    const rows = [];
    for (const id of collection?.datasetIds || []) {
      const dataset = datasetById(id);
      if (!dataset) continue;
      for (const row of dataset.rows || []) {
        rows.push({ ...row, page: dataset.pageIndex || "" });
      }
    }
    return rows;
  }

  function viewColumns() {
    if (!activeCollection) return COLUMNS;
    return [{ key: "page", label: "Page" }, ...COLUMNS];
  }

  function viewRows() {
    if (activeCollection) return collectionRows(activeCollection);
    return activeDataset?.rows || [];
  }

  function renderCell(column, row) {
    const value = row[column.key] || "";
    if (column.key === "image" && value) {
      const src = csv.safeHttpUrl(value);
      if (!src) return "<td></td>";
      return `<td><img src="${escapeHtml(src)}" alt="" /></td>`;
    }
    if (column.key === "url" && value) {
      const href = csv.safeHttpUrl(value);
      if (!href) return "<td></td>";
      return `<td><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(href)}</a></td>`;
    }
    return `<td>${escapeHtml(value)}</td>`;
  }

  function showEmpty() {
    grid.classList.add("is-hidden");
    empty.classList.remove("is-hidden");
    rowMeta.textContent = "";
    activeDataset = null;
    activeCollection = null;
  }

  function render(preferred) {
    select.innerHTML = "";
    if (!datasets.length && !collections.length) {
      showEmpty();
      return;
    }
    empty.classList.add("is-hidden");
    grid.classList.remove("is-hidden");

    collections.forEach((collection) => {
      const opt = document.createElement("option");
      opt.value = `collection:${collection.id}`;
      opt.textContent = `Collection · ${collection.title} (${collection.totalRows || 0} · ${collection.pageCount || 0} pages)`;
      select.appendChild(opt);
    });

    datasets.forEach((dataset) => {
      const opt = document.createElement("option");
      opt.value = `dataset:${dataset.id}`;
      const pageBit = dataset.pageIndex ? ` · p.${dataset.pageIndex}` : "";
      opt.textContent = `${dataset.title} (${dataset.rows?.length || 0}${pageBit})`;
      select.appendChild(opt);
    });

    const preferredCollection =
      preferred?.collectionId &&
      collections.some((collection) => collection.id === preferred.collectionId)
        ? preferred.collectionId
        : null;
    const preferredDataset =
      preferred?.datasetId &&
      datasets.some((dataset) => dataset.id === preferred.datasetId)
        ? preferred.datasetId
        : null;

    if (preferredCollection) {
      activeCollection =
        collections.find(
          (collection) => collection.id === preferredCollection,
        ) || null;
      activeDataset = null;
    } else if (preferredDataset) {
      activeCollection = null;
      activeDataset = datasetById(preferredDataset);
    } else if (collections.length && !datasets.length) {
      activeCollection = collections[0];
      activeDataset = null;
    } else {
      activeCollection = null;
      activeDataset = datasets[0] || null;
    }

    if (!activeCollection && !activeDataset) {
      showEmpty();
      return;
    }

    select.value = activeCollection
      ? `collection:${activeCollection.id}`
      : `dataset:${activeDataset.id}`;

    const rows = viewRows();
    if (activeCollection) {
      rowMeta.textContent = `${rows.length} rows · ${activeCollection.pageCount || 0} pages · ${new Date(activeCollection.createdAt).toLocaleString()}`;
    } else {
      rowMeta.textContent = `${rows.length} rows · ${new Date(activeDataset.createdAt).toLocaleString()}`;
    }

    const columns = viewColumns();
    thead.innerHTML = `<tr><th>#</th>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr>`;
    tbody.innerHTML = "";
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      const cells = columns.map((column) => renderCell(column, row)).join("");
      tr.innerHTML = `<td>${index + 1}</td>${cells}`;
      tbody.appendChild(tr);
    });
  }

  function exportName() {
    const title = activeCollection?.title || activeDataset?.title || "dataset";
    return `${title.replace(/[^\w-]+/g, "_").slice(0, 40)}.csv`;
  }

  select.addEventListener("change", async () => {
    const [kind, id] = select.value.split(":");
    if (kind === "collection") {
      await chrome.storage.local.set({
        activeCollectionId: id,
        activeDatasetId: null,
      });
      render({ collectionId: id });
      return;
    }
    await chrome.storage.local.set({
      activeDatasetId: id,
      activeCollectionId: null,
    });
    render({ datasetId: id });
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const rows = viewRows();
    if (!rows.length) return;
    const blob = new Blob([csv.toCsv(rows, viewColumns())], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportName();
    a.click();
    URL.revokeObjectURL(url);
  });

  const stored = await chrome.storage.local.get([
    "datasets",
    "collections",
    "activeDatasetId",
    "activeCollectionId",
  ]);
  datasets = stored.datasets || [];
  collections = stored.collections || [];
  render({
    collectionId: stored.activeCollectionId || null,
    datasetId: stored.activeDatasetId || null,
  });
})();
