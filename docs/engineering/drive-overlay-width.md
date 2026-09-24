# Keeping Drive overlays outside conversation width rules

A conversation-width extension needs to widen the reading surface without resizing every interface that happens to appear above it. Wider Gemini previously applied the conversation limit to generic overlay and dialog containers. The repository records the Drive-picker correction in commit `9029e1c` (`Fix Drive picker layout with custom width`).

The useful engineering lesson is the boundary: an upload picker owns its own layout, while the conversation setting belongs to messages and the inner composer. This article follows the current [CSS](../../gemini-content.css), [content script](../../gemini-content.js), and [browser fixture](../../tests/e2e/message-width.js). It does not claim a new live Drive or macOS verification.

## How a width rule reached the wrong interface

The removed CSS rule targeted three generic selectors:

```css
.cdk-overlay-pane,
.mat-menu-panel,
[role="dialog"] {
    max-width: var(--gemini-chat-width) !important;
}
```

Those selectors describe containers used by dialogs and menus, not a Gemini message. Giving them a conversation limit can shrink a picker independently of the size its contents require. Increasing the width preset only changes the symptom; it does not restore ownership of the picker layout.

The same commit also narrowed JavaScript behavior. It removed `.mat-menu-panel` from the width configuration, removed generic overlay/dialog targets from drag-and-drop scanning, and required a likely drop zone to belong to an input or chat container before applying `max-width: 100%`.

You can inspect the original change without modifying the working tree:

```sh
git show 9029e1c -- gemini-content.css gemini-content.js
```

## Keep the outer composer available to native controls

The current stylesheet leaves the outer shell unconstrained:

```css
input-container {
    max-width: none !important;
    width: 100% !important;
}
```

The desired conversation width applies to `input-container .input-area-container` and `input-container input-area-v2`. Upload-card and file-drop-area rules are scoped below `input-container`, using the parent width rather than a new page-wide conversation limit.

The JavaScript `css_config` mirrors this boundary: it targets the inner composer and input-scoped upload elements. `applyDragDropStyles()` still scans for likely drag/upload elements, but checks their nearest input or chat container and their visible layout before modifying them. This is a narrower heuristic, not a guarantee that every future element containing the word “upload” is safe to resize.

This separation also matters outside Drive. A Sources control adjacent to the inner composer needs the space supplied by the outer shell. Constraining that shell to the reading width can affect navigation or attachment controls even when the text itself looks correct.

## Deep message selectors need an overlay exclusion

Some Gemini message bodies have several nested width limits. The current CSS uses `:has()` to find wrapper paths leading to `message-content`, then releases those nested limits. These rules explicitly exclude `.cdk-overlay-pane`, `.mat-menu-panel`, `[role="dialog"]`, `[role="menu"]`, and their descendants.

The exclusions matter in two places: in the content that qualifies a wrapper for widening, and in the elements that actually receive the rule. A dialog containing an element named `message-content` must not become evidence that an unrelated wrapper belongs to the reading surface.

The stylesheet also retains broader compatibility rules for shallow response containers. The exclusion in one deep selector should not be described as proof that every possible overlay topology is protected. A real regression needs the relevant DOM ancestry and computed widths before changing those rules.

## Reproduce the existing browser fixture

The repository has an existing dependency-free browser check. Use Node.js and a local Chrome executable:

```powershell
$env:WG_CHROME = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node tests/e2e/message-width.js
```

On another platform, set `WG_CHROME` to that platform's Chrome path. The script creates local synthetic Gemini-shaped markup, loads the actual project CSS and content script, and measures the result in headless Chrome. It prints the temporary fixture directory for inspection. It does not log in to Gemini or open a real Drive picker.

| Existing assertion | What it protects in the fixture |
| --- | --- |
| Nested and page-level overlay/menu widths remain 300 px | Reading-width changes do not resize the fixture's protected shells. |
| Overlay body widths remain 120 px | A nested `message-content` or markdown element is not widened merely because its name resembles a reply body. |
| Outer input matches the parent, inner input matches the requested width | The composer shell and reading width have distinct responsibilities. |
| Sources remains 140 px | The fixture's adjacent native control retains its own width. |
| Tables still scroll and code wrapping follows its toggle | Protecting overlays does not remove the intended reading behavior. |

The numeric widths are fixture expectations, not measurements of Google's current Drive UI. A passing fixture proves these cases only. It cannot show that the real Add button is reachable, that an embedded picker loaded correctly, or that a new Gemini rollout uses the same DOM structure.

## Manual evidence for a real regression

Use non-sensitive sample content. At a narrow and a wide preset, open Add from Drive, check the picker body and Add button, close it, and verify the composer still aligns with the conversation. Check a local file attachment and the Notebook Sources control separately; they follow different layout paths.

Record the page type, browser, OS, extension version, selected width, and the affected element's ancestors and computed width. A screenshot alone may show clipping but usually cannot identify which ancestor supplied the constraint. Keep account names and private file names out of shared reports.

No new live Drive, Notebook, or macOS checks were performed for this documentation update. The implementation and existing assertions were inspected; automated checks were not rerun. See [engineering and compatibility](../engineering.md) for the broader manual checklist.
