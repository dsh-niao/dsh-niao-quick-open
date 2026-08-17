window.__ModuleLoader__.load({
  id: "dsh-niao-quick-open",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var ROUTE = "/api/dsh-niao-quick-open";
var EDITOR_KEY = "dsh.niao.quickOpen.editor";
function getEditor() {
  try {
    return window.localStorage.getItem(EDITOR_KEY);
  } catch {
    return null;
  }
}
function setEditor(id) {
  try {
    if (id) window.localStorage.setItem(EDITOR_KEY, id);
    else window.localStorage.removeItem(EDITOR_KEY);
  } catch {
  }
}
var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
var isWin = /Windows|Win32|Win64/i.test(navigator.userAgent || "");
function finderLabel() {
  return isWin ? "\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u6253\u5F00" : isMac ? "\u5728\u8BBF\u8FBE\u4E2D\u6253\u5F00" : "\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00";
}
function pickDict(zh) {
  return zh ? {
    finder: finderLabel(),
    openEditor: "\u5E38\u7528\u7F16\u8F91\u5668\u4E2D\u6253\u5F00",
    setEditor: "\u8BBE\u7F6E\u5E38\u7528\u7F16\u8F91\u5668",
    panelTitle: "\u9009\u62E9\u5E38\u7528\u7F16\u8F91\u5668",
    notSet: "\u672A\u8BBE\u7F6E",
    loading: "\u6B63\u5728\u68C0\u7D22\u5DF2\u5B89\u88C5\u7684\u7F16\u8F91\u5668\u2026",
    loadFailed: "\u7F16\u8F91\u5668\u5217\u8868\u52A0\u8F7D\u5931\u8D25: ",
    noneFound: "\u672A\u68C0\u6D4B\u5230\u652F\u6301\u7684\u7F16\u8F91\u5668",
    openFailed: "\u6253\u5F00\u5931\u8D25: ",
    unknown: "\u672A\u77E5\u539F\u56E0",
    noPath: "\u672A\u627E\u5230\u5DE5\u4F5C\u533A\u8DEF\u5F84",
    saved: "\u5DF2\u8BBE\u7F6E\u5E38\u7528\u7F16\u8F91\u5668: ",
    cleared: "\u5DF2\u6E05\u9664\u5E38\u7528\u7F16\u8F91\u5668",
    pleaseSet: "\u8BF7\u5148\u9009\u62E9\u5E38\u7528\u7F16\u8F91\u5668",
    noWorkspace: "\u65E0\u6CD5\u786E\u5B9A\u5DE5\u4F5C\u533A"
  } : {
    finder: finderLabel(),
    openEditor: "Open in Default Editor",
    setEditor: "Set Default Editor",
    panelTitle: "Choose default editor",
    notSet: "Not set",
    loading: "Looking for installed editors\u2026",
    loadFailed: "Failed to load editors: ",
    noneFound: "No supported editors detected",
    openFailed: "Failed to open: ",
    unknown: "unknown reason",
    noPath: "Workspace path not found",
    saved: "Default editor set to: ",
    cleared: "Default editor cleared",
    pleaseSet: "Please choose a default editor first",
    noWorkspace: "Cannot determine workspace"
  };
}
var FOLDER_PATH = "M5.19629 1.57104C5.81144 1.5711 6.38623 1.8786 6.72754 2.39038L7.19922 3.09839C7.28454 3.22635 7.42824 3.30344 7.58203 3.30347H12.1699C13.5039 3.30348 14.5859 4.38548 14.5859 5.71948V6.62671C15.2694 7.02689 15.6605 7.85012 15.4385 8.68726L14.3848 12.658C14.1037 13.7164 13.1449 14.4527 12.0498 14.4529H2.91699C1.51651 14.4529 0.451662 13.2814 0.501954 11.9519V3.98706C0.501954 2.65305 1.58396 1.57104 2.91797 1.57104H5.19629ZM3.7793 7.75562C3.30994 7.75562 2.89883 8.07153 2.77832 8.52515L1.91602 11.7722C1.74167 12.4291 2.23734 13.073 2.91699 13.073H12.0498C12.5191 13.0728 12.9304 12.757 13.0508 12.3035L14.1045 8.33374C14.1819 8.04202 13.9619 7.756 13.6602 7.75562H3.7793ZM2.91797 2.9519C2.34625 2.9519 1.88281 3.41534 1.88281 3.98706V7.2937C2.33068 6.7269 3.02249 6.37476 3.7793 6.37476H13.2051V5.71948C13.2051 5.14777 12.7416 4.68434 12.1699 4.68433H7.58203C6.96675 4.6843 6.39209 4.37595 6.05078 3.86401L5.5791 3.15601C5.49379 3.02821 5.34995 2.95196 5.19629 2.9519H2.91797Z";
var CODE_PATH = "M12.3368 1.53569L11.931 4.43172H14.8086V5.79673H11.7404L11.1962 9.67859H14.2839V11.0436H11.0056L10.4994 14.6529L9.14873 14.4643L9.62731 11.0436H5.75876L5.25252 14.6529L3.90186 14.4643L4.38043 11.0436H1.69141V9.67859H4.57104L5.11417 5.79673H2.21609V4.43172H5.30581L5.73724 1.34713L7.08995 1.53569L6.68414 4.43172H10.5527L10.9841 1.34713L12.3368 1.53569ZM5.94937 9.67859H9.81791L10.361 5.79673H6.49353L5.94937 9.67859Z";
var GEAR_PATH = "M14.0861 5.51366C13.8717 5.0575 13.588 4.58542 13.2889 4.18108C13.208 4.07172 13.1596 4.04373 13.0243 4.03054C12.4277 3.97255 11.8245 4.05527 11.2269 3.9972C10.7224 3.94816 10.3133 3.71661 10.0115 3.30919C9.66986 2.84777 9.43973 2.31343 9.09824 1.85234C9.01771 1.74365 8.96805 1.71589 8.83354 1.70282C8.29432 1.65044 7.70402 1.65061 7.16656 1.70282C7.03205 1.71589 6.98239 1.74365 6.90186 1.85234C6.56067 2.31303 6.33025 2.84774 5.98855 3.30919C5.68681 3.71661 5.27774 3.94816 4.77317 3.9972C4.17564 4.05527 3.57239 3.97255 2.97585 4.03054C2.84046 4.04373 2.79208 4.07172 2.71115 4.18108C2.41212 4.58542 2.12835 5.0575 1.91403 5.51366C1.85299 5.64359 1.85286 5.7018 1.91403 5.8319C2.14865 6.33077 2.49748 6.76892 2.73237 7.26854C2.9594 7.7515 2.96041 8.24717 2.73338 8.73044C2.49837 9.23061 2.14891 9.66837 1.91403 10.1681C1.85291 10.2982 1.85299 10.3564 1.91403 10.4863C2.12856 10.9429 2.41185 11.4142 2.71115 11.8189C2.79208 11.9283 2.84046 11.9563 2.97585 11.9694C3.57239 12.0274 4.17564 11.9447 4.77317 12.0028C5.27774 12.0518 5.68681 12.2834 5.98855 12.6908C6.33024 13.1522 6.56037 13.6866 6.90186 14.1476C6.98239 14.2563 7.03205 14.2841 7.16656 14.2972C7.70402 14.3494 8.29432 14.3495 8.83354 14.2972C8.96805 14.2841 9.01771 14.2563 9.09824 14.1476C9.43944 13.687 9.66985 13.1522 10.0115 12.6908C10.3133 12.2834 10.7224 12.0518 11.2269 12.0028C11.8244 11.9447 12.4271 12.0275 13.0243 11.9694C13.1596 11.9563 13.208 11.9283 13.2889 11.8189C13.5891 11.4131 13.872 10.942 14.0861 10.4863C14.1471 10.3564 14.1472 10.2982 14.0861 10.1681C13.8513 9.66861 13.5017 9.23061 13.2667 8.73044C13.0397 8.24717 13.0407 7.7515 13.2677 7.26854C13.5026 6.7689 13.8513 6.33106 14.0861 5.8319C14.1472 5.7018 14.1471 5.64359 14.0861 5.51366ZM15.3035 6.40373C15.0685 6.90359 14.7188 7.34119 14.4841 7.84037C14.4231 7.97025 14.423 8.02855 14.4841 8.15861C14.7189 8.65833 15.0685 9.09611 15.3035 9.59626C15.5308 10.0801 15.5308 10.5744 15.3035 11.0582C15.052 11.5933 14.7225 12.1426 14.37 12.6191C14.2832 12.731 14.2312 12.7498 14.0992 12.7597C13.4712 12.8065 12.8687 12.8864 12.2448 12.8864C11.6101 12.8864 10.9862 12.8054 10.3748 12.7624C10.2428 12.7526 10.1908 12.7338 10.104 12.6224C9.75092 12.1442 9.48708 11.5933 9.23566 11.0582C9.00835 10.5744 9.00835 10.0801 9.23566 9.59626C9.48708 9.09611 9.75075 8.65833 9.98575 8.15861C10.0468 8.02855 10.0469 7.97025 9.98575 7.84037C9.75075 7.34119 9.48708 6.90359 9.23566 6.40373C9.00835 5.91985 9.00835 5.4255 9.23566 4.94162C9.48708 4.44147 9.75092 3.89217 10.104 3.41567C10.1908 3.30429 10.2428 3.28554 10.3748 3.27568C10.9862 3.23273 11.6101 3.15164 12.2448 3.15164C12.8687 3.15164 13.4712 3.23161 14.0992 3.27845C14.2312 3.28831 14.2832 3.30706 14.37 3.41844C14.7225 3.89494 15.052 4.44424 15.3035 4.94162C15.5308 5.4255 15.5308 5.91985 15.3035 6.40373ZM12.2645 9.74878C13.2286 9.74878 14.0134 8.96408 14.0134 7.99994C14.0134 7.0358 13.2286 6.2511 12.2645 6.2511C11.3004 6.2511 10.5156 7.0358 10.5156 7.99994C10.5156 8.96408 11.3004 9.74878 12.2645 9.74878Z";
var GEAR_INNER = "M9.13764 7.99999C9.13764 7.3715 8.62855 6.8624 8.00005 6.8624C7.37155 6.8624 6.86246 7.3715 6.86246 7.99999C6.86246 8.62849 7.37155 9.13759 8.00005 9.13759C8.62855 9.13759 9.13764 8.62849 9.13764 7.99999ZM10.4834 7.99999C10.4834 9.37126 9.37132 10.4833 8.00005 10.4833C6.62878 10.4833 5.51674 9.37126 5.51674 7.99999C5.51674 6.62873 6.62878 5.51669 8.00005 5.51669C9.37132 5.51669 10.4834 6.62873 10.4834 7.99999Z";
function makeSvg(ds) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  for (const d of ds) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", "currentColor");
    svg.appendChild(p);
  }
  return svg;
}
var folderSvg = makeSvg([FOLDER_PATH]);
var codeSvg = makeSvg([CODE_PATH]);
var gearSvg = makeSvg([GEAR_PATH, GEAR_INNER]);
async function rpc(action, payload) {
  try {
    const res = await fetch(ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await res.json();
    if (data && data.ok) return { ok: true, value: data.value };
    return { ok: false, error: data && data.error && data.error.message || `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
}
var runtimeCtx = null;
var workspaceByTitle = /* @__PURE__ */ new Map();
function buildWorkspaceMap(entries) {
  const map = /* @__PURE__ */ new Map();
  for (const w of entries) {
    if (w && typeof w.title === "string" && typeof w.path === "string" && w.title) {
      if (!map.has(w.title)) map.set(w.title, w.path);
    }
  }
  if (map.size > 0) workspaceByTitle = map;
}
async function refreshWorkspaces() {
  const workspaces = runtimeCtx ? runtimeCtx.get("workspaces") : void 0;
  if (!workspaces) return false;
  try {
    const snapshot = () => {
      const s = workspaces.list.getSnapshot();
      return s && Array.isArray(s.items) ? s.items : [];
    };
    let items = snapshot();
    if (items.length === 0 && typeof workspaces.refresh === "function") {
      try {
        await workspaces.refresh();
      } catch {
      }
      items = snapshot();
    }
    if (items.length === 0) return false;
    buildWorkspaceMap(items.map((w) => ({ title: w.title, path: w.path })));
    return true;
  } catch {
    return false;
  }
}
var WORKSPACE_MARK_TEXTS = /* @__PURE__ */ new Set(["\u5220\u9664\u5DE5\u4F5C\u533A", "Delete workspace"]);
function isWorkspaceMenu(el) {
  if (!el || el.nodeType !== 1 || el.getAttribute("role") !== "menu") return false;
  const items = el.querySelectorAll('[role="menuitem"]');
  for (let i = 0; i < items.length; i++) {
    const text = (items[i].textContent || "").trim();
    if (WORKSPACE_MARK_TEXTS.has(text)) return true;
  }
  return false;
}
function menuLocale(menu) {
  const items = menu.querySelectorAll('[role="menuitem"]');
  for (let i = 0; i < items.length; i++) {
    const text = (items[i].textContent || "").trim();
    if (text === "\u5220\u9664\u5DE5\u4F5C\u533A") return "zh";
  }
  return "en";
}
function findOpenWorkspaceRow() {
  const rows = document.querySelectorAll('[role="treeitem"][class*="menuOpen"]');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.querySelector('[class*="projectText"]')) return row;
  }
  return null;
}
var UNGROUPED_TITLES = /* @__PURE__ */ new Set(["\u672A\u5206\u7EC4", "Ungrouped"]);
function titleFromRow(row) {
  if (!row) return "";
  const project = row.querySelector('[class*="projectText"]');
  let text = "";
  if (project) {
    const title = project.querySelector('[class*="title"]');
    text = ((title ? title.textContent : project.textContent) || "").trim();
  }
  if (!text) text = (row.textContent || "").trim();
  if (UNGROUPED_TITLES.has(text)) return "";
  return text;
}
function resolveWorkspace() {
  const row = findOpenWorkspaceRow();
  const title = titleFromRow(row);
  if (!title) return null;
  return { title, path: workspaceByTitle.get(title) || "" };
}
async function resolveWorkspaceWithPath() {
  const ws = resolveWorkspace();
  if (!ws) return null;
  if (!ws.path) {
    await refreshWorkspaces();
    const path = workspaceByTitle.get(ws.title);
    if (path) ws.path = path;
  }
  return ws;
}
function feedback(container, text, cls) {
  const old = container.querySelector("[data-nio-feedback]");
  if (old) old.remove();
  const chip = document.createElement("div");
  chip.className = "nio-feedback " + (cls || "");
  chip.setAttribute("data-nio-feedback", "1");
  chip.textContent = text;
  container.appendChild(chip);
  window.setTimeout(() => {
    if (chip.isConnected) chip.remove();
  }, 2500);
}
async function workspaceOrFail(block, dict) {
  const ws = await resolveWorkspaceWithPath();
  if (!ws) {
    feedback(block, dict.noWorkspace, "err");
    return null;
  }
  if (!ws.path) {
    feedback(block, dict.noPath, "err");
    return null;
  }
  return ws;
}
async function openInFinder(block, dict) {
  const ws = await workspaceOrFail(block, dict);
  if (!ws) return;
  const res = await rpc("open-in-finder", { cwd: ws.path });
  if (!res.ok) feedback(block, dict.openFailed + res.error, "err");
  else if (res.value && res.value.ok === false) feedback(block, dict.openFailed + dict.unknown, "err");
}
async function openWithEditor(block, dict) {
  const ws = await workspaceOrFail(block, dict);
  if (!ws) return;
  const id = getEditor();
  if (!id) {
    feedback(block, dict.pleaseSet, "");
    showEditorPanel(block, dict);
    return;
  }
  const res = await rpc("open-with-editor", { cwd: ws.path, editorId: id });
  if (!res.ok) feedback(block, dict.openFailed + res.error, "err");
  else if (res.value && (res.value.opened === false || res.value.ok === false)) feedback(block, dict.openFailed + (res.value.reason || dict.unknown), "err");
}
function toggleEditorPanel(block, dict) {
  const old = block.querySelector("[data-nio-editpanel]");
  if (old) {
    old.remove();
    return;
  }
  showEditorPanel(block, dict);
}
function showEditorPanel(block, dict) {
  const panel = document.createElement("div");
  panel.className = "nio-editpanel";
  panel.setAttribute("data-nio-editpanel", "1");
  const head = document.createElement("div");
  head.className = "nio-editpanel-head";
  head.textContent = dict.panelTitle;
  const list = document.createElement("div");
  list.className = "nio-editpanel-list";
  const note = document.createElement("div");
  note.className = "nio-editpanel-note";
  note.textContent = dict.loading;
  panel.appendChild(head);
  panel.appendChild(list);
  panel.appendChild(note);
  block.appendChild(panel);
  loadEditorOptions(list, note, dict);
}
function makeEditorOption(id, name, icon, selected, block, dict) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "nio-editor-opt" + (selected ? " sel" : "");
  row.setAttribute("role", "menuitem");
  if (icon) {
    const img = document.createElement("img");
    img.className = "nio-editor-ico";
    img.src = icon;
    img.alt = "";
    row.appendChild(img);
  } else {
    const dot = document.createElement("span");
    dot.className = "nio-editor-ico nio-editor-ico-empty";
    row.appendChild(dot);
  }
  const label = document.createElement("span");
  label.className = "nio-editor-name";
  label.textContent = name;
  row.appendChild(label);
  if (selected) {
    const check = document.createElement("span");
    check.className = "nio-check";
    check.textContent = "\u2713";
    row.appendChild(check);
  }
  row.addEventListener("click", (e) => {
    e.stopPropagation();
    setEditor(id);
    const panel = block.querySelector("[data-nio-editpanel]");
    if (panel) panel.remove();
    feedback(block, id ? dict.saved + name : dict.cleared, "");
  });
  return row;
}
async function loadEditorOptions(list, note, dict) {
  const res = await rpc("list-editors", {});
  if (!res.ok) {
    note.textContent = dict.loadFailed + res.error;
    note.classList.add("err");
    return;
  }
  const editors = Array.isArray(res.value) ? res.value : [];
  const current = getEditor();
  const panel = note.closest("[data-nio-editpanel]");
  if (!panel) return;
  const block = panel.parentNode;
  list.appendChild(makeEditorOption(null, dict.notSet, null, current === null || current === "", block, dict));
  if (editors.length === 0) {
    note.textContent = dict.noneFound;
    return;
  }
  note.textContent = "";
  for (const ed of editors) {
    if (!ed || typeof ed.id !== "string") continue;
    list.appendChild(makeEditorOption(ed.id, ed.name || ed.id, ed.icon || null, current === ed.id, block, dict));
  }
}
function makeMenuBlock(menu, dict) {
  const block = document.createElement("div");
  block.className = "nio-mblock";
  block.setAttribute("data-nio-mblock", "1");
  const sep = document.createElement("div");
  sep.className = "nio-msep";
  sep.setAttribute("role", "separator");
  block.appendChild(sep);
  const mkItem = (label, icon, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nio-mitem";
    btn.setAttribute("role", "menuitem");
    btn.appendChild(icon.cloneNode(true));
    const span = document.createElement("span");
    span.className = "nio-mitem-label";
    span.textContent = label;
    btn.appendChild(span);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  };
  block.appendChild(mkItem(dict.finder, folderSvg, () => openInFinder(block, dict)));
  block.appendChild(mkItem(dict.openEditor, codeSvg, () => openWithEditor(block, dict)));
  block.appendChild(mkItem(dict.setEditor, gearSvg, () => toggleEditorPanel(block, dict)));
  return block;
}
function enhanceMenu(menu) {
  if (menu.dataset.nioBound && menu.querySelector("[data-nio-mblock]")) return;
  menu.dataset.nioBound = "1";
  const dict = pickDict(menuLocale(menu) === "zh");
  const block = makeMenuBlock(menu, dict);
  const viewport = menu.querySelector('[role="presentation"]') || menu;
  viewport.appendChild(block);
}
function scan() {
  const menus = document.querySelectorAll('[role="menu"]');
  for (let i = 0; i < menus.length; i++) {
    const el = menus[i];
    if (el.dataset.nioBound && el.querySelector("[data-nio-mblock]")) continue;
    if (isWorkspaceMenu(el)) {
      try {
        enhanceMenu(el);
      } catch {
      }
    }
  }
}
var scanScheduled = false;
function scheduleScan() {
  if (scanScheduled) return;
  scanScheduled = true;
  window.requestAnimationFrame(() => {
    scanScheduled = false;
    scan();
  });
}
var CSS = `
.nio-msep{height:1px;background:var(--dsw-alias-border-l2,rgba(255,255,255,0.1));margin:4px 8px}
.nio-mitem{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;padding:6px 12px;border:none;background:transparent;color:var(--dsw-alias-label-primary,#e6e8eb);border-radius:6px;cursor:pointer;text-align:left;font-size:13px;line-height:18px;font-family:inherit}
.nio-mitem:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.08))}
.nio-mitem svg{flex:none}
.nio-mitem-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nio-editpanel{border-top:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,0.1));margin:4px 8px 0;padding-top:6px;max-height:240px;overflow-y:auto}
.nio-editpanel-head{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#9aa1a9);padding:0 4px 4px}
.nio-editpanel-list{display:flex;flex-direction:column;gap:1px}
.nio-editor-opt{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;padding:5px 10px;border:none;background:transparent;color:var(--dsw-alias-label-primary,#e6e8eb);border-radius:6px;cursor:pointer;text-align:left;font-size:13px;line-height:18px;font-family:inherit}
.nio-editor-opt:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.08))}
.nio-editor-opt.sel{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.1))}
.nio-editor-ico{width:18px;height:18px;border-radius:4px;flex:none;object-fit:contain}
.nio-editor-ico-empty{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,0.15));border-radius:50%}
.nio-editor-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nio-check{color:var(--dsw-alias-state-business-primary,#6c8cff);flex:none;font-size:12px;line-height:18px}
.nio-editpanel-note{font-size:11px;color:var(--dsw-alias-label-tertiary,#9aa1a9);padding:4px}
.nio-editpanel-note.err{color:var(--dsw-alias-state-error-primary,#ff8f8f)}
.nio-feedback{font-size:11px;line-height:16px;color:#b8f0c4;text-align:center;padding:4px 8px}
.nio-feedback.err{color:#ff8f8f}
`;
var inject = ["workspaces"];
function apply(ctx) {
  runtimeCtx = ctx;
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.setAttribute("data-plugin", "dsh-niao-quick-open");
    tag.setAttribute("data-plugin-css", "dsh-niao-quick-open");
    tag.textContent = CSS;
    document.head.append(tag);
    return () => tag.remove();
  }, "dsh-niao-quick-open: styles");
  ctx.effect(() => {
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => observer.disconnect();
  }, "dsh-niao-quick-open: observer");
  ctx.effect(() => {
    refreshWorkspaces();
    return () => {
    };
  }, "dsh-niao-quick-open: workspace catalog");
}
    return module.exports;
  }
});
