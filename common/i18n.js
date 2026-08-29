// ============================================================
// 运行时轻量 i18n：中英双语文案字典 + 模板渲染
// 语言偏好存于配置 config.language："auto"（跟随浏览器）| "zh" | "en"
// manifest 层（商店展示的名称/描述）走官方 _locales，与此字典互不影响。
// 模板占位符形如 {name}，由 bpgT 的第三个参数替换。
// ============================================================

const BPG_I18N = {
  zh: {
    // ---------- popup ----------
    "popup.running": "运行中",
    "popup.desc": "检测 Bing / 百度 / 搜狗 / 360 等搜索引擎结果中的疑似钓鱼网站",
    "popup.scanned": "已扫描",
    "popup.marked": "已标记",
    "popup.hidden": "已隐藏",
    "popup.mode": "拦截方式",
    "popup.sens": "灵敏度",
    "popup.btnTest": "测试搜索",
    "popup.btnSettings": "设置",
    "popup.btnReset": "重置统计",
    "popup.resetTitle": "清零统计",
    "popup.openFull": "打开完整设置 →",
    "popup.since": "自 {date} 起",
    "mode.mark": "仅标记",
    "mode.hide_danger": "隐藏高危 + 标记可疑",
    "mode.hide_all": "全部隐藏",
    "sens.low": "低（保守）",
    "sens.medium": "中（默认）",
    "sens.high": "高（激进）",
    // ---------- options ----------
    "opt.title": "PhishShield - 设置",
    "opt.banner": "检测并拦截 Bing / 百度 / 搜狗 / 360 / Google / DuckDuckGo 搜索结果中的疑似钓鱼网站 · 修改后点击底部「保存设置」生效",
    "opt.secMode": "拦截方式",
    "opt.mode.mark": "<b>仅标记</b>：在所有结果旁显示警告条，不隐藏任何结果",
    "opt.mode.hide_danger": "<b>隐藏高危并标记可疑</b>（推荐）：只隐藏明确判为钓鱼的结果",
    "opt.mode.hide_all": "<b>全部隐藏</b>：所有可疑/高危结果一律隐藏（可展开）",
    "opt.secSens": "检测灵敏度",
    "opt.sens.low": "<b>低</b>：更保守，减少误报",
    "opt.sens.medium": "<b>中</b>：默认",
    "opt.sens.high": "<b>高</b>：拦截更多，误报可能增加",
    "opt.secLang": "显示语言",
    "opt.lang.auto": "<b>跟随浏览器</b>：按浏览器语言自动选择中文/英文",
    "opt.lang.zh": "<b>简体中文</b>",
    "opt.lang.en": "<b>English</b>",
    "opt.secDims": "检测维度",
    "opt.dim.brand": "品牌仿冒检测（近似拼写、字符混淆、挂名域名、假下载站）",
    "opt.dim.tld": "危险域名后缀（.top / .xyz / .tk 等高危 TLD）",
    "opt.dim.ip": "结构异常（IP 直连域名、超长域名、punycode 等）",
    "opt.dim.lure": "诱导关键词与压缩包分发（login/verify/客服/退款、.zip/.rar 载荷等）",
    "opt.dim.icp": "备案审查（已 ICP 备案的域名自动豁免，减少误报；仅向备案查询服务发送域名）",
    "opt.secCustom": "自定义黑名单",
    "opt.customHint": "每行一个域名（可含子域）。命中即视为危险并隐藏。示例：fake-login.xyz",
    "opt.secSub": "订阅黑名单（远程列表）",
    "opt.subHint": "定期从以下地址抓取域名列表（支持纯文本域名列表或 hosts 文件格式），与本地检测互为补充。已内置三个大型公开黑名单（合计约 50 万活跃钓鱼域名，每日自动更新）；若某源拉取缓慢或不可用，可在 URL 前加 # 注释掉。首次保存设置后开始抓取。",
    "opt.subNamePh": "名称（如 PhishStats）",
    "opt.subUrlPh": "https://example.com/domains.txt",
    "opt.subDel": "删除",
    "opt.subAdd": "+ 添加订阅源",
    "opt.subEmpty": "尚未拉取到任何订阅源，点击下面的「保存设置」后会自动抓取。",
    "opt.subTotal": "当前订阅库：共 {count} 个域名，更新于 {time}",
    "opt.subUnknown": "未知",
    "opt.subRow": "· {name}：成功解析 {count} 个域名（{time}）",
    "opt.secSb": "Google Safe Browsing（可选增强）",
    "opt.sbHint": "填入你自己的 Google Safe Browsing API Key 后，将额外通过 Google 云端威胁情报对结果做二次核验。申请地址：console.cloud.google.com（启用 Safe Browsing API 并创建凭证）。留空则只使用本地检测。",
    "opt.sbPh": "AIza...（可留空）",
    "opt.save": "保存设置",
    "opt.saved": "已保存 ✓（刷新搜索页即可生效）",
    // ---------- content 警告条 ----------
    "warn.danger": "⚠ 高度疑似钓鱼网站",
    "warn.suspicious": "⚠ 疑似钓鱼网站，请谨慎访问",
    "warn.reasonPrefix": "依据：",
    "warn.score": "（评分 {score}/100）",
    "warn.tip": "提示：若确认为误报，忽略本提示即可；谨慎起见请核对地址栏域名后再访问。",
    // ---------- 黑名单来源 ----------
    "bl.builtin": "命中内置黑名单",
    "bl.custom": "命中自定义黑名单",
    "bl.sub": "命中订阅黑名单",
    // ---------- 启发式判定理由 ----------
    "r.ip_domain": "域名本身是 IP 地址（而非正规域名），钓鱼站点常见手法",
    "r.long_domain": "域名过长（{n} 字符），不像正常网站",
    "r.many_hyphens": "域名连字符过多，疑似随机生成的欺诈域名",
    "r.brand_as_sub": "域名整体挂靠知名站点「{domain}」（如 {host}），常见于挂名钓鱼域名",
    "r.brand_in_middle": "域名中间穿插了知名站点「{domain}」，常见于伪造品牌域名",
    "r.brand_tld": "以知名品牌「{domain}」为名注册的高危后缀域名（.{tld}）",
    "r.brand_edit1": "域名「{label}」与知名站点「{domain}」拼写几乎相同（编辑距离 1）",
    "r.brand_edit2": "域名「{label}」与知名站点「{domain}」拼写高度相似",
    "r.brand_confusable": "域名「{label}」通过数字/字母替换伪造「{domain}」",
    "r.brand_affix": "域名「{label}」是品牌「{domain}」的变体（追加/前置字符）",
    "r.sf_sub": "子域名仿冒「{name}」官方站点（含『{kw}』但注册域并非官方），符合银狐木马假下载站特征",
    "r.sf_hyphen": "域名「{label}」用连字符拼接「{name}」软件名（『{kw}』）但并非官方域名，是仿冒下载站的典型注册手法",
    "r.sf_variant": "域名「{label}」是「{name}」的变体拼写（『{kw}』的一字之差仿冒），典型钓鱼域名构造手法",
    "r.sf_label": "域名「{label}」嵌入「{name}」软件名但并非官方域名，疑似仿冒下载站",
    "r.lure_suffix": "，且附带下载/官网诱饵词",
    "r.tld_brand": "危险后缀 .{tld} + 仿冒品牌，钓鱼特征明显",
    "r.tld_lure": "危险后缀 .{tld} 同时包含诱导关键词",
    "r.tld_plain": "使用了风险较高的域名后缀 .{tld}",
    "r.cn_suffix": "仿冒国内知名品牌/软件却注册在 .{suffix} 域名（针对国内产品的常见钓鱼手法）",
    "r.url_lure": "链接路径包含诱导关键词（如 login/verify/secure 等）",
    "r.archive_path": "下载链接直指压缩包（.zip/.rar/.7z），正规软件官网通常提供签名安装包而非压缩包",
    "r.archive_text": "页面文案引导下载压缩包（假下载站常见分发方式）",
    "r.title_lure_en": "页面标题/摘要包含英文诱导关键词",
    "r.cn_lure_word": "标题/摘要包含疑似欺诈话术（{word}）",
    "r.punycode_brand": "域名包含非 ASCII 字符（punycode），是仿冒国际品牌的经典手法",
    "r.punycode_plain": "域名包含非 ASCII 字符，注意核对是否为官方域名"
  },

  en: {
    // ---------- popup ----------
    "popup.running": "Active",
    "popup.desc": "Detects suspected phishing sites in Bing / Baidu / Sogou / 360 and other search results",
    "popup.scanned": "Scanned",
    "popup.marked": "Marked",
    "popup.hidden": "Hidden",
    "popup.mode": "Action mode",
    "popup.sens": "Sensitivity",
    "popup.btnTest": "Test search",
    "popup.btnSettings": "Settings",
    "popup.btnReset": "Reset stats",
    "popup.resetTitle": "Clear statistics",
    "popup.openFull": "Open full settings →",
    "popup.since": "Since {date}",
    "mode.mark": "Mark only",
    "mode.hide_danger": "Hide dangerous + mark suspicious",
    "mode.hide_all": "Hide all",
    "sens.low": "Low (conservative)",
    "sens.medium": "Medium (default)",
    "sens.high": "High (aggressive)",
    // ---------- options ----------
    "opt.title": "PhishShield - Settings",
    "opt.banner": "Detects and blocks suspected phishing sites in Bing / Baidu / Sogou / 360 / Google / DuckDuckGo results · Click \"Save settings\" below to apply",
    "opt.secMode": "Action mode",
    "opt.mode.mark": "<b>Mark only</b>: show a warning bar next to every flagged result, hide nothing",
    "opt.mode.hide_danger": "<b>Hide dangerous, mark suspicious</b> (recommended): hide only results confirmed as phishing",
    "opt.mode.hide_all": "<b>Hide all</b>: hide every suspicious/dangerous result (can be expanded)",
    "opt.secSens": "Detection sensitivity",
    "opt.sens.low": "<b>Low</b>: more conservative, fewer false positives",
    "opt.sens.medium": "<b>Medium</b>: default",
    "opt.sens.high": "<b>High</b>: blocks more, may increase false positives",
    "opt.secLang": "Display language",
    "opt.lang.auto": "<b>Follow browser</b>: pick Chinese/English automatically by browser language",
    "opt.lang.zh": "<b>简体中文</b>",
    "opt.lang.en": "<b>English</b>",
    "opt.secDims": "Detection dimensions",
    "opt.dim.brand": "Brand impersonation (close spellings, character confusables, piggyback domains, fake download sites)",
    "opt.dim.tld": "Dangerous TLDs (.top / .xyz / .tk and other high-risk suffixes)",
    "opt.dim.ip": "Structural anomalies (raw-IP hosts, overly long domains, punycode, etc.)",
    "opt.dim.lure": "Lure keywords & archive payloads (login/verify/support/refund, .zip/.rar drops, etc.)",
    "opt.dim.icp": "ICP filing check (filed domains are exempted automatically to reduce false positives; only domain names are sent to the lookup service)",
    "opt.secCustom": "Custom blacklist",
    "opt.customHint": "One domain per line (subdomains allowed). A hit is treated as dangerous and hidden. Example: fake-login.xyz",
    "opt.secSub": "Subscription blacklists (remote feeds)",
    "opt.subHint": "Periodically fetch domain lists from the addresses below (plain-text domain lists or hosts-file format), complementing local detection. Three large public feeds are built in (~500k active phishing domains in total, updated daily); prefix a URL with # to disable a slow or broken source. Fetching starts after the first save.",
    "opt.subNamePh": "Name (e.g. PhishStats)",
    "opt.subUrlPh": "https://example.com/domains.txt",
    "opt.subDel": "Remove",
    "opt.subAdd": "+ Add feed source",
    "opt.subEmpty": "No feed fetched yet. Click \"Save settings\" below and fetching will start automatically.",
    "opt.subTotal": "Current feed DB: {count} domains in total, updated {time}",
    "opt.subUnknown": "unknown",
    "opt.subRow": "· {name}: parsed {count} domains ({time})",
    "opt.secSb": "Google Safe Browsing (optional enhancement)",
    "opt.sbHint": "Enter your own Google Safe Browsing API key to add cloud-based verification via Google's threat intelligence. Obtain one at console.cloud.google.com (enable the Safe Browsing API and create credentials). Leave empty to use local detection only.",
    "opt.sbPh": "AIza... (optional)",
    "opt.save": "Save settings",
    "opt.saved": "Saved ✓ (refresh the search page to apply)",
    // ---------- content 警告条 ----------
    "warn.danger": "⚠ Highly suspected phishing site",
    "warn.suspicious": "⚠ Suspected phishing site — proceed with caution",
    "warn.reasonPrefix": "Reasons: ",
    "warn.score": " (score {score}/100)",
    "warn.tip": "Tip: if this is a false positive, simply ignore this notice; always double-check the domain in the address bar before visiting.",
    // ---------- 黑名单来源 ----------
    "bl.builtin": "hit the built-in blacklist",
    "bl.custom": "hit the custom blacklist",
    "bl.sub": "hit a subscription blacklist",
    // ---------- 启发式判定理由 ----------
    "r.ip_domain": "The domain itself is an IP address (not a regular domain) — a common phishing technique",
    "r.long_domain": "Domain unusually long ({n} characters), unlike a normal website",
    "r.many_hyphens": "Too many hyphens in the domain, likely a randomly generated fraud domain",
    "r.brand_as_sub": "Domain piggybacks on the well-known site \"{domain}\" (e.g. {host}) — typical of piggyback phishing domains",
    "r.brand_in_middle": "Domain embeds the well-known site \"{domain}\" in the middle — typical of forged brand domains",
    "r.brand_tld": "High-risk suffix domain (.{tld}) registered under the famous brand name \"{domain}\"",
    "r.brand_edit1": "Domain \"{label}\" is nearly identical in spelling to \"{domain}\" (edit distance 1)",
    "r.brand_edit2": "Domain \"{label}\" is highly similar in spelling to \"{domain}\"",
    "r.brand_confusable": "Domain \"{label}\" fakes \"{domain}\" via digit/letter substitution",
    "r.brand_affix": "Domain \"{label}\" is a variant of the brand \"{domain}\" (appended/prepended characters)",
    "r.sf_sub": "Subdomain impersonates the official site of \"{name}\" (contains \"{kw}\" but the registrable domain is not official) — matches Silver Fox fake-download-site patterns",
    "r.sf_hyphen": "Domain \"{label}\" concatenates the \"{name}\" software name with a hyphen (\"{kw}\") but is not the official domain — a typical impersonation-registration technique",
    "r.sf_variant": "Domain \"{label}\" is a variant spelling of \"{name}\" (a one-letter-off impersonation of \"{kw}\") — a classic phishing domain construction",
    "r.sf_label": "Domain \"{label}\" embeds the \"{name}\" software name but is not the official domain — suspected fake download site",
    "r.lure_suffix": ", and it also carries download/official-site lure terms",
    "r.tld_brand": "Dangerous suffix .{tld} + brand impersonation — strong phishing signals",
    "r.tld_lure": "Dangerous suffix .{tld} combined with lure keywords",
    "r.tld_plain": "Uses a high-risk domain suffix .{tld}",
    "r.cn_suffix": "Impersonates a well-known domestic brand/software yet is registered on a .{suffix} domain (a common phishing technique targeting domestic products)",
    "r.url_lure": "URL path contains lure keywords (e.g. login/verify/secure)",
    "r.archive_path": "Download link points directly to an archive (.zip/.rar/.7z); legitimate official sites usually offer signed installers, not archives",
    "r.archive_text": "Page copy promotes downloading an archive (a common distribution method of fake download sites)",
    "r.title_lure_en": "Page title/snippet contains English lure keywords",
    "r.cn_lure_word": "Title/snippet contains suspected scam wording ({word})",
    "r.punycode_brand": "Domain contains non-ASCII characters (punycode) — a classic technique for impersonating international brands",
    "r.punycode_plain": "Domain contains non-ASCII characters; verify whether it is the official domain"
  }
};

// 解析语言偏好："zh" | "en" 直接生效，其余一律按浏览器语言判定（中文系 → zh）
function bpgResolveLang(pref) {
  if (pref === "zh" || pref === "en") return pref;
  try {
    const nav = (typeof navigator !== "undefined" && navigator.language) || "";
    return nav.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch (e) {
    return "zh";
  }
}

// 取文案：params 中的 {key} 占位符会被替换；缺失键回退 zh，再回退键名本身
function bpgT(key, lang, params) {
  const zhDict = BPG_I18N.zh;
  const dict = BPG_I18N[lang] || zhDict;
  let s = dict[key] !== undefined ? dict[key] : (zhDict[key] !== undefined ? zhDict[key] : key);
  if (params) {
    for (const k in params) {
      s = s.split("{" + k + "}").join(String(params[k]));
    }
  }
  return s;
}

// DOM 填充：按 data 属性批量注入文案（自持字典内容，无注入风险）
//   data-i18n → textContent；data-i18n-html → innerHTML（含 <b> 的富文本）
//   data-i18n-ph → placeholder；data-i18n-title → title
function bpgApplyDom(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = bpgT(el.getAttribute("data-i18n"), lang);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = bpgT(el.getAttribute("data-i18n-html"), lang);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = bpgT(el.getAttribute("data-i18n-ph"), lang);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = bpgT(el.getAttribute("data-i18n-title"), lang);
  });
}
