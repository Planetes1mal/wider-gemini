# Measurement workflow

These local tools turn Chrome Web Store exports and GitHub counts into dated snapshots. They use Python 3.10+ and its standard library. They do not add extension telemetry, change a remote account, or publish reports. Keep exports, private traffic, and generated ledgers under the ignored `archive/` directory.

## Recompute a store export

Download the same 20 reports from the Chinese-language Chrome Web Store dashboard into one directory. Preserve each CSV's title line, header line, and original values. Do not mix exports for different extensions, filters, or date ranges. The parser identifies reports by title rather than filename; a changed dashboard language/schema requires updating the title mapping explicitly.

```sh
python scripts/metrics-cws.py archive/数据 --output archive/measurement-2026-09-19 --as-of 2026-09-19
```

Use a new output directory for each observation. `--as-of` is the first excluded calendar date, normally the date you exported the reports. Without it, the script uses the computer's local date. It takes the last date shared by the five core reports before that date, then compares 7-day and 28-day windows with their immediately preceding windows. The optional 90-day window, monthly sums, full daily series, and file SHA-256 hashes remain in `cws.json`; the readable summary is `cws.md`.

“Complete” means a full calendar window with rows, not guaranteed finalized data. Missing core rows/cells yield `null` / `Unavailable`, never zero. Existing zero values remain in the totals. After the first nonzero observation, days on which installs, uninstalls, views, impressions, and installation-related weekly users are all zero are flagged as suspected reporting gaps. That flag is a heuristic, not proof of an outage. A separate mean per non-anomalous reporting day shows sensitivity without estimating missing values. It does not remove peaks or identify their causes.

The 20 historical exports were recomputed against the original saved analysis using:

```sh
python scripts/metrics-cws.py archive/数据 --output archive/measurement-2026-09-19 --as-of 2026-09-19 --compare-baseline archive/research-2026-09-19/analysis.json
```

All 75 aggregate/series/window/snapshot comparisons passed. This acceptance check is for that historical export only; do not pass the old baseline when analyzing new data. The original CSVs and analysis were not modified. No frontend test was added.

## Read the numbers correctly

| Measurement | Use | Limit |
|---|---|---|
| Install / uninstall reports | Count recorded acquisition and removal events | Include new and returning users; event net is not installed user stock |
| Store views / impressions | Observe listing exposure and visits | Aggregated reports do not establish a matched-person funnel |
| Installation-related weekly users | Compare the same store metric over time | Not active feature use or measured WAU; do not sum daily snapshots |
| Language / country / OS segments | Prioritize support and distribution | Country is not language; preserve uncovered differences against the headline total |
| UTM source / medium / campaign | Inspect tagged listing traffic | These are separate cuts, not additive; unlabeled difference is not proven organic search |

Chrome documents that install/uninstall reports include returning users and that Users measures installations rather than activity. Its impression definition includes store discovery and direct listing visits. Those definitions motivate the limits above. The exports alone do not establish retention, CAC, attribution to a specific author, or why an extension was disabled. [Chrome Web Store metrics](https://developer.chrome.com/docs/webstore/metrics)

The existing export baseline ends on **2026-09-18**: 19,171 installation-related weekly users; 529 installs / 918 views in the latest 7 days; 2,670 installs / 4,804 views in the latest 28 days. September 9, 10, and 17 are flagged zero days. Last-28-day installs are down 14.6% on raw totals, but the window has three flagged days; do not label this a measured retention or growth collapse. Full results are local in `archive/measurement-2026-09-19/cws.json` and `cws.md`.

## Capture GitHub counts and traffic

```sh
python scripts/metrics-github.py --repo Planetes1mal/wider-gemini --output archive/measurement-2026-09-19
```

Public API GETs capture stars, forks, subscriber count, open issues including PRs, repository metadata, and all currently visible release assets with download counts. Pagination is handled for releases. Deleted/replaced assets can change the cumulative download total, and download events are not users. Stars are a stock; differences between snapshots are net change, not new-star events. [Repository API](https://docs.github.com/en/rest/repos/repos#get-a-repository), [Release API](https://docs.github.com/en/rest/releases/releases#list-releases)

If `gh` is on PATH and already logged in to `github.com`, the script uses `gh api --method GET` for traffic views, clones, referring sites, and popular paths. It does not log in, read credential files, print tokens, or write to GitHub. Without a working existing login, or when an API request fails, each affected endpoint is recorded as **Unavailable**, with `data: null`. A successful API response containing zero is the only basis for recording zero.

Traffic is available for repositories with write access; fine-grained tokens need repository Administration read permission. Views and clones cover the latest 14 days, using UTC; referrers and paths contain the top 10. The script preserves the API response, including whole-window `uniques`. Do not sum daily uniques or add overlapping 14-day snapshots. Referrer/path lists are not complete attribution reports. [Traffic API](https://docs.github.com/en/rest/metrics/traffic)

GitHub describes clones as full clones, excluding fetches; clone/visitor data updates hourly and referrer/popular-content data daily. The current UTC day may therefore be incomplete. Save a snapshot weekly so short-window data is retained locally. If you later combine daily counts, deduplicate by repository, metric, and UTC date, retaining the latest observation; do not derive a deduplicated person count from daily uniques. [Repository traffic](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)

The initial public snapshot was collected at **2026-09-20 01:13 UTC** (September 19 in New York): **37 stars, 1 fork, 10 releases, 50 release-asset download events**. All four API traffic endpoints are **Unavailable** because `gh` is absent from PATH.

A separate read-only observation through the already signed-in Chrome session did expose [the repository Traffic page](https://github.com/Planetes1mal/wider-gemini/graphs/traffic). Its displayed window was **2026-09-05 through 2026-09-18**, observed on September 20 UTC / September 19 in New York: **199 views, 19 unique visitors, 74 clones, 41 unique cloners**. The independent `archive/measurement-2026-09-19/manual-ui-snapshot.json` preserves these whole-window values, daily arrays, top referrers/paths, source URL, displayed dates, and acquisition method. It is labeled `ObservedUI`, not an API response. Daily uniques must not be added; neither 37 cumulative stars divided by 19 visitors nor 199 views establishes star conversion.

## Keep one weekly ledger

After running both commands into the same new snapshot directory:

```sh
python scripts/metrics-weekly.py archive/measurement-2026-09-19 --ledger archive/measurement/weekly.csv --github-traffic-json archive/measurement-2026-09-19/manual-ui-snapshot.json --note "Initial baseline; three CWS zero days; traffic observed in signed-in UI; API unavailable"
```

The append-only CSV records 7/28-day CWS values and gap counts, GitHub counts/availability, and net changes in stars, forks, and visible download counts since the preceding row. Recording the same snapshot again is a no-op. The first delta is `Unavailable`, not zero. The row retains both the CWS window end and GitHub capture time because these clocks differ. `cws_days_since_previous_end` makes stale exports or non-weekly gaps visible. The optional `--github-traffic-json` explicitly imports a manually observed Traffic snapshot in the saved example's format; it records that observation's URL and displayed dates while retaining API availability separately. Omit it on future runs without a new manual observation; do not reuse this historical file as current traffic.

For subsequent weeks, export new CSVs, use the new date/directory in the commands, and append to the same ledger. Compare the CWS script's adjacent windows first; successive 28-day reports overlap. Compare stars against the preceding timestamp and report the actual interval. Record deployment dates, locale, material changes, unusual promotion, and data gaps in `--note`. Change one factor per experiment and prefer two complete weeks after a change; treat any result as observational, not proof of causation. No automatic schedule has been created.

## Channel ledger and attribution

`archive/measurement/channels.csv` records the existing README/About link vocabulary and a small set of planned channels. README campaigns remain `en`, `zh-cn`, and `zh-tw`; the live About link uses `github / repository / about`. Do not rename these midway through a comparison. Planned rows are explicitly unpublished and have no invented post date or performance. The English and Traditional Chinese pilot rows match the precise campaigns in [the follow-up plan](growth/research-follow-up.md): `reading_table_en_pilot` and `reading_table_zhtw_pilot`. The historical `wg_` prefix in the original research was a naming example, not an analytics requirement; preserve this agreed vocabulary rather than changing it during an observation.

For future links, use fixed lower-case source/medium/campaign names and record the exact destination URL, locale, publish date, and eventually a real post URL. Store those links in the channel ledger first. After publication is separately authorized, compare tagged views and, where available, install events for the same campaign and dates. Log unanswered or unavailable attribution rather than attributing a star increase to the campaign.

The store can forward `utm_source`, `utm_medium`, and `utm_campaign` into its managed Google Analytics property. The official guide says the store `install` event follows acceptance of the permission prompt, and UTM fields may take 24–48 hours to finalize. Its property also applies privacy thresholds. Adding UTM links does not confirm that the property is enabled or that our exports expose campaign-level installs. Access to the CWS developer console was rejected by the browser tool (`Not allowed`); no alternative route was used and GA4 was not inspected or enabled. A human dashboard check remains pending. Until that is verified, record campaign installs as `Unavailable` and use tagged store views only as an exposure signal. [CWS Google Analytics and UTM](https://developer.chrome.com/docs/webstore/google-analytics)

Potential contribution topics include Korean native-language review, macOS width verification, a real upstream DOM reproduction, and an installed-app cold start. Prepared internal drafts are not published GitHub issues or completed external contributions.

## Keep outcomes separate from preparation

`archive/measurement/experiment-log.csv` provides two **unpublished** pilot rows. Fill the actual URL, publication time and observation interval only when they exist. Leave traffic, attributable installs and feedback `Unavailable` until measured; a prepared plan is not a completed experiment. Capture concurrent changes and the retain/change/stop decision after the observation window.

`archive/measurement/engineering-events.csv` now contains 11 historical events for one Issue #9 / PR #10 compatibility episode, drawn from official issue/PR comments and GitHub releases, with CHANGELOG date cross-checks. The limited source snapshot is `archive/measurement-2026-09-19/engineering-history-source.json`; it omits account profile/email fields and quoted notification threads. Each row distinguishes the source event's time from the time we recorded it. Report, independent reproduction, validated fix, merge, release and user confirmation are separate fields; `distribution_channel` distinguishes GitHub prerelease from stable release. A GitHub publication time is not a Chrome Web Store rollout time.

The candidate was published on September 8 at 19:44 UTC. The reporter's September 9 feedback says the candidate still failed; their PR was later merged on September 15 at 17:03:44 UTC and a stable GitHub release appeared at 17:11:04 UTC. Positive stable-version user confirmation, independent reproduction/fix-validation times and the store publication time remain `Unavailable`. The negative candidate comment is not a recurrence after a verified fix. One accepted contributor is recorded for this episode; 11 event rows are not 11 reports or 11 contributors. See [the original failed-candidate feedback](https://github.com/Planetes1mal/wider-gemini/issues/9#issuecomment-5595355338), [PR #10](https://github.com/Planetes1mal/wider-gemini/pull/10), and [the stable release](https://github.com/Planetes1mal/wider-gemini/releases/tag/v2.6.0).

Once enough real records exist, calculate reproducibility over distinct reports actually evaluated in a stated period, and describe median report-to-validated-fix time using only rows with both timestamps. Keep unevaluated and unresolved counts alongside them. Count distinct public contributors for accepted contributions without guessing private identities; store technical citations as actual URLs. This single historical episode establishes neither a repair SLA nor a recurrence rate. Add future records only when their evidence exists; unavailable timestamps must not be replaced by commit, merge or closure times.
