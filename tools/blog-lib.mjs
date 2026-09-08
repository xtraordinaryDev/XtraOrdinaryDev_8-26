// Blog build library.
// Source of truth: blog/posts.json (metadata) + blog/content/<slug>.html (article body fragments).
// The page chrome (head, nav, footer, scripts) is read from previous-work.html at build time so
// blog pages always match the rest of the site.
import fs from 'node:fs';
import path from 'node:path';

export const SITE = 'https://x-traordinarydevelopment.com';
export const BIZ = `${SITE}/#business`;
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
export const POSTS_FILE = path.join(ROOT, 'blog', 'posts.json');
export const CONTENT_DIR = path.join(ROOT, 'blog', 'content');

export const AUTHOR = {
  '@type': 'Person',
  name: 'Xavier Thurman',
  url: `${SITE}/about.html`,
  jobTitle: 'Founder & Lead Engineer',
  worksFor: { '@id': BIZ },
};

const esc = (s) => String(s).replace(/&(?!amp;|#|lt;|gt;|quot;)/g, '&amp;');
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const read = (f) => fs.readFileSync(f, 'utf8');

export function loadPosts() {
  const posts = JSON.parse(read(POSTS_FILE));
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function savePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2) + '\n');
}

export function slugify(s) {
  // drop trailing "how to..." / parenthetical clauses, then cap at ~60 chars on a word boundary
  const base = s.split(/[:?(]/)[0];
  let slug = base.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length > 60) slug = slug.slice(0, 60).replace(/-[^-]*$/, '');
  return slug;
}

// ---------- site chrome, rewritten for the /blog/ subdirectory ----------
function chrome() {
  const src = read(path.join(ROOT, 'previous-work.html'));
  const up = (s) => s.replace(/(src|href|poster)="(?!https?:|mailto:|tel:|#|\/|\.\.\/)([^"]+)"/g, '$1="../$2"');
  const headTop = up(src.slice(0, src.indexOf('<title>')));
  const fontsAndCss = up(src.slice(src.indexOf('    <link rel="preconnect" href="https://fonts.googleapis.com">'), src.indexOf('    <script type="application/ld+json">')))
    .replace(/[ \t]*<link rel="preload" as="image" href="[^"]*">\r?\n/, '');
  const nav = up(src.slice(src.indexOf('    <!-- Previous work page header with overlay navigation -->'), src.indexOf('      <div class="inner-page-hero">')))
    .replace('<!-- Previous work page header with overlay navigation -->', '<!-- Blog header with overlay navigation -->')
    .replace('<a class="nav-link active" href="../previous-work.html">', '<a class="nav-link" href="../previous-work.html">');
  let footer = up(src.slice(src.indexOf('    <!-- Shared footer -->'), src.indexOf('    <!-- iOS Video Fix Script')))
    .replace('href="../blog/index.html"', 'href="index.html"');   // site-wide Blog link, made local to /blog/
  if (!/href="index\.html">Blog</.test(footer)) {
    footer = footer.replace(/([ \t]*)<li><a href="\.\.\/about\.html">About<\/a><\/li>/, (m, ind) => `${m}\n${ind}<li><a href="index.html">Blog</a></li>`);
  }
  const tail = src.slice(src.indexOf('    <script>\n      window.intercomSettings')).replace('src="js/cursor.js"', 'src="../js/cursor.js"');
  const scripts = `    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous"></script>
    <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
    <script src="../js/main.js"></script>
`;
  return { headTop, fontsAndCss, nav, footer, tail, scripts };
}

function head(c, { title, desc, url, image, ld, ogType }) {
  return `${c.headTop}<title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="${ogType}">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="X-Traordinary Development">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${image}">
${c.fontsAndCss}    <script type="application/ld+json">
    ${JSON.stringify(ld, null, 2).replace(/\n/g, '\n    ')}
    </script>
  </head>
  <body>
    <div class="cursor-dot" aria-hidden="true"></div>
    <div class="cursor-ring" aria-hidden="true"></div>


`;
}

const cta = (h2, text, btn, href) => `    <!-- Call to action -->
    <section class="bg-accent-yellow">
      <div class="container section-spacing-lg">
        <div class="row align-center-vertical">
          <div class="col-lg-7 col-md-8">
            <div class="section-header">
              <h2 class="mb-3">${esc(h2)}</h2>
              <p class="mb-4">${esc(text)}</p>
              <a class="btn_secondary" href="${href}">${esc(btn)}</a>
            </div>
          </div>
        </div>
      </div>
    </section>


`;

export function renderPost(c, p) {
  const url = `${SITE}/blog/${p.slug}.html`;
  const body = read(path.join(CONTENT_DIR, `${p.slug}.html`)).trim();
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', '@id': url, headline: p.title, description: p.description, url, mainEntityOfPage: url, image: p.image,
      datePublished: p.date, dateModified: p.dateModified || p.date, author: AUTHOR,
      publisher: { '@type': 'Organization', '@id': BIZ, name: 'X-Traordinary Development', logo: { '@type': 'ImageObject', url: `${SITE}/images/logo.png` } },
      isPartOf: { '@id': `${SITE}/blog/#blog` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog/` },
      { '@type': 'ListItem', position: 3, name: p.h1, item: url } ] },
  ] };
  return head(c, { title: p.title, desc: p.description, url, image: p.image, ld, ogType: 'article' }) + c.nav +
`      <div class="blog-hero">
        <div class="container">
          <p class="hero-kicker">${esc(p.kicker)}</p>
          <h1>${esc(p.h1)}</h1>
          <p class="post-meta">By <a href="../about.html">Xavier Thurman</a> · <time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.readMinutes} min read</p>
        </div>
      </div>
    </header>


    <!-- Article -->
    <article class="post">
      <div class="container section-spacing-lg">
        <div class="post-body reveal-on-scroll">
${body}
        </div>
        <p class="post-back"><a href="index.html">← All posts</a></p>
      </div>
    </article>


` + cta(p.cta.h2, p.cta.text, p.cta.button, p.cta.href || '../contact.html') + c.footer + c.scripts + c.tail;
}

export function renderIndex(c, posts) {
  const url = `${SITE}/blog/`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Blog', '@id': `${SITE}/blog/#blog`, name: 'X-Traordinary Development Blog', url,
      description: 'Plain-English guides on websites, custom software, and AI for business owners – from a Minneapolis development studio.',
      publisher: { '@id': BIZ },
      blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}.html`, datePublished: p.date, author: AUTHOR })) },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: url } ] },
  ] };
  const cards = posts.map((p) => `          <div class="col-lg-4 col-md-6 mb-4">
            <a class="post-card" href="${p.slug}.html">
              <p class="post-card-kicker">${esc(p.kicker)}</p>
              <h2 class="h4">${esc(p.h1)}</h2>
              <p>${esc(p.excerpt)}</p>
              <p class="post-meta"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.readMinutes} min read</p>
            </a>
          </div>`).join('\n');
  return head(c, { title: 'Blog: Websites, Custom Software & AI for Business | X-Traordinary', desc: 'Plain-English guides on website costs, WordPress vs custom code, software projects, and AI for business owners – from X-Traordinary Development in Minneapolis, MN.', url, image: `${SITE}/images/logo.png`, ld, ogType: 'website' }) + c.nav +
`      <div class="blog-hero">
        <div class="container">
          <p class="hero-kicker">Guides &amp; Case Studies</p>
          <h1>The X-Traordinary Blog</h1>
          <p class="post-meta">Straight answers on websites, custom software, and AI – written for business owners, not developers.</p>
        </div>
      </div>
    </header>


    <!-- Posts -->
    <section>
      <div class="container section-spacing-lg">
        <div class="row reveal-on-scroll">
${cards}
        </div>
      </div>
    </section>


` + cta('Have a question we should answer next?', 'If you are weighing a website or software decision and cannot find a straight answer, ask us. We may write the post – and we will definitely reply.', 'Ask a question', '../contact.html') + c.footer + c.scripts + c.tail;
}

export function updateSitemap(posts) {
  const file = path.join(ROOT, 'sitemap.xml');
  let sm = read(file);
  const entry = (loc, lastmod, cf, pr) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`;
  const today = new Date().toISOString().slice(0, 10);
  // blog index: refresh lastmod on every build
  if (sm.includes(`<loc>${SITE}/blog/</loc>`)) sm = sm.replace(new RegExp(`(<loc>${SITE.replace(/\./g, '\\.')}/blog/</loc>\\s*<lastmod>)[^<]*`), `$1${today}`);
  else sm = sm.replace('</urlset>', entry(`${SITE}/blog/`, today, 'weekly', '0.7') + '\n</urlset>');
  for (const p of posts) {
    const loc = `${SITE}/blog/${p.slug}.html`;
    if (!sm.includes(`<loc>${loc}</loc>`)) sm = sm.replace('</urlset>', entry(loc, p.dateModified || p.date, 'monthly', '0.7') + '\n</urlset>');
  }
  fs.writeFileSync(file, sm);
}

export function buildAll({ log = console.log } = {}) {
  const c = chrome();
  const posts = loadPosts();
  for (const p of posts) {
    const out = path.join(ROOT, 'blog', `${p.slug}.html`);
    fs.writeFileSync(out, renderPost(c, p));
    log(`built blog/${p.slug}.html`);
  }
  fs.writeFileSync(path.join(ROOT, 'blog', 'index.html'), renderIndex(c, posts));
  log('built blog/index.html');
  updateSitemap(posts);
  log('sitemap.xml updated');
  return posts;
}
