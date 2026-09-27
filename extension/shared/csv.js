/**
 * CSV + URL helpers shared by the data table.
 * Formula-looking cells are prefixed so spreadsheets treat them as text.
 */
(function initOmniCsv(root) {
  const FORMULA_PREFIX = /^[=+\-@\t\r]/;

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

  function neutralizeFormula(value) {
    const raw = String(value ?? "");
    if (FORMULA_PREFIX.test(raw)) return `'${raw}`;
    return raw;
  }

  function csvCell(value) {
    const safe = neutralizeFormula(value).replaceAll('"', '""');
    return `"${safe}"`;
  }

  function toCsv(rows, columns) {
    const headers = columns.map((column) => column.label);
    const lines = [headers.map(csvCell).join(",")];
    for (const row of rows) {
      const vals = columns.map((column) => csvCell(row[column.key] ?? ""));
      lines.push(vals.join(","));
    }
    return `\uFEFF${lines.join("\n")}`;
  }

  root.OmniCsv = { safeHttpUrl, neutralizeFormula, csvCell, toCsv };
})(globalThis);
