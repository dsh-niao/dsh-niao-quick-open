window.__ModuleLoader__.load({
  id: "dsh-niao-quick-open",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);
var ROUTE = "/api/dsh-niao-quick-open";
var EDITOR_KEY = "dsh.niao.quickOpen.editor";
var pluginConfig = { enabled: true, editor: "", showRestart: true, menuQuickActions: false, sessionDoneMark: false };
var configBaseline = null;
var runtimeCtx = null;
async function refreshConfig() {
  const res = await rpc("get-config");
  if (res.ok && res.value && res.value.config) {
    if (configBaseline === null) configBaseline = { ...res.value.config };
    applyConfigPatch(res.value.config);
    return true;
  }
  return false;
}
var RESTART_REQUIRED_KEYS = [];
function configDirty() {
  if (!configBaseline) return false;
  for (const key of RESTART_REQUIRED_KEYS) {
    if (pluginConfig[key] !== configBaseline[key]) return true;
  }
  return false;
}
function applyConfigPatch(next) {
  const changed = next && (typeof next.enabled === "boolean" || typeof next.editor === "string" || typeof next.showRestart === "boolean" || typeof next.menuQuickActions === "boolean" || typeof next.sessionDoneMark === "boolean");
  if (next && typeof next.enabled === "boolean") pluginConfig.enabled = next.enabled;
  if (next && typeof next.editor === "string") pluginConfig.editor = next.editor;
  if (next && typeof next.showRestart === "boolean") pluginConfig.showRestart = next.showRestart;
  if (next && typeof next.menuQuickActions === "boolean") pluginConfig.menuQuickActions = next.menuQuickActions;
  if (next && typeof next.sessionDoneMark === "boolean") pluginConfig.sessionDoneMark = next.sessionDoneMark;
  if (changed) {
    try {
      ensureHeaderRow();
    } catch {
    }
    try {
      ensureRestartButton();
    } catch {
    }
    try {
      ensureSessionDoneDots();
    } catch {
    }
  }
}
function getEditor() {
  return pluginConfig.editor || "";
}
async function setEditor(id) {
  const editor = id || "";
  pluginConfig.editor = editor;
  await rpc("set-config", { config: { editor } });
}
async function migrateLegacyEditor() {
  if (pluginConfig.editor) return;
  let legacy = "";
  try {
    legacy = window.localStorage.getItem(EDITOR_KEY) || "";
  } catch {
  }
  if (!legacy) return;
  await setEditor(legacy);
  try {
    window.localStorage.removeItem(EDITOR_KEY);
  } catch {
  }
}
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
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  } catch {
    return false;
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
    openFailed: "\u6253\u5F00\u5931\u8D25: ",
    unknown: "\u672A\u77E5\u539F\u56E0",
    pleaseSet: "\u8BF7\u5148\u5728\u8BBE\u7F6E-\u754C\u9762\u529F\u80FD-\u5DE5\u4F5C\u533A\u5FEB\u6377\u6309\u94AE\u4E2D\u8FDB\u884C\u5E38\u7528\u7F16\u8F91\u5668\u7684\u914D\u7F6E",
    copyTip: "\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84",
    copied: "\u5DF2\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84"
  } : {
    finder: finderLabel(),
    openEditor: "Open in Default Editor",
    openFailed: "Failed to open: ",
    unknown: "unknown reason",
    pleaseSet: "Please configure a default editor under Settings \u2192 UI Features \u2192 Workspace quick buttons first",
    copyTip: "Copy absolute path",
    copied: "Absolute path copied"
  };
}
var FOLDER_PATH = "M5.19629 1.57104C5.81144 1.5711 6.38623 1.8786 6.72754 2.39038L7.19922 3.09839C7.28454 3.22635 7.42824 3.30344 7.58203 3.30347H12.1699C13.5039 3.30348 14.5859 4.38548 14.5859 5.71948V6.62671C15.2694 7.02689 15.6605 7.85012 15.4385 8.68726L14.3848 12.658C14.1037 13.7164 13.1449 14.4527 12.0498 14.4529H2.91699C1.51651 14.4529 0.451662 13.2814 0.501954 11.9519V3.98706C0.501954 2.65305 1.58396 1.57104 2.91797 1.57104H5.19629ZM3.7793 7.75562C3.30994 7.75562 2.89883 8.07153 2.77832 8.52515L1.91602 11.7722C1.74167 12.4291 2.23734 13.073 2.91699 13.073H12.0498C12.5191 13.0728 12.9304 12.757 13.0508 12.3035L14.1045 8.33374C14.1819 8.04202 13.9619 7.756 13.6602 7.75562H3.7793ZM2.91797 2.9519C2.34625 2.9519 1.88281 3.41534 1.88281 3.98706V7.2937C2.33068 6.7269 3.02249 6.37476 3.7793 6.37476H13.2051V5.71948C13.2051 5.14777 12.7416 4.68434 12.1699 4.68433H7.58203C6.96675 4.6843 6.39209 4.37595 6.05078 3.86401L5.5791 3.15601C5.49379 3.02821 5.34995 2.95196 5.19629 2.9519H2.91797Z";
var CODE_PATH = "M12.3368 1.53569L11.931 4.43172H14.8086V5.79673H11.7404L11.1962 9.67859H14.2839V11.0436H11.0056L10.4994 14.6529L9.14873 14.4643L9.62731 11.0436H5.75876L5.25252 14.6529L3.90186 14.4643L4.38043 11.0436H1.69141V9.67859H4.57104L5.11417 5.79673H2.21609V4.43172H5.30581L5.73724 1.34713L7.08995 1.53569L6.68414 4.43172H10.5527L10.9841 1.34713L12.3368 1.53569ZM5.94937 9.67859H9.81791L10.361 5.79673H6.49353L5.94937 9.67859Z";
var COPY_PATH = "M6.14929 4.02032C7.11197 4.02032 7.87983 4.02016 8.49597 4.07598C9.12128 4.13269 9.65792 4.25188 10.1415 4.53106C10.7202 4.8653 11.2008 5.3459 11.535 5.92462C11.8142 6.40818 11.9334 6.94481 11.9901 7.57012C12.0459 8.18625 12.0458 8.95419 12.0458 9.9168C12.0458 10.8795 12.0459 11.6473 11.9901 12.2635C11.9334 12.8888 11.8142 13.4254 11.535 13.909C11.2008 14.4877 10.7202 14.9683 10.1415 15.3025C9.65792 15.5817 9.12128 15.7009 8.49597 15.7576C7.87984 15.8134 7.11196 15.8133 6.14929 15.8133C5.18667 15.8133 4.41874 15.8134 3.80261 15.7576C3.1773 15.7009 2.64067 15.5817 2.1571 15.3025C1.5784 14.9683 1.09778 14.4877 0.76355 13.909C0.484366 13.4254 0.365184 12.8888 0.308472 12.2635C0.252649 11.6473 0.252808 10.8795 0.252808 9.9168C0.252808 8.95418 0.252664 8.18625 0.308472 7.57012C0.365184 6.94481 0.484366 6.40818 0.76355 5.92462C1.09777 5.34589 1.57839 4.86529 2.1571 4.53106C2.64067 4.25188 3.1773 4.13269 3.80261 4.07598C4.41874 4.02017 5.18666 4.02032 6.14929 4.02032ZM6.14929 5.37774C5.16181 5.37774 4.46634 5.37761 3.92566 5.42657C3.39434 5.47472 3.07859 5.56574 2.83582 5.70587C2.4632 5.92106 2.15354 6.2307 1.93835 6.60333C1.79823 6.8461 1.70721 7.16185 1.65906 7.69317C1.6101 8.23385 1.61023 8.92933 1.61023 9.9168C1.61023 10.9043 1.61009 11.5998 1.65906 12.1404C1.70721 12.6717 1.79823 12.9875 1.93835 13.2303C2.15356 13.6029 2.46321 13.9126 2.83582 14.1277C3.07859 14.2679 3.39434 14.3589 3.92566 14.407C4.46634 14.456 5.16182 14.4559 6.14929 14.4559C7.13682 14.4559 7.83224 14.456 8.37292 14.407C8.90425 14.3589 9.21999 14.2679 9.46277 14.1277C9.83535 13.9126 10.145 13.6029 10.3602 13.2303C10.5004 12.9875 10.5914 12.6717 10.6395 12.1404C10.6885 11.5998 10.6884 10.9043 10.6884 9.9168C10.6884 8.92934 10.6885 8.23384 10.6395 7.69317C10.5914 7.16185 10.5004 6.8461 10.3602 6.60333C10.1451 6.23071 9.83536 5.92107 9.46277 5.70587C9.21999 5.56574 8.90424 5.47472 8.37292 5.42657C7.83224 5.3776 7.13682 5.37774 6.14929 5.37774ZM9.80164 0.367975C10.7638 0.367975 11.5314 0.367958 12.1476 0.423777C12.7729 0.480489 13.3095 0.599671 13.7931 0.878855C14.3718 1.21309 14.8524 1.6937 15.1866 2.27241C15.4658 2.75597 15.585 3.29261 15.6417 3.91791C15.6975 4.53405 15.6974 5.30198 15.6974 6.2646C15.6974 7.22721 15.6975 7.99514 15.6417 8.61128C15.585 9.23659 15.4658 9.77322 15.1866 10.2568C14.8524 10.8355 14.3718 11.3161 13.7931 11.6503C13.3095 11.9295 12.7729 12.0487 12.1476 12.1054C11.5314 12.1612 10.7638 12.1611 9.80164 12.1611C8.83902 12.1611 8.0711 12.1612 7.45497 12.1054C6.82966 12.0487 6.29303 11.9295 5.80946 11.6503C5.23075 11.3161 4.75015 10.8355 4.41592 10.2568C4.13674 9.77322 4.01756 9.23659 3.96084 8.61128C3.90502 7.99515 3.90518 7.22722 3.90518 6.2646C3.90518 5.30198 3.90502 4.53404 3.96084 3.91791C4.01756 3.29261 4.13674 2.75597 4.41592 2.27241C4.75015 1.6937 5.23077 1.21309 5.80946 0.878855C6.29303 0.599671 6.82966 0.480489 7.45497 0.423777C8.0711 0.367957 8.83903 0.367975 9.80164 0.367975ZM9.80164 1.72539C8.81416 1.72539 8.1187 1.72526 7.57802 1.77422C7.0467 1.82237 6.73095 1.91339 6.48818 2.05352C6.11555 2.26871 5.8059 2.57835 5.59071 2.95098C5.45059 3.19375 5.35957 3.5095 5.31142 4.04082C5.26246 4.5815 5.26259 5.27698 5.26259 6.2646C5.26259 7.25208 5.26245 7.94755 5.31142 8.48807C5.35957 9.01939 5.45059 9.33514 5.59071 9.57791C5.8059 9.95053 6.11555 10.2602 6.48818 10.4754C6.73095 10.6155 7.0467 10.7065 7.57802 10.7547C8.1187 10.8036 8.81417 10.8035 9.80164 10.8035C10.7891 10.8035 11.4846 10.8037 12.0253 10.7547C12.5566 10.7065 12.8723 10.6155 13.1151 10.4754C13.4877 10.2602 13.7974 9.95053 14.0126 9.57791C14.1527 9.33514 14.2437 9.01939 14.2919 8.48807C14.3409 7.94755 14.3407 7.25207 14.3407 6.2646C14.3407 5.27712 14.3409 4.58164 14.2919 4.04082C14.2437 3.5095 14.1527 3.19375 14.0126 2.95098C13.7974 2.57836 13.4877 2.26871 13.1151 2.05352C12.8723 1.91339 12.5566 1.82237 12.0253 1.77422C11.4846 1.72526 10.7891 1.72539 9.80164 1.72539Z";
function makeSvg(shapes, viewBox = "0 0 16 16", stroke = false) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("fill", "none");
  if (stroke) {
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }
  for (const shape of shapes) {
    if (typeof shape === "string") {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", shape);
      p.setAttribute("fill", "currentColor");
      svg.appendChild(p);
    } else if (shape.circle) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", String(shape.circle.cx));
      c.setAttribute("cy", String(shape.circle.cy));
      c.setAttribute("r", String(shape.circle.r));
      svg.appendChild(c);
    } else {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", shape.d);
      svg.appendChild(p);
    }
  }
  return svg;
}
var folderSvg = makeSvg([FOLDER_PATH]);
var codeSvg = makeSvg([CODE_PATH]);
var copySvg = makeSvg([COPY_PATH]);
var restartSvg = makeSvg([
  { circle: { cx: 12, cy: 12, r: 10 } },
  { d: "M12 7v4" },
  { d: "M7.998 9.003a5 5 0 1 0 8-.005" }
], "0 0 24 24", true);
function sessionsService() {
  return runtimeCtx ? runtimeCtx.get("sessions") : void 0;
}
function currentSession() {
  const sessions = sessionsService();
  if (!sessions) return null;
  try {
    const list = sessions.list.getSnapshot();
    const id = list.current;
    if (!id || !list.byId) return null;
    const s = list.byId[id];
    if (!s) return null;
    return {
      cwd: typeof s.cwd === "string" ? s.cwd : "",
      displayTitle: typeof s.displayTitle === "string" ? s.displayTitle : ""
    };
  } catch {
    return null;
  }
}
function folderName(cwd) {
  if (!cwd) return "";
  return cwd.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || cwd;
}
function findSessionHeader() {
  const crumbs = document.querySelector('nav[class*="crumbs"]');
  if (!crumbs) return null;
  const header = crumbs.closest("header");
  if (!header || header.hasAttribute("aria-hidden")) return null;
  return header;
}
function headerLocale(header) {
  const crumbs = header.querySelector('[class*="crumbs"]');
  const label = crumbs ? crumbs.getAttribute("aria-label") || "" : "";
  return /[\u4e00-\u9fff]/.test(label) ? "zh" : "en";
}
function headerFeedback(row, text, cls) {
  const old = row.querySelector("[data-nio-hfeed]");
  if (old) old.remove();
  const chip = document.createElement("span");
  chip.className = "nio-hfeed " + (cls || "");
  chip.setAttribute("data-nio-hfeed", "1");
  chip.textContent = text;
  row.appendChild(chip);
  window.setTimeout(() => {
    if (chip.isConnected) chip.remove();
  }, 2500);
}
async function copyWorkspacePath(row, path, dict) {
  if (!path) return;
  const ok = await copyText(path);
  if (ok) headerFeedback(row, dict.copied, "");
}
async function revealInFinder(row, path, dict) {
  if (!path) return;
  const res = await rpc("open-in-finder", { cwd: path });
  if (!res.ok) headerFeedback(row, dict.openFailed + res.error, "err");
  else if (res.value && res.value.ok === false) headerFeedback(row, dict.openFailed + dict.unknown, "err");
}
async function openCwdWithEditor(row, path, dict, pickerBtn) {
  if (!path) return;
  const id = getEditor();
  if (!id) {
    headerFeedback(row, dict.pleaseSet, "");
    return;
  }
  const res = await rpc("open-with-editor", { cwd: path, editorId: id });
  if (!res.ok) headerFeedback(row, dict.openFailed + res.error, "err");
  else if (res.value && (res.value.opened === false || res.value.ok === false)) headerFeedback(row, dict.openFailed + (res.value.reason || dict.unknown), "err");
}
function buildHeaderRow(folder, path, dict) {
  const row = document.createElement("div");
  row.className = "nio-hrow";
  row.setAttribute("data-nio-hrow", "1");
  const chip = document.createElement("span");
  chip.className = "nio-hchip";
  chip.textContent = folder;
  chip.title = path;
  row.appendChild(chip);
  const mkBtn = (tip, icon, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nio-hbtn";
    btn.setAttribute("aria-label", tip);
    const tipEl = document.createElement("span");
    tipEl.className = "nio-htip";
    tipEl.textContent = tip;
    btn.appendChild(icon.cloneNode(true));
    btn.appendChild(tipEl);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  };
  row.appendChild(mkBtn(dict.copyTip, copySvg, () => copyWorkspacePath(row, path, dict)));
  row.appendChild(mkBtn(dict.finder, folderSvg, () => revealInFinder(row, path, dict)));
  const codeBtn = mkBtn(dict.openEditor, codeSvg, () => openCwdWithEditor(row, path, dict, codeBtn));
  row.appendChild(codeBtn);
  return row;
}
function ensureHeaderRow() {
  if (!pluginConfig.enabled) {
    const header2 = findSessionHeader();
    const row2 = header2 ? header2.querySelector("[data-nio-hrow]") : null;
    if (row2) row2.remove();
    return;
  }
  const header = findSessionHeader();
  const session = currentSession();
  const row = header ? header.querySelector("[data-nio-hrow]") : null;
  if (!header || !session || !session.cwd) {
    if (row) row.remove();
    return;
  }
  const folder = folderName(session.cwd);
  const key = folder + "\0" + session.cwd;
  if (row && row.dataset.nioKey === key) return;
  if (row) row.remove();
  const dict = pickDict(headerLocale(header) === "zh");
  const fresh = buildHeaderRow(folder, session.cwd, dict);
  fresh.dataset.nioKey = key;
  const titleRow = header.querySelector('[class*="titleRow"]');
  header.insertBefore(fresh, titleRow || header.firstChild);
}
function workspacePathMap() {
  const workspaces = runtimeCtx ? runtimeCtx.get("workspaces") : void 0;
  const map = /* @__PURE__ */ new Map();
  if (!workspaces) return map;
  try {
    const items = workspaces.list.getSnapshot().items;
    for (const w of items) {
      if (w && typeof w.title === "string" && typeof w.path === "string" && w.title && !map.has(w.title)) {
        map.set(w.title, w.path);
      }
    }
  } catch {
  }
  return map;
}
var WORKSPACE_MENU_MARK = /* @__PURE__ */ new Set(["\u5220\u9664\u5DE5\u4F5C\u533A", "Delete workspace"]);
function isWorkspaceMenu(el) {
  if (!el || el.nodeType !== 1 || el.getAttribute("role") !== "menu") return false;
  const items = el.querySelectorAll('[role="menuitem"]');
  for (const item of items) {
    if (WORKSPACE_MENU_MARK.has((item.textContent || "").trim())) return true;
  }
  return false;
}
function workspaceMenuLocale(menu) {
  const items = menu.querySelectorAll('[role="menuitem"]');
  for (const item of items) {
    if ((item.textContent || "").trim() === "\u5220\u9664\u5DE5\u4F5C\u533A") return "zh";
  }
  return "en";
}
function openWorkspaceRowTitle() {
  const rows = document.querySelectorAll('[role="treeitem"][class*="menuOpen"]');
  for (const row of rows) {
    if (!row.className || !row.className.toString().includes("projectRow")) continue;
    const project = row.querySelector('[class*="projectText"]');
    let text = "";
    if (project) {
      const title = project.querySelector('[class*="title"]');
      text = ((title ? title.textContent : project.textContent) || "").trim();
    }
    if (!text) text = (row.textContent || "").trim();
    if (text) return text;
  }
  return "";
}
function ensureWorkspaceMenuActions() {
  const injected = document.querySelectorAll("[data-nio-mqa]");
  if (!pluginConfig.menuQuickActions) {
    for (const el of injected) el.remove();
    return;
  }
  const menus = document.querySelectorAll('[role="menu"]');
  for (const menu of menus) {
    if (!isWorkspaceMenu(menu) || menu.querySelector("[data-nio-mqa]")) continue;
    const dict = pickDict(workspaceMenuLocale(menu) === "zh");
    const title = openWorkspaceRowTitle();
    if (!title) continue;
    const path = workspacePathMap().get(title) || "";
    if (!path) continue;
    menu.setAttribute("data-nio-mqa-menu", "1");
    const row = document.createElement("div");
    row.className = "nio-mqa";
    row.setAttribute("data-nio-mqa", "1");
    const mkBtn = (tip, icon, onClick) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nio-mqa-btn";
      btn.setAttribute("aria-label", tip);
      const tipEl = document.createElement("span");
      tipEl.className = "nio-mqa-tip";
      tipEl.textContent = tip;
      btn.appendChild(icon.cloneNode(true));
      btn.appendChild(tipEl);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
      return btn;
    };
    const mkFeedback = () => {
      const chip = document.createElement("span");
      chip.className = "nio-mqa-feedback";
      chip.setAttribute("data-nio-mqa-feedback", "1");
      row.appendChild(chip);
      return chip;
    };
    row.appendChild(mkBtn(dict.copyTip, copySvg, async () => {
      const ok = await copyText(path);
      const chip = mkFeedback();
      chip.textContent = ok ? dict.copied : dict.openFailed + dict.unknown;
      window.setTimeout(() => {
        if (chip.isConnected) chip.remove();
      }, 1800);
    }));
    row.appendChild(mkBtn(dict.finder, folderSvg, async () => {
      const res = await rpc("open-in-finder", { cwd: path });
      const chip = mkFeedback();
      if (!res.ok) chip.textContent = dict.openFailed + res.error;
      else if (res.value && res.value.ok === false) chip.textContent = dict.openFailed + dict.unknown;
      chip.classList.toggle("err", !(res.ok && res.value && res.value.ok !== false));
      window.setTimeout(() => {
        if (chip.isConnected) chip.remove();
      }, 1800);
    }));
    row.appendChild(mkBtn(dict.openEditor, codeSvg, async () => {
      const id = getEditor();
      const chip = mkFeedback();
      if (!id) {
        chip.textContent = dict.pleaseSet;
        chip.classList.add("err");
      } else {
        const res = await rpc("open-with-editor", { cwd: path, editorId: id });
        if (!res.ok) chip.textContent = dict.openFailed + res.error;
        else if (res.value && (res.value.opened === false || res.value.ok === false)) chip.textContent = dict.openFailed + (res.value.reason || dict.unknown);
      }
      window.setTimeout(() => {
        if (chip.isConnected) chip.remove();
      }, 1800);
    }));
    menu.appendChild(row);
  }
}
var DONE_IDS_KEY = "dsh.niao.quickOpen.doneSessionIds";
function readDoneIds() {
  try {
    const raw = window.localStorage.getItem(DONE_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}
function writeDoneIds(ids) {
  try {
    window.localStorage.setItem(DONE_IDS_KEY, JSON.stringify(ids));
  } catch {
  }
}
function doneSessionIdSet() {
  return new Set(readDoneIds());
}
function setSessionDone(id, done) {
  const ids = readDoneIds();
  const set = new Set(ids);
  if (done) set.add(id);
  else set.delete(id);
  writeDoneIds([...set]);
  try {
    ensureSessionDoneDots();
  } catch {
  }
}
function sessionSnapshotRows() {
  const sessions = runtimeCtx ? runtimeCtx.get("sessions") : void 0;
  if (!sessions) return [];
  try {
    const snapshot = sessions.list.getSnapshot();
    const byId = snapshot && snapshot.byId ? snapshot.byId : {};
    const ids = snapshot && Array.isArray(snapshot.ids) ? snapshot.ids : [];
    const out = [];
    for (const id of ids) {
      const s = byId[id];
      if (!s) continue;
      out.push({
        id,
        displayTitle: typeof s.displayTitle === "string" ? s.displayTitle : "",
        running: !!s.running,
        pending: !!s.pendingInteraction,
        completed: !!s.completed,
        blank: !!s.blank
      });
    }
    return out;
  } catch {
    return [];
  }
}
function sessionRowTitle(row) {
  const titleEl = row.querySelector('[class*="title"]');
  return ((titleEl ? titleEl.textContent : row.textContent) || "").trim();
}
function mapSessionRowsToIds(rows) {
  const sessions = sessionSnapshotRows();
  const out = /* @__PURE__ */ new Map();
  if (sessions.length === 0 || rows.length === 0) return out;
  if (rows.length === sessions.length) {
    for (let i = 0; i < rows.length; i++) out.set(rows[i], sessions[i].id);
    return out;
  }
  const byTitle = /* @__PURE__ */ new Map();
  for (const s of sessions) {
    const key = s.displayTitle || s.id;
    const list = byTitle.get(key) || [];
    list.push(s.id);
    byTitle.set(key, list);
  }
  for (const row of rows) {
    const title = sessionRowTitle(row);
    if (!title) continue;
    const candidates = byTitle.get(title);
    if (!candidates || candidates.length === 0) continue;
    out.set(row, candidates.shift());
  }
  return out;
}
function isIdleSession(s) {
  return !s.running && !s.pending && !s.completed && !s.blank;
}
var lastClearedSessionId = null;
function clearDoneOnOpen() {
  const sessions = runtimeCtx ? runtimeCtx.get("sessions") : void 0;
  if (!sessions) return;
  let current = null;
  try {
    current = sessions.list.getSnapshot().current || null;
  } catch {
    return;
  }
  if (!current || current === lastClearedSessionId) return;
  lastClearedSessionId = current;
  if (doneSessionIdSet().has(current)) setSessionDone(current, false);
}
var nativeDotClass = "";
function findNativeDotClass() {
  if (nativeDotClass) return nativeDotClass;
  try {
    const el = document.querySelector("span[data-state]");
    if (el && el.className && typeof el.className === "string") nativeDotClass = el.className;
  } catch {
  }
  return nativeDotClass;
}
function ensureSessionDoneDots() {
  const injected = document.querySelectorAll("[data-nio-sdone]");
  if (!pluginConfig.sessionDoneMark) {
    for (const el of injected) el.remove();
    return;
  }
  const marked = doneSessionIdSet();
  const rows = Array.from(document.querySelectorAll('[class*="sessionRow"]'));
  const idByRow = mapSessionRowsToIds(rows);
  const stateById = new Map(sessionSnapshotRows().map((s) => [s.id, s]));
  const nativeClass = findNativeDotClass();
  for (const row of rows) {
    const existing = row.querySelector("[data-nio-sdone]");
    const sessionId = idByRow.get(row);
    if (!sessionId) {
      if (existing) existing.remove();
      continue;
    }
    const s = stateById.get(sessionId);
    const userMarked = marked.has(sessionId);
    const idle = s ? isIdleSession(s) : false;
    if (!idle) {
      if (existing) existing.remove();
      continue;
    }
    let slot = null;
    for (const child of row.children) {
      if (child.classList && child.className.toString().includes("slot")) {
        slot = child;
        break;
      }
    }
    if (existing) {
      if (existing.dataset.nioSid && existing.dataset.nioSid !== sessionId) {
        existing.remove();
        continue;
      }
      existing.classList.toggle("nio-sdone-marked", userMarked);
      existing.setAttribute("aria-label", userMarked ? "\u5DF2\u5B8C\u6210" : "\u8BBE\u4E3A\u5F85\u529E");
      const tip2 = existing.querySelector(".nio-sdone-tip");
      if (tip2) tip2.textContent = userMarked ? "\u5DF2\u5B8C\u6210" : "\u8BBE\u4E3A\u5F85\u529E";
      continue;
    }
    if (slot && slot.querySelector("[data-state]")) continue;
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "nio-sdone" + (userMarked ? " nio-sdone-marked" : "");
    dot.setAttribute("data-nio-sdone", "1");
    dot.setAttribute("data-nio-sid", sessionId);
    dot.setAttribute("aria-label", userMarked ? "\u5DF2\u5B8C\u6210" : "\u8BBE\u4E3A\u5F85\u529E");
    const inner = document.createElement("span");
    inner.className = (nativeClass ? nativeClass + " " : "") + "nio-sdone-dot";
    inner.style.width = "10px";
    inner.style.height = "10px";
    const vh = document.createElement("span");
    vh.className = "nio-sdone-vh";
    vh.textContent = userMarked ? "\u5DF2\u5B8C\u6210" : "\u8BBE\u4E3A\u5F85\u529E";
    const tip = document.createElement("span");
    tip.className = "nio-sdone-tip";
    tip.textContent = userMarked ? "\u5DF2\u5B8C\u6210" : "\u8BBE\u4E3A\u5F85\u529E";
    dot.appendChild(inner);
    dot.appendChild(vh);
    dot.appendChild(tip);
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      const sid = dot.dataset.nioSid || sessionId;
      const nowMarked = doneSessionIdSet().has(sid);
      setSessionDone(sid, !nowMarked);
    });
    if (slot) slot.appendChild(dot);
    else row.insertBefore(dot, row.firstChild);
  }
}
var lastMsgCache = /* @__PURE__ */ new Map();
var LAST_MSG_TTL = 6e4;
var PREVIEW_MAX_LEN = 300;
var lastMsgPending = /* @__PURE__ */ new Set();
var lastMsgInflight = /* @__PURE__ */ new Set();
var lastMsgFetching = false;
function workspaceTitleBySession() {
  const out = /* @__PURE__ */ new Map();
  const workspaces = runtimeCtx ? runtimeCtx.get("workspaces") : void 0;
  if (!workspaces) return out;
  try {
    const items = workspaces.list.getSnapshot().items;
    for (const w of items) {
      if (!w || !Array.isArray(w.sessionIds) || typeof w.title !== "string" || !w.title) continue;
      for (const sid of w.sessionIds) if (!out.has(sid)) out.set(sid, w.title);
    }
  } catch {
  }
  return out;
}
function relativeTimeLabel(time, now) {
  const MIN = 6e4;
  const HOUR = 36e5;
  const DAY = 864e5;
  const diff = Math.max(0, now - time);
  if (diff < MIN) return "\u521A\u521A";
  if (diff < HOUR) return Math.floor(diff / MIN) + "\u5206\u949F";
  if (diff < DAY) return Math.floor(diff / HOUR) + "\u5C0F\u65F6";
  if (diff < 30 * DAY) return Math.floor(diff / DAY) + "\u5929";
  if (diff < 365 * DAY) return Math.floor(diff / (30 * DAY)) + "\u4E2A\u6708";
  return Math.floor(diff / (365 * DAY)) + "\u5E74";
}
function normalizePreviewText(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > PREVIEW_MAX_LEN ? t.slice(0, PREVIEW_MAX_LEN) + "\u2026" : t;
}
function markFlatRowChildren(row) {
  const kids = { slot: null, title: null, time: null, actions: null };
  for (const child of row.children) {
    const cls = child.className && typeof child.className === "string" ? child.className : "";
    if (!kids.slot && cls.indexOf("slot") !== -1) {
      kids.slot = child;
      child.classList.add("nio-flat-slot");
      continue;
    }
    if (!kids.title && cls.indexOf("title") !== -1) {
      kids.title = child;
      child.classList.add("nio-flat-title");
      continue;
    }
    if (!kids.time && cls.indexOf("time") !== -1) {
      kids.time = child;
      child.classList.add("nio-flat-time");
      continue;
    }
    if (!kids.actions && cls.indexOf("rowActions") !== -1) {
      kids.actions = child;
      child.classList.add("nio-flat-actions");
      continue;
    }
  }
  return kids;
}
function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
function setAttr(el, name, value) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}
function blockFlatRowHoverCard(row) {
  if (row.dataset.nioFlatPvh === "1") return;
  row.dataset.nioFlatPvh = "1";
  const root = row.parentElement;
  if (root && root !== row) {
    root.addEventListener("pointerenter", (e) => e.stopImmediatePropagation(), true);
  }
}
function sweepFlatHoverCards() {
  const flat = document.querySelector('[class*="flatList"]');
  if (!flat) return;
  const contents = document.querySelectorAll('[class*="hoverContent"]');
  for (const content of contents) {
    let el = content;
    while (el && el !== document.body) {
      if (el.parentElement === document.body && el.getAttribute("role") === "button") {
        el.remove();
        break;
      }
      el = el.parentElement;
    }
  }
}
function renderFlatRow(row, sessionId, info, wsMap) {
  row.setAttribute("data-nio-flat", "1");
  row.classList.add("nio-flat-row");
  const kids = markFlatRowChildren(row);
  blockFlatRowHoverCard(row);
  const hasStatus = !!(kids.slot && kids.slot.children.length > 0);
  const hasDot = !!row.querySelector("[data-nio-sdone]");
  row.classList.toggle("nio-flat-has-status", hasStatus);
  row.classList.toggle("nio-flat-has-dot", hasDot);
  let chip = row.querySelector("[data-nio-fchip]");
  if (!chip) {
    chip = document.createElement("span");
    chip.className = "nio-hchip nio-fchip";
    chip.setAttribute("data-nio-fchip", "1");
    row.insertBefore(chip, kids.title || row.children[1] || null);
  }
  const wsTitle = wsMap && wsMap.get(sessionId) || "";
  setText(chip, wsTitle || "\u672A\u5206\u7EC4");
  setAttr(chip, "title", wsTitle);
  let preview = row.querySelector("[data-nio-fprev]");
  if (!preview) {
    preview = document.createElement("span");
    preview.className = "nio-fprev";
    preview.setAttribute("data-nio-fprev", "1");
    row.appendChild(preview);
  }
  if (info) {
    setText(preview, normalizePreviewText(info.text));
    setAttr(preview, "title", String(info.text || ""));
    if (info.time > 0) {
      const timeEl = row.querySelector('[class*="time"]');
      if (timeEl) setText(timeEl, relativeTimeLabel(info.time, Date.now()));
    }
  } else {
    setText(preview, "");
    setAttr(preview, "title", "");
  }
}
async function fetchLastMessages() {
  if (lastMsgFetching) return;
  lastMsgFetching = true;
  const ids = [...lastMsgPending].slice(0, 100);
  lastMsgPending.clear();
  if (ids.length === 0) {
    lastMsgFetching = false;
    return;
  }
  for (const id of ids) lastMsgInflight.add(id);
  try {
    const res = await rpc("list-last-user-messages", { sessionIds: ids });
    const now = Date.now();
    const items = res.ok && res.value && Array.isArray(res.value.items) ? res.value.items : [];
    for (const item of items) {
      if (!item || typeof item.sessionId !== "string") continue;
      lastMsgCache.set(item.sessionId, {
        text: String(item.text || ""),
        time: typeof item.time === "number" ? item.time : now,
        at: now
      });
    }
    for (const id of ids) {
      if (!lastMsgCache.has(id)) lastMsgCache.set(id, { text: "", time: 0, at: now });
    }
    const list = document.querySelector('[class*="flatList"]');
    if (list) {
      const rows = Array.from(list.querySelectorAll('[class*="sessionRow"]'));
      const idByRow = mapSessionRowsToIds(rows);
      const wsMap = workspaceTitleBySession();
      for (const row of rows) {
        const sessionId = idByRow.get(row);
        if (!sessionId) continue;
        const cached = lastMsgCache.get(sessionId);
        if (cached) renderFlatRow(row, sessionId, cached, wsMap);
      }
    }
  } catch {
    const now = Date.now();
    for (const id of ids) {
      if (!lastMsgCache.has(id)) lastMsgCache.set(id, { text: "", time: 0, at: now });
    }
  } finally {
    for (const id of ids) lastMsgInflight.delete(id);
    lastMsgFetching = false;
    if (lastMsgPending.size > 0) fetchLastMessages();
  }
}
function ensureFlatEnhance() {
  const list = document.querySelector('[class*="flatList"]');
  if (!list) return;
  const rows = Array.from(list.querySelectorAll('[class*="sessionRow"]'));
  if (rows.length === 0) return;
  const idByRow = mapSessionRowsToIds(rows);
  const stateById = new Map(sessionSnapshotRows().map((s) => [s.id, s]));
  const wsMap = workspaceTitleBySession();
  const now = Date.now();
  for (const row of rows) {
    const sessionId = idByRow.get(row);
    if (!sessionId) continue;
    const s = stateById.get(sessionId);
    if (s && s.blank) continue;
    const cached = lastMsgCache.get(sessionId);
    if (cached && now - cached.at <= LAST_MSG_TTL) {
      renderFlatRow(row, sessionId, cached, wsMap);
    } else if (!lastMsgInflight.has(sessionId)) {
      lastMsgPending.add(sessionId);
      renderFlatRow(row, sessionId, null, wsMap);
    } else {
      renderFlatRow(row, sessionId, null, wsMap);
    }
  }
  if (lastMsgPending.size > 0) fetchLastMessages();
}
function ConfigPanel() {
  const [state, setState] = import_react.default.useState(null);
  const [editors, setEditors] = import_react.default.useState([]);
  const [loadError, setLoadError] = import_react.default.useState("");
  const [dirty, setDirty] = import_react.default.useState(configDirty());
  import_react.default.useEffect(() => {
    let alive = true;
    Promise.all([rpc("get-config"), rpc("list-editors")]).then(([configRes, editorsRes]) => {
      if (!alive) return;
      if (configRes.ok && configRes.value && configRes.value.config) {
        if (configBaseline === null) configBaseline = { ...configRes.value.config };
        setState(configRes.value.config);
        applyConfigPatch(configRes.value.config);
        setDirty(configDirty());
      } else {
        setLoadError(configRes.error || "\u914D\u7F6E\u8BFB\u53D6\u5931\u8D25");
      }
      if (editorsRes.ok && Array.isArray(editorsRes.value)) setEditors(editorsRes.value);
    });
    return () => {
      alive = false;
    };
  }, []);
  const save = (patch) => {
    rpc("set-config", { config: patch }).then((res) => {
      if (res.ok && res.value && res.value.config) {
        setState(res.value.config);
        applyConfigPatch(res.value.config);
        setDirty(configDirty());
      }
    });
  };
  if (loadError) {
    return import_react.default.createElement("div", { className: "nio-settings-error" }, loadError);
  }
  if (!state) {
    return import_react.default.createElement("div", { className: "nio-settings-note" }, "\u52A0\u8F7D\u4E2D\u2026");
  }
  return import_react.default.createElement(
    "div",
    { className: "nio-settings" },
    // 顶部固定横幅（高度恒定，不随 dirty 变化而伸缩）：
    // 左右两侧 flex 纵向居中：左侧两行（标题「温馨提示」+ 提示内容），
    // 右侧预留盒子（dirty 时显示「重启以生效」按钮）。
    import_react.default.createElement(
      "div",
      {
        className: "nio-settings-banner" + (dirty ? " nio-settings-banner-warn" : ""),
        "aria-live": "polite"
      },
      import_react.default.createElement(
        "div",
        { className: "nio-settings-banner-main" },
        import_react.default.createElement("div", { className: "nio-settings-banner-title" }, "\u6E29\u99A8\u63D0\u793A"),
        import_react.default.createElement(
          "div",
          { className: "nio-settings-banner-text" },
          dirty ? "\u6709\u914D\u7F6E\u4FEE\u6539\u9700\u8981\u91CD\u542F\u624D\u80FD\u751F\u6548" : "\u90E8\u5206\u914D\u7F6E\u4FEE\u6539\u540E\uFF0C\u9700\u91CD\u542F\u670D\u52A1\u624D\u80FD\u751F\u6548"
        )
      ),
      import_react.default.createElement(
        "div",
        { className: "nio-settings-banner-side" },
        dirty && import_react.default.createElement("button", {
          type: "button",
          className: "nio-settings-banner-btn",
          onClick: () => showRestartConfirm({
            title: "\u91CD\u542F\u4EE5\u751F\u6548",
            desc: "\u5373\u5C06\u786C\u6027\u91CD\u542F DeepSeek Harness \u670D\u52A1\uFF0C\u4EE5\u4F7F\u672C\u6B21\u4FEE\u6539\u751F\u6548\u3002\u6240\u6709\u6B63\u5728\u8FD0\u884C\u7684\u4F1A\u8BDD\u4F1A\u6682\u65F6\u4E2D\u65AD\uFF0C\u670D\u52A1\u5173\u95ED\u540E\u4EE5\u76F8\u540C\u65B9\u5F0F\u91CD\u65B0\u542F\u52A8\uFF0C\u9875\u9762\u4F1A\u81EA\u52A8\u6062\u590D\u3002",
            okText: "\u91CD\u542F"
          })
        }, "\u91CD\u542F\u4EE5\u751F\u6548")
      )
    ),
    // 「工作区快捷按钮」组：开关 + 其子项「常用编辑器」（缩进）。
    import_react.default.createElement(
      "div",
      { className: "nio-settings-group" },
      import_react.default.createElement(
        "div",
        { className: "nio-settings-row" },
        import_react.default.createElement(
          "div",
          { className: "nio-settings-text" },
          import_react.default.createElement("div", { className: "nio-settings-title" }, "\u5DE5\u4F5C\u533A\u5FEB\u6377\u6309\u94AE"),
          import_react.default.createElement("div", { className: "nio-settings-desc" }, "\u5728\u4F1A\u8BDD\u533A\u57DF\u9876\u90E8\u663E\u793A\u5DE5\u4F5C\u533A\u6587\u4EF6\u5939\u540D\u4E0E\u5FEB\u6377\u64CD\u4F5C\u6309\u94AE\uFF08\u590D\u5236\u8DEF\u5F84 / \u8BBF\u8FBE\u663E\u793A / \u7F16\u8F91\u5668\u6253\u5F00\uFF09")
        ),
        import_react.default.createElement(
          "label",
          { className: "nio-settings-toggle" },
          import_react.default.createElement("input", {
            type: "checkbox",
            checked: !!state.enabled,
            onChange: (e) => save({ enabled: e.target.checked })
          }),
          import_react.default.createElement("span", { className: "nio-settings-toggle-track" }, null)
        )
      ),
      // 子项：常用编辑器（随主开关禁用）
      import_react.default.createElement(
        "div",
        { className: "nio-settings-sub" },
        import_react.default.createElement(
          "div",
          { className: "nio-settings-text" },
          import_react.default.createElement("div", { className: "nio-settings-title" }, "\u5E38\u7528\u7F16\u8F91\u5668"),
          import_react.default.createElement("div", { className: "nio-settings-desc" }, "\u300C\u5E38\u7528\u7F16\u8F91\u5668\u4E2D\u6253\u5F00\u300D\u4F7F\u7528\u7684\u7F16\u8F91\u5668\uFF0C\u9009\u62E9\u540E\u7ACB\u5373\u751F\u6548")
        ),
        import_react.default.createElement(
          "select",
          {
            className: "nio-settings-select",
            value: state.editor || "",
            disabled: !state.enabled,
            onChange: (e) => save({ editor: e.target.value })
          },
          import_react.default.createElement("option", { value: "", key: "" }, "\u672A\u8BBE\u7F6E"),
          editors.map((ed) => import_react.default.createElement("option", { value: ed.id, key: ed.id }, ed.name || ed.id))
        )
      ),
      // 子项：工作区行菜单快捷按钮（随主开关禁用）
      import_react.default.createElement(
        "div",
        { className: "nio-settings-sub" },
        import_react.default.createElement(
          "div",
          { className: "nio-settings-text" },
          import_react.default.createElement("div", { className: "nio-settings-title" }, "\u5DE5\u4F5C\u533A\u884C\u83DC\u5355\u5FEB\u6377\u6309\u94AE"),
          import_react.default.createElement("div", { className: "nio-settings-desc" }, "\u5728\u5DE5\u4F5C\u533A\u300C\u22EF\u300D\u83DC\u5355\u4E2D\u5C55\u793A\u4E00\u884C\u5FEB\u6377\u6309\u94AE\uFF08\u590D\u5236\u8DEF\u5F84 / \u8BBF\u8FBE\u663E\u793A / \u7F16\u8F91\u5668\u6253\u5F00\uFF09")
        ),
        import_react.default.createElement(
          "label",
          { className: "nio-settings-toggle" },
          import_react.default.createElement("input", {
            type: "checkbox",
            checked: !!state.menuQuickActions,
            disabled: !state.enabled,
            onChange: (e) => save({ menuQuickActions: e.target.checked })
          }),
          import_react.default.createElement("span", { className: "nio-settings-toggle-track" }, null)
        )
      )
    ),
    // 「会话待办标记」组（与「工作区快捷按钮」同级）：空闲会话前的标记圆点开关。
    import_react.default.createElement(
      "div",
      { className: "nio-settings-group" },
      import_react.default.createElement(
        "div",
        { className: "nio-settings-row" },
        import_react.default.createElement(
          "div",
          { className: "nio-settings-text" },
          import_react.default.createElement("div", { className: "nio-settings-title" }, "\u4F1A\u8BDD\u5F85\u529E\u6807\u8BB0"),
          import_react.default.createElement("div", { className: "nio-settings-desc" }, "\u5728\u7A7A\u95F2\u4F1A\u8BDD\u524D\u663E\u793A\u53EF\u70B9\u51FB\u7684\u6807\u8BB0\u5706\u70B9\uFF0C\u5C06\u5176\u6807\u8BB0\u4E3A\u5DF2\u5B8C\u6210")
        ),
        import_react.default.createElement(
          "label",
          { className: "nio-settings-toggle" },
          import_react.default.createElement("input", {
            type: "checkbox",
            checked: !!state.sessionDoneMark,
            onChange: (e) => save({ sessionDoneMark: e.target.checked })
          }),
          import_react.default.createElement("span", { className: "nio-settings-toggle-track" }, null)
        )
      )
    ),
    // 「重启按钮」组（与「工作区快捷按钮」同级）：开关控制左下角按钮是否显示。
    import_react.default.createElement(
      "div",
      { className: "nio-settings-group" },
      import_react.default.createElement(
        "div",
        { className: "nio-settings-row" },
        import_react.default.createElement(
          "div",
          { className: "nio-settings-text" },
          import_react.default.createElement("div", { className: "nio-settings-title" }, "\u91CD\u542F\u6309\u94AE"),
          import_react.default.createElement("div", { className: "nio-settings-desc" }, "\u5728\u754C\u9762\u5DE6\u4E0B\u89D2\u8BBE\u7F6E\u6309\u94AE\u53F3\u4FA7\u663E\u793A\u300C\u786C\u6027\u91CD\u542F\u300D\u6309\u94AE")
        ),
        import_react.default.createElement(
          "label",
          { className: "nio-settings-toggle" },
          import_react.default.createElement("input", {
            type: "checkbox",
            checked: !!state.showRestart,
            onChange: (e) => save({ showRestart: e.target.checked })
          }),
          import_react.default.createElement("span", { className: "nio-settings-toggle-track" }, null)
        )
      )
    )
  );
}
function findSettingsArea() {
  const bySlot = document.querySelector('[data-slot="sidebar.settings"]');
  if (bySlot) return bySlot;
  const byClass = document.querySelector('[class*="settingsArea"]');
  if (byClass) return byClass;
  const trigger = document.querySelector('button[aria-haspopup="dialog"]');
  return trigger && trigger.parentElement ? trigger.parentElement : null;
}
function ensureRestartButton() {
  const existing = document.querySelector("[data-nio-rst]");
  if (!pluginConfig.showRestart) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;
  const area = findSettingsArea();
  if (!area) {
    if (window.console) console.warn("[dsh-niao-quick-open] \u672A\u627E\u5230\u8BBE\u7F6E\u533A\u951A\u70B9\uFF08sidebar.settings slot\uFF09");
    return;
  }
  if (area.closest('[class*="collapsed"]')) return;
  const layout = area.closest('[class*="settingsArea"]') || area;
  layout.classList.add("nio-rst-area");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nio-rst";
  btn.setAttribute("data-nio-rst", "1");
  btn.setAttribute("aria-label", "\u786C\u6027\u91CD\u542F");
  const tip = document.createElement("span");
  tip.className = "nio-rst-tip";
  tip.textContent = "\u786C\u6027\u91CD\u542F";
  btn.appendChild(restartSvg.cloneNode(true));
  btn.appendChild(tip);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    showRestartConfirm();
  });
  area.appendChild(btn);
  if (window.console) console.log("[dsh-niao-quick-open] \u91CD\u542F\u6309\u94AE\u5DF2\u6CE8\u5165", area.tagName, (area.className || "").toString().slice(0, 80));
}
var restartOverlay = null;
function closeRestartOverlay() {
  if (!restartOverlay) return;
  if (typeof restartOverlay._nioCleanup === "function") restartOverlay._nioCleanup();
  restartOverlay.remove();
  restartOverlay = null;
}
function showRestartConfirm(opts) {
  if (restartOverlay) closeRestartOverlay();
  const text = opts || {};
  const overlay = document.createElement("div");
  overlay.className = "nio-confirm";
  overlay.setAttribute("data-nio-confirm", "1");
  const dialog = document.createElement("div");
  dialog.className = "nio-confirm-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "nio-confirm-title");
  const title = document.createElement("div");
  title.className = "nio-confirm-title";
  title.id = "nio-confirm-title";
  title.textContent = text.title || "\u91CD\u542F DeepSeek Harness\uFF1F";
  const desc = document.createElement("div");
  desc.className = "nio-confirm-desc";
  desc.textContent = text.desc || "\u5C06\u786C\u6027\u91CD\u542F DeepSeek Harness \u670D\u52A1\uFF1A\u6240\u6709\u6B63\u5728\u8FD0\u884C\u7684\u4F1A\u8BDD\u4F1A\u6682\u65F6\u4E2D\u65AD\uFF0C\u670D\u52A1\u5173\u95ED\u540E\u4EE5\u76F8\u540C\u65B9\u5F0F\u91CD\u65B0\u542F\u52A8\uFF0C\u9875\u9762\u4F1A\u81EA\u52A8\u6062\u590D\u3002";
  const actions = document.createElement("div");
  actions.className = "nio-confirm-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "nio-confirm-btn";
  cancel.textContent = "\u53D6\u6D88";
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "nio-confirm-btn nio-confirm-danger";
  ok.textContent = text.okText || "\u786E\u8BA4\u91CD\u542F";
  actions.appendChild(cancel);
  actions.appendChild(ok);
  dialog.appendChild(title);
  dialog.appendChild(desc);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  const onKey = (e) => {
    if (e.key === "Escape") closeRestartOverlay();
  };
  const onDown = (e) => {
    if (e.target === overlay) closeRestartOverlay();
  };
  cancel.addEventListener("click", () => closeRestartOverlay());
  ok.addEventListener("click", () => {
    closeRestartOverlay();
    doRestart();
  });
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("pointerdown", onDown);
  overlay._nioCleanup = () => {
    document.removeEventListener("keydown", onKey);
    overlay.removeEventListener("pointerdown", onDown);
  };
  document.body.appendChild(overlay);
  restartOverlay = overlay;
  ok.focus();
}
async function doRestart() {
  showRebootWait(false);
  try {
    await rpc("restart");
  } catch {
  }
  const started = Date.now();
  const timer = window.setInterval(async () => {
    let alive = false;
    try {
      const res = await rpc("ping");
      alive = res.ok;
    } catch {
    }
    if (alive) {
      window.clearInterval(timer);
      window.location.reload();
      return;
    }
    if (Date.now() - started > 3e4) {
      window.clearInterval(timer);
      showRebootWait(true);
    }
  }, 700);
}
function showRebootWait(failed) {
  if (restartOverlay) closeRestartOverlay();
  const overlay = document.createElement("div");
  overlay.className = "nio-reboot";
  overlay.setAttribute("data-nio-reboot", "1");
  if (!failed) {
    const spinner = document.createElement("div");
    spinner.className = "nio-reboot-spinner";
    const text = document.createElement("div");
    text.className = "nio-reboot-text";
    text.textContent = "\u6B63\u5728\u91CD\u542F DeepSeek Harness\u2026";
    overlay.appendChild(spinner);
    overlay.appendChild(text);
  } else {
    const text = document.createElement("div");
    text.className = "nio-reboot-text";
    text.textContent = "\u91CD\u542F\u4F3C\u4E4E\u672A\u5B8C\u6210\uFF0C\u8BF7\u624B\u52A8\u5237\u65B0\u9875\u9762\u3002";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "nio-confirm-btn nio-confirm-primary";
    retry.textContent = "\u5237\u65B0\u9875\u9762";
    retry.addEventListener("click", () => window.location.reload());
    overlay.appendChild(text);
    overlay.appendChild(retry);
  }
  document.body.appendChild(overlay);
  restartOverlay = overlay;
}
function scan() {
  try {
    ensureHeaderRow();
  } catch {
  }
  try {
    ensureRestartButton();
  } catch {
  }
  try {
    ensureWorkspaceMenuActions();
  } catch {
  }
  try {
    clearDoneOnOpen();
  } catch {
  }
  try {
    ensureSessionDoneDots();
  } catch {
  }
  try {
    ensureFlatEnhance();
  } catch {
  }
  try {
    sweepFlatHoverCards();
  } catch {
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
/* \u5168\u90E8\u4F7F\u7528 DSH \u4E3B\u9898\u8BED\u4E49\u53D8\u91CF\uFF08--dsw-alias-*\uFF09\uFF0C\u968F\u4EAE/\u6697\u4E3B\u9898\u81EA\u52A8\u5207\u6362 */
/* \u4F1A\u8BDD header\uFF08wSkVaW_header \u4E3A\u539F\u751F\u7C7B\u540D\uFF09\uFF1A\u6536\u7D27\u9876\u90E8\u7559\u767D */
.wSkVaW_header{padding-top:5px !important}
/* \u4F1A\u8BDD header \u5DE5\u4F5C\u533A\u884C\uFF08\u7B2C\u4E00\u884C\uFF09 */
.nio-hrow{box-sizing:border-box;display:flex;align-items:center;gap:6px;min-height:20px;margin:0 0 2px;padding:2px 10px 2px 2px;background:var(--dsw-alias-interactive-bg-hover);border-radius:12px;width:fit-content;max-width:100%}
.nio-hchip{box-sizing:border-box;flex:none;max-width:260px;padding:1px 8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 30%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent);color:var(--dsw-alias-state-business-primary);font-size:11px;line-height:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nio-hbtn{position:relative;cursor:pointer;width:18px;height:18px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:4px;padding:0;display:inline-flex;align-items:center;justify-content:center}
.nio-hbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nio-hbtn svg{display:block;width:14px;height:14px}
.nio-htip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-hbtn:hover .nio-htip{opacity:1}
.nio-hfeed{font-size:11px;line-height:16px;color:var(--dsw-alias-state-success-primary);padding:0 2px;white-space:nowrap}
.nio-hfeed.err{color:var(--dsw-alias-state-error-primary)}
/* \u4F1A\u8BDD\u540D\uFF08\u7B2C\u4E8C\u884C\uFF09\u653E\u5927 */
[class*="crumbCurrent"]{font-size:19px !important;line-height:27px !important;max-width:none !important;font-weight:600 !important}
/* \u5DE5\u4F5C\u533A\u300C\u22EF\u300D\u83DC\u5355\uFF1A\u5FEB\u6377\u6309\u94AE\u884C\uFF08\u6302\u5728 list \u672B\u5C3E\u3001viewport \u6EDA\u52A8\u5BB9\u5668\u5916\uFF09 */
[data-nio-mqa-menu]{overflow:visible !important}
[data-nio-mqa-menu] > [role="presentation"]{max-height:none !important;overflow:visible !important}
.nio-mqa{box-sizing:border-box;display:flex;align-items:center;gap:4px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2);margin-top:2px}
.nio-mqa-btn{position:relative;width:22px;height:22px;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:5px;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.nio-mqa-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nio-mqa-btn svg{display:block;width:14px;height:14px}
.nio-mqa-tip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-mqa-btn:hover .nio-mqa-tip{opacity:1}
.nio-mqa-feedback{font-size:11px;line-height:16px;color:var(--dsw-alias-state-success-primary);margin-left:2px;white-space:nowrap}
.nio-mqa-feedback.err{color:var(--dsw-alias-state-error-primary)}
/* \u4F1A\u8BDD\u5F85\u529E\u6807\u8BB0\u5706\u70B9\uFF1A\u5B8C\u6574\u590D\u523B\u539F\u751F _dot_10orb_3\uFF08span \u900F\u660E + :before \u6655\u5708 + :after \u5185\u82AF\uFF0CcurrentColor \u7740\u8272\uFF09 */
.nio-sdone{position:relative;box-sizing:border-box;flex:none;width:16px;height:20px;border:none;background:transparent;padding:0;margin:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dsw-alias-label-tertiary)}
/* \u5185\u5C42\u5706\u70B9\uFF1A\u4E0E\u539F\u751F\u89C4\u5219\u4E00\u81F4\uFF08position:relative + :before/:after \u53CC\u5C42\u5706\uFF09\uFF0C\u4EC5\u989C\u8272\u4E0D\u540C */
.nio-sdone-dot{position:relative;display:inline-block;flex:none;width:10px;height:10px;box-sizing:border-box;opacity:0 !important;transition:opacity .12s ease,color .15s ease !important;color:var(--dsw-alias-label-tertiary) !important}
.nio-sdone-dot:before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:currentColor;opacity:.1}
.nio-sdone-dot:after{content:"";position:absolute;top:20%;right:20%;bottom:20%;left:20%;border-radius:50%;background:currentColor}
[class*="sessionRow"]:hover .nio-sdone .nio-sdone-dot{opacity:.8 !important}
.nio-sdone:hover .nio-sdone-dot{opacity:1 !important}
.nio-sdone-marked .nio-sdone-dot{opacity:1 !important;color:var(--dsw-alias-state-success-primary) !important}
.nio-sdone-vh{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}
.nio-sdone-tip{position:absolute;bottom:calc(100% + 6px);left:0;white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-sdone:hover .nio-sdone-tip{opacity:1}
/* \u5355\u5217\u8868\uFF08flat\uFF09\u4F1A\u8BDD\u884C\uFF1A\u4E09\u884C\u5E03\u5C40\uFF08\u7B2C\u4E00\u884C \u72B6\u6001\u56FE\u6807+chip+\u65F6\u95F4 / \u7B2C\u4E8C\u884C\u6807\u9898 / \u7B2C\u4E09\u884C\u9884\u89C8\uFF09 */
.nio-flat-row{height:auto !important;min-height:82px;box-sizing:border-box;display:grid !important;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:auto auto auto;column-gap:6px;row-gap:1px;align-items:center;padding:7px 8px !important}
/* \u65E0\u524D\u7F6E\u56FE\u6807\uFF08\u9ED8\u8BA4\uFF09\uFF1Achip \u8DE8\u524D\u4E24\u5217\u3001time/actions \u5728\u6700\u53F3\u5217 */
.nio-flat-slot{grid-column:1;grid-row:1;align-self:center;justify-self:center;min-width:0}
.nio-flat-chip{grid-column:1 / 3;grid-row:1;align-self:center;justify-self:start;min-width:0}
.nio-fchip{max-width:180px;font-size:11px;line-height:16px}
.nio-flat-time{grid-column:3;grid-row:1;align-self:center;justify-self:end;min-width:0;white-space:nowrap}
.nio-flat-title{grid-column:1 / 3;grid-row:2;align-self:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:20px}
.nio-flat-actions{grid-column:3;grid-row:2;align-self:center;justify-self:end}
.nio-fprev{grid-column:1 / 4;grid-row:3;align-self:start;min-width:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default}
/* \u6709\u539F\u751F\u72B6\u6001\u56FE\u6807\uFF08\u8FD0\u884C/\u7B49\u5F85/\u5B8C\u6210\u63D0\u9192\uFF09\uFF1A\u56FE\u6807\u5360\u7B2C\u4E00\u5217\uFF0Cchip/\u6807\u9898\u540E\u79FB\u4E00\u5217 */
.nio-flat-has-status .nio-flat-slot{grid-column:1;grid-row:1}
.nio-flat-has-status .nio-flat-chip{grid-column:2}
.nio-flat-has-status .nio-flat-title{grid-column:2}
.nio-flat-has-status .nio-flat-time{grid-column:3}
.nio-flat-has-status .nio-flat-actions{grid-column:3}
.nio-flat-has-status .nio-fprev{grid-column:2 / 4}
/* \u6709\u5F85\u529E\u5706\u70B9\uFF08\u7A7A\u95F2\u4F1A\u8BDD\u88AB\u6807\u8BB0\uFF09\uFF1A\u5706\u70B9\u5360\u7B2C\u4E00\u5217\uFF0C\u5176\u4F59\u540E\u79FB\uFF08\u4E0E\u539F\u751F\u56FE\u6807\u76F8\u540C\u5E03\u5C40\uFF09 */
.nio-flat-has-dot .nio-sdone{grid-column:1;grid-row:1;align-self:center;justify-self:center}
.nio-flat-has-dot .nio-flat-chip{grid-column:2}
.nio-flat-has-dot .nio-flat-title{grid-column:2}
.nio-flat-has-dot .nio-flat-time{grid-column:3}
.nio-flat-has-dot .nio-flat-actions{grid-column:3}
.nio-flat-has-dot .nio-fprev{grid-column:2 / 4}
/* \u8BBE\u7F6E\u9762\u677F\u300C\u754C\u9762\u529F\u80FD\u300D\u9875 */
.nio-settings{display:flex;flex-direction:column;max-width:640px}
/* \u9876\u90E8\u300C\u914D\u7F6E\u72B6\u6001\u300D\u56FA\u5B9A\u6A2A\u5E45\uFF1A\u59CB\u7EC8\u6E32\u67D3\uFF08\u9AD8\u5EA6\u6052\u5B9A\uFF09\uFF0Cdirty \u53EA\u5207\u6362\u989C\u8272\u4E0E\u6309\u94AE */
.nio-settings-banner{box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px;margin:12px 0 4px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 92%,transparent);transition:border-color .2s ease,background-color .2s ease}
/* \u5DE6\u4FA7\uFF1A\u4E0A\u4E0B\u4E24\u884C\uFF08\u6807\u9898 + \u63D0\u793A\u5185\u5BB9\uFF09 */
.nio-settings-banner-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.nio-settings-banner-title{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:600;line-height:18px}
.nio-settings-banner-text{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
/* \u53F3\u4FA7\uFF1A\u9884\u7559\u76D2\u5B50\uFF08dirty \u65F6\u663E\u793A\u6309\u94AE\uFF09\uFF0C\u7EB5\u5411\u5C45\u4E2D */
.nio-settings-banner-side{flex:none;display:flex;align-items:center;min-width:96px;justify-content:flex-end}
/* \u6709\u5F85\u91CD\u542F\u4FEE\u6539\uFF1A\u5F3A\u8C03\u8272\u63D0\u793A + \u6309\u94AE\uFF08\u6D45\u8272\u5E95\uFF09 */
.nio-settings-banner-warn{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 5%,transparent)}
.nio-settings-banner-warn .nio-settings-banner-title{color:var(--dsw-alias-state-business-primary)}
.nio-settings-banner-warn .nio-settings-banner-text{color:var(--dsw-alias-label-primary);font-weight:500}
.nio-settings-banner-btn{box-sizing:border-box;flex:none;height:30px;padding:0 14px;border:none;border-radius:8px;background:var(--dsw-alias-state-business-primary);color:#fff;font-size:13px;line-height:30px;font-family:inherit;cursor:pointer;white-space:nowrap}
.nio-settings-banner-btn:hover{opacity:.9}
.nio-settings-group{display:flex;flex-direction:column}
.nio-settings-row{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:16px;padding:16px 0;display:flex}
.nio-settings-group > .nio-settings-row{border-bottom:none}
.nio-settings-sub{box-sizing:border-box;align-items:center;gap:16px;padding:4px 0 16px 28px;display:flex}
.nio-settings-sub .nio-settings-title{font-weight:400;color:var(--dsw-alias-label-secondary)}
.nio-settings-sub::before{content:"";flex:none;width:2px;align-self:stretch;background:var(--dsw-alias-border-l2);border-radius:1px;margin-right:12px}
.nio-settings-text{flex:1;min-width:0}
.nio-settings-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
.nio-settings-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-top:2px}
.nio-settings-toggle{position:relative;cursor:pointer;width:36px;height:20px;flex:none}
.nio-settings-toggle input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}
.nio-settings-toggle-track{box-sizing:border-box;display:block;width:36px;height:20px;border-radius:999px;background:var(--dsw-alias-border-l3);transition:background .15s ease;position:relative}
.nio-settings-toggle-track:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary-inverted);transition:transform .15s ease}
.nio-settings-toggle input:checked + .nio-settings-toggle-track{background:var(--dsw-alias-state-business-primary)}
.nio-settings-toggle input:checked + .nio-settings-toggle-track:after{transform:translateX(16px)}
.nio-settings-select{box-sizing:border-box;flex:none;min-width:200px;max-width:260px;height:32px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:0 10px;font-size:13px;line-height:20px;font-family:inherit;cursor:pointer}
.nio-settings-select:focus{outline:none;border-color:var(--dsw-alias-state-business-primary)}
.nio-settings-select:disabled{opacity:.5;cursor:default}
.nio-settings-note{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;padding:16px 0}
.nio-settings-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px;padding:16px 0}
/* \u5DE6\u4E0B\u89D2\u91CD\u542F\u6309\u94AE\uFF1Aabsolute \u5B9A\u4F4D\u5728\u8BBE\u7F6E\u884C\u53F3\u4FA7\uFF08\u5B9A\u4F4D\u4E0A\u4E0B\u6587 = settingsArea\uFF09 */
[class*="settingsArea"].nio-rst-area{position:relative}
/* \u9ED8\u8BA4\uFF1A\u7070\u8272\u534A\u900F\u660E\uFF1Bhover\uFF1A\u53D8\u4E3A\u7EA2\u8272\uFF08\u786C\u6027\u91CD\u542F\u8B66\u793A\u8272\uFF09 */
.nio-rst{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:28px;height:28px;color:color-mix(in srgb,var(--dsw-alias-label-secondary) 55%,transparent);background:transparent;border:none;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:color .15s ease,background .15s ease}
.nio-rst:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.nio-rst svg{display:block;width:15px;height:15px}
.nio-rst-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-rst:hover .nio-rst-tip{opacity:1}
/* \u91CD\u542F\u4E8C\u6B21\u786E\u8BA4\u6846 */
.nio-confirm{position:fixed;inset:0;z-index:2147483003;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1);backdrop-filter:blur(2px)}
.nio-confirm-dialog{box-sizing:border-box;width:min(420px,calc(100vw - 48px));background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.35));padding:20px;display:flex;flex-direction:column;gap:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-confirm-title{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600;line-height:24px}
.nio-confirm-desc{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.nio-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}
.nio-confirm-btn{box-sizing:border-box;height:32px;padding:0 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;line-height:30px;font-family:inherit;cursor:pointer}
.nio-confirm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nio-confirm-danger{background:var(--dsw-alias-state-error-primary);border-color:transparent;color:#fff}
.nio-confirm-danger:hover{background:var(--dsw-alias-state-error-primary);opacity:.9}
.nio-confirm-primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff}
.nio-confirm-primary:hover{background:var(--dsw-alias-state-business-primary);opacity:.9}
/* \u91CD\u542F\u7B49\u5F85\u5C42 */
.nio-reboot{position:fixed;inset:0;z-index:2147483003;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--dsw-alias-bg-mask-1);backdrop-filter:blur(2px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-reboot-spinner{width:26px;height:26px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary);border-radius:50%;animation:nio-reboot-spin .8s linear infinite}
@keyframes nio-reboot-spin{to{transform:rotate(360deg)}}
.nio-reboot-text{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
`;
var inject = [];
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
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > 20) {
        window.clearInterval(timer);
        return;
      }
      if (document.querySelector("[data-nio-rst]")) {
        window.clearInterval(timer);
        return;
      }
      scan();
    }, 1e3);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, "dsh-niao-quick-open: observer");
  ctx.effect(() => {
    refreshConfig().then(migrateLegacyEditor);
    return () => {
    };
  }, "dsh-niao-quick-open: config");
  const slots = ctx.get("slots");
  if (!slots) return;
  slots.inject("settings.section", () => slots.register(
    {
      name: "settings.section",
      id: "dsh-niao-quick-open",
      order: 35,
      label: () => document.documentElement.lang && document.documentElement.lang.startsWith("en") ? "UI Features" : "\u754C\u9762\u529F\u80FD"
    },
    () => import_react.default.createElement(ConfigPanel, null)
  ));
}
    return module.exports;
  }
});
