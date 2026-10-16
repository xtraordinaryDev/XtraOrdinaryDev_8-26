// Records each live portfolio site in a real Chrome window: hero video playing, scroll animations
// firing, then a slow scroll down the page. Output: out/rec/<name>.webm + <name>.json (trim offset).
//
//   node booth-video/record.mjs            # all sites
//   node booth-video/record.mjs trk lf     # just some
//
// Viewport is 1476x996: the same 1180:796 shape as the browser frame on the cards, so build.py
// only has to scale it down.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const MOBILE = process.env.MOBILE === '1';   // MOBILE=1 records a phone viewport (for vertical ads) into out/rec-mobile
const REC = join(HERE, 'out', MOBILE ? 'rec-mobile' : 'rec');

export const SITES = [
  { name: 'woh',   url: 'https://worksofheart.us', hold: 2500, scroll: 16000, maxScroll: 6000, mobileHold: 1800, mobileScroll: 7000, mobileMaxScroll: 2600 },   // long page: scroll further, slowly, so each section can animate in
  { name: 'grid',  url: 'https://gridly-mvp.vercel.app' },
  { name: 'vsc',   url: 'https://xtraordinarydev.github.io/VSC-Peptides', hold: 2500, scroll: 14000, maxScroll: 6000, mobileHold: 1800, mobileScroll: 7000, mobileMaxScroll: 2600, settle: 6000 },   // has its own 0-100% preloader
  { name: 'lf',    url: 'https://low-fuel.com' },
  { name: 'trk',   url: 'https://trk-contracting.com', mobileStartY: 830, mobileHold: 2500, mobileScroll: 8500, mobileMaxScroll: 3200 },   // ads: start below the hero, on the real project photos
  { name: 'pnp',   url: 'https://platesandplaymakers.com', mobileHold: 1800, mobileScroll: 7000, mobileMaxScroll: 2600 },
  { name: 'start', url: 'file://' + join(REPO, 'start.html'), maxScroll: 1100 },
];

const W = MOBILE ? 390 : 1476, H = MOBILE ? 844 : 996;
// Chrome's screencast captures at CSS pixels under mobile emulation, so for a crisp 2x phone recording
// the whole browser is launched at a forced 2x scale factor instead of using deviceScaleFactor/isMobile.
const DSF = MOBILE ? 2 : 1;
// Per-site overrides: hold, scroll (ms) and maxScroll (px) on any SITES entry. build.py's dur for that
// segment should be about (hold + scroll + 600) / 1000 seconds.
const HOLD = 3200;      // ms to sit on the hero before scrolling (lets hero video + intro animations play)
const MAX_SCROLL = 2200; // px to scroll by default (slow enough that reveal animations and lazy images show up)
const SCROLL = 6500;    // ms of slow scroll
const TAIL = 600;       // ms to rest at the end

// Force every <video> on the page to fetch (sites often ship preload="metadata" or "none") and wait
// until each has enough data to play, so hero videos and before/after sliders aren't black on screen.
async function warmVideos(page, name, timeout) {
  const n = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('video')];
    vids.forEach(v => { v.muted = true; v.preload = 'auto'; if (v.readyState < 3) { try { v.load(); } catch {} } });
    return vids.length;
  });
  if (!n) return;
  await page.waitForFunction(() => [...document.querySelectorAll('video')].every(v => v.readyState >= 3 || v.error), null, { timeout })
    .catch(() => console.log(`\n  warning: ${name}: some videos were still buffering after ${timeout / 1000}s – recording anyway`));
}

// Raw Chrome screencast: every compositor frame arrives as a JPEG with a timestamp. Frames are written to
// a temp folder, then assembled by ffmpeg with their real durations into a 60fps H.264 mp4.
async function startScreencast(ctx, page, name) {
  const dir = join(REC, `${name}-frames`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const ts = []; let n = 0; let stopped = false;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    if (!stopped) {
      try { writeFileSync(join(dir, `f${String(n).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64')); ts.push(metadata.timestamp); n++; }
      catch (e) { console.log(`\n  warning: dropped a frame (${e.code || e.message})`); }
    }
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 93, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
  return {
    async finish(dest) {
      await cdp.send('Page.stopScreencast').catch(() => {});
      await new Promise(r => setTimeout(r, 300));
      stopped = true;
      // frames can arrive slightly out of timestamp order: sort by time, and never let a duration go below 1/120s
      const order = ts.map((t, i) => [t, i]).sort((a, b) => a[0] - b[0]);
      const sortedTs = order.map(o => o[0]);
      const gaps = sortedTs.slice(1).map((t, i) => Math.max(1 / 120, t - sortedTs[i]));
      const median = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 1 / 60;
      const list = order.map(([, idx], k) => `file 'f${String(idx).padStart(6, '0')}.jpg'\nduration ${(k < gaps.length ? gaps[k] : median).toFixed(5)}`).join('\n');
      writeFileSync(join(dir, 'frames.txt'), list + '\n');
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'frames.txt'),
        '-vf', 'fps=60,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-movflags', '+faststart', dest]);
      if (r.status !== 0) throw new Error('ffmpeg assemble failed: ' + r.stderr.toString().slice(-500));
      rmSync(dir, { recursive: true, force: true });
      const seconds = gaps.reduce((a, b) => a + b, 0) + median;
      return { seconds, fps: n / seconds };
    },
  };
}

const only = process.argv.slice(2);
const sites = only.length ? SITES.filter(s => only.includes(s.name)) : SITES;
mkdirSync(REC, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies',
         ...(MOBILE ? ['--force-device-scale-factor=2'] : [])],
});

for (const site of sites) {
  process.stdout.write(`recording ${site.name} … `);
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    // Desktop uses Playwright's recorder (fixed 25fps, fine for the booth loop). Mobile captures a raw
    // Chrome screencast instead (~40-60fps with timestamps) so scrolling in the ads is smooth.
    ...(MOBILE ? {} : { recordVideo: { dir: REC, size: { width: W * DSF, height: H * DSF } } }),
    reducedMotion: 'no-preference',
    userAgent: MOBILE
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  } catch (e) {
    console.log(`\n  warning: ${site.name} did not finish loading (${e.message.split('\n')[0]}) – recording anyway`);
  }
  await page.evaluate(() => document.querySelectorAll('video').forEach(v => { v.muted = true; v.play().catch(() => {}); }));
  // warm-up pass: scroll through the page once so lazy-loaded images and every video are fetched, then reload
  {
    const max = await page.evaluate(m => Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, m)),
      ((MOBILE && site.mobileStartY) || 0) + ((MOBILE && site.mobileMaxScroll) || site.maxScroll || MAX_SCROLL));
    for (let y = 0; y < max; y += 500) {
      if (MOBILE) await page.evaluate(v => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, v); }, y + 500);
      else await page.mouse.wheel(0, 500);
      await page.waitForTimeout(120);
    }
    // force every lazy image (and any data-src style deferred image) to fetch now, and wait until decoded
    await page.evaluate(() => Promise.all([...document.images].map(img => {
      if (img.loading === 'lazy') img.loading = 'eager';
      const ds = img.dataset && (img.dataset.src || img.dataset.lazySrc);
      if (ds && !img.src.endsWith(ds)) img.src = ds;
      return img.decode().catch(() => {});
    }))).catch(() => {});
    await page.waitForTimeout(1500);
    await warmVideos(page, site.name, 90000);   // first fetch of big slider videos can take a while
    // reload: images and videos now come from cache, and the site's own scroll-in animations start fresh
    await page.evaluate(() => { try { history.scrollRestoration = 'manual'; } catch {} });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
    // Chrome restores the old scroll position on reload; snap back to the top before recording starts
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); document.documentElement.style.scrollBehavior = ''; });
    await warmVideos(page, site.name, 45000);
    await page.evaluate(() => document.querySelectorAll('video').forEach(v => { v.muted = true; if (v.getBoundingClientRect().height > 0) v.play().catch(() => {}); }));
    await page.waitForTimeout(1200);
    if (await page.evaluate(() => scrollY) > 0) await page.evaluate(() => scrollTo(0, 0));
    if (site.settle) await page.waitForTimeout(site.settle);   // let the site's own preloader finish
    if (MOBILE && site.mobileStartY) {   // begin the recording already scrolled to the real content
      await page.evaluate(y => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, y); }, site.mobileStartY);
      await page.waitForTimeout(400);
    }
  }
  const trimStart = (Date.now() - t0) / 1000;        // seconds of loading + warm-up to cut off the front
  // The recorded pass is exactly the LAST `window` seconds of the video. Builders use (duration - window),
  // which stays correct even when the recorder drops time during a static preloader.
  const window = (((MOBILE && site.mobileHold) || site.hold || HOLD) + ((MOBILE && site.mobileScroll) || site.scroll || SCROLL) + TAIL) / 1000;

  // mobile: start the raw screencast now, so the file begins exactly at the hold (no trimming needed)
  let cast = null;
  if (MOBILE) cast = await startScreencast(ctx, page, site.name);

  await page.waitForTimeout((MOBILE && site.mobileHold) || site.hold || HOLD);
  const ms = (MOBILE && site.mobileScroll) || site.scroll || SCROLL;
  const startY = (MOBILE && site.mobileStartY) || 0;
  const max = await page.evaluate(([m, y0]) => Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight - y0, m)), [(MOBILE && site.mobileMaxScroll) || site.maxScroll || MAX_SCROLL, startY]);
  if (MOBILE) {
    // in-page scroll driven by requestAnimationFrame: one step per display frame, eased, smooth-scroll CSS disabled
    await page.evaluate(({ ms, max, y0 }) => new Promise(res => {
      document.documentElement.style.scrollBehavior = 'auto';
      const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const start = performance.now();
      (function step(now) { const p = Math.min(1, (now - start) / ms); scrollTo(0, y0 + ease(p) * max); if (p < 1) requestAnimationFrame(step); else res(); })(start);
    }), { ms, max, y0: startY });
  } else {
    // desktop: real mouse-wheel events (sites that set `scroll-behavior: smooth` or use a smooth-scroll
    // library ignore rapid scrollTo() calls). Eased, time-based, so the scroll takes exactly `ms`.
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const t0 = Date.now();
    let sent = 0;
    while (true) {
      const p = Math.min(1, (Date.now() - t0) / ms);
      const target = Math.round(ease(p) * max);
      if (target > sent) { await page.mouse.wheel(0, target - sent); sent = target; }
      if (p >= 1) break;
      await page.waitForTimeout(40);
    }
  }
  await page.waitForTimeout(TAIL);

  if (MOBILE) {
    const { seconds, fps } = await cast.finish(join(REC, `${site.name}.mp4`));
    await ctx.close();
    writeFileSync(join(REC, `${site.name}.json`), JSON.stringify({ trimStart: 0, window: seconds, url: site.url, fps }, null, 2));
    console.log(`done (${seconds.toFixed(1)}s at ~${fps.toFixed(0)} fps)`);
  } else {
    const video = page.video();
    await ctx.close();
    const dest = join(REC, `${site.name}.webm`);
    await video.saveAs(dest);
    await video.delete().catch(() => {});
    writeFileSync(join(REC, `${site.name}.json`), JSON.stringify({ trimStart, window, url: site.url }, null, 2));
    console.log(`done (trim ${trimStart.toFixed(1)}s)`);
  }
}
await browser.close();
