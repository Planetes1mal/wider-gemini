# Recovering a missed content-script injection at browser startup

A Gemini tab can already be open when Wider Gemini becomes available. The same timing matters for a Chrome-installed Gemini site app: the page and extension do not necessarily become ready in the order a navigation-only setup expects. The recovery path lives in [background.js](../../background.js), while [gemini-content.js](../../gemini-content.js) makes re-execution safe.

This article explains the current repository implementation and how to exercise its existing checks. It does not report a new macOS or live-Gemini cold-start verification.

## Two entry paths into the same page

The [manifest](../../manifest.json) declares `settings-utils.js`, then `gemini-content.js`, plus `gemini-content.css`, for `https://gemini.google.com/*` at `document_start`. That is the normal navigation path.

The service worker registers `injectIntoOpenGeminiTabs` for both `chrome.runtime.onStartup` and `chrome.runtime.onInstalled`. It reads the content-script declaration from the manifest instead of maintaining a second file list. Its recovery sequence is:

1. Query tabs matching the manifest's Gemini URL patterns.
2. Skip tabs without an ID and discarded tabs.
3. Execute a small check for `window.widerGeminiContentLoaded === true` in the extension's isolated world.
4. If the flag is absent, insert the declared CSS, then execute the declared JavaScript files with `injectImmediately: true`.
5. Catch errors per tab so one closed or unavailable tab does not stop recovery for the other tabs.

Reading the manifest in one place preserves the dependency order: settings normalization must exist before the content script reads `window.widerGeminiSettings`. The worker does not duplicate the settings-loading or layout logic; it gets the same content script onto the page.

The manifest lists `storage`, `scripting`, and Gemini host access. It does not list the `tabs` permission. The [background test](../../tests/background.test.js) checks those manifest properties and that recovery queries only the declared URL patterns.

## Re-injection needs two guards

The content script begins with an execution guard:

```js
if (window.widerGeminiContentLoaded) return;
window.widerGeminiContentLoaded = true;
```

This flag belongs to the extension's isolated world, matching the worker's check. It prevents a repeated execution from registering another copy of the script's listeners. It means that the script has entered execution; it is not a measurement that every setting has already been applied successfully.

There is also an initialization guard inside `init()`:

```js
if (isInitialized) return;
isInitialized = true;
```

The guards solve different problems. The first covers a second script execution. The second covers multiple document events reaching the same script instance. Without the second guard, `DOMContentLoaded` and `load` could each install observers and drag listeners.

Late injection must also handle a document whose load events have already happened. The script checks `document.readyState`: for `interactive` or `complete`, it schedules `init()` immediately; otherwise, it registers the document load listeners. Inside `init()`, it applies stored settings and installs URL, mutation, drag, image-load, and resize handling.

## Reproduce the existing checks

From the repository root, with Node.js installed:

```sh
node tests/background.test.js
node tests/gemini-content-lifecycle.test.js
```

These are existing dependency-free tests; they do not launch a signed-in browser or package a release.

| Test | Evidence it checks |
| --- | --- |
| [background.test.js](../../tests/background.test.js) | A missing script receives check → CSS → JS; an already-loaded tab receives only the check; discarded tabs are skipped; one tab's failure does not break the rest; a later install event does not reinject the recovered tab. |
| [gemini-content-lifecycle.test.js](../../tests/gemini-content-lifecycle.test.js) | Loading documents initialize once, repeated injection does not add another initialization, and injection into an already-ready document still initializes. |

The tests use mocked extension APIs and a minimal document model. They establish the code's decisions under those inputs, not whether a particular operating system or browser startup will reproduce the original race.

## Verify the actual app window separately

For a manual check, use a Gemini site app installed through Chrome and an extension build under test. Record the browser version, OS, extension version, and whether Chrome background processes remain enabled.

1. Save a recognizable width and code-wrapping setting, then confirm it on an ordinary Gemini tab.
2. Quit Chrome completely and launch the installed Gemini site app.
3. Check whether the saved width and wrapping are present before any manual refresh.
4. Change a setting from the real popup and check that the open page updates without navigation.
5. Repeat after a full browser exit; save the outcomes rather than treating one successful launch as proof of every startup order.

The CSS custom property `--gemini-chat-width` on the document root gives a concrete layout value to inspect. The worker logs when it actually performs recovery. A successfully styled page alone cannot tell whether declaration-based injection or the recovery path supplied the script.

## Boundaries of this repair

The worker responds to startup and installation/update events. It has no periodic retry loop, and its loaded flag is not a health check for every downstream operation. The guard makes repeated JavaScript execution harmless; the check and injection are not a cross-event transaction that guarantees exactly one CSS insertion.

A Chrome-installed site app uses Gemini webpages. Google's native desktop apps and Chrome's built-in Gemini panel are outside the manifest's target. Live Gemini DOM changes, platform-specific startup behavior, and account-dependent UI still require direct observation. For the neighboring layout problem, see [keeping Drive overlays outside conversation width rules](./drive-overlay-width.md).
