# PhishShield Privacy Policy

Last updated: 2026-08-29

PhishShield processes everything locally on your device. It does not collect, upload, or transmit your search queries, browsing history, or any personal data to any server.

## What we collect

Nothing. All phishing detection (brand impersonation checks, dangerous-domain rules, heuristic scoring) runs locally in your browser. Your search keywords and visited URLs never leave your device.

Local statistics (scan and mark counters) are stored only in your browser local storage and shown solely in the extension popup. The extension requires no account and contains no analytics, advertising, or tracking code.

## Subscribed blacklists (optional, on by default)

When enabled, the extension periodically downloads public phishing-list files (e.g. OpenPhish) to your device. This is a plain file download carrying no search content or browsing history; matching happens entirely offline afterwards.

## ICP filing check (optional, on by default)

When enabled, candidate domain names (e.g. example.com) are sent to a public ICP filing lookup service to check registration status; filed domains are exempted from heuristic warnings to reduce false positives. Only the domain name itself is transmitted - never your search keywords, page content, or browsing history. Results are cached locally. If the lookup service is unavailable, the check is silently skipped and local detection is unaffected. You can turn this off at any time in the extension options.

## Permissions

- storage: save your settings and local statistics
- alarms: periodically refresh subscribed lists
- unlimitedStorage: accommodate large subscription data
- Search-engine site access: read result links on the page for local analysis only

## Contact

Feedback or data requests: https://github.com/Lu-yanmo/phishshield/issues
