// ============================================================
// 知名品牌/机构域名库 —— 钓鱼攻击最常见的仿冒对象
// 启发式检测会把搜索结果中的域名与以下品牌做"相似度"比对：
//   1. 编辑距离极小的仿冒拼写（paypa1.com、amaz0n.com）
//   2. 子域伪装（paypal.com.secure-login.xyz 这类挂名域名）
//   3. 字符混淆（数字/字母互替，如 0→o、1→l、5→s）
// [需要维护时] 新增条目只需添加 { domain, name } 对象：
//   domain 为该品牌的真实注册域（如 icbc.com.cn）
//   name   为用于匹配的品牌词（如 icbc、中国工商银行）
// ============================================================

const BPG_BRANDS = [
  // —— 国际支付/电商 ——
  { domain: "paypal.com",     name: "paypal" },
  { domain: "amazon.com",     name: "amazon" },
  { domain: "ebay.com",       name: "ebay" },
  { domain: "aliexpress.com", name: "aliexpress" },
  { domain: "apple.com",      name: "apple" },
  { domain: "appstore.com",   name: "appstore" },

  // —— 互联网巨头 / 社交 ——
  { domain: "microsoft.com",  name: "microsoft" },
  { domain: "outlook.com",    name: "outlook" },
  { domain: "office.com",     name: "office" },
  { domain: "google.com",     name: "google" },
  { domain: "facebook.com",   name: "facebook" },
  { domain: "instagram.com",  name: "instagram" },
  { domain: "whatsapp.com",   name: "whatsapp" },
  { domain: "x.com",          name: "twitter" },
  { domain: "telegram.org",   name: "telegram" },
  { domain: "linkedin.com",   name: "linkedin" },
  { domain: "tiktok.com",     name: "tiktok" },

  // —— 加密货币 / 投资 ——
  { domain: "binance.com",    name: "binance" },
  { domain: "coinbase.com",   name: "coinbase" },
  { domain: "metamask.io",    name: "metamask" },
  { domain: "blockchain.com", name: "blockchain" },
  { domain: "okx.com",        name: "okx" },
  { domain: "huobi.com",      name: "huobi" },

  // —— 国内平台 ——
  { domain: "taobao.com",     name: "taobao" },
  { domain: "tmall.com",      name: "tmall" },
  { domain: "jd.com",         name: "jd" },
  { domain: "pinduoduo.com",  name: "pinduoduo" },
  { domain: "baidu.com",      name: "baidu" },
  { domain: "qq.com",         name: "qq" },
  { domain: "weixin.qq.com",  name: "weixin" },
  { domain: "weibo.com",      name: "weibo" },
  { domain: "bilibili.com",   name: "bilibili" },
  { domain: "douyin.com",     name: "douyin" },
  { domain: "zhihu.com",      name: "zhihu" },
  { domain: "163.com",        name: "163" },
  { domain: "aliyun.com",     name: "aliyun" },
  { domain: "alipay.com",     name: "alipay" },

  // —— 国内银行 ——
  { domain: "icbc.com.cn",    name: "icbc" },
  { domain: "ccb.com",        name: "ccb" },
  { domain: "abchina.com",    name: "abchina" },
  { domain: "boc.cn",         name: "boc" },
  { domain: "bankcomm.com",   name: "bankcomm" },
  { domain: "cmbchina.com",   name: "cmbchina" },
  { domain: "spdb.com.cn",    name: "spdb" },
  { domain: "cib.com.cn",     name: "cib" },
  { domain: "cebbank.com",    name: "cebbank" },
  { domain: "psbc.com",       name: "psbc" },
  { domain: "citicbank.com",  name: "citicbank" },

  // —— 国际品牌地区站/附属域名（防误报 + 扩大仿冒识别面）——
  { domain: "amazon.cn",      name: "amazon" },
  { domain: "amazon.co.uk",   name: "amazon" },
  { domain: "amazon.co.jp",   name: "amazon" },
  { domain: "amazon.de",      name: "amazon" },
  { domain: "apple.com.cn",   name: "apple" },
  { domain: "microsoftonline.com", name: "microsoft" },
  { domain: "live.com",       name: "microsoft" },
  { domain: "msn.com",        name: "microsoft" },
  { domain: "skype.com",      name: "skype" },
  { domain: "github.com",     name: "github" },
  { domain: "google.cn",      name: "google" },
  { domain: "youtube.com",    name: "youtube" },
  { domain: "youtu.be",       name: "youtube" },
  { domain: "gstatic.com",    name: "google" },
  { domain: "bing.com",       name: "bing" },
  { domain: "yahoo.com",      name: "yahoo" },
  { domain: "netflix.com",    name: "netflix" },
  { domain: "steamcommunity.com", name: "steam" },
  { domain: "steampowered.com",   name: "steam" },
  { domain: "discord.com",    name: "discord" },
  { domain: "reddit.com",     name: "reddit" },
  { domain: "pinterest.com",  name: "pinterest" },
  { domain: "snapchat.com",   name: "snapchat" },
  { domain: "twitch.tv",      name: "twitch" },
  { domain: "dropbox.com",    name: "dropbox" },
  { domain: "adobe.com",      name: "adobe" },
  { domain: "oracle.com",     name: "oracle" },
  { domain: "nvidia.com",     name: "nvidia" },
  { domain: "intel.com",      name: "intel" },
  { domain: "amd.com",        name: "amd" },
  { domain: "samsung.com",    name: "samsung" },
  { domain: "huawei.com",     name: "huawei" },
  { domain: "xiaomi.com",     name: "xiaomi" },
  { domain: "mi.com",         name: "xiaomi" },
  { domain: "oppo.com",       name: "oppo" },
  { domain: "vivo.com",       name: "vivo" },
  { domain: "lenovo.com",     name: "lenovo" },
  { domain: "dell.com",       name: "dell" },
  { domain: "hp.com",         name: "hp" },

  // —— 邮箱 / 搜索 ——
  { domain: "gmail.com",      name: "gmail" },
  { domain: "hotmail.com",    name: "hotmail" },
  { domain: "126.com",        name: "126" },
  { domain: "yeah.net",       name: "yeah" },
  { domain: "sina.com",       name: "sina" },
  { domain: "sohu.com",       name: "sohu" },
  { domain: "sogou.com",      name: "sogou" },

  // —— 国内平台短域/附属域名 ——
  { domain: "baidu.cn",       name: "baidu" },
  { domain: "bdstatic.com",   name: "baidu" },
  { domain: "bcebos.com",     name: "baidu" },
  { domain: "1688.com",       name: "1688" },
  { domain: "b2b.cn",         name: "alibaba" },
  { domain: "tmall.hk",       name: "tmall" },
  { domain: "jd.hk",          name: "jd" },
  { domain: "bilibili.cn",    name: "bilibili" },
  { domain: "b23.tv",         name: "bilibili" },
  { domain: "acg.tv",         name: "bilibili" },
  { domain: "zhihu.cn",       name: "zhihu" },
  { domain: "csdn.net",       name: "csdn" },
  { domain: "jianshu.com",    name: "jianshu" },
  { domain: "meituan.com",    name: "meituan" },
  { domain: "dianping.com",   name: "dianping" },
  { domain: "ele.me",         name: "eleme" },
  { domain: "ctrip.com",      name: "ctrip" },
  { domain: "qunar.com",      name: "qunar" },
  { domain: "58.com",         name: "58" },
  { domain: "ganji.com",      name: "ganji" },
  { domain: "youku.com",      name: "youku" },
  { domain: "iqiyi.com",      name: "iqiyi" },
  { domain: "kuaishou.com",   name: "kuaishou" },
  { domain: "xiaohongshu.com", name: "xiaohongshu" },
  { domain: "xhslink.com",    name: "xiaohongshu" },

  // —— 国内办公/云盘/运营商 ——
  { domain: "foxmail.com",    name: "foxmail" },
  { domain: "yunpan.com",     name: "360" },
  { domain: "10086.cn",       name: "10086" },
  { domain: "10010.com",      name: "10010" },
  { domain: "189.cn",         name: "189" },

  // —— 银行/证券/金融 ——
  { domain: "95588.com.cn",   name: "icbc" },
  { domain: "95533.com",      name: "ccb" },
  { domain: "95566.com.cn",   name: "boc" },
  { domain: "95559.com.cn",   name: "bankcomm" },
  { domain: "95599.cn",       name: "abchina" },
  { domain: "95555.cn",       name: "cmbchina" },
  { domain: "95528.com",      name: "spdb" },
  { domain: "95561.com",      name: "cib" },
  { domain: "95580.net",      name: "psbc" },
  { domain: "95508.com",      name: "gdb" },
  { domain: "95577.com.cn",   name: "hxb" },
  { domain: "bankofbeijing.com.cn", name: "bankofbeijing" },
  { domain: "bankofshanghai.com",   name: "bankofshanghai" },
  { domain: "securities.com", name: "securities" },
  { domain: "gf.com.cn",      name: "gf" },
  { domain: "csc.com.cn",     name: "csc" },
  { domain: "guosen.com.cn",  name: "guosen" },
  { domain: "htsc.com.cn",    name: "htsc" },
  { domain: "eastmoney.com",  name: "eastmoney" },
  { domain: "10jqka.com.cn",  name: "10jqka" },
  { domain: "gtja.com",       name: "gtja" },

  // —— 支付/清算 ——
  { domain: "alipay.cn",      name: "alipay" },
  { domain: "tenpay.com",     name: "tenpay" },
  { domain: "unionpay.com",   name: "unionpay" },
  { domain: "95516.com",      name: "unionpay" },
  { domain: "95516.net",      name: "unionpay" },

  // —— 政务/公共服务（钓鱼重灾区，官方域放行可防误报）——
  { domain: "gov.cn",         name: "gov" },
  { domain: "pbc.gov.cn",     name: "pbc" },
  { domain: "chinatax.gov.cn", name: "chinatax" },
  { domain: "12333.gov.cn",   name: "12333" },
  { domain: "samr.gov.cn",    name: "samr" },
  { domain: "mps.gov.cn",    name: "mps" },
  { domain: "12377.cn",       name: "12377" },
  { domain: "miit.gov.cn",    name: "miit" },
  { domain: "mof.gov.cn",     name: "mof" },
  { domain: "mofcom.gov.cn",  name: "mofcom" },
  { domain: "stats.gov.cn",   name: "stats" },
  { domain: "customs.gov.cn", name: "customs" },
  { domain: "nmpa.gov.cn",    name: "nmpa" },
  { domain: "12306.cn",       name: "12306" },
  { domain: "95306.cn",       name: "95306" },
  { domain: "tsinghua.edu.cn", name: "tsinghua" },
  { domain: "pku.edu.cn",     name: "pku" },
  { domain: "fudan.edu.cn",   name: "fudan" },
  { domain: "sjtu.edu.cn",    name: "sjtu" },
  { domain: "zju.edu.cn",     name: "zju" }
];

// 供其他脚本使用
const BPG_BRANDS_LIST = BPG_BRANDS;

// ============================================================
// 银狐（Silver Fox / Winos 4.0）木马特化清单（2026 年情报）
// 银狐当前最主要的搜索侧传播方式是 SEO 投毒：黑产批量注册仿冒
// 常用软件的“假官网下载站”，霸占搜索结果前列（含竞价广告位），
// 用户下载的安装包内捆绑银狐远控木马。
// 依据：CNCERT 2026-05 风险提示（仿冒 Chrome/WPS 合计占 77.4%）
//       及各安全厂商公开威胁情报。
// keywords: 假站域名中常出现的软件名关键词（子域或域名标签）
// official: 该软件的真实官方注册域，命中即视为官网放行；
//           空数组表示该软件没有官方下载站（如开源的 Clash，
//           一切自称“Clash 官网”的下载站都高度可疑）。
// ============================================================
const BPG_SOFTWARE_TARGETS = [
  { name: "Google Chrome 浏览器", keywords: ["chrome", "google-chrome"], official: ["google.com", "google.cn", "google.com.hk", "chrome.com"] },
  { name: "WPS Office",          keywords: ["wps"],                       official: ["wps.cn", "wps.com"] },
  { name: "Telegram",            keywords: ["telegram"],                  official: ["telegram.org", "telegram.com"] },
  { name: "WhatsApp",            keywords: ["whatsapp"],                  official: ["whatsapp.com"] },
  { name: "LetsVPN（快连）",     keywords: ["letsvpn", "kuailian"],       official: ["letsvpn.com"] },
  { name: "Clash",               keywords: ["clash"],                     official: [] },
  { name: "钉钉",                keywords: ["dingtalk", "dingding"],      official: ["dingtalk.com"] },
  { name: "飞书",                keywords: ["feishu"],                    official: ["feishu.cn"] },
  { name: "腾讯会议",            keywords: ["tencentmeeting", "tencent-meeting"], official: ["tencent.com"] },
  { name: "ToDesk 远程控制",     keywords: ["todesk"],                    official: ["todesk.com"] },
  { name: "向日葵远程控制",      keywords: ["sunlogin"],                  official: ["oray.com"] },
  { name: "DeepSeek",            keywords: ["deepseek"],                  official: ["deepseek.com", "deepseek.cn"] },
  { name: "Notepad++",           keywords: ["notepad"],                   official: ["notepad-plus-plus.org"] },
  { name: "有道翻译",            keywords: ["youdao"],                    official: ["youdao.com"] },
  { name: "Firefox 浏览器",      keywords: ["firefox"],                   official: ["firefox.com", "firefox.com.cn", "mozilla.org"] },
  { name: "搜狗浏览器",          keywords: ["sogou", "sougou"],           official: ["sogou.com"] }, // sougou 为高频误拼，假站常用
  { name: "FinalShell",          keywords: ["finalshell"],                official: ["finalshell.com"] },
  { name: "火绒安全",            keywords: ["huorong"],                   official: ["huorong.cn"] },
  { name: "CPU-Z",               keywords: ["cpuz", "cpu-z"],             official: ["cpuid.com"] },
  { name: "Edge 浏览器",         keywords: ["msedge", "microsoft-edge"],  official: ["microsoft.com"] },
  { name: "微信",                keywords: ["weixin", "wechat"],          official: ["qq.com", "wechat.com"] },
  { name: "QQ",                  keywords: ["qq"],                        official: ["qq.com"] },
  { name: "快压",                keywords: ["kuaizip"],                   official: ["kuaizip.com"] },
  // 汽水音乐（抖音/字节跳动官方出品）：官方入口 music.douyin.com（注册域 douyin.com）
  // 与 PC 端官网 qishui.com；
  // 2026-08 实测发现 qissmusic.com.cn / qishuidou.com.cn / cn-qishui.com 等仿冒站经 Bing 传播，
  // qiss 为 qishui 的常见仿冒变体拼写，一并纳入关键词识别（无合法站点以此命名）
  { name: "汽水音乐",            keywords: ["qishui", "qissmusic"],        official: ["douyin.com", "qishui.com"] },

  // —— 国内常用软件（SEO 投毒高频仿冒对象，2026-08 扩充）——
  { name: "搜狗输入法",          keywords: ["sougousrf", "sougoushurufa"], official: ["sogou.com"] },
  { name: "百度输入法",          keywords: ["baidushuru", "baiduinput"],   official: ["baidu.com"] },
  { name: "讯飞输入法",          keywords: ["xunfeishuru", "iflyime"],     official: ["iflyime.com", "xunfei.cn"] },
  { name: "QQ 输入法",           keywords: ["qqshuru", "qqinput"],         official: ["qq.com"] },
  { name: "2345 浏览器",         keywords: ["2345"],                       official: ["2345.com"] },
  { name: "360 安全浏览器",      keywords: ["360browser", "360se"],        official: ["360.cn", "360.com"] },
  { name: "360 安全卫士",        keywords: ["360safe", "360weishi"],       official: ["360.cn", "360.com"] },
  { name: "腾讯电脑管家",        keywords: ["guanjia", "pcmanager"],       official: ["qq.com"] },
  { name: "鲁大师",              keywords: ["ludashi"],                    official: ["ludashi.com"] },
  { name: "驱动精灵",            keywords: ["dongting", "drivergenius"],   official: ["drivergenius.com"] },
  { name: "驱动人生",            keywords: ["drvsky", "qudongrensheng"],   official: ["160.com"] },
  { name: "爱思助手",            keywords: ["isi", "i4"],                  official: ["i4.cn"] },
  { name: "剪映",                keywords: ["jianying", "capcut"],         official: ["jianying.com", "capcut.com"] },
  { name: "美图秀秀",            keywords: ["meitu", "xiuxiu"],            official: ["meitu.com"] },
  { name: "格式工厂",            keywords: ["formatfactory", "geshipg"],   official: ["formatfactory.com"] },
  { name: "金山毒霸",            keywords: ["kingsoftantivirus", "duba"],  official: ["duba.com", "kingsoft.com"] },
  { name: "迅雷",                keywords: ["xunlei", "thunder"],          official: ["xunlei.com"] },
  { name: "福昕阅读器",          keywords: ["foxit", "fuxin"],             official: ["foxitsoftware.cn", "foxit.com"] },
  { name: "WPS 稻壳",            keywords: ["docer"],                      official: ["wps.cn"] },
  { name: "网易云音乐",          keywords: ["wangyiyun", "cloudmusic"],    official: ["music.163.com"] },
  { name: "酷狗音乐",            keywords: ["kugou"],                      official: ["kugou.com"] },
  { name: "酷我音乐",            keywords: ["kuwo"],                       official: ["kuwo.cn"] },
  { name: "QQ 音乐",             keywords: ["qqmusic"],                    official: ["qq.com"] },

  // —— 国际常用软件 ——
  { name: "Opera 浏览器",        keywords: ["opera"],                      official: ["opera.com"] },
  { name: "Brave 浏览器",        keywords: ["brave"],                      official: ["brave.com"] },
  { name: "Vivaldi 浏览器",      keywords: ["vivaldi"],                    official: ["vivaldi.com"] },
  { name: "7-Zip",               keywords: ["7zip", "7-zip"],              official: ["7-zip.org"] },
  { name: "WinRAR",              keywords: ["winrar", "rarlab"],           official: ["rarlab.com", "win-rar.com"] },
  { name: "Bandizip",            keywords: ["bandizip"],                   official: ["bandisoft.com"] },
  { name: "Zoom 会议",           keywords: ["zoom"],                       official: ["zoom.us", "zoom.com"] },
  { name: "TeamViewer",          keywords: ["teamviewer"],                 official: ["teamviewer.com"] },
  { name: "AnyDesk",             keywords: ["anydesk"],                    official: ["anydesk.com"] },
  { name: "Obsidian",            keywords: ["obsidian"],                   official: ["obsidian.md"] },
  { name: "VS Code",             keywords: ["vscode", "visualstudiocode"], official: ["code.visualstudio.com", "microsoft.com"] },
  { name: "Postman",             keywords: ["postman"],                    official: ["postman.com"] },
  { name: "uTorrent",            keywords: ["utorrent"],                   official: ["utorrent.com"] },
  { name: "IDM 下载器",          keywords: ["idm", "internet-download-manager"], official: ["internetdownloadmanager.com"] },
  { name: "OBS 录屏",            keywords: ["obs"],                        official: ["obsproject.com"] },
  { name: "VLC 播放器",          keywords: ["vlc"],                        official: ["videolan.org"] },
  { name: "iTunes",              keywords: ["itunes"],                     official: ["apple.com"] },
  { name: "PeaZip",              keywords: ["peazip"],                     official: ["peazip.github.io"] },
  { name: "MobaXterm",           keywords: ["mobaxterm"],                  official: ["mobatek.net"] },
  { name: "Xshell",              keywords: ["xshell", "xftp"],             official: ["netsarang.com"] }
];

// 合法托管/下载类域名：注册域命中时不做“仿冒下载站”判定，避免误伤
// （开源软件官方托管于 GitHub、老牌下载站虽有捆绑风险但不属于银狐投毒）
const BPG_TRUSTED_HOSTS = new Set([
  "github.com", "github.io", "gitee.com", "sourceforge.net",
  "onlinedown.net", "pcsoft.com.cn", "duote.com", "xiazaiba.com",
  "ddooo.com", "52z.com", "crsky.com"
]);

// 供其他脚本使用（银狐特化）
const BPG_SOFTWARE_TARGETS_LIST = BPG_SOFTWARE_TARGETS;