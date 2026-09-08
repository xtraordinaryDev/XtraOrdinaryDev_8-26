// Rebuild every blog page + the index + sitemap entries from blog/posts.json and blog/content/.
// Usage: npm run blog:build
import { buildAll } from './blog-lib.mjs';

buildAll();
