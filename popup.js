// ============================================================
// Popup 弹窗逻辑：展示配置与统计，提供快捷操作
// 文案全部走 common/i18n.js 双语字典，语言跟随配置（auto/zh/en）
// ============================================================

(function () {
  "use strict";

  let lang = bpgResolveLang(); // 先用浏览器语言填充，拿到配置后若指定了语言则重填

  function fill() {
    // 统计
    chrome.runtime.sendMessage({ type: "getStats" }, (s) => {
      s = s || { scanned: 0, marked: 0, hidden: 0, since: Date.now() };
      document.getElementById("sScanned").textContent = s.scanned;
      document.getElementById("sMarked").textContent = s.marked;
      document.getElementById("sHidden").textContent = s.hidden;
      const since = document.getElementById("since");
      since.textContent = bpgT("popup.since", lang, { date: new Date(s.since).toLocaleDateString() });
    });

    // 配置摘要（含语言偏好：配置指定语言时重刷全文案）
    chrome.runtime.sendMessage({ type: "getConfig" }, (cfg) => {
      cfg = cfg || {};
      const newLang = bpgResolveLang(cfg.language);
      if (newLang !== lang) {
        lang = newLang;
        bpgApplyDom(lang);
      }
      document.getElementById("cMode").textContent = bpgT("mode." + (cfg.mode || ""), lang) || "-";
      document.getElementById("cSens").textContent = bpgT("sens." + (cfg.sensitivity || ""), lang) || "-";
    });
  }

  document.getElementById("btnOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("linkOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("btnOpenBing").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://cn.bing.com/search?q=%E5%AE%98%E7%BD%91" });
  });
  document.getElementById("btnReset").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "resetStats" }, (fresh) => {
      document.getElementById("sScanned").textContent = fresh.scanned;
      document.getElementById("sMarked").textContent = fresh.marked;
      document.getElementById("sHidden").textContent = fresh.hidden;
    });
  });

  bpgApplyDom(lang);
  fill();
})();
