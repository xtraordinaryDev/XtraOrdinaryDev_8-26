# SEO Playbook — x-traordinarydevelopment.com

Goal: rank #1 in Google for custom development and website searches.
Last updated: 2026-09-08.

## 0. Reality check and the keywords we are actually going after

"Custom development" and "websites" with no location are dominated by Toptal, Upwork, Wix, and
national agencies with thousands of backlinks. No small agency wins those. What a small agency
*does* win — and what actually produces phone calls — is **local intent** and **long-tail**:

| Page | Primary keyword | Secondary keywords |
|---|---|---|
| `/` (home) | custom software development Minneapolis | software development company Minneapolis, custom software Miami |
| `/websites.html` | custom website design Minneapolis | web design Minneapolis, website developer Minneapolis, custom website Miami |
| `/services.html` | software development services Minneapolis | web development company Minnesota, .NET developer Minneapolis |
| `/apply-399-website.html` | affordable website for small business Minneapolis | $399 website, small business website design |
| `/previous-work.html` | web design portfolio Minneapolis | (supports the others with proof) |
| Future landing pages (§5) | web design Miami, custom software Miami, website redesign Minneapolis, etc. | |

Track these 10–15 phrases weekly in Google Search Console (Performance → Queries). Expect movement
in 6–12 weeks for local terms once the Google Business Profile and backlinks in §6 are in place.

---

## 1. What is already done in the code (this commit)

- **Duplicate pages neutralized** — `2.html`, `4.html`, `index5.html`, `index_old.html`, `old*.html`,
  `zztest99.html`, `mschf-portfolio.html` now carry `noindex, nofollow`. They were 10 indexable
  copies of the site competing with the real pages. **Better still: delete them from the server**
  (a 404/410 drops out of the index faster than noindex). Keep them locally in git if you want.
- **Every live page** has a unique keyword-targeted `<title>`, meta description, `rel=canonical`,
  Open Graph + Twitter cards, `robots` meta, and Google Fonts preconnects.
- **Exactly one H1 per page**, containing the target keyword (websites, services, about, contact
  were missing one entirely).
- **Structured data (JSON-LD)**: `LocalBusiness` (home, now with a stable `@id`), `Service` +
  `FAQPage` + `BreadcrumbList` (websites), `Service` with an offer catalog (services), `ItemList`
  of portfolio sites (previous-work), `AboutPage`, `ContactPage`. FAQPage can earn rich results.
- **FAQ section** on websites.html (visible copy matches the schema — required by Google).
- **Alt text** on all ~60 images that had none; client logos no longer say "placeholder".
- **Internal links**: home page now links to `/previous-work.html` and `/websites.html` with
  keyword anchor text; "Previous Work" is in the nav and footer of every page.
- **`sitemap.xml`** (10 live URLs) and **`robots.txt`** (points to the sitemap, blocks `mail.php`).
- **`.htaccess`**: 301s for http→https, www→non-www, `/index.html`→`/` (Cloudflare-safe), gzip.
- **Hero poster images** generated for the three video heroes (the home page referenced a poster
  that did not exist) and preloaded — this is what Google measures as LCP on those pages.

## 2. Hosting & deploy (GitHub Pages) — read this first

The site is served by **GitHub Pages** (custom domain `x-traordinarydevelopment.com`, behind
Cloudflare). `static.yml` deploys `main` on every push, so **merging = publishing**. Consequences:

- **URGENT – contact form.** GitHub Pages cannot run PHP, so `mail.php` stopped working the moment
  the site moved (visitors were shown raw PHP source as the "success" message). The form now posts
  to **Web3Forms** (free, no server). To turn it on: go to https://web3forms.com, enter
  `xavier.thurman@x-traordinarydevelopment.com`, copy the access key from the email, and paste it
  into `contact.html` replacing `YOUR_WEB3FORMS_ACCESS_KEY` (line ~248). Until then the form shows
  "not configured yet – please email us". Test with a real submission after.
- `.htaccess` is ignored on Pages. Do the redirects in Cloudflare instead: **Rules → Redirect
  Rules**: `www.x-traordinarydevelopment.com/*` → `https://x-traordinarydevelopment.com/${1}` (301);
  SSL/TLS → **Full**; **Always Use HTTPS** on. In GitHub → Settings → Pages tick **Enforce HTTPS**.
- Cloudflare → Caching → **Purge Everything** after this deploy (old rules cached HTML for a year).
- Verify: `/robots.txt`, `/sitemap.xml`, `/previous-work.html`, `/blog/` load; view-source on
  `/websites.html` shows the JSON-LD. Test rich results: https://search.google.com/test/rich-results.
- The old draft pages (`old*.html`, `2.html` …) are still deployed with `noindex`. Delete them from
  the repo when convenient – a 404 drops out of Google faster.
- Everything in the repo is public and deployed, including this file and `tools/`. Nothing
  sensitive lives there (the API key is a GitHub secret), but keep it that way.

## 3. Week 1 — accounts and measurement (no ranking without these)

**Google Search Console** — https://search.google.com/search-console
- Add a **Domain** property for `x-traordinarydevelopment.com`; verify with the DNS TXT record
  in Cloudflare (takes 5 minutes).
- Sitemaps → submit `https://x-traordinarydevelopment.com/sitemap.xml`.
- URL Inspection → **Request indexing** for `/`, `/websites.html`, `/services.html`,
  `/previous-work.html`, `/apply-399-website.html`.
- Removals → request removal of any `old*.html` / `2.html` etc. that show up in `site:` search.
- Check "Pages" report weekly for "Crawled – not indexed" and "Duplicate" warnings.

**Bing Webmaster Tools** — https://www.bing.com/webmasters → "Import from Google Search Console".
(Bing powers DuckDuckGo and Copilot answers; it's free traffic.)

**Google Analytics 4** — ✅ DONE. Property `G-QTZ0S4RLHH` is installed on every live page with
Consent Mode v2 (analytics is denied for visitors who click "Reject" on cookie-settings.html).
Events already firing: `generate_lead` (contact form sent successfully) and `contact_click`
(any phone or email link, with `method: phone|email`).
- In GA4: Admin → Events → toggle **Mark as conversion** on `generate_lead` and `contact_click`.
- Admin → Product links → **Search Console links** → link the property (shows queries next to
  landing pages). Rankings are vanity; leads are the metric.

**Google Business Profile** — https://business.google.com — this is the single biggest lever for
"web design Minneapolis" (the map pack shows above organic results).
- Create/claim the Minneapolis profile. Primary category **Website Designer**; secondary
  **Software Company**, **Internet Marketing Service**.
- If you have no public office, choose "I deliver goods and services to my customers" and set the
  service area (Minneapolis, St. Paul, Twin Cities suburbs). Do the same for Miami **only** if you
  can verify a real Miami address — a fake one gets the whole profile suspended.
- Fill every field: services (with prices where fixed, e.g. $399 website), description with the
  keywords from §0, business hours, phone `763-742-4823`, website `https://x-traordinarydevelopment.com/`.
- Upload 10+ photos: logo, project screenshots (`assetsmschf/*.webp` work), a headshot.
- Post an update weekly (a new project, a tip). Profiles that post rank higher.
- **NAP consistency**: use exactly the same business name, phone, and city everywhere online
  (GBP, site footer, LinkedIn, directories). Add a street address to the `LocalBusiness` schema in
  `index.html` once you have a public one.

## 4. Speed / Core Web Vitals (Google ranks fast pages higher; mobile first)

Run https://pagespeed.web.dev on `/` and `/websites.html` after deploy and save the scores as
the baseline. Status:

1. ✅ **Hero videos re-encoded.** Home hero now serves `xtraherosection-1080.mp4` (18.8 MB, ~5.5 Mbps)
   on desktop and `xtraherosection-720.mp4` (8.2 MB) on phones / data-saver, instead of the 74 MB
   original (which stays in `images/` unreferenced). Websites hero: 43 MB → 5.4 MB / 2.8 MB.
   iOS gets multi-bitrate HLS (`output.m3u8` → `hero1080.m3u8` / `hero720.m3u8`;
   `xavierthurman.m3u8` → `xt1080` / `xt720`) so Safari picks by connection speed.
2. ✅ **Below-the-fold promo videos** on about/services/websites are `preload="none"` and only
   load when scrolled within 600px of the viewport.
3. ☐ **Cloudflare → Speed** (you, in the dashboard): turn on **Brotli**, **Early Hints**,
   **Auto Minify** (HTML/CSS/JS), and **Polish (lossy) + WebP**. Free plan has all of these.
   Also SSL/TLS → **Full (strict)**.
4. ✅ **Fonts** moved from the CSS `@import` chain to a single `<link … display=swap>` in each
   page's `<head>` with preconnects.
5. ✅ **Images**: hero image/banner/poster PNG+JPG converted to WebP (`about.png` 496 KB → 16 KB,
   the three 4 MB screenshots on the $399 page → ~150 KB each); everything below the header is
   `loading="lazy" decoding="async"`.
6. ✅ Poster images for all video heroes, preloaded (LCP).

Targets: LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on mobile. Re-check PageSpeed after the Cloudflare
settings in item 3 — that is the only remaining speed item outside the code.

## 5. Content — the pages that will actually rank (build over the next 60 days)

One page per intent. Each gets its own H1, title, meta description, 600–1,200 words of real copy,
2–3 portfolio screenshots, an FAQ block with `FAQPage` schema, and a contact CTA. Copy the
structure of `websites.html`. Do **not** make near-duplicate pages that only swap the city name —
Google calls those doorway pages and penalizes them; every page needs unique content.

Priority order:
1. ✅ `/web-design-minneapolis.html` — live. ~1,500 words, Service + FAQPage + Breadcrumb schema,
   three Twin Cities proof projects, suburbs named. Linked from the footer of every page and from
   websites.html / services.html.
2. ✅ `/custom-software-development-minneapolis.html` — live (GridLink, FundStart AI, U.S. Bank, CHS).
3. ✅ `/web-design-miami.html` — live, with a genuinely Miami angle (industries, bilingual/Spanish
   pages with hreflang, Miami-Dade/Broward local SEO). `/custom-software-development-miami.html`
   deliberately **not** built yet — build it only once you have a Miami software client to cite,
   otherwise it reads as a doorway page.
4. ✅ `/website-redesign.html` — live.
   **Your part for all four:** read them once for tone and facts (pricing ranges, suburbs, claims
   about in-person meetings), then request indexing for each in Search Console.
5. ☐ **Case studies** — one page per project in `previous-work.html` (`/work/works-of-heart.html`,
   etc.) with the problem, what you built, and a *number* (conversion lift, launch time, tickets
   sold). Link each from the portfolio row. These attract links and rank for "[client] website".
6. ✅ **Blog** at `/blog/` — live with three posts (website cost in Minneapolis, WordPress vs
   custom, Works of Heart case study), `BlogPosting` schema with author byline, linked from every
   footer and in the sitemap. **Cadence:** 2 posts/month for the first 3 months (Google needs a
   pattern to start crawling the section regularly), then 1–2/month sustained. One genuinely useful
   1,000+ word answer beats four filler posts; never publish just to hit the number. Once a year,
   refresh the top posts (update the year in the title, re-check the numbers) — that keeps them
   ranking. To add a post: copy an existing one in `/blog/`, update title/description/canonical/
   schema dates, add a card to `/blog/index.html`, and add the URL to `sitemap.xml`.
   Next posts, in order, answering what your buyers Google:
   "How much does a website cost in Minneapolis (2026)", "WordPress vs custom website for small
   business", "Do I need a web developer or a web designer?", "How long does custom software
   take?", "AI chatbot for small business — what it really costs".
7. Add every new page to `sitemap.xml` (update `<lastmod>`), link it from the nav or footer, and
   request indexing in Search Console.

## 6. Authority — backlinks (this is what separates page 1 from page 3)

1. **Client footer credits — do this this week.** Ask each client whose site you built to add
   "Website by <a href="https://x-traordinarydevelopment.com/">X-Traordinary Development</a>" in
   their footer: low-fuel.com, trk-contracting.com, platesandplaymakers.com, worksofheart.us,
   VSC Peptides, GridLink. Six relevant, real links from live businesses is more than most local
   competitors have. Make it a standard line in every future contract.
2. **Directories that Google trusts** (fill out completely, same NAP): Clutch, GoodFirms,
   DesignRush, UpCity, Yelp, BBB, Bing Places, Apple Business Connect, Minneapolis Regional Chamber
   of Commerce, MEDA (Metropolitan Economic Development Association), NMSDC / MN Unified
   Certification Program (minority-owned certification pages link back), LinkedIn company page.
3. **x-traordinary.ai** already links here from its nav — make sure it has a visible text link
   ("web design by X-Traordinary Development") on its footer too, and vice versa.
4. **Local press / community**: Minneapolis/St. Paul Business Journal, Twin Cities Startup Week,
   Minnesota Black Chamber of Commerce, sponsor a local event (Plates & Playmakers already is one —
   get listed as a sponsor with a link).
5. **Guest posts** on Minnesota business blogs and podcasts about small-business websites/AI.
6. Never buy links or use link networks. One real link from a Minneapolis business beats 100
   junk links, and junk links get sites penalized.

## 7. Reviews

- Ask every past client for a **Google review** on the Business Profile (send the direct review
  link from GBP). Reviews with the words "website" / "software" in them help the map pack.
- Reply to every review.
- Do **not** add self-authored `Review`/`AggregateRating` schema to the site — Google ignores it
  for LocalBusiness and can flag it.

## 8. Monthly maintenance

- Search Console: check Performance (clicks, impressions, average position for §0 keywords),
  Pages (indexing errors), Core Web Vitals, and any manual actions.
- Add new projects to `previous-work.html` and the schema `ItemList`; write the case study.
- Refresh `sitemap.xml` `<lastmod>` when pages change.
- Post on Google Business Profile weekly; publish 2 blog posts.
- Re-run PageSpeed after any media change.

## 9. Things that will hurt (avoid)

- Doorway pages (same page, city name swapped).
- Keyword stuffing in titles/H1s — one primary phrase per page, written for humans.
- Leaving the draft/duplicate pages on the server.
- Auto-playing 74 MB videos on mobile.
- Buying links, fake reviews, fake Miami address.
- Removing or renaming existing URLs without a 301 in `.htaccess`.

## 10. Automated weekly blog drafts (set up 2026-09-08)

A GitHub Actions workflow (`.github/workflows/weekly-blog-post.yml`) runs **every Monday at 9 AM
Central**, takes the next topic from `tools/topics.txt`, has Claude (`claude-opus-5`) write a
~1,000–1,500 word post using only the facts in `tools/blog-config.json`, validates it (no prices,
no invented statistics, internal links present), builds the HTML, and **opens a pull request**.
Nothing publishes until you merge. Cost is roughly $0.10–0.15 per post.

- **Review the PR** on Monday (10 minutes): read it, fix anything that sounds off, merge. Closing
  the PR discards it. Run it on demand from the Actions tab (`Run workflow`, optional topic).
- **Editorial calendar:** add lines to `tools/topics.txt` any time. When it is empty, Claude proposes
  a non-overlapping topic.
- **Company facts / tone / what never to claim:** edit `tools/blog-config.json`.
- **Deploy:** merging the PR triggers `static.yml`, which republishes the site on GitHub Pages within a minute or two.
- **Manual posts:** add `blog/content/<slug>.html` + an entry in `blog/posts.json`, run
  `npm run blog:build`. Never edit `blog/*.html` directly – they are generated.
- **Rotate the API key** any time from the Anthropic Console, then
  `gh secret set ANTHROPIC_API_KEY` (or Settings → Secrets → Actions).
