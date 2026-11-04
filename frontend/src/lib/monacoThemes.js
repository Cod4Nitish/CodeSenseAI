/**
 * Custom Monaco themes, one per palette/mode (kept AA-legible).
 * by Nitish Kumar Singh
 */
export const MONACO_LIGHT = "codesense-light";
export const MONACO_DARK = "codesense-dark";

/** Monaco theme id for the active palette + resolved mode. */
export function monacoThemeName(palette, isDark) {
  if (palette === "pastel") return isDark ? MONACO_DARK : MONACO_LIGHT;
  if (palette === "lofi") return isDark ? "codesense-lofi-dark" : "codesense-lofi-light";
  if (palette === "graphite") return "codesense-graphite";
  if (palette === "paper") return "codesense-paper";
  if (palette === "arctic") return "codesense-arctic";
  return isDark ? MONACO_DARK : MONACO_LIGHT;
}

/** spec: bg, fg, gutter, active, line, sel, cursor, widget, indent, kw, str, num, type, com, delim, err, warn, info */
function make(base, s) {
  return {
    base,
    inherit: true,
    rules: [
      { token: "comment", foreground: s.com, fontStyle: "italic" },
      { token: "keyword", foreground: s.kw },
      { token: "string", foreground: s.str },
      { token: "number", foreground: s.num },
      { token: "type", foreground: s.type },
      { token: "identifier", foreground: s.fg },
      { token: "delimiter", foreground: s.delim },
    ],
    colors: {
      "editor.background": "#" + s.bg,
      "editor.foreground": "#" + s.fg,
      "editorLineNumber.foreground": "#" + s.gutter,
      "editorLineNumber.activeForeground": "#" + s.active,
      "editor.lineHighlightBackground": "#" + s.line,
      "editor.selectionBackground": "#" + s.sel,
      "editorCursor.foreground": "#" + s.cursor,
      "editorIndentGuide.background1": "#" + s.indent,
      "editorError.foreground": "#" + s.err,
      "editorWarning.foreground": "#" + s.warn,
      "editorInfo.foreground": "#" + s.info,
      "diffEditor.insertedTextBackground": "#" + s.info + "33",
      "diffEditor.removedTextBackground": "#" + s.err + "33",
      "diffEditor.insertedLineBackground": "#" + s.info + "1a",
      "diffEditor.removedLineBackground": "#" + s.err + "1a",
      "editorWidget.background": "#" + s.widget,
      "editorGutter.background": "#" + s.bg,
    },
  };
}

const SPECS = {
  "codesense-light": ["vs", { bg: "fffdfb", fg: "3a2e4f", gutter: "7b6f92", active: "6c4fd6", line: "fff4ec", sel: "d9cffa", cursor: "6c4fd6", widget: "ffffff", indent: "f0e2d8", kw: "6c4fd6", str: "b02f62", num: "a24a00", type: "0f6d63", com: "6e6385", delim: "6b5d85", err: "d03a5a", warn: "c27500", info: "17704f" }],
  "codesense-dark": ["vs-dark", { bg: "1e1a2e", fg: "eee7fb", gutter: "8f84b0", active: "b4a0ff", line: "262040", sel: "4a3f7a", cursor: "ffb3c7", widget: "2a2440", indent: "2f2850", kw: "c4b5ff", str: "ffb3c7", num: "ffcf8a", type: "9be8c4", com: "9d92bd", delim: "bfb3dc", err: "ff9eb0", warn: "ffcf8a", info: "9be8c4" }],
  "codesense-lofi-light": ["vs", { bg: "fcfbf7", fg: "1a1a1a", gutter: "6a6a72", active: "2b3bff", line: "f2efe8", sel: "c9cdff", cursor: "2b3bff", widget: "ffffff", indent: "e8e3d8", kw: "2331e6", str: "9d1f78", num: "864c00", type: "1f6b3a", com: "5f5f68", delim: "55555e", err: "b3261e", warn: "864c00", info: "1f6b3a" }],
  "codesense-lofi-dark": ["vs-dark", { bg: "0d0d17", fg: "ececf5", gutter: "8d8dab", active: "ff8ad8", line: "171726", sel: "34346a", cursor: "ff8ad8", widget: "1d1d2c", indent: "232336", kw: "98a1ff", str: "ff9fe0", num: "ffb454", type: "6ee7b0", com: "9494b2", delim: "a8a8c4", err: "ff8a9a", warn: "ffb454", info: "6ee7b0" }],
  "codesense-graphite": ["vs-dark", { bg: "0c0c0f", fg: "d6d6dc", gutter: "8a8a96", active: "c4f82a", line: "141418", sel: "3a4a10", cursor: "c4f82a", widget: "1a1a1f", indent: "1c1c22", kw: "fafafa", str: "c4f82a", num: "ffb224", type: "7fc8ff", com: "8a8a96", delim: "a0a0ab", err: "ff6b6b", warn: "ffb224", info: "4fd6a0" }],
  "codesense-paper": ["vs", { bg: "fcfbf8", fg: "25272c", gutter: "5e626b", active: "b8340f", line: "f1efe8", sel: "f3d3c8", cursor: "b8340f", widget: "ffffff", indent: "e2ded3", kw: "101216", str: "1f6b3a", num: "864c00", type: "1d4f86", com: "5e626b", delim: "565a63", err: "b3261e", warn: "864c00", info: "1f6b3a" }],
  "codesense-arctic": ["vs", { bg: "f4fafc", fg: "12304f", gutter: "435d77", active: "05626f", line: "e6f2f6", sel: "bfe3ea", cursor: "05626f", widget: "ffffff", indent: "d3e8ef", kw: "05626f", str: "14693f", num: "7f4c00", type: "214f9c", com: "435d77", delim: "38546e", err: "a8252a", warn: "7f4c00", info: "14693f" }],
};

export function defineThemes(monaco) {
  Object.entries(SPECS).forEach(([name, [base, s]]) => monaco.editor.defineTheme(name, make(base, s)));
}
