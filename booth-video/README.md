# Booth video

The conference loop is generated, not hand-edited. Everything is in this folder:

| File | What it controls |
|---|---|
| `cards.html` | Every title card: wording, colors, layout. One `<div class="card" id="...">` per card. |
| `record.mjs` | Which live sites get recorded (URL list at the top), how long to hold on the hero, how far and how slowly to scroll. |
| `build.py` | The order of segments, how long each stays on screen, which clip or recording each one uses. See `SEQUENCE` at the top. |
| `out/` | Generated files (recordings in `out/rec/`, cards as PNG, one mp4 per segment, and the final video). Git-ignored. |
| `~/Desktop/X-traordinary site recordings/` | Standalone MP4 of each site recording (trimmed, 1476x996, 30fps, silent), named `<site>-<date>.mp4`. Reusable in other videos. Written by the `export` step on every build. |

## Rebuild

```
python3 booth-video/build.py --desktop
```

That records each live site in Chrome (hero video playing, scroll animations firing), renders the cards, builds each segment, crossfades them together, and copies `X-traordinary-booth-loop.mp4` to the Desktop. Full build takes several minutes. Needs ffmpeg (`brew install ffmpeg`), Google Chrome, and a one-time `npm install` inside this folder (plus `npx playwright install ffmpeg`).

Only changed wording? Skip the recording step:

```
python3 booth-video/build.py --only cards,segments,final --desktop
```

One site changed? Re-record and rebuild just that one:

```
node booth-video/record.mjs trk
python3 booth-video/build.py --only segments,final --seg trk --desktop
```

## Common edits

- **Change any text:** edit it in `cards.html`, rebuild.
- **Reorder or cut a section:** move or delete its line in `SEQUENCE` in `build.py`.
- **Hold a card longer:** raise its `dur`.
- **Scroll slower or faster:** change `SCROLL` (all sites) or a site's own `scroll` in `record.mjs`, then set that segment's `dur` in `build.py` to about `(hold + scroll + 600) / 1000` seconds so the cut lands after the scroll ends.
- **Add a new site:** add its URL to the `SITES` list in `record.mjs`, copy one of the portfolio `<div class="card cream pf">` blocks in `cards.html` with the same `id`, and add a `kind="record"` line to `SEQUENCE` in `build.py`. Renumber the `01 / 06` labels.
- **A site records blank or half-loaded:** it was slow that day. Re-run `node booth-video/record.mjs <name>` and rebuild that segment.
- **Swap the intro or closing footage:** change `src`/`start` on the `intro` and `close` entries. Keep them on the same clip so the loop is seamless.
- **Music:** the file is silent on purpose. Add a track in iMovie or CapCut, or run
  `ffmpeg -stream_loop -1 -i music.mp3 -i out/X-traordinary-booth-loop.mp4 -shortest -c:v copy -c:a aac with-music.mp4`

## Meta ads (`ads/`)

Premium set, built from phone-viewport recordings of the sites. `ads/ads.html` holds the caption cards, `ads/build_ads.py` composites each recording behind a phone frame and stitches the videos, `ads/COPY.md` has primary text, headlines, the founder video script and the launch plan.

```
MOBILE=1 node booth-video/record.mjs vsc pnp woh trk   # phone recordings of the sites the ads show (once, or when a site changes)
python3 booth-video/ads/build_ads.py                    # -> ~/Desktop/X-traordinary Meta ads/
```

Outputs: `P1_premium_9x16.mp4`, `P2_selective_9x16.mp4`, `P2_selective_4x5.mp4`, `S1_premium_4x5.png`, `S1_premium_1x1.png`, `S2_not-templated_4x5.png`, `S3_before-you-commit_4x5.png`.

- **Change the price or a line:** edit `ads.html` (and the matching copy in `COPY.md`), rebuild.
- **Show a different site in a segment:** change the site name in the `phone_seg(...)` calls in `build_ads.py` and the footer text on that card in `ads.html`.
- **A site has its own loading screen** (like VSC): give it `settle: <ms>` in `record.mjs` so recording starts after it.
