# X-traordinary — `/start` Landing Page + Meta Campaign Spec (High-Ticket v2)

**Goal:** Replace `apply.x-traordinarydev.com` with a lead-capture page at `https://x-traordinarydev.com/start` that turns cold Meta traffic into qualified "free mockup" requests for $2,500–$7,500+ website projects.

**Offer:** Lead Engine website. $4,500 core. 50% deposit, balance at launch. Live in 14 days. Free homepage mockup before any commitment.

**Market:** Minnesota (Twin Cities first). **Trades:** roofing, HVAC, remodeling. Secondary: med spas, dental.

---

## 1. Technical requirements

- Path: `/start` on the root domain (same domain as Meta pixel `742033115386019`; no subdomain).
- Mobile-first, single column, max content width ~680px on desktop.
- No popups, no autoplay video, no chat widgets.
- Lighthouse mobile performance ≥ 90. Lazy-load below-the-fold images. Serve WebP.
- Existing Meta pixel base code stays in `<head>`; `PageView` fires on load (already does).
- On successful form submit: **stay on page**, swap the form for an inline thank-you, and fire:
  ```js
  fbq('track', 'Lead');
  ```
  If the budget answer is `$5k+` or `$2k–5k`, ALSO fire:
  ```js
  fbq('track', 'SubmitApplication');
  ```
  (This gives Meta a "qualified lead" signal to optimize toward later. Under-$2k does not fire it.)
- Do not redirect to the old `/confirmation-*` page from this form. The booking confirmation page keeps firing `Schedule` as it does today.
- Form posts to GHL (see §5). Capture `utm_source`, `utm_campaign`, `utm_content`, `fbclid` in hidden fields.
- Sticky bottom CTA bar on mobile: "Get My Free Mockup" → scrolls to `#form`.

---

## 2. Page structure (in order)

### 2.1 Header
- Logo left. One button right: **Get My Free Mockup** (anchor `#form`).
- Remove "Free Consultation."

### 2.2 Hero
```
EYEBROW:  FOR MINNESOTA ROOFERS, HVAC & REMODELERS
H1:       A website that books jobs while you're on the job.
SUB:      Custom-built, live in 14 days, designed to turn "roofer near me"
          searches into booked estimates. I'll build a free mockup of your
          homepage first — see it before you commit to anything.
BUTTON:   Get My Free Mockup →
MICRO:    Free mockup in 48 hours · Live in 14 days · You own everything
```
- No price in the hero.
- Visual: phone + laptop mockup of one of the before/after sites (§2.4). **Remove** the code-editor collage background.

### 2.3 Problem
```
Someone in the Twin Cities is searching "roofer near me" right now.
They'll call whoever looks the most legit in the first 10 seconds.
If your site looks like it was built in 2014 — or you're sending people
to a Facebook page — they're calling the next guy. Not because he's
better. Because he looks like he is.
```

### 2.4 Before / After (primary conversion section)
Three side-by-side pairs. Left = their current site/Facebook page screenshot. Right = mockup.

| Label | Left | Right |
|---|---|---|
| Roofer · St. Paul | current site | mockup |
| HVAC · Bloomington | current site | mockup |
| Remodeler · Maple Grove | current site | mockup |

- Caption under each: **"Mockup"** until they're real clients.
- If/when you have a real result, add one line under the pair: "Went from 2 calls/month to 14 in 60 days." Only if true.
- TODO (Xavier): pick 3 real MN businesses with bad sites, build the mockups (1–2 hrs each), screenshot both. Email them the mockup — this is your first outreach (§7).

### 2.5 What you actually get
Short paragraph, not a feature grid:
```
This isn't a template. I build every page around the three things that
make a contractor's phone ring: showing up on Google, looking trustworthy
in 10 seconds, and making it stupid-easy to request an estimate. Click-to-
call on every screen. Estimate form that texts you instantly. Google
Business Profile wired up. Reviews front and center. Built to load fast
on a truck's 4G.
```

### 2.6 How it works
```
1. Tell me about your business (30 seconds).
2. I send you a free homepage mockup within 48 hours.
3. Love it? We hop on a 15-minute call, you put down a deposit, and it's
   live in 14 days. Don't love it? No charge, no follow-up.
```

### 2.7 Pricing
Three cards, middle one highlighted "Most popular."

**Starter — $2,500**
- Up to 5 pages
- Click-to-call + estimate form
- Mobile-first, fast
- Google Business Profile setup
- Live in 14 days

**Lead Engine — $4,500** *(Most popular)*
- Everything in Starter
- Up to 10 pages (one per service + service areas)
- Online booking / estimate scheduler
- Automated review requests
- Missed-call text-back
- 30 days of post-launch edits included

**Authority — $7,500+**
- Everything in Lead Engine
- Custom photography direction + copywriting
- Local SEO foundation (service-area pages, schema, GBP optimization)
- Monthly lead report for 90 days
- Priority build (7 days)

Line under the cards:
```
All plans: 50% to start, 50% at launch. You own the site, the domain, and
the code. Optional care plan after launch: $149/mo for hosting, security,
and up to 2 hours of edits a month.
```

### 2.8 FAQ (accordion)
**Do I own the website?**
Yes. Domain, code, hosting account — all yours. If we part ways, you keep everything.

**Why not just use Wix or a $500 guy on Fiverr?**
You can. I've rebuilt a lot of those sites. The difference is whether the site generates calls or just exists. A $500 site that gets you zero jobs costs you more than a $4,500 one that gets you two.

**How long does it take?**
Free mockup in 48 hours. After deposit, the full site is live in 14 days. Authority plan: 7 days.

**Do I have to write anything?**
No. Send your services, service area, a few job photos, and any reviews. I write the copy and you approve it.

**What if I already have a site?**
I'll rebuild it and migrate anything worth keeping. Most of my clients came from a site that looked fine but never rang the phone.

### 2.9 Form (`#form`)
```
H2:      Get your free mockup
SUB:     30 seconds. Mockup in your inbox within 48 hours.

FIELDS:
  - Name                      (required)
  - Business name             (required)
  - Phone                     (required, tel)
  - What do you do?           (select: Roofing / HVAC / Remodeling /
                               Med spa / Dental / Other)
  - Current website           (optional, url)
  - Budget for this project   (select, required:
                               "Under $2,000" / "$2,000–$5,000" /
                               "$5,000+" / "Not sure yet")
  - hidden: utm_source, utm_campaign, utm_content, fbclid

BUTTON:  Send My Free Mockup
MICRO:   You'll hear from me within 48 hours.
```
On success (inline, no redirect):
```
Got it. Watch for a text from me — your mockup is on the way.
```

### 2.10 Footer
Logo, email, "Minnesota", privacy link.

---

## 3. Copy rules
- Never use: "application," "apply," "tentatively scheduled," "consultation," "cheap," "affordable."
- Always use: "free mockup," "live in 14 days," "you own everything," "books jobs."
- Voice: direct, first person. Xavier is the product. Confidence, not hype.

---

## 4. Remove / retire
- `apply.x-traordinarydev.com` as any ad destination.
- "Free Consultation" button and "$399" anywhere on the site.
- Code-editor hero background.
- The word "application" from the funnel.
- Meta custom conversion `1035525209080705` (old apply page).

---

## 5. GHL automation (form submit)
1. Tag contact `mockup-request` + tag with trade + tag with budget answer.
2. Instant SMS (all budgets):
   > Hey {{contact.first_name}}, Xavier here. Got your request — I'll have your mockup over within 48 hours.
3. **Budget = Under $2,000 or Not sure:** move to pipeline stage "Low budget." Send email:
   > Quick heads up — my projects start at $2,500. If that's out of range right now, I also offer a $149/mo care plan on a starter site. Reply "care plan" and I'll send details.
   No task created. (Protects your time.)
4. **Budget = $2k–5k or $5k+:** pipeline stage "Mockup queue." Task for Xavier: "Build mockup — {{contact.company_name}}", due 24h.
5. When mockup is sent (stage → "Mockup Sent"), SMS + email:
   > Here's your mockup: {{link}}. If you like where it's going, grab 15 min with me and we'll map out the rest: {{calendar_link}}
6. No reply after 48h → nudge SMS. After 7 days → "Cold." After 30 days → re-engage: "Still have that mockup — want me to send it again?"
7. Booked call → existing confirmation page (fires `Schedule`).

---

## 6. Meta campaign (already built in Ads Manager — IDs below)

```
Campaign:  META_Leads_MN-Contractors_0Down149_Sep26   id 120256168051680273
           → RENAME to META_Leads_MN-Contractors_LeadEngine_Sep26
           CBO $40/day, PAUSED
└── Ad set B: /start Landing Page  id 120256168053640273
    optimization OFFSITE_CONVERSIONS (Lead), Minnesota, 25–60 Adv+, PAUSED
```
- Old campaign `120255321052130273` ($399 offer) → PAUSED. Leave paused; archive after 30 days.
- Ad set A (instant form) is NOT recommended for high-ticket — instant forms produce cheap, low-intent leads. Skip it. Keep everything on the landing page with the budget qualifier.
- After 30 `Lead` events: switch ad set B optimization from `Lead` → `SubmitApplication` (qualified-lead signal from §1). After 20 booked calls: build a lookalike from `Schedule` and add as ad set C.
- Exclusions (add in Ads Manager): website visitors 90d, existing leads custom audience.

### Creatives (4 angles, 1 ad each; kill bottom two after $150 spend each)

**Ad 1 — The Cheap Site Is Expensive (anti-cheap)**
- Primary: A $500 website isn't cheap. If it costs you two jobs a month, that's $50,000 a year walking to the next roofer. I build websites for Minnesota contractors that actually book estimates — live in 14 days. I'll mock up your homepage for free first so you can see the difference before you spend a dollar.
- Headline: Your Website Is Costing You Jobs
- Description: Free homepage mockup. See it before you decide.
- Visual: Split screen. Left: an ugly 2014-era contractor site. Right: the mockup. Overlay: "This one gets 2 calls/mo → This one gets 14."

**Ad 2 — Losing Jobs (PAS)**
- Primary: Someone in the Twin Cities just searched "HVAC repair near me" and called your competitor. Not because they're better. Because they looked legit in 10 seconds and you didn't. I fix that in 14 days.
- Headline: Stop Losing Jobs to Guys With Worse Work
- Description: Free homepage mockup for MN contractors.
- Visual: Phone screenshot of a Google "near me" result with a competitor highlighted.

**Ad 3 — Free Mockup (proof)**
- Primary: I'll build a free mockup of your new website. No deposit, no call, nothing — you just see it. Here's one I did for a Minnesota roofer last week. If you like it, it's live in 14 days.
- Headline: Free Website Mockup for Contractors
- Description: See your new site before you commit.
- Visual: Real before/after from §2.4.

**Ad 4 — Anti-Agency (contrast)**
- Primary: Agencies quote $12,000, take 4 months, and hand you a site you can't edit. I build the same thing for Minnesota contractors in 14 days, you own everything, and I'm the guy you actually talk to. Free mockup first.
- Headline: Agency Results. Half the Price. 14 Days.
- Description: Free homepage mockup. You own the site.
- Visual: Agency proposal "$12,000 · 16 weeks" crossed out next to "14 days."

**Video (25–30s, phone, captions on, you on camera)**
```
0–3s   If you're a roofer, HVAC, or remodeling company in Minnesota and
       your website hasn't gotten you a job this month, watch this.
3–10s  Every day someone searches your service, lands on your site, and
       decides in 10 seconds whether to call you or the next guy. Most
       contractor sites lose that decision.
10–22s I build websites that win it. Click-to-call everywhere, estimate
       form that texts you instantly, reviews up front, live in 14 days.
       And I'll mock up your homepage for free before you pay anything.
22–30s Tap below, drop your business name, and I'll send the mockup in
       48 hours.
```

### Kill rules
- After $150 spend per ad: pause the bottom two by cost per lead.
- Judge ads on cost per *qualified* lead ($2k+ budget answers), not raw leads.
- Budget changes ≤ 20% at a time, 3 days apart.

---

## 7. Outreach email for the 3 mockup businesses
```
Subject: Built you a new homepage (free, no strings)

Hi {{first_name}},

I build websites for Minnesota {{trade}} companies and I mocked up a new
homepage for {{business}} — took me an afternoon, no charge, I just think
you're losing calls with the current site.

Here it is: {{link}}

If you like it, I can have the full site live in 14 days. If not, no
worries — keep the mockup.

Xavier
X-traordinary
```

---

## 8. Sales call outline (15 min, for the Lead Engine tier)
1. "Walk me through how jobs come in today." (2 min — listen)
2. "What's a typical job worth?" (anchors the $4,500 against one job)
3. Show the mockup, ask what they'd change. (5 min)
4. "Here's what I'd build and why" — tie each feature to a job they lose today. (3 min)
5. Price: "Lead Engine is $4,500. Half now, half when it's live in 14 days. Want me to start Monday?" Then stop talking.
6. Objection = budget → offer Starter at $2,500. Objection = timing → hold the mockup 30 days.
