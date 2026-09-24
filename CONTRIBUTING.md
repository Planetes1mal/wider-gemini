# Contributing to Wider Gemini

Bug reports, translations, and focused fixes are welcome. Start with a reproducible problem or a small improvement to an existing feature. For a larger feature, open an issue describing the user task before implementing it.

## Run the extension

1. Clone this repository.
2. Open `chrome://extensions/` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked** and select the repository folder.
4. Open [Gemini](https://gemini.google.com/). After changing extension files, reload the extension and then reload the page.

The extension uses vanilla JavaScript, HTML, and CSS. There is no build step or npm install.

## Run the existing checks

Use Node.js 24 for internal checks. Browser checks also need Chrome; they can load the source directory directly without making a release ZIP.

```sh
node scripts/test.js --skip-packaging
node tests/e2e/message-width.js
```

The first command runs the existing unit checks while skipping ZIP packaging. The second runs synthetic Gemini layout scenarios in a real headless Chrome window. Set `WG_CHROME` to your Chrome executable when it is not installed at the default Windows path.

When release validation is actually needed, `node scripts/test.js` keeps the full default suite, including packaging tests. Those checks also require PowerShell 7 (`pwsh`) or Windows PowerShell 5.1; `WG_POWERSHELL` selects the executable. CI retains the full suite.

```powershell
$env:WG_CHROME = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node tests/e2e/message-width.js
```

```sh
WG_CHROME="/path/to/chrome" node tests/e2e/message-width.js
```

Optional popup checks can also use the repository root directly:

```sh
node tests/e2e/package-load.js .
node tests/e2e/popup-language.js . archive/popup-language-check
```

These use isolated browser profiles. Despite its name, `package-load.js` accepts any unpacked extension directory, including the source tree; the language check stores diagnostic screenshots under the ignored archive. Neither command builds a ZIP.

For layout changes, also try the affected flow on the real Gemini website. Record your browser, OS, extension version, and steps in the PR. Synthetic fixtures do not establish compatibility with every live Gemini rollout or with macOS. See [engineering and compatibility notes](docs/engineering.md) for the supported boundaries and manual scenarios.

For focused examples, read the [startup injection case study](docs/engineering/pwa-cold-start.md) and the [Drive overlay layout case study](docs/engineering/drive-overlay-width.md). Each links the existing source and tests, explains what the checks establish, and separates fixture evidence from manual verification.

## Keep a change focused

- Follow the existing four-space JavaScript indentation and semicolon style.
- Keep runtime code dependency-free. Preserve live settings updates and idempotent content-script initialization.
- Keep overlays and dialogs outside conversation width overrides. Preserve the input, upload, and sidenav boundaries described in the engineering notes.
- Reuse the existing checks. Add a regression case when a reproduced behavior needs one; routine wording and documentation changes do not need new tests.
- In a PR, explain the user-visible change, link its issue when applicable, and report which existing checks and manual flows you ran. Include before/after images for visible layout changes, with personal content removed.

Do not include private conversations, account details, tokens, or local diagnostic archives in an issue or commit. `tests/diagnostics/` and experimental browser scripts remain local.

## Translations

Locale dictionaries live in `_locales/<locale>/messages.json`; use the English keys as the source. Keep message keys and placeholders consistent, translate the meaning rather than the code identifiers, and check the popup at its actual size. New UI languages also need the language selector and language normalization updated. Include a native-speaker review when available, and identify machine-assisted translations that still need review.

The [Korean](./_locales/ko/messages.json), [Japanese](./_locales/ja/messages.json), and [Spanish](./_locales/es/messages.json) dictionaries are machine-assisted internal drafts awaiting native-speaker review. Review natural phrasing, technical terms, help text, and fit at the popup's actual size before treating them as release-ready. They do not include localized store materials or additional READMEs in this iteration.

The existing language check confirmed parity for all 86 message keys across six dictionaries, manual switching among all six interface languages, automatic Korean/Japanese/Spanish selection, and English fallback for a French browser locale. Popup text fit was checked locally. These checks establish loading and layout, not translation quality; native-speaker review is still pending. See the dated [compatibility record](docs/compatibility.md) for the exact help-page and browser coverage.

## Releases

Maintainers update the manifest and dated changelog, run the checks, and tag a release. CI runs the same tests before building the release ZIP. The shared `scripts/package.ps1` validates versions and release notes and packages an explicit runtime-file list. Ordinary contributions should leave version bumps and release tags to the maintainer.
