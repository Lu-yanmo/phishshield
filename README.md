# PhishShield 🛡

**English** | [简体中文](README.zh-CN.md)

[![Release](https://img.shields.io/github/v/release/Lu-yanmo/phishshield)](https://github.com/Lu-yanmo/phishshield/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-MV3-green)](https://developer.chrome.com/docs/extensions/mv3/)

Automatically **marks and hides** suspected phishing / fraudulent websites in search engine results.

Supported engines: **Bing / Baidu / Sogou / 360 Search / Google / DuckDuckGo**

## Why It Exists

When you search for "XX official site", "XX download" or "XX support", the top results (even paid ad slots) are often polluted with lookalike phishing sites:

- 🎣 Typosquatted domains: `deepseek-com.com.cn` impersonating DeepSeek, `gf-sougoui.com.cn` impersonating Sogou
- 📦 Luring downloads of trojanized archives (a typical distribution method of the Silver Fox trojan)
- 🔑 Fake login pages stealing credentials, fake support pages stealing verification codes

PhishShield flags or hides these results **before you click**, adding one more line of defense.

## Key Features

- ✅ **Six search engines covered** — one detection engine, consistent behavior everywhere
- ✅ **Four detection layers** — blacklist, heuristic scoring, subscription feeds, Safe Browsing (optional)
- ✅ **100% local execution** — no search terms or browsing data are ever collected or uploaded
- ✅ **Three action modes** — mark only / hide dangerous / hide all, switchable anytime
- ✅ **Works out of the box, fully customizable** — built-in blacklist & brand DB keep growing; custom blacklists and feed sources supported

## Detection Layers

Each search result is judged through four layers in order; the first hit decides:

### Layer 1: Built-in Blacklist

Manually confirmed phishing domains (matched by registrable domain), e.g. trojan distribution sites and fake download portals, continuously accumulated in `common/blacklist.js`.

### Layer 2: Heuristic Scoring Engine (core)

Scores domains across multiple dimensions (max 100; ≥70 dangerous, ≥40 suspicious). Main rules:

| Rule | Description | Example |
|---|---|---|
| Brand impersonation | Edit distance, hyphen concatenation, one-letter-off variant spellings; covers 170+ brands and 67 frequently impersonated apps | `wps-downlod.com`, `xunlei-app.com` |
| CN-suffix combo | Impersonating a known brand + two-part `.com.cn/.net.cn/.org.cn` suffix gets extra weight | `ludashi-down.com.cn` |
| High-risk domain traits | Raw IP hosts, dangerous TLDs, overly long random subdomains | `192.168.1.1-login.xyz` |
| Lure wording | Fake "official/download/support/cracked" copy, archive distribution (`.zip/.rar/.7z`) | "Official site free download" → the file is actually an archive |

Multiple **false-positive guards** are built in: official-domain early exit, short abbreviations (≤4 chars) skip edit-distance comparison, well-known platform domains are always allowed through.

### Layer 3: Subscription Blacklists (daily updates)

The background worker periodically pulls public phishing-domain feeds, totaling hundreds of thousands of entries:

- [Phishing Army](https://phishing.army/)
- [malware-filter](https://gitlab.com/malware-filter/phishing-filter)
- [Phishing.Database](https://github.com/mitchellkrogza/Phishing.Database)

### Layer 4: Google Safe Browsing (optional)

Enter an API key in the options page to add cloud verification for suspicious URLs.

## How It Works

The extension is a collaboration between the **content script** (search result pages) and the **service worker** (background), with all data stored in `chrome.storage.local`:

- **Content script**: page load → pick engine adapter by hostname → extract the real destination URL → blacklist check → (on miss) heuristic scoring → classify by threshold (≥70 dangerous / 40–69 suspicious / otherwise safe) → hide or insert a warning bar depending on mode; subscription blacklist hits are queried from the worker in one batch.
- **Service worker**: alarm triggers → fetch the 3 feeds → parse into newline-separated strings stored in `storage.local` (hundreds of thousands of entries) → in-memory cache (invalidated by `updatedAt`) → expose the `queryDomains` query service.

### Content Script: Scan Pipeline (content.js)

1. **Engine adapters**: chosen by current hostname (Bing/Baidu/Sogou/360/Google/DDG); unsupported sites are ignored. Each adapter resolves the **real destination URL** — Bing decodes base64url redirect params, Baidu reads the `mu` attribute, Sogou/360 fall back to the displayed domain text on the page, DDG decodes the `uddg` parameter.
2. **Incremental scan**: a `MutationObserver` watches for newly loaded results and rescans after a 300ms debounce; each node is marked with `data-bpg-done` to avoid reprocessing, so infinite scroll is fully covered.
3. **Batched verdicts**: newly found results on the page are sent to the worker in a single message for subscription lookup (avoiding per-item message overhead), then checked against local blacklists and the heuristic engine; statistics are written to `storage` for the popup.
4. **Hot reload**: setting changes immediately restore hidden items, remove old warning bars and re-judge the whole page — no refresh needed.

### Service Worker: Intelligence & Queries (background.js)

1. **Scheduled fetch**: `alarms` updates the three feeds daily (60s timeout per source, tolerant of large-file fluctuations).
2. **Compact storage**: blacklists are stored as newline-separated strings (~1/3 smaller than JSON arrays); the `unlimitedStorage` permission accommodates hundreds of thousands of entries; stale feed sources are migrated automatically on first install.
3. **In-memory cache**: invalidated by `updatedAt` to avoid repeated deserialization; lookups are O(1).
4. **Version compatibility**: config uses a merge-with-defaults strategy, so old settings survive upgrades.

## Action Modes

| Mode | Behavior |
|---|---|
| Mark only | Dangerous/suspicious results stay visible with a prominent warning bar (including verdict reasons and score) |
| Hide dangerous (default) | Dangerous results are hidden; suspicious ones are marked |
| Hide all | Every non-safe result is hidden |

Sensitivity is adjustable (low/medium/high), mapping to different score thresholds.

## Installation

### Option 1: Load Unpacked (current)

1. Download the latest zip from [Releases](https://github.com/Lu-yanmo/phishshield/releases) and extract it
2. Open `chrome://extensions` and enable "Developer mode" (top right)
3. Click "Load unpacked" and select the extracted folder
4. Search on any supported engine — protection kicks in automatically

> Give it a moment after first launch: the background worker downloads the subscription blacklists (~10MB) automatically.

### Option 2: Microsoft Edge

Edge is compatible with Chrome extensions — install via "Load unpacked" the same way, or install directly once published on Edge Add-ons.

## Usage

### Toolbar Popup

Click the toolbar icon to see: scanned/marked/hidden counts for the current page, quick switching of action mode and sensitivity, and a one-click test search.

### Options Page

Right-click the icon → Options, or click "Advanced settings" at the bottom of the popup:

- **Detection toggles**: brand impersonation, dangerous TLDs, IP domains and lure wording can each be switched independently
- **Custom blacklist**: one domain per line, takes effect immediately
- **Feed management**: add/remove intelligence sources, refresh manually
- **Safe Browsing**: enter a Google API key to enable cloud verification

### Warning Bars

Marked results show a graded warning bar on top:

- 🔴 **Highly suspected phishing site**: lists the verdict reasons and score (e.g. "hit built-in blacklist", "impersonates the DeepSeek domain")
- 🟡 **Suspected phishing site**: advises caution

Changing settings re-judges the current page instantly — no refresh needed.

## Project Structure

```
├── manifest.json             # MV3 manifest (six-engine match rules)
├── background.js             # Service worker: feed fetching, blacklist queries, SB enhancement
├── content.js                # Multi-engine adapters + scan/mark/hide
├── content.css               # Warning bar styles
├── popup.html / popup.js     # Toolbar popup (stats & quick toggles)
├── options.html / options.js # Options page (mode, sensitivity, custom blacklist, feeds)
├── icons/                    # 16/32/48/128 px icons
└── common/
    ├── blacklist.js          # Built-in phishing domain blacklist (44+ entries, growing)
    ├── brands.js             # Brand DB (170+ brands) & software list (67 apps)
    └── heuristics.js         # Heuristic scoring engine (domain shapes / lures / suffix combos)
```

## Contributing

Issues and PRs are welcome:

- 🐛 **Report misses**: open an issue with the phishing domain and a screenshot of the search results; we'll analyze its traits and add it to the blacklist or rules
- 🚫 **Report false positives**: same format, with the legitimate domain that was wrongly flagged
- ➕ **Extend the brand DB**: add entries to `BPG_BRANDS` (brands) or `BPG_SOFTWARE_TARGETS` (software, requires `keywords` and `official` fields) in `common/brands.js`
- 🌐 **Adapt a new engine**: just add an adapter in `detectEngine()` of `content.js` — the core detection logic needs no changes

> Tip: when extending brand keywords, beware of cross-brand collisions — short abbreviations (≤4 chars) never undergo edit-distance comparison, and official domains of legitimate brands exit early as safe.

## Privacy

- All detection runs locally; search terms, clicks and browsing data are never collected or uploaded
- The only network requests: scheduled downloads of public blacklist feeds; with Safe Browsing enabled, suspicious URLs are submitted to Google as hashes
- Statistics live only in local `chrome.storage.local`

## FAQ

**Q: Why didn't it catch some phishing site?**
A: Detection relies on domain traits and blacklists; brand-new domains without obvious impersonation traits may slip through. Open an issue — confirmed domains are hard-coded into the built-in blacklist, and daily feed updates keep filling the gaps.

**Q: Why was a legitimate site flagged?**
A: Its domain is likely too similar to some brand, triggering a heuristic rule. Report it via an issue and we'll whitelist the official domain; meanwhile you can switch to "Mark only" mode to avoid hiding.

**Q: Is detection accurate on Baidu/Sogou/360?**
A: These engines wrap results in server-side 302 redirects, so the extension judges by the domain text displayed on the page — accuracy is unaffected. Only results with no displayed domain at all are skipped.

**Q: Firefox support?**
A: It's currently a Chrome MV3 implementation; Firefox needs adaptation (`browser.*` APIs and some manifest differences). Contributions welcome.

## Disclaimer

PhishShield is an auxiliary defense; it cannot guarantee blocking every phishing site and may produce false positives. Always verify the domain in the address bar before visiting, and confirm money- or account-related operations through official channels.

## License

This project is open-sourced under the [MIT License](LICENSE).
