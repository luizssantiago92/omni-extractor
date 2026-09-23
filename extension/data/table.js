(() => {
  const select = document.getElementById("dataset-select");
  const thead = document.querySelector("#grid thead");
  const tbody = document.querySelector("#grid tbody");
  const rowMeta = document.getElementById("row-meta");
  const empty = document.getElementById("empty");
  const grid = document.getElementById("grid");

  const COLUMNS = [
    { key: "image", label: "Imagem" },
    { key: "title", label: "Título" },
    { key: "description", label: "Descrição" },
    { key: "price", label: "Preço" },
    { key: "url", label: "URL" },
  ];

  let datasets = [];
  let active = null;

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function render() {
    select.innerHTML = "";
    if (!datasets.length) {
      grid.classList.add("is-hidden");
      empty.classList.remove("is-hidden");
      rowMeta.textContent = "";
      return;
    }
    empty.classList.add("is-hidden");
    grid.classList.remove("is-hidden");

    datasets.forEach((ds) => {
      const opt = document.createElement("option");
      opt.value = ds.id;
      opt.textContent = `${ds.title} (${ds.rows?.length || 0})`;
      select.appendChild(opt);
    });

    active = datasets.find((d) => d.id === select.value) || datasets[0];
    select.value = active.id;
    rowMeta.textContent = `${active.rows?.length || 0} linhas · ${new Date(active.createdAt).toLocaleString()}`;

    thead.innerHTML = `<tr><th>#</th>${COLUMNS.map((c) => `<th>${c.label}</th>`).join("")}</tr>`;
    tbody.innerHTML = "";
    (active.rows || []).forEach((row, i) => {
      const tr = document.createElement("tr");
      const cells = COLUMNS.map((c) => {
        const v = row[c.key] || "";
        if (c.key === "image" && v) {
          return `<td><img src="${escapeHtml(v)}" alt="" /></td>`;
        }
        if (c.key === "url" && v) {
          return `<td><a href="${escapeHtml(v)}" target="_blank" rel="noreferrer">${escapeHtml(v)}</a></td>`;
        }
        return `<td>${escapeHtml(v)}</td>`;
      }).join("");
      tr.innerHTML = `<td>${i + 1}</td>${cells}`;
      tbody.appendChild(tr);
    });
  }

  function toCsv(rows) {
    const headers = COLUMNS.map((c) => c.label);
    const lines = [headers.join(",")];
    for (const row of rows) {
      const vals = COLUMNS.map((c) => {
        const raw = String(row[c.key] ?? "");
        const escaped = raw.replaceAll('"', '""');
        return `"${escaped}"`;
      });
      lines.push(vals.join(","));
    }
    return `\uFEFF${lines.join("\n")}`;
  }

  select.addEventListener("change", async () => {
    await chrome.storage.local.set({ activeDatasetId: select.value });
    active = datasets.find((d) => d.id === select.value) || null;
    render();
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    if (!active?.rows?.length) return;
    const blob = new Blob([toCsv(active.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(active.title || "dataset").replace(/[^\w\-]+/g, "_").slice(0, 40)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  chrome.storage.local.get(["datasets", "activeDatasetId"]).then((stored) => {
    datasets = stored.datasets || [];
    if (stored.activeDatasetId) {
      const exists = datasets.some((d) => d.id === stored.activeDatasetId);
      if (exists) {
        // force select after render options
        setTimeout(() => {
          select.value = stored.activeDatasetId;
          render();
        }, 0);
      }
    }
    render();
  });
})();
