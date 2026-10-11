# Personal Website — Project Plan

A clean rebuild of my personal website: a portfolio of projects plus a resume / about-me section.

## Goals

- Show who I am and what I've built, quickly and clearly.
- Make it easy to add new projects without touching layout code.
- Fast, accessible, and good-looking on phone and desktop.
- Cheap to run: free static hosting, no server.

## Decisions

| Area | Choice | Notes |
| --- | --- | --- |
| Purpose | Portfolio + resume / about me | No blog for now; can be added later. |
| Framework | Angular (latest stable) | Standalone components, signals, Angular Router. |
| Rendering | Static prerendering (SSG) | Each route builds to its own HTML file, so GitHub Pages serves real pages and deep links work without a 404 redirect hack. |
| Hosting | GitHub Pages | Deployed by a GitHub Actions workflow on every push to `master`. |

## Site structure

| Route | Page | Content |
| --- | --- | --- |
| `/` | Home | Name, one-line intro, short summary, links to projects and resume, featured projects. |
| `/projects` | Projects | Grid of project cards (title, summary, tags, image). |
| `/projects/:slug` | Project detail | Write-up: problem, what I built, tech used, links (repo, live demo), screenshots. |
| `/about` | About / Resume | Bio, experience timeline, skills, education, downloadable PDF resume. |
| `/contact` (or footer) | Contact | Email and profile links (GitHub, LinkedIn). No form, so no backend needed. |

## Content model

Content lives as data files in the repo so adding a project is a content change, not a code change.

- `src/content/projects/*.json` (or Markdown with front matter): `slug`, `title`, `summary`, `tags`, `date`, `image`, `repoUrl`, `liveUrl`, `featured`, `body`.
- `src/content/resume.json`: experience, skills, education.
- `public/resume.pdf`: downloadable resume.

Project slugs are read at build time so the prerenderer generates one page per project.

## Technical plan

- **Scaffold:** `ng new` with routing, SCSS, and SSR/prerendering enabled (static output only).
- **Styling:** SCSS with CSS custom properties for theme tokens; light and dark mode via `prefers-color-scheme`.
- **Components:** layout shell (header, nav, footer), project card, project grid, timeline, tag chip.
- **SEO:** per-route `<title>` and meta description via Angular `Title`/`Meta`; Open Graph tags; `sitemap.xml`.
- **Accessibility:** semantic landmarks, keyboard-navigable nav, sufficient contrast, alt text on all images.
- **Quality:** ESLint (angular-eslint), Prettier, unit tests for components with logic.
- **CI/CD:** GitHub Actions workflow — install, lint, test, build, upload `dist/.../browser` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`.
- **Base path:** if served at `zachfejes.github.io/personal_website/`, build with `--base-href /personal_website/`; if using a custom domain, keep `/` and add a `CNAME` file.

## Milestones

1. **Scaffold & deploy** — Angular app with a placeholder home page, deployed to GitHub Pages via Actions.
2. **Layout & theme** — header, nav, footer, typography, colors, dark mode.
3. **Projects** — content files, projects grid, project detail pages, prerendered per slug.
4. **About / Resume** — bio, experience timeline, skills, PDF download.
5. **Polish** — SEO tags, sitemap, accessibility pass, performance check (Lighthouse), favicon.
6. **Content** — write up the first set of projects and finalize the bio.

## Open questions

- Custom domain, or `zachfejes.github.io/personal_website/`?
- Which projects to feature first?
- Visual direction: minimal / typographic, or more graphic and colorful?
- Project write-ups in JSON or Markdown? (Markdown is nicer to write; needs a small build-time parser.)
- Anything from the old site worth carrying over (e.g. the Armada article)?
