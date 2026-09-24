(() => {
  const OMNI_VERSION = 12;
  if (window.__omniListExtractorVersion === OMNI_VERSION) return;
  if (typeof window.__omniListExtractorCleanup === "function") {
    try {
      window.__omniListExtractorCleanup();
    } catch {
      /* ignore */
    }
  }
  window.__omniListExtractorVersion = OMNI_VERSION;

  const GOLD = "#d4af37";
  const GREEN = "#5ce0d0";
  const LOAD_MORE_RE =
    /load\s*more|show\s*more|show\s*all|view\s*more|see\s*more|more\s*results|more\s*items|more\s*games|ver\s*mais|mostrar\s*mais|carregar\s*mais|exibir\s*mais|ver\s*tudo|mostrar\s*tudo|carregar\s*tudo|mais\s*resultados|mais\s*itens|mais\s*jogos|mais\s*roms|carregar|infinite|próxim[oa]s?|seguintes?|\bnext\b/i;
  const LOAD_MORE_SOFT_RE =
    /\bmais\b|\bmore\b|\bload\b|\bcarregar\b|\bmostrar\b|\bexibir\b|\bexpand/i;
  const NOISE_CLASS =
    /^(is-|has-|js-|active|selected|hover|focus|open|closed|hidden|visible|disabled|checked|current|ng-|v-|css-|svelte-|ember-)/i;
  const HASH_CLASS = /(^|-)[a-f0-9]{5,}$/i;

  let pickerActive = false;
  let buttonPickerActive = false;
  let multiPick = false;
  let highlightEl = null;
  let itemOutlineRoot = null;
  let tooltipEl = null;
  let focusRoot = null;
  let currentCandidate = null;
  let selection = null;
  let selections = [];
  let stopRequested = false;
  let pageScan = { listCount: 0, maxItems: 0 };

  function ensureUi() {
    if (!highlightEl) {
      highlightEl = document.createElement("div");
      highlightEl.id = "omni-list-highlight";
      Object.assign(highlightEl.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "2147483645",
        border: `2px solid ${GOLD}`,
        background: "rgba(34, 140, 90, 0.10)",
        borderRadius: "8px",
        display: "none",
        boxSizing: "border-box",
      });
      document.documentElement.appendChild(highlightEl);
    }
    if (!itemOutlineRoot) {
      itemOutlineRoot = document.createElement("div");
      itemOutlineRoot.id = "omni-list-item-outlines";
      Object.assign(itemOutlineRoot.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: "2147483644",
      });
      document.documentElement.appendChild(itemOutlineRoot);
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
        fontFamily: "Instrument Sans, Segoe UI, sans-serif",
        fontSize: "13px",
        fontWeight: "700",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        display: "none",
        maxWidth: "320px",
      });
      document.documentElement.appendChild(tooltipEl);
    }
  }

  function clearHighlight() {
    if (highlightEl) highlightEl.style.display = "none";
    if (tooltipEl) tooltipEl.style.display = "none";
    if (itemOutlineRoot) itemOutlineRoot.innerHTML = "";
  }

  function clearFocusMode() {
    if (focusRoot) {
      focusRoot.remove();
      focusRoot = null;
    }
  }

  function resolveSelectionEl(sel) {
    if (!sel?.containerPath) return null;
    try {
      return document.querySelector(sel.containerPath);
    } catch {
      return null;
    }
  }

  function applyFocusMode(on, sels) {
    clearFocusMode();
    if (!on) return;
    const list = Array.isArray(sels) && sels.length ? sels : activeSelections();
    const rects = [];
    for (const sel of list) {
      const el = resolveSelectionEl(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      rects.push({
        x: Math.max(0, r.left),
        y: Math.max(0, r.top),
        w: Math.min(window.innerWidth - Math.max(0, r.left), r.width),
        h: Math.min(window.innerHeight - Math.max(0, r.top), r.height),
      });
    }
    if (!rects.length) return;

    focusRoot = document.createElement("div");
    focusRoot.id = "omni-focus-root";
    Object.assign(focusRoot.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483642",
      pointerEvents: "none",
    });

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });

    const defs = document.createElementNS(ns, "defs");
    const mask = document.createElementNS(ns, "mask");
    mask.setAttribute("id", "omni-focus-mask");
    const full = document.createElementNS(ns, "rect");
    full.setAttribute("x", "0");
    full.setAttribute("y", "0");
    full.setAttribute("width", "100%");
    full.setAttribute("height", "100%");
    full.setAttribute("fill", "white");
    mask.appendChild(full);
    for (const r of rects) {
      const hole = document.createElementNS(ns, "rect");
      hole.setAttribute("x", String(r.x));
      hole.setAttribute("y", String(r.y));
      hole.setAttribute("width", String(r.w));
      hole.setAttribute("height", String(r.h));
      hole.setAttribute("rx", "10");
      hole.setAttribute("fill", "black");
      mask.appendChild(hole);
    }
    defs.appendChild(mask);
    svg.appendChild(defs);

    const dim = document.createElementNS(ns, "rect");
    dim.setAttribute("x", "0");
    dim.setAttribute("y", "0");
    dim.setAttribute("width", "100%");
    dim.setAttribute("height", "100%");
    dim.setAttribute("fill", "rgba(4, 10, 8, 0.78)");
    dim.setAttribute("mask", "url(#omni-focus-mask)");
    svg.appendChild(dim);
    focusRoot.appendChild(svg);

    for (const r of rects) {
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        position: "fixed",
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.w}px`,
        height: `${r.h}px`,
        borderRadius: "10px",
        border: `2px solid ${GOLD}`,
        boxShadow: `0 0 0 1px rgba(34,140,90,0.5), 0 0 24px rgba(212,175,55,0.45)`,
        pointerEvents: "none",
      });
      focusRoot.appendChild(ring);
    }
    document.documentElement.appendChild(focusRoot);
  }

  function paintAllSelections(label) {
    const items = [];
    for (const sel of activeSelections()) {
      for (const el of queryItems(sel, "block")) items.push(el);
    }
    if (items.length) paintListHighlight(items, label || `${activeSelections().length} block(s) selected`);
  }

  function paintListHighlight(items, label) {
    ensureUi();
    if (!items?.length) {
      clearHighlight();
      return;
    }

    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    itemOutlineRoot.innerHTML = "";

    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);

      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "fixed",
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        border: `1.5px solid ${GREEN}`,
        borderRadius: "6px",
        background: "rgba(212, 175, 55, 0.06)",
        boxSizing: "border-box",
      });
      itemOutlineRoot.appendChild(box);
    }

    if (!Number.isFinite(top)) {
      clearHighlight();
      return;
    }

    Object.assign(highlightEl.style, {
      display: "block",
      top: `${Math.max(0, top - 4)}px`,
      left: `${Math.max(0, left - 4)}px`,
      width: `${right - left + 8}px`,
      height: `${bottom - top + 8}px`,
    });

    tooltipEl.textContent = label;
    tooltipEl.style.display = "block";
    const ty = Math.min(window.innerHeight - 52, Math.max(8, bottom + 10));
    const tx = Math.min(window.innerWidth - 330, Math.max(8, left));
    tooltipEl.style.top = `${ty}px`;
    tooltipEl.style.left = `${tx}px`;
  }

  function paintButtonHighlight(el, label) {
    ensureUi();
    itemOutlineRoot.innerHTML = "";
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
    tooltipEl.style.top = `${Math.min(window.innerHeight - 48, Math.max(8, r.bottom + 8))}px`;
    tooltipEl.style.left = `${Math.min(window.innerWidth - 290, Math.max(8, r.left))}px`;
  }

  function visible(el) {
    if (!(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8;
  }

  function stableClasses(el) {
    return [...el.classList]
      .filter((c) => c && !NOISE_CLASS.test(c) && !HASH_CLASS.test(c) && c.length < 48)
      .sort();
  }

  function classJaccard(a, b) {
    const setA = new Set(stableClasses(a));
    const setB = new Set(stableClasses(b));
    if (!setA.size && !setB.size) return a.tagName === b.tagName ? 0.6 : 0;
    let inter = 0;
    for (const c of setA) if (setB.has(c)) inter += 1;
    const union = new Set([...setA, ...setB]).size || 1;
    return inter / union;
  }

  function similarItems(seed, kids, threshold = 0.34) {
    const tag = seed.tagName;
    return kids.filter((k) => {
      if (k.tagName !== tag) return false;
      if (k === seed) return true;
      return classJaccard(seed, k) >= threshold;
    });
  }

  function sharedClasses(items) {
    if (!items.length) return [];
    return items.slice(1).reduce((acc, el) => {
      const set = new Set(stableClasses(el));
      return acc.filter((c) => set.has(c));
    }, stableClasses(items[0]));
  }

  function clusterScore(items) {
    if (items.length < 3) return 0;
    const widths = items.map((el) => el.getBoundingClientRect().width);
    const avg = widths.reduce((a, b) => a + b, 0) / widths.length || 1;
    const variance =
      widths.reduce((a, w) => a + Math.abs(w - avg), 0) / widths.length / avg;
    const sizeBonus = Math.min(items.length, 80);
    return sizeBonus * (1.15 - Math.min(variance, 0.6));
  }

  function buildCandidate(container, items) {
    const shared = sharedClasses(items);
    const tag = items[0].tagName.toLowerCase();
    return {
      container,
      items,
      tag,
      sharedClasses: shared,
      itemCount: items.length,
      score: clusterScore(items),
      signature: `${tag}.${shared.join(".") || "_plain"}`,
    };
  }

  function bestClusterInParent(parent, preferredSeed = null) {
    const kids = [...parent.children].filter(visible);
    if (kids.length < 3) return null;

    let best = null;
    const seeds = preferredSeed && kids.includes(preferredSeed) ? [preferredSeed, ...kids] : kids;

    for (const seed of seeds.slice(0, 24)) {
      for (const threshold of [0.5, 0.34, 0.2]) {
        const items = similarItems(seed, kids, threshold);
        if (items.length < 3) continue;
        const candidate = buildCandidate(parent, items);
        if (!best || candidate.score > best.score) best = candidate;
        if (items.length >= kids.length * 0.7) break;
      }
    }
    return best;
  }

  function findListFromTarget(target) {
    let node = target instanceof Element ? target : null;
    let best = null;
    let depth = 0;
    while (node && node !== document.documentElement && depth < 14) {
      const parent = node.parentElement;
      if (!parent) break;
      const candidate = bestClusterInParent(parent, node);
      if (candidate && (!best || candidate.score > best.score)) {
        best = candidate;
      }
      node = parent;
      depth += 1;
    }
    return best;
  }

  function discoverLists() {
    const roots = [
      document.body,
      ...document.querySelectorAll("main, section, article, ul, ol, [role='list'], [class*='grid'], [class*='list'], [class*='cards'], [class*='products'], [class*='items']"),
    ];
    const seen = new Set();
    const found = [];

    for (const root of roots) {
      if (!(root instanceof Element)) continue;
      const walkerParents = [root, ...root.querySelectorAll("div, ul, ol, section, main")];
      for (const parent of walkerParents) {
        if (seen.has(parent) || parent.children.length < 3) continue;
        seen.add(parent);
        const candidate = bestClusterInParent(parent);
        if (candidate && candidate.itemCount >= 3) found.push(candidate);
      }
    }

    found.sort((a, b) => b.score - a.score);
    const deduped = [];
    for (const c of found) {
      const overlaps = deduped.some(
        (d) => d.container.contains(c.container) || c.container.contains(d.container),
      );
      if (!overlaps) deduped.push(c);
      if (deduped.length >= 8) break;
    }
    return deduped;
  }

  function cssPath(el) {
    if (!(el instanceof Element)) return "";
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      let part = cur.tagName.toLowerCase();
      if (cur.id && !/\d{4,}/.test(cur.id)) {
        parts.unshift(`#${CSS.escape(cur.id)}`);
        break;
      }
      const stable = stableClasses(cur).slice(0, 2);
      if (stable.length) {
        part += stable.map((c) => `.${CSS.escape(c)}`).join("");
      }
      const parent = cur.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => {
          if (c.tagName !== cur.tagName) return false;
          if (!stable.length) return true;
          return stable.every((cls) => c.classList.contains(cls));
        });
        if (same.length > 1) {
          part += `:nth-of-type(${[...parent.children]
            .filter((c) => c.tagName === cur.tagName)
            .indexOf(cur) + 1})`;
        }
      }
      parts.unshift(part);
      cur = parent;
      if (parts.length > 8) break;
    }
    return parts.join(" > ");
  }

  function resolveContainer(sel) {
    if (!sel) return null;
    if (sel.containerPath) {
      try {
        const byPath = document.querySelector(sel.containerPath);
        if (byPath) return byPath;
      } catch {
        /* ignore invalid selector */
      }
    }
    return null;
  }

  function itemMatches(el, sel) {
    if (!visible(el)) return false;
    if (sel.tag && el.tagName.toLowerCase() !== sel.tag) return false;
    const shared = sel.sharedClasses || [];
    if (shared.length) {
      const hit = shared.filter((c) => el.classList.contains(c)).length;
      return hit >= Math.max(1, Math.ceil(shared.length * 0.5));
    }
    return true;
  }

  function queryItems(sel, scope = "block") {
    if (scope === "page" || scope === "load-more" || scope === "pagination" || scope === "full-page") {
      return queryItemsPageWide(sel);
    }
    const container = resolveContainer(sel);
    if (!container) return queryItemsPageWide(sel);

    let kids = [...container.children].filter((c) => itemMatches(c, sel));
    if (kids.length >= 2) return kids;

    const nested = [...container.querySelectorAll(":scope > * > *")].filter((c) => itemMatches(c, sel));
    if (nested.length >= 3) {
      const byParent = new Map();
      for (const el of nested) {
        const p = el.parentElement;
        if (!p) continue;
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(el);
      }
      let best = [];
      for (const group of byParent.values()) {
        if (group.length > best.length) best = group;
      }
      if (best.length >= 3) return best;
    }

    if (sel.tag) {
      const selector = [sel.tag, ...(sel.sharedClasses || []).map((c) => `.${CSS.escape(c)}`)].join("");
      try {
        const all = [...container.querySelectorAll(selector)].filter(visible);
        if (all.length >= 3) return all;
      } catch {
        /* ignore */
      }
    }
    return kids;
  }

  function queryItemsPageWide(sel) {
    if (!sel?.tag) {
      const lists = discoverLists();
      const out = [];
      const seen = new Set();
      for (const list of lists) {
        for (const el of list.items) {
          if (seen.has(el)) continue;
          seen.add(el);
          out.push(el);
        }
      }
      return out;
    }
    let matched = [];
    try {
      matched = [...document.querySelectorAll(sel.tag)].filter((el) => itemMatches(el, sel));
    } catch {
      matched = [];
    }
    // Prefer outer items (drop nested matches inside another match)
    return matched.filter((el) => !matched.some((other) => other !== el && other.contains(el)));
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
        if (!t) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName.toLowerCase();
        if (["script", "style", "noscript", "svg"].includes(tag)) return NodeFilter.FILTER_REJECT;
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
      const src =
        img.currentSrc ||
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        "";
      if (src) images.push(absoluteUrl(src));
    });
    el.querySelectorAll("source[srcset], img[srcset]").forEach((node) => {
      const srcset = node.getAttribute("srcset") || "";
      const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
      if (first) images.push(absoluteUrl(first));
    });

    const title = pickTitle(el, texts);
    const description = texts.slice(0, 4).join(" · ");
    const price = texts.find((t) => /(?:R\$|\$|€|£)\s?\d/.test(t) || /^\d+[.,]\d{2}$/.test(t)) || "";
    return {
      title,
      description,
      price,
      url: links[0] || (el.tagName === "A" ? absoluteUrl(el.getAttribute("href")) : "") || "",
      image: images[0] || "",
      texts,
      links: [...new Set(links)],
      images: [...new Set(images)],
    };
  }

  function pickTitle(el, texts) {
    const heading = el.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading) {
      const t = heading.textContent.trim().replace(/\s+/g, " ");
      if (t) return t;
    }
    const named = el.querySelector(
      "[class*='title' i], [class*='name' i], [itemprop='name'], [data-title]",
    );
    if (named) {
      const t = (named.getAttribute("data-title") || named.textContent || "").trim().replace(/\s+/g, " ");
      if (t) return t;
    }
    const aria = (el.getAttribute("aria-label") || "").trim();
    if (aria) return aria.replace(/\s+/g, " ");
    const imgAlt = el.querySelector("img[alt]")?.getAttribute("alt")?.trim();
    if (imgAlt) return imgAlt.replace(/\s+/g, " ");

    const meaningful = texts.find(
      (t) =>
        t.length >= 2 &&
        !/^[\d,.\s]+$/.test(t) &&
        !/^\d+[.,]\d+\s*ROM$/i.test(t) &&
        !/^ROM$/i.test(t),
    );
    return meaningful || texts[0] || "";
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function rowKey(row) {
    return `${row.url}|${row.title}|${row.image}|${(row.description || "").slice(0, 60)}`;
  }

  function isDisabledControl(el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.getAttribute("aria-disabled") === "true") return true;
    if (el.classList.contains("disabled")) return true;
    return false;
  }

  async function autoScroll(onTick) {
    await expandPageContent(onTick, { preferScroll: true });
  }

  function isScrollable(el) {
    if (!(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    if (!/(auto|scroll|overlay)/.test(st.overflowY)) return false;
    return el.scrollHeight > el.clientHeight + 24;
  }

  function findScrollRoots(nearEl) {
    const roots = [];
    let el = nearEl instanceof Element ? nearEl : null;
    while (el && el !== document.documentElement) {
      if (isScrollable(el)) roots.push(el);
      el = el.parentElement;
    }
    for (const sel of ["main", "[role='main']", "#content", ".content", ".main", "[class*='scroll']"]) {
      try {
        document.querySelectorAll(sel).forEach((node) => {
          if (isScrollable(node)) roots.push(node);
        });
      } catch {
        /* ignore */
      }
    }
    if (isScrollable(document.scrollingElement)) roots.push(document.scrollingElement);
    return [...new Set(roots)];
  }

  function gatherPageListElements() {
    const fromPattern = selection ? queryItemsPageWide(selection) : [];
    const fromActive = queryItemsActive("full-page");
    const fromScan = collectAllPageListItems();
    const merged = [];
    const seen = new Set();
    for (const el of [...fromPattern, ...fromActive, ...fromScan]) {
      if (seen.has(el)) continue;
      seen.add(el);
      merged.push(el);
    }
    return merged.filter((el) => !merged.some((o) => o !== el && o.contains(el)));
  }

  function pageContentHeight() {
    return Math.max(
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0,
      document.scrollingElement?.scrollHeight || 0,
    );
  }

  function scrollTowardBottom() {
    const step = Math.max(520, Math.floor(window.innerHeight * 0.92));
    const anchor =
      resolveContainer(selection) ||
      gatherPageListElements().slice(-1)[0] ||
      document.body;
    const roots = findScrollRoots(anchor);
    for (const root of roots) {
      try {
        root.scrollTop = Math.min(root.scrollHeight, root.scrollTop + step);
      } catch {
        /* ignore */
      }
    }
    window.scrollBy(0, step);
    const items = gatherPageListElements();
    const last = items[items.length - 1];
    if (last) {
      try {
        last.scrollIntoView({ block: "end", inline: "nearest" });
      } catch {
        /* ignore */
      }
    }
    // Nudge absolute bottom — triggers many IntersectionObservers
    const maxY = pageContentHeight() - window.innerHeight;
    if (maxY > 0 && window.scrollY < maxY - 2) {
      window.scrollTo(0, Math.min(maxY, window.scrollY + step));
    }
  }

  function waitForDomSettle(ms = 750) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try {
          mo.disconnect();
        } catch {
          /* ignore */
        }
        resolve();
      };
      let timer = setTimeout(finish, ms);
      const mo = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(finish, 320);
      });
      try {
        mo.observe(document.body, { childList: true, subtree: true });
      } catch {
        /* ignore */
      }
    });
  }

  function refreshDominantSelection() {
    const lists = discoverLists();
    if (!lists[0]) return false;
    const top = lists[0];
    const prev = selection?.itemCount || 0;
    if (top.itemCount < prev) return false;
    selection = {
      containerPath: cssPath(top.container),
      tag: top.tag,
      sharedClasses: top.sharedClasses,
      itemSignature: top.signature,
      itemCount: top.itemCount,
      actionSelector: selection?.actionSelector || null,
    };
    selections = [selection];
    return true;
  }

  function controlLabel(el) {
    if (!el) return "";
    return [
      el.innerText || el.textContent,
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("value"),
      el.getAttribute("data-text"),
      el.getAttribute("data-label"),
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function listAnchorBottom() {
    const items = gatherPageListElements();
    if (!items.length) return 0;
    const last = items[items.length - 1];
    const r = last.getBoundingClientRect();
    return r.bottom + window.scrollY;
  }

  function scoreLoadMoreCandidate(el, listBottom) {
    if (!el || !visible(el) || isDisabledControl(el)) return -Infinity;
    let score = 0;
    const label = controlLabel(el);
    const cls = `${el.className || ""} ${el.id || ""} ${el.getAttribute("data-testid") || ""}`;

    if (LOAD_MORE_RE.test(label)) score += 55;
    else if (LOAD_MORE_SOFT_RE.test(label) && label.length < 48) score += 22;

    if (/load[-_]?more|show[-_]?more|btn[-_]?more|loadmore|showmore|infinite|carregar|ver-mais|vermais/i.test(cls)) {
      score += 45;
    }

    const absTop = el.getBoundingClientRect().top + window.scrollY;
    if (listBottom > 0) {
      if (absTop >= listBottom - 80) score += 30;
      else if (absTop >= listBottom - 280) score += 12;
      else if (absTop + 40 < listBottom - 600) score -= 20;
    }

    if (el.closest("nav, header, [role='navigation'], .navbar, .menu")) score -= 45;
    if (el.closest("footer") && LOAD_MORE_RE.test(label)) score += 8;

    const container = resolveContainer(selection);
    if (container) {
      if (container.contains(el)) score += 18;
      else if (container.parentElement?.contains(el)) score += 10;
    }

    // Prefer real buttons / role=button over plain links in menus
    const tag = el.tagName.toLowerCase();
    if (tag === "button" || el.getAttribute("role") === "button") score += 8;
    if (tag === "a" && (el.getAttribute("href") || "#") === "#") score += 6;

    // Truncated / collapsed expanders often sit under the list
    if (/expand|collapse|toggle|accordion/i.test(cls) && listBottom && absTop >= listBottom - 120) {
      score += 15;
    }

    return score;
  }

  function findLoadMoreButton() {
    const actionSel = selection?.actionSelector || selections[0]?.actionSelector;
    if (actionSel) {
      try {
        const el = document.querySelector(actionSel);
        if (el && visible(el) && !isDisabledControl(el)) return el;
      } catch {
        /* ignore */
      }
    }

    const listBottom = listAnchorBottom();
    const hookNodes = [
      ...document.querySelectorAll(
        [
          '[class*="load-more" i]',
          '[class*="loadmore" i]',
          '[class*="show-more" i]',
          '[class*="showmore" i]',
          '[class*="ver-mais" i]',
          '[class*="vermais" i]',
          '[class*="carregar" i]',
          '[data-action*="load" i]',
          '[data-testid*="load-more" i]',
          '[data-testid*="show-more" i]',
          '[id*="load-more" i]',
          '[id*="show-more" i]',
          '[aria-label*="more" i]',
          '[aria-label*="mais" i]',
        ].join(","),
      ),
    ];

    const interactive = [
      ...document.querySelectorAll("button, a, [role='button'], input[type='button'], input[type='submit']"),
    ];

    const seen = new Set();
    const pool = [];
    for (const el of [...hookNodes, ...interactive]) {
      if (seen.has(el)) continue;
      seen.add(el);
      // Prefer the clickable host if hook hit a wrapper child
      const host =
        el.closest("button, a, [role='button']") ||
        (el.matches?.("button, a, [role='button'], input") ? el : null);
      if (host && !seen.has(host)) {
        seen.add(host);
        pool.push(host);
      } else if (host) {
        pool.push(host);
      } else {
        pool.push(el);
      }
    }

    let best = null;
    let bestScore = 0;
    for (const el of pool) {
      const s = scoreLoadMoreCandidate(el, listBottom);
      if (s > bestScore) {
        bestScore = s;
        best = el;
      }
    }
    // Threshold: only click when we are reasonably sure it's a load-more control
    return bestScore >= 40 ? best : null;
  }

  async function clickExpandControl(btn) {
    if (!btn) return false;
    try {
      btn.scrollIntoView({ block: "center", inline: "nearest" });
      await sleep(180);
      if (typeof btn.click === "function") btn.click();
      else {
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }
      return true;
    } catch {
      return false;
    }
  }

  async function expandPageContent(onTick, _opts = {}) {
    let lastCount = gatherPageListElements().length;
    onTick?.(lastCount);

    // Phase 1 — page is hiding more behind an actionable control
    let stableClicks = 0;
    for (let i = 0; i < 80 && !stopRequested; i++) {
      const btn = findLoadMoreButton();
      if (!btn) break;

      const before = lastCount;
      const heightBefore = pageContentHeight();
      await clickExpandControl(btn);
      await waitForDomSettle(1100);
      refreshDominantSelection();

      const count = gatherPageListElements().length;
      const height = pageContentHeight();
      onTick?.(count);

      const grew = count > before || height > heightBefore + 40;
      if (!grew) stableClicks += 1;
      else stableClicks = 0;
      lastCount = Math.max(lastCount, count);

      const gone = !document.contains(btn) || !visible(btn) || isDisabledControl(btn);
      if (gone) {
        // New button may appear after load — loop continues
        stableClicks = Math.min(stableClicks, 1);
        continue;
      }
      if (stableClicks >= 3) break;
    }

    // Phase 2 — infinite scroll / lazy windows
    let stableScroll = 0;
    let lastHeight = pageContentHeight();
    for (let i = 0; i < 100 && !stopRequested; i++) {
      // If a load-more appeared after scrolling, prefer clicking it
      const btn = findLoadMoreButton();
      if (btn) {
        await clickExpandControl(btn);
        await waitForDomSettle(1000);
      } else {
        scrollTowardBottom();
        await waitForDomSettle(750);
        if (window.scrollY + window.innerHeight >= pageContentHeight() - 12) {
          window.scrollBy(0, -120);
          await sleep(140);
          scrollTowardBottom();
          await waitForDomSettle(500);
        }
      }

      refreshDominantSelection();
      const count = gatherPageListElements().length;
      const height = pageContentHeight();
      onTick?.(count);

      const grew = count > lastCount || height > lastHeight + 48;
      if (!grew) stableScroll += 1;
      else stableScroll = 0;
      lastCount = Math.max(lastCount, count);
      lastHeight = Math.max(lastHeight, height);
      if (stableScroll >= 6) break;
    }
  }

  async function clickLoadMore(onTick) {
    await expandPageContent(onTick, { preferScroll: false });
  }

  function findNextButton() {
    const actionSel = selection?.actionSelector || selections[0]?.actionSelector;
    if (actionSel) {
      const el = document.querySelector(actionSel);
      if (el && !isDisabledControl(el)) return el;
    }
    const relNext = document.querySelector('a[rel="next"]');
    if (relNext && visible(relNext) && !isDisabledControl(relNext)) return relNext;

    const candidates = [...document.querySelectorAll("a, button, [role='button']")].filter(visible);
    const byLabel =
      candidates.find((el) => /^(next|próxim[oa]|seguinte|>|»|›)$/i.test((el.textContent || "").trim())) ||
      candidates.find((el) => /next|próxim|seguinte/i.test((el.textContent || "").trim())) ||
      candidates.find((el) => /next|próxim|seguinte/i.test(el.getAttribute("aria-label") || ""));
    if (byLabel && !isDisabledControl(byLabel)) return byLabel;

    const current = candidates.find(
      (el) =>
        el.getAttribute("aria-current") === "page" ||
        /\b(active|current|selected|is-active|is-current)\b/i.test(el.className || ""),
    );
    if (current) {
      const n = parseInt((current.textContent || "").trim(), 10);
      if (Number.isFinite(n)) {
        const nextNum = candidates.find((el) => (el.textContent || "").trim() === String(n + 1));
        if (nextNum && !isDisabledControl(nextNum)) return nextNum;
      }
    }
    return null;
  }

  async function clickLoadMore(onTick) {
    let stable = 0;
    let last = queryItemsActive("full-page").length;
    for (let i = 0; i < 60 && !stopRequested; i++) {
      const btn = findLoadMoreButton();
      if (!btn) break;
      btn.click();
      await sleep(700);
      const count = queryItemsActive("full-page").length;
      onTick?.(count);
      if (count <= last) stable += 1;
      else stable = 0;
      last = count;
      if (stable >= 3) break;
    }
  }

  function activeSelections() {
    if (Array.isArray(selections) && selections.length) return selections;
    if (selection) return [selection];
    return [];
  }

  function queryItemsActive(scope) {
    const sels = activeSelections();
    if (!sels.length) return [];
    const out = [];
    const seen = new Set();
    for (const sel of sels) {
      for (const el of queryItems(sel, scope === "blocks" ? "block" : scope)) {
        if (seen.has(el)) continue;
        seen.add(el);
        out.push(el);
      }
    }
    return out;
  }

  function extractRows(scope) {
    const items = queryItemsActive(scope);
    const rows = [];
    const seen = new Set();
    for (const el of items) {
      const row = extractItem(el);
      const key = rowKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
    return rows;
  }

  function ensureDominantSelection() {
    if (selection?.tag || (selections.length && selections[0]?.tag)) {
      if (!selection && selections[0]) selection = selections[0];
      return selection;
    }
    const lists = discoverLists();
    if (!lists[0]) return null;
    const top = lists[0];
    selection = {
      containerPath: cssPath(top.container),
      tag: top.tag,
      sharedClasses: top.sharedClasses,
      itemSignature: top.signature,
      itemCount: top.itemCount,
    };
    selections = [selection];
    return selection;
  }

  function collectAllPageListItems() {
    const lists = discoverLists();
    const out = [];
    const seen = new Set();
    for (const list of lists) {
      for (const el of list.items || []) {
        if (seen.has(el)) continue;
        seen.add(el);
        out.push(el);
      }
    }
    // Prefer outer cards (drop nested matches)
    return out.filter((el) => !out.some((other) => other !== el && other.contains(el)));
  }

  function extractRowsFromElements(elements) {
    const rows = [];
    const seen = new Set();
    for (const el of elements) {
      const row = extractItem(el);
      const key = rowKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
    return rows;
  }

  function titleMatchesFilter(title, tokens) {
    const hay = String(title || "").toLowerCase();
    if (!hay) return false;
    return tokens.some((t) => hay.includes(t));
  }

  function normalizeFilterTokens(rawTokens) {
    const list = Array.isArray(rawTokens) ? rawTokens : [];
    const out = [];
    for (const t of list) {
      const s = String(t || "").trim();
      if (!s || /\s/.test(s) || s.length > 32) continue;
      out.push(s.toLowerCase());
    }
    return [...new Set(out)];
  }

  async function waitForPageChange(beforeUrl, beforeFirstKey) {
    let waited = 0;
    while (waited < 9000 && !stopRequested) {
      await sleep(300);
      waited += 300;
      if (location.href !== beforeUrl) return true;
      const now = extractRows("pagination");
      const nowKey = now[0] ? rowKey(now[0]) : "";
      if (nowKey && nowKey !== beforeFirstKey) return true;
    }
    return false;
  }

  async function collectAll(mode, onProgress, options = {}) {
    stopRequested = false;
    let paradigm = mode || "blocks";
    if (paradigm === "block") paradigm = "blocks";
    if (paradigm === "page" || paradigm === "load-more" || paradigm === "auto-scroll") {
      paradigm = "full-page";
    }

    function report(rows, meta = {}) {
      onProgress?.(rows.length, rows.slice(-8).map((r) => r.image).filter(Boolean), meta);
    }

    if (paradigm === "blocks") {
      const rows = extractRows("blocks");
      report(rows);
      return { rows, pages: null, paradigm };
    }

    if (paradigm === "full-page") {
      if (!ensureDominantSelection()) {
        return { rows: [], pages: null, paradigm, error: "No list detected on this page" };
      }
      const fingerprint = new Set();
      const rows = [];
      function ingest() {
        for (const row of extractRowsFromElements(gatherPageListElements())) {
          const key = rowKey(row);
          if (fingerprint.has(key)) continue;
          fingerprint.add(key);
          rows.push(row);
        }
        report(rows);
      }
      ingest();
      await expandPageContent(() => ingest());
      ingest();
      return { rows, pages: null, paradigm };
    }

    if (paradigm === "filter") {
      const tokens = normalizeFilterTokens(options.filterTokens);
      if (!tokens.length) {
        return { rows: [], pages: null, paradigm, error: "Add at least one letter or word filter" };
      }

      // Page-wide: merge every discovered list, then keep rows whose dataset title matches
      ensureDominantSelection();
      const fingerprint = new Set();
      const rows = [];

      function gatherElements() {
        const fromPattern = selection ? queryItemsPageWide(selection) : [];
        const fromScan = collectAllPageListItems();
        const merged = [];
        const seen = new Set();
        for (const el of [...fromPattern, ...fromScan]) {
          if (seen.has(el)) continue;
          seen.add(el);
          merged.push(el);
        }
        return merged.filter((el) => !merged.some((o) => o !== el && o.contains(el)));
      }

      function ingestFiltered() {
        for (const row of extractRowsFromElements(gatherElements())) {
          if (!titleMatchesFilter(row.title || "", tokens)) continue;
          const key = rowKey(row);
          if (fingerprint.has(key)) continue;
          fingerprint.add(key);
          rows.push(row);
        }
        report(rows);
      }

      ingestFiltered();
      await expandPageContent(() => ingestFiltered());
      ingestFiltered();
      return { rows, pages: null, paradigm };
    }

    if (paradigm === "pagination") {
      if (!ensureDominantSelection()) {
        return { rows: [], pages: null, paradigm, error: "No list detected on this page" };
      }
      const pagesAll = options.pagesAll === true || !options.pageLimit;
      const maxPages = pagesAll
        ? 200
        : Math.min(500, Math.max(1, Number(options.pageLimit) || 5));
      const pages = [];
      const allRows = [];

      for (let i = 0; i < maxPages && !stopRequested; i++) {
        const pageRows = extractRows("pagination");
        pages.push({
          pageIndex: i + 1,
          pageUrl: location.href,
          pageTitle: document.title,
          rows: pageRows,
        });
        allRows.push(...pageRows);
        report(allRows, { pageIndex: i + 1, pageCount: pages.length });

        const next = findNextButton();
        if (!next) break;
        const beforeUrl = location.href;
        const beforeFirstKey = pageRows[0] ? rowKey(pageRows[0]) : "";
        next.click();
        const changed = await waitForPageChange(beforeUrl, beforeFirstKey);
        if (!changed) break;

        const after = extractRows("pagination");
        const same =
          after.length === pageRows.length &&
          after.every((r, idx) => rowKey(r) === rowKey(pageRows[idx] || {}));
        if (same && location.href === beforeUrl) break;
      }

      return { rows: allRows, pages, paradigm };
    }

    const rows = extractRows("blocks");
    report(rows);
    return { rows, pages: null, paradigm: "blocks" };
  }

  function onMove(e) {
    if (!pickerActive && !buttonPickerActive) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (!t || t === highlightEl || t === tooltipEl || itemOutlineRoot?.contains(t)) return;

    if (buttonPickerActive) {
      const btn = t.closest("button, a, [role='button']") || t;
      if (!visible(btn)) return;
      currentCandidate = { type: "button", el: btn };
      paintButtonHighlight(btn, `Button: ${(btn.textContent || "").trim().slice(0, 40) || "select"}`);
      return;
    }

    const found = findListFromTarget(t);
    if (!found) {
      currentCandidate = null;
      clearHighlight();
      return;
    }
    currentCandidate = found;
    const n = selections.length;
    paintListHighlight(
      found.items,
      multiPick
        ? `Block with ${found.items.length} items · click to add${n ? ` (${n} already)` : ""}`
        : `List with ${found.items.length} items · click to confirm`,
    );
  }

  function onClick(e) {
    if (!pickerActive && !buttonPickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (buttonPickerActive && currentCandidate?.el) {
      const actionSelector = cssPath(currentCandidate.el);
      if (selection) selection.actionSelector = actionSelector;
      selections = selections.map((s) => ({ ...s, actionSelector }));
      endPicker();
      chrome.runtime.sendMessage({
        type: "OMNI_BUTTON_SELECTED",
        actionSelector,
        label: (currentCandidate.el.textContent || "").trim().slice(0, 60),
      });
      return;
    }

    if (pickerActive && currentCandidate?.items?.length) {
      const items = currentCandidate.items;
      const block = {
        containerPath: cssPath(currentCandidate.container),
        tag: currentCandidate.tag,
        sharedClasses: currentCandidate.sharedClasses,
        itemSignature: currentCandidate.signature,
        itemCount: items.length,
        preview: items.slice(0, 24).map(extractItem),
      };

      if (multiPick) {
        const dup = selections.some((s) => s.containerPath === block.containerPath);
        if (!dup) selections.push(block);
        selection = selections[selections.length - 1];
        chrome.runtime.sendMessage({
          type: "OMNI_BLOCK_ADDED",
          selection: block,
          selections,
          count: selections.length,
        });
        paintListHighlight(
          items,
          `Added · ${selections.length} block(s) — keep going or Done in the panel`,
        );
        return;
      }

      selection = block;
      selections = [block];
      endPicker();
      chrome.runtime.sendMessage({ type: "OMNI_LIST_SELECTED", selection: block });
    }
  }

  function onKey(e) {
    if (e.key === "Escape") {
      endPicker();
      chrome.runtime.sendMessage({ type: "OMNI_PICKER_CANCELLED" });
    }
  }

  function startPicker(mode = "list", opts = {}) {
    ensureUi();
    endPicker({ keepFocus: mode !== "button" && !!opts.keepSelections });
    if (mode === "button") {
      buttonPickerActive = true;
      multiPick = false;
    } else {
      pickerActive = true;
      multiPick = !!opts.multi;
      if (multiPick && !opts.keepSelections) {
        selections = [];
        selection = null;
      }
      const lists = discoverLists();
      pageScan = {
        listCount: lists.length,
        maxItems: lists[0]?.itemCount || 0,
      };
      chrome.runtime.sendMessage({ type: "OMNI_PAGE_SCAN", ...pageScan });
      if (opts.keepSelections && selections.length) {
        paintAllSelections(
          `Resume · ${selections.length} block(s) — click to add more, then Done`,
        );
      } else if (lists[0]) {
        currentCandidate = lists[0];
        paintListHighlight(
          lists[0].items,
          multiPick
            ? `Click to add blocks · largest list: ${lists[0].itemCount} items`
            : `Page: ${lists.length} list(s) · largest has ${lists[0].itemCount} items`,
        );
      }
    }
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.body.style.cursor = "crosshair";
  }

  function endPicker(opts = {}) {
    pickerActive = false;
    buttonPickerActive = false;
    multiPick = false;
    currentCandidate = null;
    clearHighlight();
    if (!opts.keepFocus) clearFocusMode();
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    document.body.style.cursor = "";
  }

  window.__omniListExtractorCleanup = () => {
    endPicker();
    clearFocusMode();
    highlightEl?.remove();
    tooltipEl?.remove();
    itemOutlineRoot?.remove();
    highlightEl = tooltipEl = itemOutlineRoot = null;
    delete window.__omniListExtractorVersion;
    delete window.__omniListExtractorCleanup;
  };

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg?.type === "OMNI_PING") {
          sendResponse({ ok: true, version: OMNI_VERSION });
          return;
        }
        if (msg?.type === "OMNI_START_LIST_PICKER") {
          startPicker("list", {
            multi: msg.multi !== false,
            keepSelections: !!msg.keepSelections,
          });
          sendResponse({ ok: true, pageScan });
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
        if (msg?.type === "OMNI_FINISH_MULTI_PICK") {
          multiPick = false;
          endPicker({ keepFocus: true });
          sendResponse({ ok: true, selections, count: selections.length });
          return;
        }
        if (msg?.type === "OMNI_FOCUS_SELECTION") {
          if (Array.isArray(msg.selections) && msg.selections.length) {
            selections = msg.selections;
            selection = selections[0] || null;
          }
          applyFocusMode(!!msg.on, selections);
          sendResponse({ ok: true, on: !!msg.on });
          return;
        }
        if (msg?.type === "OMNI_SET_SELECTION") {
          if (Array.isArray(msg.selections)) {
            selections = msg.selections;
            selection = selections[0] || null;
          } else {
            selection = msg.selection;
            selections = selection ? [selection] : [];
          }
          if (pickerActive && multiPick && selections.length) {
            paintAllSelections(`Selected · ${selections.length} block(s)`);
          }
          sendResponse({
            ok: true,
            matched: queryItemsActive("blocks").length,
          });
          return;
        }
        if (msg?.type === "OMNI_STOP_EXTRACT") {
          stopRequested = true;
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "OMNI_RUN_EXTRACT") {
          const mode = msg.mode || msg.paradigm || "blocks";
          if (Array.isArray(msg.selections) && msg.selections.length) {
            selections = msg.selections;
            selection = selections[0];
          } else if (msg.selection) {
            selection = msg.selection;
            selections = [msg.selection];
          }

          if (msg.actionSelector) {
            if (selection) selection.actionSelector = msg.actionSelector;
            selections = selections.map((s) => ({ ...s, actionSelector: msg.actionSelector }));
          }

          const needsBlocks = mode === "blocks" || mode === "block";
          if (needsBlocks && !activeSelections().length) {
            sendResponse({ ok: false, error: "No blocks selected" });
            return;
          }
          if (mode === "filter") {
            const tokens = normalizeFilterTokens(msg.filterTokens);
            if (!tokens.length) {
              sendResponse({ ok: false, error: "Add at least one letter or word filter" });
              return;
            }
          }

          const result = await collectAll(
            mode,
            (count, thumbs, meta) => {
              chrome.runtime.sendMessage({
                type: "OMNI_EXTRACT_PROGRESS",
                count,
                thumbs: thumbs || [],
                pageIndex: meta?.pageIndex,
                pageCount: meta?.pageCount,
              });
            },
            {
              pageLimit: msg.pageLimit,
              pagesAll: msg.pagesAll,
              filterTokens: msg.filterTokens,
            },
          );
          if (result.error) {
            sendResponse({ ok: false, error: result.error });
            return;
          }
          if (Array.isArray(msg.excludeKeys) && msg.excludeKeys.length && Array.isArray(result.rows)) {
            const ex = new Set(msg.excludeKeys);
            result.rows = result.rows.filter((r) => {
              const k = `${r.url || ""}|${r.title || ""}|${r.image || ""}`;
              return !ex.has(k);
            });
          }
          clearFocusMode();
          sendResponse({
            ok: true,
            rows: result.rows,
            pages: result.pages,
            paradigm: result.paradigm,
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
