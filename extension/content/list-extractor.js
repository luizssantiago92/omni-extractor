(() => {
  if (window.__omniListExtractor) return;
  window.__omniListExtractor = true;

  const GOLD = "#d4af37";
  const GREEN = "#228c5a";
  const LOAD_MORE_RE =
    /load\s*more|show\s*more|ver\s*mais|mostrar\s*mais|carregar\s*mais|see\s*more|more\s*results|mais\s*resultados|next|próxim|seguint/i;

  let pickerActive = false;
  let buttonPickerActive = false;
  let highlightEl = null;
  let tooltipEl = null;
  let currentCandidate = null;
  let selection = null;
  let stopRequested = false;

  function ensureUi() {
    if (!highlightEl) {
      highlightEl = document.createElement("div");
      highlightEl.id = "omni-list-highlight";
      Object.assign(highlightEl.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "2147483646",
        border: `2px solid ${GOLD}`,
        background: "rgba(34, 140, 90, 0.12)",
        borderRadius: "6px",
        display: "none",
        boxSizing: "border-box",
      });
      document.documentElement.appendChild(highlightEl);
    }
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "omni-list-tooltip";
      Object.assign(tooltipEl.style, {
        position: "fixed",
        zIndex: "2147483647",
        pointerEvents: "none",
        background: "#0c1610",
        color: GOLD,
        border: `1px solid ${GREEN}`,
        padding: "8px 12px",
        borderRadius: "8px",
        fontFamily: "Candara, Trebuchet MS, Segoe UI, sans-serif",
        fontSize: "13px",
        fontWeight: "700",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        display: "none",
        maxWidth: "280px",
      });
      document.documentElement.appendChild(tooltipEl);
    }
  }

  function clearHighlight() {
    if (highlightEl) highlightEl.style.display = "none";
    if (tooltipEl) tooltipEl.style.display = "none";
  }

  function paintHighlight(el, label) {
    ensureUi();
    const r = el.getBoundingClientRect();
    Object.assign(highlightEl.style, {
      display: "block",
      top: `${Math.max(0, r.top)}px`,
      left: `${Math.max(0, r.left)}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    tooltipEl.textContent = label;
    tooltipEl.style.display = "block";
    const ty = Math.min(window.innerHeight - 48, Math.max(8, r.bottom + 8));
    const tx = Math.min(window.innerWidth - 290, Math.max(8, r.left));
    tooltipEl.style.top = `${ty}px`;
    tooltipEl.style.left = `${tx}px`;
  }

  function visible(el) {
    if (!(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8;
  }

  function childSignature(el) {
    const tag = el.tagName.toLowerCase();
    const cls = [...el.classList].slice(0, 4).sort().join(".");
    return `${tag}.${cls}`;
  }

  function findListFromTarget(target) {
    let node = target instanceof Element ? target : null;
    while (node && node !== document.body) {
      const parent = node.parentElement;
      if (!parent) break;
      const kids = [...parent.children].filter(visible);
      if (kids.length >= 3) {
        const sig = childSignature(node);
        const peers = kids.filter((k) => childSignature(k) === sig);
        if (peers.length >= 3) {
          return { container: parent, items: peers, signature: sig };
        }
      }
      node = parent;
    }
    return null;
  }

  function cssPath(el) {
    if (!(el instanceof Element)) return "";
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) {
        parts.unshift(`#${CSS.escape(cur.id)}`);
        break;
      }
      const parent = cur.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.tagName === cur.tagName);
        if (same.length > 1) {
          part += `:nth-of-type(${same.indexOf(cur) + 1})`;
        }
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(" > ");
  }

  function absoluteUrl(href) {
    try {
      return new URL(href, location.href).href;
    } catch {
      return href || "";
    }
  }

  function extractItem(el) {
    const texts = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const t = n.textContent?.trim();
        if (!t || t.length < 1) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName.toLowerCase();
        if (["script", "style", "noscript"].includes(tag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walk.nextNode()) {
      const t = walk.currentNode.textContent.trim().replace(/\s+/g, " ");
      if (t && !texts.includes(t)) texts.push(t);
    }

    const links = [...el.querySelectorAll("a[href]")]
      .map((a) => absoluteUrl(a.getAttribute("href")))
      .filter(Boolean);
    const images = [];
    el.querySelectorAll("img").forEach((img) => {
      const src = img.currentSrc || img.src || img.getAttribute("data-src") || "";
      if (src) images.push(absoluteUrl(src));
    });
    el.querySelectorAll("*").forEach((node) => {
      const bg = getComputedStyle(node).backgroundImage;
      const m = /url\(["']?(.*?)["']?\)/.exec(bg || "");
      if (m?.[1] && !m[1].startsWith("data:")) images.push(absoluteUrl(m[1]));
    });

    const title = texts[0] || "";
    const description = texts.slice(0, 4).join(" · ");
    const price = texts.find((t) => /(?:R\$|\$|€|£)\s?\d/.test(t) || /^\d+[.,]\d{2}$/.test(t)) || "";
    const url = links[0] || "";
    const image = images[0] || "";

    return {
      title,
      description,
      price,
      url,
      image,
      texts,
      links: [...new Set(links)],
      images: [...new Set(images)],
    };
  }

  function queryItems(sel) {
    if (!sel?.containerPath || !sel?.itemSignature) return [];
    const container = document.querySelector(sel.containerPath);
    if (!container) return [];
    return [...container.children].filter(
      (c) => visible(c) && childSignature(c) === sel.itemSignature,
    );
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function autoScroll(onProgress) {
    let stable = 0;
    let lastCount = queryItems(selection).length;
    for (let i = 0; i < 80 && !stopRequested; i++) {
      window.scrollBy(0, Math.max(400, window.innerHeight * 0.85));
      await sleep(450);
      const count = queryItems(selection).length;
      onProgress?.(count);
      if (count <= lastCount) stable += 1;
      else stable = 0;
      lastCount = count;
      if (stable >= 4) break;
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        await sleep(500);
        const again = queryItems(selection).length;
        onProgress?.(again);
        if (again <= lastCount) break;
        lastCount = again;
      }
    }
  }

  function findLoadMoreButton() {
    if (selection?.actionSelector) {
      const el = document.querySelector(selection.actionSelector);
      if (el) return el;
    }
    const candidates = [...document.querySelectorAll("button, a, [role='button']")].filter(visible);
    return (
      candidates.find((el) => LOAD_MORE_RE.test((el.textContent || "").trim())) ||
      candidates.find((el) => LOAD_MORE_RE.test(el.getAttribute("aria-label") || "")) ||
      null
    );
  }

  function findNextButton() {
    if (selection?.actionSelector) {
      const el = document.querySelector(selection.actionSelector);
      if (el) return el;
    }
    const candidates = [...document.querySelectorAll("a, button, [role='button']")].filter(visible);
    return (
      candidates.find((el) => /^(next|próxim[oa]|seguinte|>|»)$/i.test((el.textContent || "").trim())) ||
      candidates.find((el) => /next|próxim|seguinte/i.test((el.textContent || "").trim())) ||
      null
    );
  }

  async function clickLoadMore(onProgress) {
    let stable = 0;
    let last = queryItems(selection).length;
    for (let i = 0; i < 60 && !stopRequested; i++) {
      const btn = findLoadMoreButton();
      if (!btn) break;
      btn.click();
      await sleep(700);
      const count = queryItems(selection).length;
      onProgress?.(count);
      if (count <= last) stable += 1;
      else stable = 0;
      last = count;
      if (stable >= 3) break;
    }
  }

  async function clickPagination(onProgress) {
    const seen = new Set();
    for (let i = 0; i < 40 && !stopRequested; i++) {
      const items = queryItems(selection);
      items.forEach((el) => seen.add(cssPath(el) + "|" + (el.textContent || "").slice(0, 80)));
      onProgress?.(seen.size);
      const next = findNextButton();
      if (!next) break;
      const before = location.href;
      next.click();
      await sleep(900);
      if (location.href === before) {
        // same-page pagination widget
        await sleep(400);
      }
      const afterCount = queryItems(selection).length;
      if (afterCount === 0) break;
    }
    // Re-query current page items into accumulator handled by caller for SPA;
    // for multi-page navigations we collect per page in runExtract.
  }

  async function collectAll(mode, onProgress) {
    stopRequested = false;
    const rows = [];
    const fingerprint = new Set();

    function ingest() {
      const items = queryItems(selection);
      for (const el of items) {
        const row = extractItem(el);
        const key = `${row.url}|${row.title}|${row.image}|${row.description.slice(0, 60)}`;
        if (fingerprint.has(key)) continue;
        fingerprint.add(key);
        rows.push(row);
      }
      onProgress?.(rows.length, rows.slice(-6).map((r) => r.image).filter(Boolean));
    }

    ingest();

    if (mode === "auto-scroll") {
      await autoScroll(() => ingest());
    } else if (mode === "load-more") {
      await clickLoadMore(() => ingest());
    } else if (mode === "pagination") {
      for (let i = 0; i < 40 && !stopRequested; i++) {
        ingest();
        const next = findNextButton();
        if (!next) break;
        const href = next.getAttribute("href");
        next.click();
        await sleep(1000);
        if (href && !href.startsWith("#") && location.href.includes(href.replace(/^\//, ""))) {
          // navigated — wait for DOM
          await sleep(500);
        }
        ingest();
      }
    }

    ingest();
    return rows;
  }

  function onMove(e) {
    if (!pickerActive && !buttonPickerActive) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (!t || t === highlightEl || t === tooltipEl) return;

    if (buttonPickerActive) {
      const btn = t.closest("button, a, [role='button']") || t;
      if (!visible(btn)) return;
      currentCandidate = { type: "button", el: btn };
      paintHighlight(btn, `Botão: ${(btn.textContent || "").trim().slice(0, 40) || "selecionar"}`);
      return;
    }

    const found = findListFromTarget(t);
    if (!found) {
      currentCandidate = null;
      clearHighlight();
      return;
    }
    currentCandidate = found;
    paintHighlight(
      found.container,
      `Lista com ${found.items.length} itens — Smart detection. Clique para selecionar.`,
    );
  }

  function onClick(e) {
    if (!pickerActive && !buttonPickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (buttonPickerActive && currentCandidate?.el) {
      selection = {
        ...(selection || {}),
        actionSelector: cssPath(currentCandidate.el),
      };
      endPicker();
      chrome.runtime.sendMessage({
        type: "OMNI_BUTTON_SELECTED",
        actionSelector: selection.actionSelector,
        label: (currentCandidate.el.textContent || "").trim().slice(0, 60),
      });
      return;
    }

    if (pickerActive && currentCandidate?.items) {
      selection = {
        containerPath: cssPath(currentCandidate.container),
        itemSignature: currentCandidate.signature,
        itemCount: currentCandidate.items.length,
        preview: currentCandidate.items.slice(0, 20).map(extractItem),
      };
      endPicker();
      chrome.runtime.sendMessage({ type: "OMNI_LIST_SELECTED", selection });
    }
  }

  function onKey(e) {
    if (e.key === "Escape") {
      endPicker();
      chrome.runtime.sendMessage({ type: "OMNI_PICKER_CANCELLED" });
    }
  }

  function startPicker(mode = "list") {
    ensureUi();
    endPicker();
    if (mode === "button") buttonPickerActive = true;
    else pickerActive = true;
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.body.style.cursor = "crosshair";
  }

  function endPicker() {
    pickerActive = false;
    buttonPickerActive = false;
    currentCandidate = null;
    clearHighlight();
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    document.body.style.cursor = "";
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg?.type === "OMNI_PING") {
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "OMNI_START_LIST_PICKER") {
          startPicker("list");
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "OMNI_START_BUTTON_PICKER") {
          startPicker("button");
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "OMNI_CANCEL_PICKER") {
          endPicker();
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "OMNI_SET_SELECTION") {
          selection = msg.selection;
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "OMNI_STOP_EXTRACT") {
          stopRequested = true;
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "OMNI_RUN_EXTRACT") {
          selection = msg.selection || selection;
          if (!selection) {
            sendResponse({ ok: false, error: "Nenhuma lista selecionada" });
            return;
          }
          const rows = await collectAll(msg.mode || "auto-scroll", (count, thumbs) => {
            chrome.runtime.sendMessage({
              type: "OMNI_EXTRACT_PROGRESS",
              count,
              thumbs: thumbs || [],
            });
          });
          sendResponse({
            ok: true,
            rows,
            pageTitle: document.title,
            pageUrl: location.href,
          });
          return;
        }
        sendResponse({ ok: false, error: "unknown" });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  });
})();
