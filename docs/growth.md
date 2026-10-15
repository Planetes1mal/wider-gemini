# Discovery and measurement

Roomy (formerly Wider Gemini) focuses on the reading layout of Gemini and ChatGPT: conversation width, text size and spacing, code wrapping on Gemini, and message navigation. Demonstrations should show those controls solving a visible problem, with the installation link nearby.

## Assets and entry points

- The three READMEs show the same real Gemini conversation at 700px and 1200px, using full-page screenshots. They retain contributor documentation and separate `utm_campaign` values for English, Simplified Chinese, and Traditional Chinese installation links.
- The popup links to local help and the source repository. Help offers troubleshooting, an optional diagnostic copy, GitHub, and an honest store review. No automatic review prompt or reward is involved.
- [Engineering notes](./engineering.md) explain the existing implementation and link reproducible checks. They offer a concrete basis for technical discussion and contributions.
- The repository About description, installation URL, and seven relevant topics were saved on GitHub on September 19, 2026. On October 15, 2026 the repository was renamed from `wider-gemini` to `roomy`; the description now names both sites and the former name, and the topics add `chatgpt` and `ai-chat`. Old repository URLs redirect to the new name.

The 3.0.0 store assets were uploaded with the 3.0.0 submission on October 15, 2026: five screenshots per language across six languages (ChatGPT and Gemini width comparisons, tables, reading layout, and code wrapping), a 440×280 and a 1400×560 tile, plus a 1280×640 GitHub social preview. English screenshots also serve the global listing. Their sources and render scripts are kept in an ignored local archive. Each store description starts with “formerly Wider Gemini” for about three months after the rename. Video production remains paused, and the original recordings and recording scripts remain preserved in an ignored local archive.

## Internal follow-up ready for review

- [Public-source follow-up and two pending experiments](./growth/research-follow-up.md) identifies an original Reddit recommendation and a Traditional Chinese response about table width. Neither Taiwan installation peak has a confirmed referral source. The channel shortlist is based on actual editorial work and current submission rules, with no outreach or publication performed.
- Practical reading guides are available in [English](./guides/reading-layout.md) and [Traditional Chinese](./guides/reading-layout.zh-TW.md): wide tables, long code, conversation font size, and troubleshooting. They use existing individual controls and explain layout limits.
- One English community discussion and one Traditional Chinese editorial submission are planned as small, separately measured experiments. Both remain pending a decision to publish; preparing the text does not authorize external contact or publication.

## Measure one change at a time

Before changing the store listing, save its current screenshots, copy, and daily CSV export. Record the deployment date and which locale changed. Compare complete 14-day windows and keep zeros or incomplete export dates visible as data quality caveats.

| Goal | Signal | Limit |
|---|---|---|
| More discovery | Store listing views and impressions by source/locale | These are not unique people or installs |
| Better conversion | Store views and installs over the same period | Daily aggregates are not a matched-user funnel |
| More sustained use | Installation-related user counts and uninstalls | They do not establish actual weekly feature usage or cohort retention |
| More open-source interest | GitHub traffic, stars, forks, and useful issues | Stars alone do not measure product quality |

UTM parameters are in the links. Attribution still depends on the store's available analytics configuration; adding a URL parameter does not by itself establish a working measurement pipeline. The extension does not include analytics.

Use English and Traditional Chinese materials first, then Simplified Chinese. Further localization should follow user demand and a native-language copy review. Avoid changing screenshots, description, and a large feature set simultaneously if the purpose is to understand which change helps.

## Releases

3.0.0 was released on October 15, 2026: GitHub release `v3.0.0`, and a Chrome Web Store submission intended for a staged rollout (10%, then 50%, then 100%). Do not publish another store version while a staged rollout is running, because that stops the earlier version from reaching more users.

Later releases use the existing gated Release workflow and shared packager; only a stable extension ZIP belongs in a Chrome Web Store upload. Keep the contributor's PR #10 layout changes intact unless a real regression has been reproduced. Cross-platform claims still require the relevant device, especially macOS and actual Chrome-installed-app cold starts.
