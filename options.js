// ============================================================
// Options 页逻辑：加载/保存配置、订阅源管理与状态展示
// 文案全部走 common/i18n.js 双语字典；语言切换即时预览、保存后持久化
// ============================================================

(function () {
  "use strict";

  const CONFIG_KEY = "bpg_config";
  let lang = bpgResolveLang(); // 当前界面语言（读取配置后更新）

  // ---------- 订阅源行 ----------
  function addSubRow(name, url) {
    const row = document.createElement("div");
    row.className = "sub-row";
    const n = document.createElement("input");
    n.type = "text";
    n.setAttribute("data-i18n-ph", "opt.subNamePh");
    n.placeholder = bpgT("opt.subNamePh", lang);
    n.value = name || "";
    const u = document.createElement("input");
    u.type = "url";
    u.placeholder = "https://example.com/domains.txt";
    u.value = url || "";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "small ghost";
    del.setAttribute("data-i18n", "opt.subDel");
    del.textContent = bpgT("opt.subDel", lang);
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
    lang = bpgResolveLang(cfg.language);
    document.title = bpgT("opt.title", lang);
    bpgApplyDom(lang);
    const setRadio = (name, val) => {
      const el = document.querySelector('input[name="' + name + '"][value="' + val + '"]');
      if (el) el.checked = true;
    };
    setRadio("mode", cfg.mode || "hide_danger");
    setRadio("sensitivity", cfg.sensitivity || "medium");
    setRadio("lang", cfg.language || "auto");
    document.getElementById("chkBrand").checked = cfg.brandMatch !== false;
    document.getElementById("chkTld").checked = cfg.dangerousTld !== false;
    document.getElementById("chkIp").checked = cfg.ipDomain !== false;
    document.getElementById("chkLure").checked = cfg.lureWords !== false;
    document.getElementById("chkIcp").checked = cfg.icpCheck !== false;
    document.getElementById("customList").value = cfg.customList || "";
    document.getElementById("sbKey").value = cfg.safeBrowsingKey || "";
    const subs = Array.isArray(cfg.subscriptions) ? cfg.subscriptions : [];
    if (subs.length === 0) addSubRow("", "");
    subs.forEach((s) => addSubRow(s.name, s.url));
  });

  // 语言单选即时预览（不落盘，保存按钮才持久化）
  document.querySelectorAll('input[name="lang"]').forEach((el) => {
    el.addEventListener("change", () => {
      lang = bpgResolveLang(el.value);
      document.title = bpgT("opt.title", lang);
      bpgApplyDom(lang);
      showSubStatus(); // 订阅状态文案同步换语言
    });
  });

  document.getElementById("addSub").addEventListener("click", () => addSubRow("", ""));

  // ---------- 订阅状态 ----------
  function showSubStatus() {
    chrome.runtime.sendMessage({ type: "getSubStatus" }, (res) => {
      const el = document.getElementById("subStatus");
      if (!res || !res.sources || res.sources.length === 0) {
        el.innerHTML = bpgT("opt.subEmpty", lang);
        return;
      }
      let html = bpgT("opt.subTotal", lang, {
        count: (res.count || 0).toLocaleString(),
        time: res.updatedAt ? new Date(res.updatedAt).toLocaleString() : bpgT("opt.subUnknown", lang)
      }) + "<br>";
      res.sources.forEach((s) => {
        html += bpgT("opt.subRow", lang, {
          name: s.name || s.url,
          count: s.count,
          time: s.fetchedAt ? new Date(s.fetchedAt).toLocaleTimeString() : "-"
        }) + "<br>";
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
      language: document.querySelector('input[name="lang"]:checked').value,
      brandMatch: document.getElementById("chkBrand").checked,
      dangerousTld: document.getElementById("chkTld").checked,
      ipDomain: document.getElementById("chkIp").checked,
      lureWords: document.getElementById("chkLure").checked,
      icpCheck: document.getElementById("chkIcp").checked,
      customList: document.getElementById("customList").value,
      safeBrowsingKey: document.getElementById("sbKey").value.trim(),
      subscriptions: collectSubRows()
    };
    chrome.storage.local.set({ [CONFIG_KEY]: cfg }, () => {
      const tip = document.getElementById("saveTip");
      tip.textContent = bpgT("opt.saved", lang);
      setTimeout(() => { tip.textContent = ""; }, 2500);
      // 触发一次立即刷新订阅，提高生效速度
      chrome.runtime.sendMessage({ type: "refreshSubscriptions" }, () => showSubStatus());
    });
  });
})();
