# Personal Website — Project Plan

A clean rebuild of my personal website: a portfolio of projects plus a resume / about-me section.

## Goals

- Show who I am and what I've built, quickly and clearly.
- Let each project be a rich, interactive write-up (charts, math, demos), not just text and images.
- Professional look with a distinctive visual identity and tasteful motion.
- Fast, accessible, and good-looking on phone and desktop.
- Static output that can be hosted anywhere.

## Decisions

| Area          | Choice                                                 | Notes                                                                                                 |
| ------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Purpose       | Portfolio + resume / about me                          | No blog for now; can be added later.                                                                  |
| Framework     | Angular (latest stable)                                | Standalone components, signals, Angular Router.                                                       |
| Rendering     | Static prerendering (SSG)                              | Each route builds to its own HTML file, so deep links work on any static host without redirect hacks. |
| Project pages | Code, not content                                      | Each project is its own lazy-loaded Angular component (see below).                                    |
| Environments  | Staging on GitHub Pages, production on a custom domain | Same build, different Angular build configuration (see below).                                        |

## Environments

Angular build configurations, each with its own `environment.*.ts` file:

| Config        | Where                                                 | Base href            | Settings                                                                                                                 |
| ------------- | ----------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `development` | `ng serve` locally                                    | `/`                  | No analytics, verbose errors.                                                                                            |
| `staging`     | GitHub Pages: `zachfejes.github.io/personal_website/` | `/personal_website/` | `noindex` meta tag and `robots.txt` disallow, so search engines don't index the dev copy. "Staging" badge in the footer. |
| `production`  | Custom domain, on a paid host                         | `/`                  | Canonical URLs, sitemap, analytics (if any), indexable.                                                                  |

Values that differ per environment (`siteUrl`, `baseHref`, `indexable`, `analyticsId`) live in the environment files. Code reads them instead of hard-coding URLs.

Deployment:

- **Staging:** GitHub Actions on every push to `master`: lint, test, `ng build --configuration staging`, deploy with `actions/deploy-pages`.
- **Production:** a separate workflow, triggered manually or by pushing a version tag (`v*`): `ng build --configuration production`, then deploy to the production host.
- Because the output is plain static files, the production host is interchangeable: Netlify, Vercel, Cloudflare Pages, a static bucket + CDN, or a VPS behind nginx. The only host-specific part is the deploy step in the production workflow.

## Project pages: code vs. content

Project write-ups like Armada mix prose with interactive charts, equations, and custom layouts. Markdown handles the prose well but gets awkward once a page needs live components, and Markdown-with-components (MDX-style) isn't well supported in Angular.

**Recommendation: treat each project as code, and keep a small metadata registry for listing them.**

- **One component per project:** `src/app/projects/<slug>/<slug>.page.ts`, lazy-loaded on its own route. The page can use any Angular code it needs: charts, sliders, canvas, 3D.
- **Shared building blocks** keep pages consistent and quick to write:
  - `<app-article>`: page shell with title, subtitle, date, reading width, and a table of contents.
  - `<app-section>`: a section with heading and anchor link, supporting the alternating color bands.
  - `<app-figure>`: an image or chart with a caption.
  - `<app-math>`: an equation, rendered with KaTeX at build time.
  - `<app-callout>`, `<app-code-block>`, `<app-footnote>` / `<app-references>`.
  - `<app-chart>`: a thin wrapper around a charting library (D3 or Chart.js), themed to the site palette.
- **Registry:** `src/app/projects/projects.registry.ts` lists each project's `slug`, `title`, `summary`, `tags`, `date`, `thumbnail`, `featured`, and `loadComponent`. The projects grid, the landing page's featured projects, routes, prerender paths, and the sitemap are all generated from this one list, so adding a project means adding one folder and one registry entry.

Trade-off: writing prose in templates is a bit more verbose than Markdown. If a future project is mostly text, a Markdown-rendering component can be added later without changing this structure.

## Visual direction

- **Mood:** warm, inviting, cozy, with a sense of wonder.
- **Grain:** every band has a subtle film-grain texture (a tiled noise overlay), with one site-wide strength setting.
- **Palette:** full-width sections alternating between three bands.
  - Near-black / charcoal (e.g. `#151515`) with off-white text.
  - Off-white / warm paper (e.g. `#F3F1EC`) with charcoal text.
  - Dark green accent (e.g. `#1E4D3A`) with off-white text, used for emphasis sections and calls to action.
  - Defined as CSS custom properties; a section picks its band with a class (`band--dark`, `band--light`, `band--accent`).
- **Typography:** professional pairing, self-hosted for performance, final pick still open. Candidates: Inter or IBM Plex Sans for body, with a refined serif such as Source Serif 4 or Fraunces for headings.
- **Motion:** scroll-reveal fade/slide-ins (IntersectionObserver), subtle parallax or hover effects on project cards, smooth anchor scrolling. Everything respects `prefers-reduced-motion`.
- **Fixed theme:** the alternating bands are the design, so there is no light/dark mode toggle.

## Project pages: visual storytelling

Project pages tell each project's story by weaving imagery and data together, in the style of
architectural presentation boards and editorial data visualization. Each page has its own look, but
draws from a shared visual vocabulary:

- **Maps and contours:** contour lines and terrain as backgrounds or as the subject itself, with
  routes, waypoints and annotations on top.
- **Annotated imagery:** photos, renders and diagrams labelled with hairline leader lines that end in
  small circles, and italic serif annotations.
- **Exploded and layered drawings:** isometric or axonometric breakdowns that show how something is
  put together, layer by layer.
- **Process diagrams:** steps connected by arrows and dashed paths, on grainy paper.
- **Flowing data:** Sankey-like streams and arcs, mostly in muted tones, with the key thread picked
  out in a single warm accent.
- **Instrument readouts:** HUD-style stats, dials and scale bars that frame the data.
- **Timelines:** nodes on a line, for project histories.
- **Scrollytelling:** a sticky figure that changes as the reader scrolls through the narrative steps.

These become reusable building blocks (alongside the article blocks above), drawn with SVG, Canvas
and D3, so they can be animated and made interactive. Reference boards: RENON map, topographic site
model, rover HUD, Race to Treat Global Diseases, recycled ceramic process diagram, Barajeel museum
axonometric, Air Pollution Sources, High-Rise Zoo, misty company timeline, particle sphere.

## Site structure

| Route               | Page                  | Content                                                                                                                                                    |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | Landing (long scroll) | Hero (name, title, one-liner) → short intro → featured projects → experience highlights → skills → contact call to action. Sections alternate color bands. |
| `/projects`         | Projects              | Grid of project cards (thumbnail, title, summary, tags).                                                                                                   |
| `/projects/:slug`   | Project write-up      | The project's own component (see above).                                                                                                                   |
| `/about`            | About / Resume        | Full bio, experience timeline, skills, education, downloadable PDF resume.                                                                                 |
| Footer (every page) | Contact               | Email, GitHub, LinkedIn. No form, so no backend needed.                                                                                                    |

## Technical plan

- **Scaffold:** `ng new` with routing, SCSS, and SSR/prerendering enabled (static output only).
- **Styling:** SCSS with CSS custom-property design tokens (colors, type scale, spacing).
- **Layout components:** header and nav (with a scroll-aware style change over dark/light bands), footer, band section, project card, project grid, timeline.
- **SEO:** per-route `<title>` and meta description via Angular `Title`/`Meta`; Open Graph tags; `sitemap.xml` and `robots.txt` generated per environment.
- **Accessibility:** semantic landmarks, keyboard-navigable nav, contrast checked for every band and text combination, alt text, accessible chart descriptions.
- **Quality:** ESLint (angular-eslint), Prettier, unit tests for components with logic.

## First project: Armada Scaling

Rebuild the old "Armada Scaling" write-up as the first project page and the reference example for the format.

- **Source:** the old React version is in git history at commit `36797de`, under `src/views/Armada/` and `src/config/armadaScaleData.js`.
- **Content:** background, the problem (the non-linear model scale in Star Wars: Armada), method, scatter plot of canon length vs. model length, log and power regression fits, results, references, and wireframe images.
- **Interactive:**
  - Scatter plot with hover labels for each ship.
  - Toggleable overlays for the log and power fits.
  - Possibly an input that predicts model size for a given canon length.
- **Port:** the chart data and regression helper (`linearRegression.js`) carry over as typed TypeScript. Equations move from MathJax to KaTeX.

## Milestones

1. **Scaffold & staging deploy:** Angular app with prerendering, environment configs, placeholder landing page, deployed to GitHub Pages.
2. **Design system:** tokens, fonts, color bands, header/nav/footer, scroll-reveal animations.
3. **Landing page:** long-scroll home with all sections (placeholder copy is fine).
4. **Project framework:** registry, projects grid, article building blocks, routing and prerendering per slug.
5. **Armada Scaling:** port the first project using the framework.
6. **About / Resume:** bio, experience timeline, skills, PDF download.
7. **Polish:** SEO, sitemap, accessibility pass, Lighthouse performance check, favicon and social preview images.
8. **Production:** choose a host, connect the domain, add the production deploy workflow.

## Open questions

- Which production host? (Decide by milestone 8; nothing earlier depends on it.)
- Final font pairing and exact palette values (decide in milestone 2 with visual mock-ups).
- Charting library: leaning D3, since the storytelling visuals above need custom drawing that
  Chart.js can't do.
- Which projects follow Armada?
