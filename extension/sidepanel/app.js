(() => {
  const state = {
    view: "home",
    listSelected: false,
    loadMoreMode: "auto-scroll",
    mockItemCount: 12,
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

  const footList = document.getElementById("foot-list");
  const btnStart = document.getElementById("btn-start");
  const stepLoad = document.getElementById("step-load");
  const selectIdle = document.getElementById("select-idle");
  const selectDone = document.getElementById("select-done");
  const itemCountBadge = document.getElementById("item-count-badge");

  function setView(name) {
    state.view = name;
    Object.entries(views).forEach(([key, el]) => {
      el.classList.toggle("is-visible", key === name);
    });

    const navKey = name === "list" ? "home" : name;
    Object.entries(navButtons).forEach(([key, el]) => {
      el.classList.toggle("is-active", key === navKey);
    });

    footList.hidden = name !== "list";
    renderListState();
  }

  function renderListState() {
    const selected = state.listSelected;
    selectIdle.classList.toggle("is-hidden", selected);
    selectDone.classList.toggle("is-hidden", !selected);
    stepLoad.classList.toggle("is-dim", !selected);
    btnStart.disabled = !selected;
    itemCountBadge.textContent = `${state.mockItemCount} itens`;
  }

  function setLoadMode(mode) {
    state.loadMoreMode = mode;
    document.querySelectorAll(".mode-card").forEach((card) => {
      const on = card.dataset.mode === mode;
      card.classList.toggle("is-selected", on);
      card.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  document.getElementById("open-list-extractor").addEventListener("click", () => {
    setView("list");
  });

  document.getElementById("back-home").addEventListener("click", () => {
    setView("home");
  });

  Object.entries(navButtons).forEach(([key, el]) => {
    el.addEventListener("click", () => setView(key));
  });

  document.getElementById("btn-select-list").addEventListener("click", () => {
    // UI stub: real page picker comes in the next delivery.
    state.listSelected = true;
    renderListState();
  });

  document.getElementById("btn-reselect").addEventListener("click", () => {
    state.listSelected = false;
    renderListState();
  });

  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (!state.listSelected) return;
      setLoadMode(card.dataset.mode);
    });
  });

  btnStart.addEventListener("click", () => {
    if (!state.listSelected) return;
    btnStart.textContent = "Extração (stub) — lógica na próxima etapa";
    window.setTimeout(() => {
      btnStart.textContent = "Iniciar extração";
    }, 2200);
  });

  setView("home");
  setLoadMode("auto-scroll");
})();
