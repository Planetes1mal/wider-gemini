# Reading layout experiment

Run `node scripts/reading-lab.js` from the repository root and open the printed local URL. You can also open `index.html` directly. No build, account, network resource, or extension installation is required.

This is an internal decision tool, not a recreation of the Gemini interface and not a shipped extension feature. The question is whether limiting prose to 72ch while keeping tables/code wide helps a particular reader's tasks. The comparison is deliberately isolated from production selectors, so it cannot undo PR #10. There is no telemetry or persistent storage. Generate notes to preview a copyable JSON record, then optionally use its save link. Notes are not sent anywhere. Browser-managed file saving was not confirmed by the restricted browser tool; the visible text can be copied without relying on a download notification.

The page uses the project's blue/gray controls and system fonts. The design-skill search did not yield a relevant reading-comparison pattern; layout and accessibility use the skill's general guidance instead of its unrelated marketing-page recommendation.

## What the prototype establishes

- Two synthetic samples (search and retry) support uniform and mixed widths, 700–1600 px targets, text scaling and code wrapping. Switching samples updates the tasks and answer key without changing layout settings.
- At narrow viewports, both layouts fit the screen, while the table/code region can scroll independently.
- It makes the trade-off visible without changing Gemini, introducing new permissions, or adding a production layout mode.

It does **not** establish a preferred line length, an accessibility conformance level, or a user benefit. It also does not prove that mixed widths work with every real Gemini DOM, language, table, image, upload flow, or mobile browser.

## Small study ready for human participants

Recruit 10–12 people who already use Gemini for text, tables, or code. Recruitment and external invitations are not part of this internal iteration. Use participant codes, not names or account details. Avoid collecting private conversations.

1. Keep viewport, browser zoom, font size, and sample difficulty fixed. Record these conditions.
2. Alternate the first layout across participants using [the session sheet](session-sheet.csv). Use sample A and B to reduce repetition. They share the same paragraph/table/code structure, but equal difficulty has not been validated: pilot the tasks before interpreting timing differences.
3. Ask participants to explain one paragraph, locate two table facts, and find a code condition. Record each task's success, elapsed seconds, incorrect answers, scrolling, and a brief preference reason. Do not explain the expected preference beforehand.
4. Allow participants to adjust settings afterward and record which settings they changed.
5. Keep the result descriptive: preference count, task mistakes and observation notes. With a small convenience sample, do not claim statistical superiority or a conversion uplift.

Continue only if a recurring task benefit appears without repeated table/code or comprehension problems. If there is no clear benefit, keep the existing uniform width. The production integration would require focused real-Gemini verification before release; the prototype intentionally does not touch extension code.

The built-in answer key and downloadable notes help run a session. The page intentionally has no automatic timer, participant identifier, server endpoint, leaderboard, or analytics SDK.

### Worksheet definitions

The CSV contains 12 **blank planned sessions**, not participant observations. `first` and `second` mean the two viewing orders, not fixed layout names. Record width target, viewport, browser zoom, font percentage and code wrapping; keep them unchanged between the two scored blocks. Each block has three tasks: `prose`, `table`, and `code`. They correspond to the page's numbered prompts and answer key.

For each task, start a manual timer after reading the instruction aloud and stop when the participant states a final answer. `seconds` is elapsed wall-clock time; interruptions go in `notes` and should not be silently deducted. `success` is `yes`, `no`, or `not-run`: prose needs both concepts distinguished, table needs both facts, and code needs both the value and condition. `errors` counts incorrect answer attempts before the final answer, not hesitations or scrolling. Leave a cell blank if it was not observed; blank is not zero. Record `assistance=yes` if the facilitator gives a hint or opens the answer key before completion, and keep that result separate from unassisted successes.

For `scroll_actions`, count intentional wheel/trackpad gestures, scrollbar drags, or keyboard scroll commands within the content; do not count individual low-level browser events. This is a coarse observer count, not an instrumented metric. Stop a task at the same predeclared limit in both blocks (suggested pilot limit: 120 seconds), record the elapsed limit and `success=no`, and note `timeout`. The pilot may change that limit for later sessions, but it must be recorded before their scored tasks.

Use `preference` = `uniform`, `mixed`, or `none`, plus the participant's reason in `notes`. Record post-task adjustments separately in `adjustments`; do not overwrite the fixed conditions of the scored blocks. Report task-level success/error counts and median times with the observed sample size, assistance and timeouts visible. Do not pool the three different tasks into a single speed score or treat these descriptive results as causal proof.
