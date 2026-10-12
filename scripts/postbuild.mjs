// Post-build steps for static hosting:
// - 404.html: copies the prerendered /404 page to the root so static hosts
//   (GitHub Pages, Netlify, etc.) serve it for unknown URLs.
// - .nojekyll: stops GitHub Pages from running Jekyll over the output.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = 'dist/personal-website/browser';
const notFound = join(outDir, '404', 'index.html');

if (!existsSync(notFound)) {
  console.error(`postbuild: expected prerendered page at ${notFound}`);
  process.exit(1);
}

copyFileSync(notFound, join(outDir, '404.html'));
writeFileSync(join(outDir, '.nojekyll'), '');
console.log('postbuild: wrote 404.html and .nojekyll');
