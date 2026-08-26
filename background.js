// ============================================================
// Service Worker（background）
// 职责：
//   1. 管理订阅黑名单：定时抓取用户配置的域名列表 URL 并合并成 Set
//   2. 响应 content script 的批量域名查询（订阅命中 + 可选 Safe Browsing）
//   3. 维护默认配置与统计信息
//   4. 提供 options / popup 页面的配置与状态接口
// ============================================================

const CONFIG_KEY = "bpg_config";
const SUBS_KEY = "bpg_subs";      // { list: "域名\n域名..."（换行分隔字符串，比数组省约 1/3 存储），
                                  //   sources: [{url,name,fetchedAt,count}], lastError, updatedAt }
const STATS_KEY = "bpg_stats";
const REFRESH_PERIOD_MIN = 360;   // 每 6 小时自动刷新一次订阅

const DEFAULT_CONFIG = {
  mode: "hide_danger",      // mark | hide_danger | hide_all
  sensitivity: "medium",    // low | medium | high
  brandMatch: true,
  dangerousTld: true,
  ipDomain: true,
  lureWords: true,
  customList: "",
  subscriptions: [
    {
      // Phishing Army 扩展版：约 15 万活跃钓鱼域名，每日更新（社区维护）
      url: "https://phishing.army/download/phishing_army_blocklist_extended.txt",
      name: "Phishing Army"
    },
    {
      // malware-filter 钓鱼 hosts 列表：汇总 OpenPhish/PhishTank/IPThreat，约 3.7 万条，每日多次更新（hosts 格式）
      url: "https://malware-filter.gitlab.io/malware-filter/phishing-filter-hosts.txt",
      name: "malware-filter"
    },
    {
      // Phishing.Database：经 PyFunceble 验证仍存活的钓鱼域名，约 39 万条（体积较大，约 10MB）
      url: "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt",
      name: "Phishing.Database"
    }
  ],
  safeBrowsingKey: ""
};

// ---------- 订阅抓取与解析 ----------

// 解析下载的文本：支持“每行一个域名”，也支持 hosts 文件格式（0.0.0.0 xxx）
function parseDomainList(raw) {
  const out = new Set();
  for (const line of String(raw || "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    // hosts 文件：跳过 127.0.0.1 / 0.0.0.0 等前缀，取域名列
    let dom = t.split(/\s+/)[0];
    if (/^(?:0\.0\.0\.0|127\.0\.0\.1|::1|::)$/.test(t.split(/\s+/)[0])) {
      dom = t.split(/\s+/)[1];
    }
    if (!dom) continue;
    dom = dom.replace(/^https?:\/\//, "").split("/")[0].replace(/\.$/, "").toLowerCase();
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(dom)) out.add(dom);
  }
  return out;
}

async function fetchSubscription(url) {
  const controller = new AbortController();
  // 大列表（10MB 级）需要更宽松的超时；弱网下宁可慢一点也不丢数据
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const text = await resp.text();
    return parseDomainList(text);
  } finally {
    clearTimeout(timer);
  }
}

// 刷新所有订阅源，合并进 SUBS_KEY
async function refreshSubscriptions() {
  const { [CONFIG_KEY]: cfg } = await chrome.storage.local.get(CONFIG_KEY);
  const subs = (cfg && cfg.subscriptions) || [];
  const sources = [];
  const list = new Set();
  let lastError = null;

  await Promise.all(subs.map(async (s) => {
    try {
      const doms = await fetchSubscription(s.url);
      doms.forEach((d) => list.add(d));
      sources.push({ url: s.url, name: s.name, fetchedAt: Date.now(), count: doms.size });
    } catch (e) {
      lastError = "订阅「" + (s.name || s.url) + "」拉取失败：" + (e.message || e);
    }
  }));

  await chrome.storage.local.set({
    // 换行分隔字符串存储：数十万域名时比 JSON 数组节省约 1/3 空间与序列化开销
    [SUBS_KEY]: { list: [...list].join("\n"), sources, lastError, updatedAt: Date.now() }
  });
  subSetCache = null; // 失效内存缓存，下次查询重建
  return { count: list.size, sources, lastError, updatedAt: Date.now() };
}

// ---------- 订阅域名集合（内存缓存，避免每次查询都反序列化数十万条） ----------
let subSetCache = null; // { updatedAt, set }
async function getSubSet() {
  const { [SUBS_KEY]: d } = await chrome.storage.local.get(SUBS_KEY);
  const updatedAt = (d && d.updatedAt) || 0;
  if (!subSetCache || subSetCache.updatedAt !== updatedAt) {
    const raw = (d && d.list) || "";
    // 兼容旧版本的数组存储格式
    const arr = typeof raw === "string" ? raw.split("\n") : raw;
    subSetCache = { updatedAt, set: new Set(arr.filter(Boolean)) };
  }
  return subSetCache.set;
}

// ---------- Google Safe Browsing 查询（可选，需用户配置 API Key） ----------
// 请求/响应格式参见官方 v4 Lookup API：
// POST https://safebrowsing.googleapis.com/v4/threatMatches:find?key=xxx
async function safeBrowsingLookup(urls) {
  const { [CONFIG_KEY]: cfg } = await chrome.storage.local.get(CONFIG_KEY);
  const key = cfg && cfg.safeBrowsingKey;
  if (!key || !urls.length) return {};

  const body = {
    client: { clientId: "bing-phishing-guard", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION", "POTENTIALLY_UNWANTED_APPLICATION"
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.slice(0, 500).map((u) => ({ url: u }))
    }
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(
      "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + encodeURIComponent(key),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );
    clearTimeout(timer);
    if (!resp.ok) return {};
    const data = await resp.json();
    const hits = {};
    for (const m of data.matches || []) {
      const keyUrl = new URL(m.threat && m.threat.url).href;
      hits[keyUrl] = m.threatType || "UNKNOWN";
    }
    return hits;
  } catch (e) {
    return {};
  }
}

// ---------- 消息处理 ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  switch (msg.type) {
    case "queryDomains": {
      (async () => {
        const subSet = await getSubSet();
        const hits = {};
        for (const host of msg.hosts || []) {
          // 注册域匹配（订阅源里可能存了完整域名，做精确 + 后两/三段尝试）
          const norm = host.toLowerCase().replace(/^www\./, "");
          const parts = norm.split(".");
          const candidates = new Set([norm]);
          if (parts.length > 2) {
            candidates.add(parts.slice(-2).join("."));
            candidates.add(parts.slice(-3).join("."));
          }
          for (const c of candidates) {
            if (subSet.has(c)) {
              hits[host] = "订阅黑名单";  // 键与 content script 中的 hostname 保持一致
              break;
            }
          }
        }
        // 若配置了 Safe Browsing Key，追加云端查询（host 匹配不上时用完整 URL 查）
        const { [CONFIG_KEY]: cfg } = await chrome.storage.local.get(CONFIG_KEY);
        if (cfg && cfg.safeBrowsingKey) {
          try {
            const sbHits = await safeBrowsingLookup((msg.urls || []));
            for (const u of Object.keys(sbHits)) {
              let h;
              try { h = new URL(u).hostname.toLowerCase(); } catch (e) { continue; }
              hits[h] = "Google Safe Browsing：" + sbHits[u];
            }
          } catch (e) { /* 云端查询失败不影响本地检测 */ }
        }
        sendResponse({ hits });
      })();
      return true; // 异步响应
    }

    case "getSubStatus":
      chrome.storage.local.get(SUBS_KEY, (d) => {
        const s = d[SUBS_KEY] || {};
        const count = typeof s.list === "string"
          ? (s.list ? s.list.split("\n").length : 0)
          : (s.list || []).length;
        sendResponse({ count, sources: s.sources || [], updatedAt: s.updatedAt, lastError: s.lastError });
      });
      return true;

    case "refreshSubscriptions":
      refreshSubscriptions().then((r) => sendResponse(r));
      return true;

    case "getStats":
    case "resetStats": {
      chrome.storage.local.get(STATS_KEY, (d) => {
        if (msg.type === "resetStats") {
          const fresh = { scanned: 0, marked: 0, hidden: 0, since: Date.now() };
          chrome.storage.local.set({ [STATS_KEY]: fresh });
          sendResponse(fresh);
        } else {
          sendResponse(d[STATS_KEY] || { scanned: 0, marked: 0, hidden: 0, since: Date.now() });
        }
      });
      return true;
    }

    case "getConfig":
      chrome.storage.local.get(CONFIG_KEY, (d) => sendResponse(d[CONFIG_KEY] || null));
      return true;

    case "setConfig":
      chrome.storage.local.set({ [CONFIG_KEY]: msg.config }).then(() => {
        sendResponse({ ok: true });
      });
      return true;

    default:
      return false;
  }
});

// ---------- 初始化与定时刷新 ----------

chrome.runtime.onInstalled.addListener(async () => {
  const { [CONFIG_KEY]: cfg } = await chrome.storage.local.get(CONFIG_KEY);
  if (!cfg) {
    await chrome.storage.local.set({ [CONFIG_KEY]: DEFAULT_CONFIG });
  } else if (Array.isArray(cfg.subscriptions) &&
             cfg.subscriptions.some((s) => /phishstats\.info/i.test(s.url || ""))) {
    // 升级迁移：旧默认源 PhishStats 已失效（404），自动替换为新默认源，保留用户自加的源
    cfg.subscriptions = DEFAULT_CONFIG.subscriptions.concat(
      cfg.subscriptions.filter((s) => !/phishstats\.info/i.test(s.url || ""))
    );
    await chrome.storage.local.set({ [CONFIG_KEY]: cfg });
  }
  await chrome.storage.local.set({
    [STATS_KEY]: { scanned: 0, marked: 0, hidden: 0, since: Date.now() }
  });
  await chrome.alarms.create("bpg-refresh-subs", { periodInMinutes: REFRESH_PERIOD_MIN });
  // 启动时首次抓取订阅
  refreshSubscriptions();
});

chrome.runtime.onStartup.addListener(() => {
  refreshSubscriptions();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "bpg-refresh-subs") refreshSubscriptions();
});