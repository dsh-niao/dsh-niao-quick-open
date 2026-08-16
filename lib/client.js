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
var import_react = require("react");
var ROUTE = "/api/dsh-niao-quick-open";
var EDITOR_KEY = "dsh.niao.quickOpen.editor";
async function rpc(action, payload) {
  const res = await fetch(ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  if (!res.ok) throw new Error(`rpc ${action} failed: ${res.status}`);
  const data = await res.json();
  return data && data.ok ? data.value : null;
}
var getEditor = () => {
  try {
    return window.localStorage.getItem(EDITOR_KEY);
  } catch {
    return null;
  }
};
var setEditor = (id) => {
  try {
    window.localStorage.setItem(EDITOR_KEY, id);
  } catch {
  }
};
var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
var isWin = /Windows|Win32|Win64/i.test(navigator.userAgent || "");
var finderLabel = isWin ? "\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u6253\u5F00" : isMac ? "\u5728\u8BBF\u8FBE\u4E2D\u6253\u5F00" : "\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00";
var GEAR_PATH = "M14.0861 5.51366C13.8717 5.0575 13.588 4.58542 13.2889 4.18108C13.208 4.07172 13.1596 4.04373 13.0243 4.03054C12.4277 3.97255 11.8245 4.05527 11.2269 3.9972C10.7224 3.94816 10.3133 3.71661 10.0115 3.30919C9.66986 2.84777 9.43973 2.31343 9.09824 1.85234C9.01771 1.74365 8.96805 1.71589 8.83354 1.70282C8.29432 1.65044 7.70402 1.65061 7.16656 1.70282C7.03205 1.71589 6.98239 1.74365 6.90186 1.85234C6.56067 2.31303 6.33025 2.84774 5.98855 3.30919C5.68681 3.71661 5.27774 3.94816 4.77317 3.9972C4.17564 4.05527 3.57239 3.97255 2.97585 4.03054C2.84046 4.04373 2.79208 4.07172 2.71115 4.18108C2.41212 4.58542 2.12835 5.0575 1.91403 5.51366C1.85299 5.64359 1.85286 5.7018 1.91403 5.8319C2.14865 6.33077 2.49748 6.76892 2.73237 7.26854C2.9594 7.7515 2.96041 8.24717 2.73338 8.73044C2.49837 9.23061 2.14891 9.66837 1.91403 10.1681C1.85291 10.2982 1.85299 10.3564 1.91403 10.4863C2.12856 10.9429 2.41185 11.4142 2.71115 11.8189C2.79208 11.9283 2.84046 11.9563 2.97585 11.9694C3.57239 12.0274 4.17564 11.9447 4.77317 12.0028C5.27774 12.0518 5.68681 12.2834 5.98855 12.6908C6.33024 13.1522 6.56037 13.6866 6.90186 14.1476C6.98239 14.2563 7.03205 14.2841 7.16656 14.2972C7.70402 14.3494 8.29432 14.3495 8.83354 14.2972C8.96805 14.2841 9.01771 14.2563 9.09824 14.1476C9.43944 13.687 9.66985 13.1522 10.0115 12.6908C10.3133 12.2834 10.7224 12.0518 11.2269 12.0028C11.8244 11.9447 12.4271 12.0275 13.0243 11.9694C13.1596 11.9563 13.208 11.9283 13.2889 11.8189C13.5891 11.4131 13.872 10.942 14.0861 10.4863C14.1471 10.3564 14.1472 10.2982 14.0861 10.1681C13.8513 9.66861 13.5017 9.23061 13.2667 8.73044C13.0397 8.24717 13.0407 7.7515 13.2677 7.26854C13.5026 6.7689 13.8513 6.33106 14.0861 5.8319C14.1472 5.7018 14.1471 5.64359 14.0861 5.51366ZM15.3035 6.40373C15.0685 6.90359 14.7188 7.34119 14.4841 7.84037C14.4231 7.97025 14.423 8.02855 14.4841 8.15861C14.7189 8.65833 15.0685 9.09611 15.3035 9.59626C15.5308 10.0801 15.5308 10.5744 15.3035 11.0582C15.052 11.5933 14.7225 12.1426 14.37 12.6191C14.0685 13.0265 13.6581 13.259 13.1536 13.3081C12.5566 13.366 11.9541 13.2835 11.3573 13.3414C11.2228 13.3545 11.1731 13.3823 11.0926 13.491C10.7511 13.9521 10.521 14.4864 10.1793 14.9478C9.87828 15.3542 9.46719 15.5869 8.96387 15.6358C8.34008 15.6964 7.66194 15.6966 7.03623 15.6358C6.53291 15.5869 6.12182 15.3542 5.82084 14.9478C5.47911 14.4863 5.24878 13.9517 4.90753 13.491C4.82701 13.3823 4.77734 13.3545 4.64284 13.3414C4.04647 13.2835 3.44373 13.366 2.84653 13.3081C2.34201 13.259 1.93164 13.0265 1.63013 12.6191C1.27867 12.144 0.948453 11.5941 0.696621 11.0582C0.469315 10.5744 0.469279 10.0801 0.696621 9.59626C0.931628 9.09613 1.2813 8.65807 1.51597 8.15861C1.57708 8.02855 1.57702 7.97025 1.51597 7.84037C1.28117 7.34095 0.931635 6.9036 0.696621 6.40373C0.469213 5.91992 0.469367 5.42562 0.696621 4.94183C0.948441 4.40587 1.27868 3.85598 1.63013 3.38092C1.93164 2.97349 2.34201 2.74095 2.84653 2.6919C3.44353 2.63397 4.04599 2.71649 4.64284 2.65856C4.77734 2.64549 4.82701 2.61774 4.90753 2.50904C5.24905 2.04792 5.47913 1.51362 5.82084 1.05219C6.12182 0.645806 6.53291 0.413119 7.03623 0.364178C7.66002 0.303556 8.33816 0.303369 8.96387 0.364178C9.46719 0.413119 9.87828 0.645806 10.1793 1.05219C10.521 1.51365 10.7513 2.04828 11.0926 2.50904C11.1731 2.61774 11.2228 2.64549 11.3573 2.65856C11.9541 2.71649 12.5566 2.63397 13.1536 2.6919C13.6581 2.74095 14.0685 2.97349 14.37 3.38092C14.7214 3.85598 15.0517 4.40587 15.3035 4.94183C15.5307 5.42562 15.5309 5.91992 15.3035 6.40373Z";
var GEAR_INNER = "M9.13764 7.99999C9.13764 7.3715 8.62855 6.8624 8.00005 6.8624C7.37155 6.8624 6.86246 7.3715 6.86246 7.99999C6.86246 8.62849 7.37155 9.13759 8.00005 9.13759C8.62855 9.13759 9.13764 8.62849 9.13764 7.99999ZM10.4834 7.99999C10.4834 9.37126 9.37132 10.4833 8.00005 10.4833C6.62878 10.4833 5.51674 9.37126 5.51674 7.99999C5.51674 6.62873 6.62878 5.51669 8.00005 5.51669C9.37132 5.51669 10.4834 6.62873 10.4834 7.99999Z";
var CODE_PATH = "M12.3368 1.53569L11.931 4.43172H14.8086V5.79673H11.7404L11.1962 9.67859H14.2839V11.0436H11.0056L10.4994 14.6529L9.14873 14.4643L9.62731 11.0436H5.75876L5.25252 14.6529L3.90186 14.4643L4.38043 11.0436H1.69141V9.67859H4.57104L5.11417 5.79673H2.21609V4.43172H5.30581L5.73724 1.34713L7.08995 1.53569L6.68414 4.43172H10.5527L10.9841 1.34713L12.3368 1.53569ZM5.94937 9.67859H9.81791L10.361 5.79673H6.49353L5.94937 9.67859Z";
var FOLDER_PATH = "M5.19629 1.57104C5.81144 1.5711 6.38623 1.8786 6.72754 2.39038L7.19922 3.09839C7.28454 3.22635 7.42824 3.30344 7.58203 3.30347H12.1699C13.5039 3.30348 14.5859 4.38548 14.5859 5.71948V6.62671C15.2694 7.02689 15.6605 7.85012 15.4385 8.68726L14.3848 12.658C14.1037 13.7164 13.1449 14.4527 12.0498 14.4529H2.91699C1.51651 14.4529 0.451662 13.2814 0.501954 11.9519V3.98706C0.501954 2.65305 1.58396 1.57104 2.91797 1.57104H5.19629ZM3.7793 7.75562C3.30994 7.75562 2.89883 8.07153 2.77832 8.52515L1.91602 11.7722C1.74167 12.4291 2.23734 13.073 2.91699 13.073H12.0498C12.5191 13.0728 12.9304 12.757 13.0508 12.3035L14.1045 8.33374C14.1819 8.04202 13.9619 7.756 13.6602 7.75562H3.7793ZM2.91797 2.9519C2.34625 2.9519 1.88281 3.41534 1.88281 3.98706V7.2937C2.33068 6.7269 3.02249 6.37476 3.7793 6.37476H13.2051V5.71948C13.2051 5.14777 12.7416 4.68434 12.1699 4.68433H7.58203C6.96675 4.6843 6.39209 4.37595 6.05078 3.86401L5.5791 3.15601C5.49379 3.02821 5.34995 2.95196 5.19629 2.9519H2.91797Z";
var COPY_PATH = "M6.14929 4.02032C7.11197 4.02032 7.87983 4.02016 8.49597 4.07598C9.12128 4.13269 9.65792 4.25188 10.1415 4.53106C10.7202 4.8653 11.2008 5.3459 11.535 5.92462C11.8142 6.40818 11.9334 6.94481 11.9901 7.57012C12.0459 8.18625 12.0458 8.95419 12.0458 9.9168C12.0458 10.8795 12.0459 11.6473 11.9901 12.2635C11.9334 12.8888 11.8142 13.4254 11.535 13.909C11.2008 14.4877 10.7202 14.9683 10.1415 15.3025C9.65792 15.5817 9.12128 15.7009 8.49597 15.7576C7.87984 15.8134 7.11196 15.8133 6.14929 15.8133C5.18667 15.8133 4.41874 15.8134 3.80261 15.7576C3.1773 15.7009 2.64067 15.5817 2.1571 15.3025C1.5784 14.9683 1.09778 14.4877 0.76355 13.909C0.484366 13.4254 0.365184 12.8888 0.308472 12.2635C0.252649 11.6473 0.252808 10.8795 0.252808 9.9168C0.252808 8.95418 0.252664 8.18625 0.308472 7.57012C0.365184 6.94481 0.484366 6.40818 0.76355 5.92462C1.09777 5.34589 1.57839 4.86529 2.1571 4.53106C2.64067 4.25188 3.1773 4.13269 3.80261 4.07598C4.41874 4.02017 5.18666 4.02032 6.14929 4.02032ZM6.14929 5.37774C5.16181 5.37774 4.46634 5.37761 3.92566 5.42657C3.39434 5.47472 3.07859 5.56574 2.83582 5.70587C2.4632 5.92106 2.15354 6.2307 1.93835 6.60333C1.79823 6.8461 1.70721 7.16185 1.65906 7.69317C1.6101 8.23385 1.61023 8.92933 1.61023 9.9168C1.61023 10.9043 1.61009 11.5998 1.65906 12.1404C1.70721 12.6717 1.79823 12.9875 1.93835 13.2303C2.15356 13.6029 2.46321 13.9126 2.83582 14.1277C3.07859 14.2679 3.39434 14.3589 3.92566 14.407C4.46634 14.456 5.16182 14.4559 6.14929 14.4559C7.13682 14.4559 7.83224 14.456 8.37292 14.407C8.90425 14.3589 9.21999 14.2679 9.46277 14.1277C9.83535 13.9126 10.145 13.6029 10.3602 13.2303C10.5004 12.9875 10.5914 12.6717 10.6395 12.1404C10.6885 11.5998 10.6884 10.9043 10.6884 9.9168C10.6884 8.92934 10.6885 8.23384 10.6395 7.69317C10.5914 7.16185 10.5004 6.8461 10.3602 6.60333C10.1451 6.23071 9.83536 5.92107 9.46277 5.70587C9.21999 5.56574 8.90424 5.47472 8.37292 5.42657C7.83224 5.3776 7.13682 5.37774 6.14929 5.37774ZM9.80164 0.367975C10.7638 0.367975 11.5314 0.36788 12.1473 0.423639C12.7726 0.480307 13.3093 0.598759 13.7928 0.877741C14.3717 1.21192 14.8521 1.69355 15.1864 2.27227C15.4655 2.75574 15.5857 3.29164 15.6425 3.9168C15.6983 4.53301 15.6971 5.3016 15.6971 6.26446V7.82989C15.6971 8.29264 15.6989 8.58993 15.6649 8.84844C15.4668 10.3525 14.401 11.5738 12.9833 11.9988V10.5467C13.6973 10.1903 14.2105 9.49662 14.3192 8.67169C14.3387 8.52347 14.3407 8.3358 14.3407 7.82989V6.26446C14.3407 5.27706 14.3398 4.58149 14.2909 4.04083C14.2428 3.50968 14.1526 3.19372 14.0126 2.95098C13.7974 2.57849 13.4876 2.26869 13.1151 2.05352C12.8724 1.91347 12.5564 1.82237 12.0253 1.77423C11.4847 1.72528 10.7888 1.7254 9.80164 1.7254H7.71472C6.7562 1.72558 5.92665 2.27697 5.52332 3.07891H4.07019C4.54221 1.51132 5.9932 0.368186 7.71472 0.367975H9.80164Z";
function makeIcon(paths) {
  return (0, import_react.createElement)(
    "svg",
    { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
    paths.map((d) => (0, import_react.createElement)("path", { key: d.slice(0, 8), d, fill: "currentColor" }))
  );
}
var gearSvg = makeIcon([GEAR_PATH, GEAR_INNER]);
var codeSvg = makeIcon([CODE_PATH]);
var folderSvg = makeIcon([FOLDER_PATH]);
var copySvg = makeIcon([COPY_PATH]);
function HeaderActions(props) {
  const sid = props && props.sessionId;
  const useSessions = props && typeof props.useSessions === "function" ? props.useSessions : null;
  let cwd = null;
  let folderName = null;
  if (sid && useSessions) {
    try {
      const byId = useSessions((s) => s && s.byId ? s.byId : null);
      cwd = byId && byId[sid] && byId[sid].cwd ? byId[sid].cwd : null;
      if (cwd) folderName = cwd.split(/[\\/]/).filter(Boolean).pop() || cwd;
    } catch {
      cwd = null;
    }
  }
  const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
  const [editors, setEditors] = (0, import_react.useState)(null);
  const [editorDraft, setEditorDraft] = (0, import_react.useState)("");
  const [copied, setCopied] = (0, import_react.useState)(false);
  const copyTimer = (0, import_react.useRef)(null);
  const menuRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [menuOpen]);
  (0, import_react.useEffect)(() => () => {
    if (copyTimer.current) {
      try {
        copyTimer.current();
      } catch {
      }
      copyTimer.current = null;
    }
  }, []);
  const openMenu = () => {
    setMenuOpen(true);
    setEditorDraft(getEditor() || "");
    if (editors === null) rpc("list-editors", {}).then((list) => {
      setEditors(Array.isArray(list) ? list : []);
    }).catch(() => {
      setEditors([]);
    });
  };
  const saveMenu = () => {
    setEditor(editorDraft || null);
    setMenuOpen(false);
  };
  const cancelMenu = () => {
    setMenuOpen(false);
  };
  const runFinder = () => {
    if (cwd) rpc("open-in-finder", { cwd }).catch(() => {
    });
  };
  const runCopyName = async () => {
    if (!folderName) return;
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(folderName);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const el = document.createElement("textarea");
        el.value = folderName;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        ok = document.execCommand("copy");
        el.remove();
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    setCopied(true);
    if (copyTimer.current) {
      try {
        copyTimer.current();
      } catch {
      }
      copyTimer.current = null;
    }
    copyTimer.current = window.setTimeout(() => {
      setCopied(false);
      copyTimer.current = null;
    }, 1e3);
  };
  const runEditor = () => {
    if (!cwd) return;
    const id = getEditor();
    if (!id) {
      openMenu();
      return;
    }
    rpc("open-with-editor", { cwd, editorId: id }).then((r) => {
      if (r && r.reason === "not-found") openMenu();
    }).catch(() => {
    });
  };
  const iconBtn = (title, icon, onClick, disabled, tipText) => (0, import_react.createElement)("button", {
    type: "button",
    className: "dsh-hdr-btn",
    "aria-label": title,
    disabled: disabled || false,
    onClick: (e) => {
      e.stopPropagation();
      onClick();
    }
  }, icon, (0, import_react.createElement)("span", { className: "dsh-hdr-tip" }, tipText || title));
  const menuEl = menuOpen ? (0, import_react.createElement)(
    "div",
    { className: "dsh-hdr-menu", ref: menuRef, onClick: (e) => e.stopPropagation() },
    (0, import_react.createElement)("div", { className: "dsh-hdr-menu-head" }, "\u8BBE\u7F6E"),
    (0, import_react.createElement)(
      "div",
      { className: "dsh-hdr-menu-field" },
      (0, import_react.createElement)("label", { className: "dsh-hdr-menu-label" }, "\u5E38\u7528\u7F16\u8F91\u5668"),
      editors === null ? (0, import_react.createElement)("div", { className: "dsh-hdr-menu-note" }, "\u6B63\u5728\u68C0\u7D22\u5DF2\u5B89\u88C5\u7684\u7F16\u8F91\u5668\u2026") : editors.length === 0 ? (0, import_react.createElement)("div", { className: "dsh-hdr-menu-note" }, "\u672A\u68C0\u6D4B\u5230\u652F\u6301\u7684\u7F16\u8F91\u5668") : (0, import_react.createElement)(
        "select",
        {
          className: "dsh-hdr-select",
          value: editorDraft,
          onChange: (e) => {
            e.stopPropagation();
            setEditorDraft(e.target.value);
          }
        },
        (0, import_react.createElement)("option", { value: "" }, "\u672A\u8BBE\u7F6E"),
        editors.map((ed) => (0, import_react.createElement)("option", { key: ed.id, value: ed.id }, ed.name))
      )
    ),
    (0, import_react.createElement)(
      "div",
      { className: "dsh-hdr-menu-foot" },
      (0, import_react.createElement)("button", { type: "button", className: "dsh-hdr-menu-btn", onClick: (e) => {
        e.stopPropagation();
        cancelMenu();
      } }, "\u53D6\u6D88"),
      (0, import_react.createElement)("button", { type: "button", className: "dsh-hdr-menu-btn primary", onClick: (e) => {
        e.stopPropagation();
        saveMenu();
      } }, "\u4FDD\u5B58")
    )
  ) : null;
  return (0, import_react.createElement)(
    "div",
    { className: "dsh-hdr-actions", onClick: (e) => e.stopPropagation() },
    iconBtn("\u914D\u7F6E\u5E38\u7528\u7F16\u8F91\u5668", gearSvg, openMenu),
    iconBtn("\u7F16\u8F91\u5668\u6253\u5F00", codeSvg, runEditor, !cwd),
    iconBtn(finderLabel, folderSvg, runFinder, !cwd),
    iconBtn("\u590D\u5236\u6587\u4EF6\u5939\u540D\u79F0", copySvg, runCopyName, !folderName, copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u6587\u4EF6\u5939\u540D\u79F0"),
    menuEl
  );
}
var CSS = `
.dsh-hdr-actions{display:flex;align-items:center;gap:2px;position:relative}
.dsh-hdr-btn{position:relative;cursor:pointer;width:30px;height:30px;border:none;background:transparent;border-radius:8px;color:var(--dsw-alias-label-secondary,#9aa0a8);display:inline-flex;align-items:center;justify-content:center;padding:0}
.dsh-hdr-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,0.14));color:var(--dsw-alias-label-primary,#e6e8eb)}
.dsh-hdr-btn:disabled{opacity:0.4;cursor:not-allowed}
.dsh-hdr-btn svg{display:block}
.dsh-hdr-tip{position:absolute;top:calc(100% + 6px);right:50%;transform:translateX(50%);white-space:nowrap;background:rgba(20,20,24,0.96);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:5px 9px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.dsh-hdr-btn:hover .dsh-hdr-tip{opacity:1}
.dsh-hdr-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:2147483002;background:rgba(24,24,30,0.98);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,0.45);min-width:220px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.dsh-hdr-menu-head{font-size:12px;font-weight:600;color:#e6e8eb;margin-bottom:10px}
.dsh-hdr-menu-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.dsh-hdr-menu-label{font-size:11px;color:#9aa0a8}
.dsh-hdr-select{box-sizing:border-box;width:100%;height:32px;color:#e6e8eb;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.16);border-radius:8px;padding:0 8px;font-size:12px;font-family:inherit;outline:none}
.dsh-hdr-select:focus{border-color:rgba(88,130,255,0.6)}
.dsh-hdr-menu-foot{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px}
.dsh-hdr-menu-btn{cursor:pointer;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.08);color:#e6e8eb;border-radius:7px;padding:5px 12px;font-size:12px;line-height:16px;font-family:inherit}
.dsh-hdr-menu-btn:hover{background:rgba(255,255,255,0.16)}
.dsh-hdr-menu-btn.primary{border-color:rgba(88,130,255,0.55);color:#c9d6ff;background:rgba(88,130,255,0.16)}
.dsh-hdr-menu-btn.primary:hover{background:rgba(88,130,255,0.26)}
.dsh-hdr-menu-note{font-size:11px;color:#9aa0a8;margin-bottom:10px;line-height:15px}
`;
var inject = ["slots"];
function apply(ctx) {
  const installStyles = () => {
    const tag = document.createElement("style");
    tag.setAttribute("data-plugin", "dsh-niao-quick-open");
    tag.setAttribute("data-plugin-css", "dsh-niao-quick-open");
    tag.textContent = CSS;
    document.head.append(tag);
    return () => {
      tag.remove();
    };
  };
  ctx.effect(installStyles, "dsh-niao-quick-open: styles");
  ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
    name: "conversation.session.header.utilities",
    id: "dsh-ws-actions",
    order: -30
  }, (props) => (0, import_react.createElement)(HeaderActions, props)));
}
    return module.exports;
  }
});
