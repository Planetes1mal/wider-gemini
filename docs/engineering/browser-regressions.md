# Measuring a layout regression in a real browser

A selector can exist in a stylesheet and still fail to widen a reply. Gemini may constrain an inner wrapper, preserve a fixed-width user bubble, or render a table wider than its visible region. Conversely, a rule that widens the reply can accidentally change an unrelated dialog. Those are geometry questions: the [existing browser fixture](../../tests/e2e/message-width.js) measures them in Chrome.

## A small fixture around the production code

The Node script creates a temporary HTML file with synthetic message trees, then embeds the real `settings-utils.js`, `gemini-content.js`, and `gemini-content.css`. Minimal Chrome API substitutes deliver stored settings and runtime messages. Chrome runs with extensions disabled in an isolated profile, so this check needs neither a Gemini account nor a copy of a private conversation.

The fixture includes tag and class wrappers, nested width limits, padded message content, user bubbles, the input shell, Sources controls, tables, code, images, and protected overlays. It measures rectangles after changing pixel/percentage widths and toggling user-message width and code wrapping. A late-added message also exercises the mutation path. The 73 reported rows are combinations in one browser fixture, not 73 separately maintained frontend tests.

The expected width is the smaller of the requested width and the available parent width. Padded content subtracts its 32px internal spacing. Geometry comparisons allow one pixel of rounding. Other checks establish that:

- the input's outer shell stays full width while its inner area follows the conversation;
- Sources retains its own width;
- protected overlay/menu shells and their content retain the fixture's 300px and 120px widths;
- a wide table keeps a scrollable region;
- code either wraps within its region or retains horizontal scrolling, according to the setting.

These are deliberate boundaries, not a snapshot of every Gemini element. An arbitrary synthetic wrapper is not enough evidence to widen the extension's production selectors.

## Add a check only after a useful reproduction

The recent caption bug needed one extra scenario in this same script. After the conversation widened from 1000px to 1400px, an image stayed centered but its caption retained the old padding and shifted 200px left. The scenario now compares their left edges after a direct width message, the duplicate storage delivery, and a storage-only change. It checks the user-visible alignment rather than the implementation of the recalculation.

The [performance record](../performance.md) contains the measured before/after coordinates. No CSS width selectors were changed for that fix; the PR #10 compatibility rules remain in place.

## Reproduce and inspect a failure

From the repository root, with Node.js 24 and Chrome available:

```sh
node scripts/test.js --skip-packaging
node tests/e2e/message-width.js
```

Set `WG_CHROME` when Chrome is not at the default Windows path. See [the contributor instructions](../../CONTRIBUTING.md) for shell-specific examples. No package manager or extension ZIP is involved.

The fixture launches an isolated headless Chrome window at a requested 2000 × 1200 size. Its page writes measured JSON into a result element; Node extracts the result from Chrome's DOM output and asserts the geometry. The script prints the temporary directory containing both `fixture.html` and `results.json`. Open those artifacts to inspect the exact input and measured values instead of adding speculative fallback rules.

The PR/push [Tests workflow](../../.github/workflows/test.yml) runs the existing checks and this browser fixture. The [Release workflow](../../.github/workflows/release.yml) depends on that workflow. A geometry assertion fails the process and therefore the required job; configuring GitHub branch protection is a separate repository setting.

## Keep the evidence layers distinct

Unit checks cover normalization, lifecycle guards, and injection decisions. This browser fixture covers actual CSS/layout behavior on synthetic markup, with substituted extension APIs. Isolated unpacked-extension checks cover the popup and real extension storage. Live Gemini and installed-app checks cover the changing website and browser startup environment.

Passing one layer does not establish the others. In particular, this Windows fixture cannot certify the reporter's macOS behavior, every current Gemini rollout, a Google Drive picker after file selection, or a real PWA cold start. The dated [compatibility record](../compatibility.md) says which of those were actually observed. Keeping that boundary explicit is more useful than accumulating near-duplicate frontend tests.
