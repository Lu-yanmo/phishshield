// ============================================================
// Options 页逻辑：加载/保存配置、订阅源管理与状态展示
// ============================================================

(function () {
  "use strict";

  const CONFIG_KEY = "bpg_config";

  // ---------- 订阅源行 ----------
  function addSubRow(name, url) {
    const row = document.createElement("div");
    row.className = "sub-row";
    const n = document.createElement("input");
    n.type = "text";
    n.placeholder = "名称（如 PhishStats）";
    n.value = name || "";
    const u = document.createElement("input");
    u.type = "url";
    u.placeholder = "https://example.com/domains.txt";
    u.value = url || "";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "small ghost";
    del.textContent = "删除";
    del.addEventListener("click", () => row.remove());
    row.appendChild(n);
    row.appendChild(u);
    row.appendChild(del);
    document.getElementById("subRows").appendChild(row);
  }

  function collectSubRows() {
    const rows = [];
    document.querySelectorAll("#subRows .sub-row").forEach((row) => {
      const url = row.querySelector('input[type="url"]').value.trim();
      if (!url || url.startsWith("#")) return;
      rows.push({ url, name: row.querySelector('input[type="text"]').value.trim() || url });
    });
    return rows;
  }

  // ---------- 加载 ----------
  chrome.storage.local.get(CONFIG_KEY, (data) => {
    const cfg = data[CONFIG_KEY] || {};
    const setRadio = (name, val) => {
      const el = document.querySelector('input[name="' + name + '"][value="' + val + '"]');
      if (el) el.checked = true;
    };
    setRadio("mode", cfg.mode || "hide_danger");
    setRadio("sensitivity", cfg.sensitivity || "medium");
    document.getElementById("chkBrand").checked = cfg.brandMatch !== false;
    document.getElementById("chkTld").checked = cfg.dangerousTld !== false;
    document.getElementById("chkIp").checked = cfg.ipDomain !== false;
    document.getElementById("chkLure").checked = cfg.lureWords !== false;
    document.getElementById("customList").value = cfg.customList || "";
    document.getElementById("sbKey").value = cfg.safeBrowsingKey || "";
    const subs = Array.isArray(cfg.subscriptions) ? cfg.subscriptions : [];
    if (subs.length === 0) addSubRow("", "");
    subs.forEach((s) => addSubRow(s.name, s.url));
  });

  document.getElementById("addSub").addEventListener("click", () => addSubRow("", ""));

  // ---------- 订阅状态 ----------
  function showSubStatus() {
    chrome.runtime.sendMessage({ type: "getSubStatus" }, (res) => {
      const el = document.getElementById("subStatus");
      if (!res || !res.sources || res.sources.length === 0) {
        el.innerHTML = "尚未拉取到任何订阅源，点击下面的「保存设置」后会自动抓取。";
        return;
      }
      let html = "当前订阅库：共 " + (res.count || 0).toLocaleString() + " 个域名，更新于 " +
        (res.updatedAt ? new Date(res.updatedAt).toLocaleString() : "未知") + "<br>";
      res.sources.forEach((s) => {
        html += "· " + (s.name || s.url) + "：成功解析 " + s.count + " 个域名（" +
          (s.fetchedAt ? new Date(s.fetchedAt).toLocaleTimeString() : "-") + "）<br>";
      });
      if (res.lastError) html += '<span class="err">⚠ ' + res.lastError + "</span>";
      el.innerHTML = html;
    });
  }
  showSubStatus();

  // ---------- 保存 ----------
  document.getElementById("saveBtn").addEventListener("click", () => {
    const cfg = {
      mode: document.querySelector('input[name="mode"]:checked').value,
      sensitivity: document.querySelector('input[name="sensitivity"]:checked').value,
      brandMatch: document.getElementById("chkBrand").checked,
      dangerousTld: document.getElementById("chkTld").checked,
      ipDomain: document.getElementById("chkIp").checked,
      lureWords: document.getElementById("chkLure").checked,
      customList: document.getElementById("customList").value,
      safeBrowsingKey: document.getElementById("sbKey").value.trim(),
      subscriptions: collectSubRows()
    };
    chrome.storage.local.set({ [CONFIG_KEY]: cfg }, () => {
      const tip = document.getElementById("saveTip");
      tip.textContent = "已保存 ✓（刷新 Bing 搜索页即可生效）";
      setTimeout(() => { tip.textContent = ""; }, 2500);
      // 触发一次立即刷新订阅，提高生效速度
      chrome.runtime.sendMessage({ type: "refreshSubscriptions" }, () => showSubStatus());
    });
  });
})();