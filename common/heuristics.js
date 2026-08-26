// ============================================================
// 本地启发式钓鱼检测引擎
// 纯逻辑模块（无 DOM / 无外部依赖），扫描 Bing 搜索结果时对每个
// 候选链接执行评分，输出 level: 'safe' | 'suspicious' | 'danger'。
//
// 评分维度：
//   1. 仿冒品牌域名（编辑距离 / 字符混淆 / 前缀后缀扩展 / 子域挂名）
//   2. 危险 TLD 列表（.top .xyz .tk .ml 等诈骗重灾区）
//   3. 诱导关键词（login / verify / 客服 / 退款 / 兑奖 ...）
//   4. 结构特征（纯 IP 域名、超长域名、punycode 同形字等）
//   5. 银狐特化：仿冒软件官网/下载站（SEO 投毒，见 brands.js 中清单）
// 所有规则的分数可叠加，上限 100；默认 70 分判危险、40 分判可疑。
// ============================================================

const BPG_HEURISTICS = (function () {
  "use strict";

  // ---------- 常量 ----------

  // 常见的两段式公共后缀（注册域需要取到倒数第三段）
  const MULTI_TLD = new Set([
    "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn",
    "com.hk", "com.tw", "com.mo", "com.sg", "com.my",
    "co.uk", "org.uk", "ac.uk", "gov.uk",
    "co.jp", "or.jp", "ne.jp", "co.kr", "or.kr",
    "com.au", "net.au", "org.au", "com.br", "com.mx",
    "co.in", "com.tr", "com.ph", "com.vn", "co.th",
    "co.id", "com.pk", "com.bd", "com.eg", "com.sa",
    "co.za", "com.ar", "co.il", "com.ua", "com.pl"
  ]);

 // 品牌域后面允许出现的合法地区后缀（如 paypal.com.cn 的 rest="cn"）
  // 同样匹配 getRegDomain 只返回“至少两段”的近似方式，避免误伤品牌海外站
  const SAFE_AFTER_BRAND = new Set([
    "cn", "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn",
    "hk", "com.hk", "tw", "com.tw", "mo", "com.mo",
    "sg", "com.sg", "my", "com.my", "in", "co.in",
    "jp", "co.jp", "or.jp", "ne.jp", "kr", "co.kr", "or.kr",
    "au", "com.au", "net.au", "org.au", "uk", "co.uk", "org.uk", "ac.uk",
    "br", "com.br", "mx", "com.mx", "de", "fr", "ru", "ca",
    "it", "es", "nl", "se", "no", "fi", "dk", "pl", "ch", "at", "be", "pt",
    "gr", "tr", "com.tr", "th", "co.th", "vn", "com.vn", "id", "co.id",
    "ph", "com.ph", "pk", "com.pk", "bd", "com.bd", "eg", "com.eg",
    "sa", "com.sa", "za", "co.za", "ar", "com.ar", "il", "co.il",
    "ua", "com.ua", "net"
  ]);

  // 诈骗/恶意站点高发 TLD（免费注册、几乎无监管）
  const DANGEROUS_TLDS = new Set([
    "tk", "ml", "ga", "cf", "gq", "top", "xyz", "club",
    "icu", "buzz", "work", "click", "link", "online",
    "site", "live", "stream", "party", "country", "science",
    "racing", "faith", "download", "review", "lol", "monster",
    "rest", "cyou", "pw", "zip", "mov", "quest", "uno", "bet"
  ]);

  // URL 路径 / 参数中的高频诱导词（仿冒登录、验证、账户等场景）
  const URL_LURE_RE =
    /login|signin|sign-in|singin|signi|secure|verify|verification|account|update|confirm|billing|wallet|recover|reset|unlock|suspend/i;

  // 标题 / 摘要中的中文诱导词（冒充客服、退款、兑奖等欺诈话术）
  const CN_LURE_WORDS = [
    "客服", "退款", "兑奖", "中奖", "代购", "认证", "验证",
    "账户冻结", "异常登录", "安全中心", "官方唯一", "备用网址",
    "点击领取", "限时活动", "贷款", "刷单",
    // 银狐新变种常用财税主题诱饵（伪装税务软件/财务工具）
    "金税四期", "金税五期", "个税清缴"
  ];

  // 银狐假下载站域名中的高频“下载/官网”诱饵词（假站域名常带 down/xiazai 等）
  const SF_DOWNLOAD_LURE_RE = /down|download|xiazai|setup|install|guanwang|official/i;
  // 中文标题/摘要中的下载站诱饵文案（假站标题通常是“XX官网下载-免费最新版”）
  const CN_DOWNLOAD_LURE_RE = /官网|下载|安装包|最新版|电脑版|免费版|正式版|绿色版/;

  // 压缩包分发特征：假下载站常把捆绑远控木马的载荷打包成 .zip/.rar/.7z
  // 分发（绕过浏览器下载安全检测），而正规软件官网提供签名的 .exe/.msi/.dmg 安装包
  const ARCHIVE_PATH_RE = /\.(zip|rar|7z)([?#]|$)/i;
  // 标题/摘要中的压缩包分发文案（“下载压缩包”“解压即可使用”）
  const CN_ARCHIVE_LURE_RE = /压缩包|解压即可|解压后(安装|运行|使用)/;

  // 短关键词（≤3 字符，如 qq）按完整标签或连字符分词匹配，避免误伤；
  // 长关键词（如 chrome）允许子串包含（命中 mb-google-chrome 这类标签）
  function labelHasKeyword(label, kw) {
    if (kw.length <= 3) {
      return label === kw || label.startsWith(kw + "-") || label.endsWith("-" + kw);
    }
    return label.includes(kw);
  }

  // ---------- 基础工具 ----------

  // 提取注册域（eTLD+1），输入 hostname，如
  //   "paypal.com.secure-login.xyz" -> "secure-login.xyz"
  //   "inner.bankcomm.com"          -> "bankcomm.com"
  //   "www.icbc.com.cn"             -> "icbc.com.cn"
  function getRegDomain(hostname) {
    let h = String(hostname || "").toLowerCase().trim();
    h = h.replace(/^https?:\/\//, "").replace(/^www\d*\./, "");
    const parts = h.split(".");
    if (parts.length <= 2) return h;
    const lastTwo = parts.slice(-2).join(".");
    if (MULTI_TLD.has(lastTwo) && parts.length >= 3) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  }

  function getTld(hostname) {
    return getRegDomain(hostname).split(".").pop();
  }

  // 编辑距离（Levenshtein），用于检测近似拼写的仿冒域名
  function editDistance(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      // 交换滚动数组
      const t = prev; prev = curr; curr = t;
    }
    return prev[n];
  }

  // 字符混淆归一化：把数字/符号替换回常见字母，用于检测 p4ypal 这类写法
  const CONFUSABLE_MAP = {
    "0": "o", "1": "l", "3": "e", "4": "a", "5": "s",
    "7": "t", "8": "b", "9": "g", "2": "z", "6": "g",
    "!": "l", "@": "a", "$": "s", "|1": "ll"
  };

  function normalizeConfusable(s) {
    return String(s).toLowerCase().replace(/[0134578962!@$]/g, (c) => CONFUSABLE_MAP[c] || c);
  }

  // ---------- 主评分入口 ----------

  /**
   * input: {
   *   hostname:  目标域名（解析后的 host）
   *   urlPath:   路径 + 查询串（通常为真实目标 URL 的一部分）
   *   title:     搜索结果标题
   *   snippet:   搜索结果摘要
   *   displayUrl:Bing 展示的网址文本（可缺省）
   * }
   * opts: {
   *   brandMatch, dangerousTld, ipDomain(structure), lureWords
   *   —— 对应 options 页的检测开关，默认全部开启
   * }
   * 返回 { level, score, reasons: [ { weight, key, params } ] }
   * reasons 采用 i18n 键 + 参数结构，由渲染方（content.js）按语言取文案
   */
  function runAnalysis(input, opts) {
    const o = Object.assign(
      { brandMatch: true, dangerousTld: true, ipDomain: true, lureWords: true },
      opts || {}
    );
    const host = String(input.hostname || "").toLowerCase();
    const reg = getRegDomain(host);
    const hostLabel = reg.split(".")[0];           // 注册域主标签
    const tld = reg.split(".").pop();
    const path = String(input.urlPath || "");
    const title = String(input.title || "");
    const snippet = String(input.snippet || "");
    const allText = [title, snippet, input.displayUrl].join(" ");

    const reasons = [];
    let score = 0;
    const bump = (w, key, params) => {
      score = Math.min(100, score + w);
      reasons.push({ weight: w, key, params: params || null });
    };
    const setMax = (w, key, params) => {
      if (w > score) {
        score = Math.min(100, w);
        reasons.push({ weight: w, key, params: params || null });
      }
    };

    // ---- 0. 结构异常（开关：ipDomain）----
    if (o.ipDomain && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      setMax(60, "r.ip_domain");
    }
    if (o.ipDomain && !/^\d/.test(host) && host.length > 35) {
      bump(10, "r.long_domain", { n: host.length });
    }
    if (o.ipDomain && (host.match(/-/g) || []).length > 2) {
      bump(10, "r.many_hyphens");
    }
    // punycode / 同形字（多字节字符仿冒拉丁字母品牌）
    const hasNonAscii = /[^\x00-\x7F]/.test(host);

    // ---- 1. 品牌仿冒检测（开关：brandMatch）----
    // 兜底：注册域本身就是清单中某个知名域名（如 icbc.com.cn / psbc.com）→ 直接安全，
    // 避免被其他品牌的相似度规则误伤（icbc 与 psbc 编辑距离仅 1）
    if (o.brandMatch && BPG_BRANDS_LIST.some((b) => getRegDomain(b.domain) === reg)) {
      return { level: "safe", score: 0, reasons: [] };
    }
    // 同理：注册域是软件清单中某款的官方域名（如 kugou.com / obsidian.md）也全局放行，
    // 防品牌互伤（kugou（酷狗）与 sogou（搜狗）编辑距离仅 1，但都是正规品牌）
    if (o.brandMatch && typeof BPG_SOFTWARE_TARGETS_LIST !== "undefined" &&
        BPG_SOFTWARE_TARGETS_LIST.some((sw) => sw.official.map(getRegDomain).includes(reg))) {
      return { level: "safe", score: 0, reasons: [] };
    }
    let brandHit = false;
    if (o.brandMatch) {
      for (const b of BPG_BRANDS_LIST) {
      const brandReg = getRegDomain(b.domain);
      const brandLabel = brandReg.split(".")[0];

      // 1a. 子域挂名：paypal.com.evil.xyz —— 品牌域名被当作子域前缀，几乎必钓鱼。
      //      rest 如果属于合法的地区后缀（如 cn / com.cn），视为品牌海外站，放行。
      if (b.domain.length >= 4 && host !== b.domain && host.startsWith(b.domain + ".")) {
        const rest = host.slice(b.domain.length + 1);
        if (!SAFE_AFTER_BRAND.has(rest)) {
          setMax(90, "r.brand_as_sub", { domain: b.domain, host });
          brandHit = true;
          break;
        }
      }
      // hostname 中间穿插品牌：x.paypal.com.evil.xyz（品牌域名不是末尾结尾）
      if (b.domain.length >= 4 && host.indexOf(b.domain + ".") > 0 &&
          !host.endsWith("." + b.domain) && reg !== brandReg) {
        setMax(90, "r.brand_in_middle", { domain: b.domain });
        brandHit = true;
        break;
      }

      // 注册域主标签与品牌主标签相同：
      //   - 后缀危险（paypal.top）→ 判定为仿冒，交给危险 TLD 规则
      //   - 后缀正常（paypal.com.cn / paypal.co.uk）→ 视为品牌地区站，放行
      if (hostLabel === brandLabel) {
        if (DANGEROUS_TLDS.has(tld)) {
          setMax(70, "r.brand_tld", { domain: b.domain, tld });
          brandHit = true;
        }
        continue;
      }

      // 1b. 编辑距离近似：paypa1.com / amaz0n.com
      //      品牌主标签过短（≤3，如 x、qq）时跳过：短标签对短域名的编辑距离无区分度，
      //      会把 qq / hl 等无关短域名全部误报（真正的仿冒如 x-com.xyz 由 1d 前后缀规则兼顾）；
      //      另外双方都是 ≤4 字符的英文缩写且距离 ≤1 时（如 icbc vs psbc），
      //      一字之差往往是另一个独立品牌而非仿冒，直接跳过该品牌（仿冒短品牌交给 1c/1d）
      const dist = editDistance(hostLabel, brandLabel);
      const lenDiff = Math.abs(hostLabel.length - brandLabel.length);
      if (dist <= 1 && hostLabel.length <= 4 && brandLabel.length <= 4 && hostLabel !== brandLabel) {
        continue;
      }
      if (brandLabel.length >= 4 && dist <= 1 && lenDiff <= 1) {
        setMax(90, "r.brand_edit1", { label: hostLabel, domain: b.domain });
        brandHit = true;
        break;
      }
      if (brandLabel.length >= 4 && dist <= 2 && lenDiff <= 2) {
        setMax(60, "r.brand_edit2", { label: hostLabel, domain: b.domain });
        brandHit = true;
        break;
      }

      // 1c. 字符混淆：p4ypal / am4zon
      if (hostLabel !== brandLabel && normalizeConfusable(hostLabel) === brandLabel) {
        setMax(70, "r.brand_confusable", { label: hostLabel, domain: b.domain });
        brandHit = true;
        break;
      }

      // 1d. 前后缀扩展：paypal-secure / securepaypal / paypal-login（短品牌名跳过，避免误伤）
      if (brandLabel.length >= 4 &&
          (hostLabel.startsWith(brandLabel) || hostLabel.endsWith(brandLabel)) &&
          lenDiff >= 1 && lenDiff <= 6) {
        const plus = URL_LURE_RE.test(path) ? 65 : 55;
        setMax(plus, "r.brand_affix", { label: hostLabel, domain: b.domain });
        brandHit = true;
        break;
      }
      }
    }

    // ---- 1e. 银狐特化：仿冒软件官网/下载站（SEO 投毒）----
    // 典型形态：子域含软件名关键词但注册域非官方（mb-google-chrome.xxx.hl.cn）
    // 或域名标签嵌入软件名并附带下载诱饵（wpsdown.cn + “官网免费下载”）
    if (o.brandMatch && typeof BPG_SOFTWARE_TARGETS_LIST !== "undefined" &&
        !BPG_TRUSTED_HOSTS.has(reg) && !BPG_TRUSTED_HOSTS.has(host)) {
      const labels = host.split(".");
      const subLabels = labels.slice(0, Math.max(0, labels.length - reg.split(".").length));
      for (const sw of BPG_SOFTWARE_TARGETS_LIST) {
        // 官网本身（含子域）直接放行，如 www.wps.cn / dl.google.com
        if (sw.official.map(getRegDomain).includes(reg)) break;

        // 形态一：子域标签含软件名关键词（假官网最常见手法，强信号）
        const subHit = sw.keywords.find((kw) => subLabels.some((l) => labelHasKeyword(l, kw)));
        if (subHit) {
          setMax(75, "r.sf_sub", { name: sw.name, kw: subHit });
          brandHit = true;
          break;
        }

        // 形态二：注册域标签嵌入软件名，按拼接方式分级：
        //   连字符拼接（deepseek-com / cn-qishui）是钓鱼团伙批量注册
        //   的典型手法——正规品牌几乎不会这样组合注册，直接进危险档；
        //   普通子串嵌入（长关键词如 chrome 允许 contains，短关键词如
        //   wps 只认前/后缀拼接）信号较弱，叠加下载诱饵后升级。
        const hyphenHit = sw.keywords.find((kw) =>
          hostLabel.startsWith(kw + "-") || hostLabel.endsWith("-" + kw));
        if (hyphenHit) {
          const lure = SF_DOWNLOAD_LURE_RE.test(host) ||
            CN_DOWNLOAD_LURE_RE.test(title + " " + snippet);
          setMax(lure ? 85 : 70, "r.sf_hyphen", { label: hostLabel, name: sw.name, kw: hyphenHit, lure: lure ? "r.lure_suffix" : "" });
          brandHit = true;
          break;
        }
        // 形态二-b：连字符分词中的关键词变体拼写（编辑距离 1）——钓鱼团伙最爱的
        //   一字之差手法，如 gf-sougoui（sougoui≈sougou，仿冒搜狗）、app-chromee；
        //   正规厂商不会用这种拼写注册域名，直接进危险档（仅对 ≥5 字符关键词启用，
        //   短关键词编辑距离 1 无区分度）
        const segs = hostLabel.split("-");
        if (segs.length >= 2) {
          const variantHit = sw.keywords.find((kw) => kw.length >= 5 && segs.some((sg) =>
            sg.length >= 4 && sg !== kw &&
            Math.abs(sg.length - kw.length) <= 1 && editDistance(sg, kw) === 1));
          if (variantHit) {
            const lure = SF_DOWNLOAD_LURE_RE.test(host) ||
              CN_DOWNLOAD_LURE_RE.test(title + " " + snippet);
            setMax(lure ? 85 : 75, "r.sf_variant", { label: hostLabel, name: sw.name, kw: variantHit, lure: lure ? "r.lure_suffix" : "" });
            brandHit = true;
            break;
          }
        }
        // 注：官方域名已在上方 break 放行，此处“主标签与品牌词完全相同但注册域非官方”
        // 本身即仿冒信号（如 qissmusic.com.cn 自称汽水音乐），不再豁免精确相等，
        // 否则仿冒变体拼写（qiss/qisui 等）注册的同名站会被漏掉
        const labelHit = sw.keywords.find((kw) => {
          if (kw.length >= 5) return hostLabel.includes(kw);
          // 短关键词只认完整标签或前/后缀拼接（wpsdown / downwps），避免误伤不相关域名；
          // hostLabel === kw 视为“品牌名直接注册在非官方域名”（同属仿冒信号）
          return hostLabel.includes(kw) &&
            (hostLabel === kw || hostLabel.startsWith(kw) || hostLabel.endsWith(kw));
        });
        if (labelHit) {
          const lure = SF_DOWNLOAD_LURE_RE.test(host) ||
            CN_DOWNLOAD_LURE_RE.test(title + " " + snippet);
          setMax(lure ? 70 : 55, "r.sf_label", { label: hostLabel, name: sw.name, lure: lure ? "r.lure_suffix" : "" });
          brandHit = true;
          break;
        }
      }
    }

    // ---- 2. 危险 TLD 压制（开关：dangerousTld）----
    if (o.dangerousTld && DANGEROUS_TLDS.has(tld)) {
      if (brandHit) {
        bump(30, "r.tld_brand", { tld });
      } else if (URL_LURE_RE.test(path) || CN_LURE_WORDS.some(w => allText.includes(w))) {
        bump(40, "r.tld_lure", { tld });
      } else {
        bump(20, "r.tld_plain", { tld });
      }
    }

    // ---- 2b. 国内两段式后缀增强（开关：brandMatch）----
    // 国内产品钓鱼的规律：.com.cn/.net.cn 注册门槛极低，且仿冒国内品牌时
    // 用户对 .cn 结尾域名天然信任（实测案例：deepseek-com.com.cn、qissmusic.com.cn）。
    // 单独不定性（正规国内企业大量使用 com.cn），仅在已命中仿冒信号时加权；
    // 官方品牌自身的 com.cn 域名在上方已放行（不会置位 brandHit）
    if (o.brandMatch && brandHit && /\.(com|net|org)\.cn$/.test(reg)) {
      bump(15, "r.cn_suffix", { suffix: reg.split(".").slice(-2).join(".") });
    }

    // ---- 3. 诱导关键词（开关：lureWords）----
    if (o.lureWords) {
      if (URL_LURE_RE.test(path)) {
        bump(25, "r.url_lure");
      }
      // 下载链接直指压缩包：假下载站用压缩包包装木马载荷的典型手法，
      // 单独不足以定性（正规绿色版软件也用 zip），但与其他信号叠加后快速达阈
      if (ARCHIVE_PATH_RE.test(path)) {
        bump(25, "r.archive_path");
      }
      if (CN_ARCHIVE_LURE_RE.test(allText)) {
        bump(10, "r.archive_text");
      }
      if (URL_LURE_RE.test(title + " " + snippet)) {
        bump(10, "r.title_lure_en");
      }
      for (const w of CN_LURE_WORDS) {
        if (allText.includes(w)) {
          bump(15, "r.cn_lure_word", { word: w });
          break;
        }
      }
    }

    // ---- 4. 同形字升级 ----
    if (hasNonAscii) {
      if (brandHit) {
        bump(40, "r.punycode_brand");
      } else {
        bump(25, "r.punycode_plain");
      }
    }

    // ---- 5. 判定级别 ----
    const level = score >= 70 ? "danger" : (score >= 40 ? "suspicious" : "safe");
    return { level, score, reasons };
  }

  // 灵敏度 → 阈值（即多少分判定为可疑 / 危险）
  function thresholdsFor(sensitivity) {
    // low 更保守（不易误报），high 更激进（拦截更多）
    const base = { suspicious: 40, danger: 70 };
    if (sensitivity === "low") return { suspicious: 55, danger: 80 };
    if (sensitivity === "high") return { suspicious: 30, danger: 60 };
    return base;
  }

  return {
    getRegDomain,
    getTld,
    editDistance,
    normalizeConfusable,
    isDangerousTld: (t) => DANGEROUS_TLDS.has(String(t).toLowerCase()),
    labelHasKeyword,
    runAnalysis,
    thresholdsFor,
    URL_LURE_RE,
    CN_LURE_WORDS
  };
})();