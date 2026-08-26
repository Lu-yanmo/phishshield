// ============================================================
// 搜索结果扫描器（content script，多引擎版）
// 职责：
//   1. 按当前搜索引擎选择适配器，遍历结果页中的候选链接
//      （支持 Bing / 百度 / 搜狗 / 360 / Google / DuckDuckGo）
//   2. 用内置黑名单 + 启发式引擎 +（可选）订阅黑名单判定风险
//   3. 按用户配置对结果进行 标记 或 隐藏
//   4. 通过 MutationObserver 增量处理滚动加载的新结果
// 适配器约定：items() 返回结果节点列表；extract(item) 返回
//   { item, href, hostname, urlPath, title, snippet, displayUrl } 或 null
// ============================================================

(function () {
  "use strict";

  // ---------- 配置 ----------
  const CONFIG_KEY = "bpg_config";
  const STATS_KEY = "bpg_stats";
  const DEFAULT_CONFIG = {
    mode: "hide_danger",      // mark | hide_danger | hide_all
    sensitivity: "medium",    // low | medium | high
    brandMatch: true,
    dangerousTld: true,
    ipDomain: true,
    lureWords: true,
    customList: ""
  };

  let config = Object.assign({}, DEFAULT_CONFIG);
  let hiddenCount = 0;           // 本页已隐藏数量（供统计写入）
  let markedCount = 0;           // 本页已标记数量
  let lang = "zh";               // 界面语言，由配置 language 解析（auto 跟随浏览器）

  // 内置黑名单 → Set（按注册域精确匹配）
  const builtinSet = new Set(
    BPG_BUILTIN_BLACKLIST.map((d) => BPG_HEURISTICS.getRegDomain(d))
  );

  // ---------- 通用工具 ----------

  // base64url 解码（Bing 跳转链接共用）
  function decodeB64Url(p) {
    let b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }

  // 从"展示域名文本"中提取 hostname（百度/搜狗/360 的跳转链接无法本地解码，
  // 只能依赖页面上展示的网址文字，如 "www.example.com/abc"）
  function parseDisplayHost(text) {
    const t = String(text || "").trim();
    if (!t) return "";
    try {
      if (/^https?:\/\//i.test(t)) return new URL(t).hostname.toLowerCase();
      const m = t.match(/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}/i);
      return m ? m[0].toLowerCase() : "";
    } catch (e) {
      return "";
    }
  }

  function safeUrl(href) {
    try {
      const u = new URL(href, location.href);
      if (!/^https?:$/.test(u.protocol)) return null;
      return u;
    } catch (e) {
      return null;
    }
  }

  function textOf(el) {
    return el ? (el.textContent || "").trim() : "";
  }

  // ---------- 引擎适配器 ----------

  function detectEngine() {
    const h = location.hostname.toLowerCase();

    // —— Bing（国际版 / 国内版）——
    if (/(^|\.)bing\.com$/.test(h)) {
      // 自然结果 /ck/a?...&u=<base64url>；竞价广告 /aclk?...&u=a1<base64url>
      function decode(href) {
        try {
          const u = new URL(href, location.href);
          if (/^([a-z-]+\.)?bing\.com$/i.test(u.hostname) &&
              (u.pathname.startsWith("/ck/") || u.pathname.startsWith("/aclk") || u.pathname.startsWith("/aclick"))) {
            let p = u.searchParams.get("u");
            if (p) {
              if (p.startsWith("a1")) p = p.slice(2); // 广告链接的 base64url 带 a1 前缀
              return decodeB64Url(p);
            }
          }
        } catch (e) { /* 解析失败就返回原链接 */ }
        return href;
      }
      return {
        name: "bing",
        items: () => document.querySelectorAll("#b_results > li.b_algo, #b_results > div.b_algo, li.b_algo, #b_results > li.b_ad"),
        extract(item) {
          const link = item.querySelector("h2 a, .b_algo a");
          if (!link || !link.href) return null;
          const href = decode(link.href);
          const u = safeUrl(href);
          if (!u) return null;
          const caption = item.querySelector(".b_caption p, .b_lineclamp2, .b_paractl");
          return {
            item,
            href,
            hostname: u.hostname.toLowerCase(),
            urlPath: u.pathname + u.search,
            title: textOf(link),
            snippet: (textOf(caption) || textOf(item)).slice(0, 300),
            displayUrl: textOf(item.querySelector("cite"))
          };
        }
      };
    }

    // —— 百度 ——
    // 跳转链接 /link?url= 无法本地解码，优先取结果节点的 mu 属性（真实地址），
    // 取不到时回退到页面展示的域名文字
    if (/(^|\.)baidu\.com$/.test(h)) {
      return {
        name: "baidu",
        items: () => document.querySelectorAll("#content_left .result, #content_left .c-container"),
        extract(item) {
          const link = item.querySelector("h3 a");
          if (!link) return null;
          const display = textOf(item.querySelector("cite, .c-color-gray, [class*='source_']"));
          const mu = item.getAttribute("mu");
          const u = mu ? safeUrl(mu) : null;
          const hostname = u ? u.hostname.toLowerCase() : parseDisplayHost(display);
          if (!hostname) return null;
          const abs = item.querySelector(".c-abstract, [class*='content-right'], [class*='content_']");
          return {
            item,
            href: u ? mu : link.href,
            hostname,
            urlPath: u ? u.pathname + u.search : "",
            title: textOf(link),
            snippet: (textOf(abs) || textOf(item)).slice(0, 300),
            displayUrl: display
          };
        }
      };
    }

    // —— 搜狗 ——
    // 同为 /link?url= 服务端跳转，依赖展示域名文字（.fb / cite）
    if (/(^|\.)sogou\.com$/.test(h)) {
      return {
        name: "sogou",
        items: () => document.querySelectorAll("#main .vrwrap, #main .rb"),
        extract(item) {
          const link = item.querySelector("h3 a");
          if (!link) return null;
          const display = textOf(item.querySelector(".fb, cite, [class*='citeurl'], [class*='vr-addr']"));
          const hostname = parseDisplayHost(display);
          if (!hostname) return null;
          return {
            item,
            href: link.href,
            hostname,
            urlPath: "",
            title: textOf(link),
            snippet: textOf(item).slice(0, 300),
            displayUrl: display
          };
        }
      };
    }

    // —— 360 搜索 ——
    if (/(^|\.)so\.com$/.test(h)) {
      return {
        name: "360",
        items: () => document.querySelectorAll("#main li.res-list-genuine, #main .result"),
        extract(item) {
          const link = item.querySelector("h3 a");
          if (!link) return null;
          const display = textOf(item.querySelector(".res-linkinfo, cite, [class*='linkinfo']"));
          const hostname = parseDisplayHost(display);
          if (!hostname) return null;
          return {
            item,
            href: link.href,
            hostname,
            urlPath: "",
            title: textOf(link),
            snippet: textOf(item).slice(0, 300),
            displayUrl: display
          };
        }
      };
    }

    // —— Google ——
    // 直链为主，兼容 /url?q=<真实地址> 包装
    if (/(^|\.)google\.com(\.[a-z]{2})?$/.test(h) || h === "www.google.com.hk") {
      return {
        name: "google",
        items: () => document.querySelectorAll("div.g, div[data-snhf] div.MjjYud"),
        extract(item) {
          const link = item.querySelector("a[href^='http'], a[href^='/url?']");
          if (!link || !link.href) return null;
          let href = link.href;
          try {
            const u0 = new URL(href, location.href);
            if (u0.pathname === "/url") {
              const q = u0.searchParams.get("q");
              if (q) href = q;
            }
          } catch (e) { /* 保持原链接 */ }
          const u = safeUrl(href);
          if (!u || /(^|\.)google\.[a-z.]+$/.test(u.hostname)) return null;
          const titleEl = item.querySelector("h3");
          return {
            item,
            href,
            hostname: u.hostname.toLowerCase(),
            urlPath: u.pathname + u.search,
            title: titleEl ? textOf(titleEl) : textOf(link),
            snippet: textOf(item.querySelector("[data-sncf], .VwiC3b, [style*='-webkit-line-clamp']")).slice(0, 300),
            displayUrl: textOf(item.querySelector("cite"))
          };
        }
      };
    }

    // —— DuckDuckGo ——
    // 链接形如 //duckduckgo.com/l/?uddg=<urlencode 真实地址>，可本地解码
    if (/(^|\.)duckduckgo\.com$/.test(h)) {
      return {
        name: "duckduckgo",
        items: () => document.querySelectorAll("article[data-testid='result'], div.result"),
        extract(item) {
          const link = item.querySelector("a[data-testid='result-title-a'], h2 a");
          if (!link || !link.href) return null;
          let href = link.href;
          try {
            const u0 = new URL(href, location.href);
            if (/duckduckgo\.com$/i.test(u0.hostname) && u0.pathname.startsWith("/l/")) {
              const uddg = u0.searchParams.get("uddg");
              if (uddg) href = decodeURIComponent(uddg);
            }
          } catch (e) { /* 保持原链接 */ }
          const u = safeUrl(href);
          if (!u) return null;
          return {
            item,
            href,
            hostname: u.hostname.toLowerCase(),
            urlPath: u.pathname + u.search,
            title: textOf(link),
            snippet: textOf(item.querySelector("[data-result-snippet], .result__snippet")).slice(0, 300),
            displayUrl: textOf(item.querySelector("[data-testid='result-extras-url'], .result__url"))
          };
        }
      };
    }

    return null; // 未适配的站点不启动扫描
  }

  const ENGINE = detectEngine();

  // 测试钩子：导出纯函数与引擎选择结果供外部验证（不影响运行逻辑）
  if (typeof globalThis.__bpgTestHook === "function") {
    globalThis.__bpgTestHook({ parseDisplayHost, decodeB64Url, safeUrl, engineName: ENGINE ? ENGINE.name : null });
  }

  if (!ENGINE) return;

  // ---------- 判定 ----------

  // 命中内置/自定义/订阅黑名单 → danger（返回来源信息，渲染时按语言取文案）
  function checkBlacklists(candidate, customSet, subHits) {
    const reg = BPG_HEURISTICS.getRegDomain(candidate.hostname);
    if (builtinSet.has(reg)) return { source: "builtin" };
    if (customSet && customSet.has(reg)) return { source: "custom" };
    if (subHits && subHits[candidate.hostname]) return { source: "sub", list: subHits[candidate.hostname] };
    return null;
  }

  // 综合判断：返回 { level, score, reasons, blacklistedFrom }
  function judge(candidate, customSet, subHits, thresholds) {
    const bl = checkBlacklists(candidate, customSet, subHits);
    if (bl) {
      return {
        level: "danger",
        score: 100,
        reasons: [{ weight: 100, key: "bl." + bl.source, params: bl.list ? { list: bl.list } : null }],
        blacklisted: bl.source
      };
    }
    // 按设置开关裁剪信号源（通过传参控制）
    const result = BPG_HEURISTICS.runAnalysis({
      hostname: candidate.hostname,
      urlPath: candidate.urlPath,
      title: candidate.title,
      snippet: candidate.snippet,
      displayUrl: candidate.displayUrl
    }, {
      brandMatch: config.brandMatch,
      dangerousTld: config.dangerousTld,
      ipDomain: config.ipDomain,
      lureWords: config.lureWords
    });
    const score = result.score;
    const reasons = [...result.reasons];

    // 阈值
    const level = score >= thresholds.danger ? "danger"
      : (score >= thresholds.suspicious ? "suspicious" : "safe");
    return { level, score, reasons, blacklisted: null };
  }

  // ---------- 渲染 ----------

  // 判定理由 → 当前语言文案（诱饵后缀是独立 i18n 键，拼接到主理由之后）
  function reasonText(r) {
    let text = bpgT(r.key, lang, r.params || undefined);
    if (r.params && r.params.lure) text += bpgT(r.params.lure, lang);
    return text;
  }

  function renderResult(candidate, verdict, mode) {
    const item = candidate.item;
    const shouldHide = (mode === "hide_all" && verdict.level !== "safe") ||
      (mode === "hide_danger" && verdict.level === "danger");

    if (shouldHide) {
      item.setAttribute("data-bpg-hidden", "1");
      item.style.display = "none";
      hiddenCount++;
    } else if (verdict.level !== "safe") {
      markedCount++;
      // 多条理由只展示前 3 条（按界面语言渲染）
      const reasonText2 = verdict.reasons.slice(0, 3).map(reasonText).join("；");
      const bar = document.createElement("div");
      bar.className = "bpg-warning";
      bar.setAttribute("data-level", verdict.level);
      const title = document.createElement("div");
      title.className = "bpg-warning-title";
      title.textContent = verdict.level === "danger" ? bpgT("warn.danger", lang) : bpgT("warn.suspicious", lang);
      const why = document.createElement("div");
      why.className = "bpg-warning-why";
      why.textContent = bpgT("warn.reasonPrefix", lang) + reasonText2 +
        bpgT("warn.score", lang, { score: verdict.score });
      const act = document.createElement("div");
      act.className = "bpg-warning-act";
      act.textContent = bpgT("warn.tip", lang);
      bar.appendChild(title);
      bar.appendChild(why);
      bar.appendChild(act);
      item.insertBefore(bar, item.firstChild);
    }
  }

  // ---------- 主流程 ----------

  async function querySubList(candidates) {
    // 向 background 查询订阅黑名单命中情况（一次批量；带完整 URL 供 Safe Browsing 用）
    const uniqueHosts = [...new Set(candidates.map((c) => c.hostname))];
    try {
      const res = await chrome.runtime.sendMessage({
        type: "queryDomains",
        hosts: uniqueHosts,
        urls: candidates.map((c) => c.href).slice(0, 500)
      });
      if (res && res.hits) return res.hits;
    } catch (e) { /* background 不可用时忽略订阅查询 */ }
    return {};
  }

  let scanning = false;
  async function scanPending() {
    if (scanning) return;
    scanning = true;
    try {
      const items = ENGINE.items();
      const pending = [];
      for (const it of items) {
        if (it.dataset.bpgDone) continue;
        const cand = ENGINE.extract(it);
        if (!cand) {
          it.dataset.bpgDone = "1";
          continue;
        }
        pending.push(cand);
      }
      if (pending.length === 0) return;

      const thresholds = BPG_HEURISTICS.thresholdsFor(config.sensitivity);
      // 自定义黑名单
      const customSet = new Set(
        String(config.customList || "")
          .split(/\r?\n/)
          .map((s) => s.trim().toLowerCase())
          .filter((s) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s))
          .map((d) => BPG_HEURISTICS.getRegDomain(d))
      );
      // 订阅黑名单（批量查询）
      const subHits = await querySubList(pending);

      const beforeMarked = markedCount;
      const beforeHidden = hiddenCount;
      for (const cand of pending) {
        const verdict = judge(cand, customSet, subHits, thresholds);
        cand.item.dataset.bpgDone = "1";
        renderResult(cand, verdict, config.mode);
      }
      bumpStats(pending.length, markedCount - beforeMarked, hiddenCount - beforeHidden);
    } finally {
      scanning = false;
    }
  }

  // 统计写入 storage（供 popup 展示）
  function bumpStats(newScanned, newMarked, newHidden) {
    try {
      chrome.storage.local.get(STATS_KEY, (data) => {
        const s = data[STATS_KEY] || { scanned: 0, marked: 0, hidden: 0, since: Date.now() };
        s.scanned += newScanned || 0;
        s.marked += newMarked || 0;
        s.hidden += newHidden || 0;
        chrome.storage.local.set({ [STATS_KEY]: s });
      });
    } catch (e) { /* 存储异常忽略 */ }
  }

  // 监听滚动加载
  let obsTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(obsTimer);
    obsTimer = setTimeout(scanPending, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 初始化：读配置后解析语言并开始扫描
  chrome.storage.local.get(CONFIG_KEY, (data) => {
    if (data[CONFIG_KEY]) config = Object.assign(config, data[CONFIG_KEY]);
    lang = bpgResolveLang(config.language);
    scanPending();
  });

  // 配置变更时热更新（含语言切换，立即按新语言重新渲染警告条）
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[CONFIG_KEY]) {
      config = Object.assign({}, DEFAULT_CONFIG, changes[CONFIG_KEY].newValue);
      lang = bpgResolveLang(config.language);
      // 重新处理当前页：先恢复被隐藏项并清除旧警告条
      document.querySelectorAll("[data-bpg-hidden]").forEach((it) => {
        it.style.display = "";
        it.removeAttribute("data-bpg-hidden");
      });
      document.querySelectorAll(".bpg-warning").forEach((el) => el.remove());
      hiddenCount = 0;
      markedCount = 0;
      ENGINE.items().forEach((it) => {
        it.dataset.bpgDone = "";
      });
      scanPending();
    }
  });
})();
