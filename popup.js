// ============================================================
// Popup 弹窗逻辑：展示配置与统计，提供快捷操作
// ============================================================

(function () {
  "use strict";

  const MODE_TEXT = {
    mark: "仅标记",
    hide_danger: "隐藏高危 + 标记可疑",
    hide_all: "全部隐藏"
  };
  const SENS_TEXT = { low: "低（保守）", medium: "中（默认）", high: "高（激进）" };

  function fill() {
    // 统计
    chrome.runtime.sendMessage({ type: "getStats" }, (s) => {
      s = s || { scanned: 0, marked: 0, hidden: 0, since: Date.now() };
      document.getElementById("sScanned").textContent = s.scanned;
      document.getElementById("sMarked").textContent = s.marked;
      document.getElementById("sHidden").textContent = s.hidden;
      const since = document.getElementById("since");
      since.textContent = "自 " + new Date(s.since).toLocaleDateString() + " 起";
    });

    // 配置摘要
    chrome.runtime.sendMessage({ type: "getConfig" }, (cfg) => {
      cfg = cfg || {};
      document.getElementById("cMode").textContent = MODE_TEXT[cfg.mode] || "-";
      document.getElementById("cSens").textContent = SENS_TEXT[cfg.sensitivity] || "-";
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

  fill();
})();