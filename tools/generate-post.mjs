// Draft one new blog post with Claude, validate it, add it to blog/posts.json + blog/content/,
// and rebuild the blog. Run by .github/workflows/weekly-blog-post.yml, which opens a pull request
// for human review – nothing is published until the PR is merged.
//
// Usage:
//   node tools/generate-post.mjs               # real run (needs ANTHROPIC_API_KEY)
//   node tools/generate-post.mjs --dry-run     # no API call; uses a stub post to test the pipeline
//   node tools/generate-post.mjs --topic "..." # override the topic queue
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { ROOT, CONTENT_DIR, SITE, loadPosts, savePosts, slugify, buildAll } from './blog-lib.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const topicArg = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'blog-config.json'), 'utf8'));
const TOPICS_FILE = path.join(ROOT, 'tools', 'topics.txt');
const today = new Date().toISOString().slice(0, 10);

/* ---------------- topic selection ---------------- */
// Peek at the next topic; it is only removed from the queue once a draft succeeds (see main).
function peekTopicFromQueue() {
  const lines = fs.readFileSync(TOPICS_FILE, 'utf8').split(/\r?\n/);
  const i = lines.findIndex((l) => l.trim() && !l.trim().startsWith('#'));
  return i < 0 ? null : lines[i].trim();
}
function removeTopicFromQueue(topic) {
  const lines = fs.readFileSync(TOPICS_FILE, 'utf8').split(/\r?\n/);
  const i = lines.findIndex((l) => l.trim() === topic);
  if (i >= 0) { lines.splice(i, 1); fs.writeFileSync(TOPICS_FILE, lines.join('\n')); }
}

/* ---------------- output schema ---------------- */
const PostSchema = z.object({
  title: z.string().describe('SEO title tag, 50-65 characters, ends with " | X-Traordinary"'),
  h1: z.string().describe('On-page headline, shorter than the title, no brand suffix'),
  kicker: z.string().describe('2-4 word category label, e.g. "Buyer\'s Guide", "How-To", "Case Study"'),
  description: z.string().describe('Meta description, 140-160 characters, plain sentence'),
  excerpt: z.string().describe('One or two sentences for the blog index card, max 200 characters'),
  read_minutes: z.number().int().describe('Estimated reading time in minutes'),
  body_html: z.string().describe('Article body as HTML fragment. Allowed tags: p, h2, h3, ul, ol, li, strong, em, a, blockquote. First paragraph gets class="lead". No h1, no images, no scripts, no inline styles.'),
  cta_h2: z.string().describe('Closing call-to-action headline, a question or short statement'),
  cta_text: z.string().describe('One or two sentences under the CTA headline'),
  cta_button: z.string().describe('2-4 word button label'),
});

/* ---------------- prompt ---------------- */
function systemPrompt(existingTitles) {
  return `You write the blog for ${cfg.business.name} (${cfg.business.url}), ${cfg.business.location}.
${cfg.business.description}

AUDIENCE: ${cfg.audience}

TONE: ${cfg.tone}

FACTS YOU MAY USE (and nothing beyond these about the company):
${cfg.approvedFacts.map((f) => '- ' + f).join('\n')}

HARD RULES:
${cfg.neverClaim.map((f) => '- ' + f).join('\n')}
- Length: ${cfg.targetWords.min}-${cfg.targetWords.max} words of body text.
- Structure: a "lead" paragraph that answers the question directly, then h2 sections (h3 inside where useful), lists where they genuinely help, and a short closing section. Write for a reader who will skim.
- Include 2 or 3 natural internal links from this list, using the label text or similar, only where they genuinely help the reader:
${cfg.internalLinks.map((l) => `  - <a href="${l.href}">${l.label}</a> – ${l.about}`).join('\n')}
- The author is ${cfg.business.author}; write in first person plural ("we") as the studio.
- Do not repeat these existing posts; link to one if it is relevant instead:
${existingTitles.map((t) => '  - ' + t).join('\n')}
- Output only the structured fields requested. The body must be valid HTML using only: p, h2, h3, ul, ol, li, strong, em, a, blockquote.`;
}

/* ---------------- validation (the human PR review is the real gate; this catches the obvious) ---------------- */
function validate(post, existing) {
  const problems = [];
  const text = post.body_html.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < cfg.targetWords.min - 100 || words > cfg.targetWords.max + 300) problems.push(`word count ${words} outside ${cfg.targetWords.min}-${cfg.targetWords.max}`);
  if (/<(script|style|img|iframe|h1)\b/i.test(post.body_html)) problems.push('disallowed tag in body (script/style/img/iframe/h1)');
  if (/\$\s?\d/.test(text)) problems.push('contains a dollar figure – our pricing must not appear');
  if (/\b\d{1,3}(\.\d+)?\s?%/.test(text)) problems.push('contains a percentage – likely an invented statistic');
  if (/\b(according to|a study|survey (found|shows)|research shows)\b/i.test(text)) problems.push('cites a study/survey – likely invented');
  const links = [...post.body_html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const internal = links.filter((h) => cfg.internalLinks.some((l) => l.href === h));
  if (internal.length < 1) problems.push('no internal links to service pages');
  const badLinks = links.filter((h) => !/^https?:/.test(h) && !cfg.internalLinks.some((l) => l.href === h) && !existing.some((p) => h === `${p.slug}.html`));
  if (badLinks.length) problems.push('links to pages that do not exist: ' + badLinks.join(', '));
  if (post.description.length < 110 || post.description.length > 175) problems.push(`meta description length ${post.description.length}`);
  if (post.title.length > 75) problems.push(`title too long (${post.title.length})`);
  return { problems, words };
}

/* ---------------- generation ---------------- */
async function draft(topic, existing) {
  if (DRY) {
    return {
      title: `${topic.slice(0, 48)} | X-Traordinary`,
      h1: topic, kicker: 'Dry Run', description: 'This is a dry-run stub post used to test the blog pipeline end to end without calling the Claude API. It will never be published.',
      excerpt: 'Dry-run stub post. Not for publication.', read_minutes: 5,
      body_html: '<p class="lead">' + 'Stub paragraph for pipeline testing. '.repeat(20) + '</p>\n<h2>Section</h2>\n' + ('<p>' + 'More stub text. '.repeat(30) + '</p>\n').repeat(6) + '<p>See our <a href="../website-redesign.html">website redesign service</a>.</p>',
      cta_h2: 'Stub CTA', cta_text: 'Stub CTA text.', cta_button: 'Contact us',
    };
  }
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: cfg.model,
    max_tokens: 16000,
    system: systemPrompt(existing.map((p) => p.title)),
    messages: [{ role: 'user', content: `Write the blog post for this topic:\n\n${topic}\n\nToday's date is ${today}.` }],
    output_config: { format: zodOutputFormat(PostSchema) },
  });
  if (response.stop_reason === 'refusal') throw new Error('Model refused: ' + JSON.stringify(response.stop_details));
  if (!response.parsed_output) throw new Error('Could not parse structured output');
  console.log(`tokens: in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);
  return response.parsed_output;
}

/* ---------------- main ---------------- */
const existing = loadPosts();
let topic = topicArg || peekTopicFromQueue();
const fromQueue = !topicArg && !!topic;
if (!topic) {
  // queue empty – ask Claude for one fresh, non-overlapping topic
  if (DRY) topic = 'Dry-run topic when the queue is empty';
  else {
    const client = new Anthropic();
    const r = await client.messages.parse({
      model: cfg.model, max_tokens: 2000,
      system: systemPrompt(existing.map((p) => p.title)),
      messages: [{ role: 'user', content: 'Propose ONE new blog post topic our audience would search for that does not overlap the existing posts. Return only the topic as a single sentence.' }],
      output_config: { format: zodOutputFormat(z.object({ topic: z.string() })) },
    });
    topic = r.parsed_output.topic;
  }
}
console.log('topic: ' + topic);

let post, check;
for (let attempt = 1; attempt <= 2; attempt++) {
  post = await draft(topic, existing);
  check = validate(post, existing);
  if (!check.problems.length || DRY) break;
  console.log(`attempt ${attempt} rejected: ${check.problems.join('; ')} – retrying`);
}
if (check.problems.length && !DRY) {
  fs.writeFileSync(path.join(ROOT, 'blog-draft-rejected.json'), JSON.stringify({ topic, post, problems: check.problems }, null, 2));
  console.error('Draft failed validation: ' + check.problems.join('; '));
  process.exit(1);
}

let slug = slugify(post.h1);
if (existing.some((p) => p.slug === slug)) slug += '-' + today;
const body = post.body_html.trim().replace(/^<p>(?!.*class=)/, '<p class="lead">');
fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.html`), body + '\n');
const entry = {
  slug, title: post.title, h1: post.h1, kicker: post.kicker, description: post.description, excerpt: post.excerpt,
  date: today, readMinutes: post.read_minutes, image: `${SITE}/images/logo.png`,
  cta: { h2: post.cta_h2, text: post.cta_text, button: post.cta_button, href: '../contact.html' },
  generated: true,
};
savePosts([entry, ...existing]);
if (fromQueue) removeTopicFromQueue(topic);
buildAll();

// summary for the pull request body
const summary = `## New blog post draft: ${post.h1}

**Topic:** ${topic}
**File:** \`blog/${slug}.html\` (content in \`blog/content/${slug}.html\`)
**Words:** ${check.words} · **Read time:** ${post.read_minutes} min
**Meta description:** ${post.description}

### Review checklist before merging
- [ ] Every claim about our company is true (facts are limited to \`tools/blog-config.json\`, but check anyway)
- [ ] No prices, invented statistics, or made-up client names
- [ ] Tone sounds like us; edit anything that sounds generic
- [ ] Internal links point to the right pages
- [ ] Title and meta description read well in a Google result

Merging this PR publishes the post (on the next deploy). Closing it discards the draft; the topic is removed from \`tools/topics.txt\` in this PR, so re-add it if you want it retried.
`;
fs.writeFileSync(path.join(ROOT, 'blog-draft-summary.md'), summary);
console.log('\n' + summary);
