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
- **Registry** (`src/app/projects/registry.ts`, built in milestone 5): one entry per project with
  `slug`, `title`, `category`, `summary`, `tags`, cover `art`, `status`, `timeline` (when the work
  happened, by month; no end means ongoing), `posted` (publication date) and `page` (the lazy
  loader). The home page's cards, the `/projects` list and the project routes are all generated
  from it, so adding a project means one folder and one registry entry. The type system requires
  a timeline, posting date and page for anything published.
- **Status decides visibility:**
  - **published:** listed on `/projects` (newest first), first in line for the home page,
    routed and prerendered.
  - **coming-soon:** fills the home page's six slots that published projects leave free, in
    registry order; the rest stay hidden. It may already have a page in progress: that page is
    a preview, routed like a draft, while the card keeps saying "Coming soon".
  - **draft:** has a page that's being written. Routed in development and staging builds so it
    can be previewed, never in production, and never listed or linked.
- **Shared pieces are extracted on second use** (see [Code style](#code-style--conventions)), not
  planned up front. So far: the project card (home and `/projects`). Likely candidates once a
  second project needs them: a page shell (title, dates, reading width, contents), figure with
  caption, KaTeX equations, a D3 chart frame themed to the palette.
- **Charts:** D3, used mostly as a math library (scales, shapes, axes), with Angular rendering
  the SVG in templates. Charts draw at their container's real width, so text keeps its size on
  phones, and every chart has a data table for screen readers and the curious.
- **Equations:** KaTeX, rendered during prerendering. Its stylesheet is a separate file
  (`katex.css`) that only pages with equations link to. KaTeX's script still ships with each
  page that uses it (about 75 KB compressed on Armada); trimming that is part of milestone 8.
- **Design tuning:** a project page under active design keeps its adjustable values (layout,
  type, section bands, chart styling) in one settings file, e.g.
  `src/app/projects/armada-scaling/design.ts`. On development and staging builds the page shows
  a **Tune** panel (`src/app/dev/tuner/`) that edits those values live, remembers them in the
  browser, and can copy them as JSON. Pasting that JSON back into the settings file makes the
  changes permanent. Production never loads the panel.

Trade-off: writing prose in templates is a bit more verbose than Markdown. If a future project is mostly text, a Markdown-rendering component can be added later without changing this structure.

## Visual direction

Baseline settled in the Hero Tuner; exact values in [`design/hero-baseline.json`](design/hero-baseline.json).
The look is a warm "lamplit survey": Hearth's warmth with Field Notes' sense of intention.

- **Mood:** warm, inviting, cozy, with a sense of wonder.
- **Palette:** full-width sections alternating between three bands, defined as CSS custom properties;
  a section picks its band with a class (`band--dark`, `band--light`, `band--accent`).

  | Token        | Value     | Use                                                |
  | ------------ | --------- | -------------------------------------------------- |
  | Near-black   | `#141917` | Dark bands, hero                                   |
  | Off-white    | `#E6E0D2` | Light bands, reading                               |
  | Accent green | `#2F4B3C` | Accent bands, calls to action                      |
  | Highlight    | `#E3A857` | Amber: accent words, buttons, waypoints, the probe |
  | Text on dark | `#ECE5D6` | Body and headings on dark bands                    |
  | Muted        | `#AAA99A` | Secondary text, labels                             |
  | Starlight    | `#E9DCC4` | Star field                                         |
  | Hero tint    | `#3A2A1C` | Warm lamplight glow in the hero, at 15%            |

- **Typography** (self-hosted):
  - Display: Bricolage Grotesque 400, line height 0.96, tracking +0.005em, soft drop shadow.
  - Accent words: Instrument Serif italic, in the highlight color, at 1.06× the headline size.
  - Body: Manrope. Labels and nav: JetBrains Mono, uppercase, tracking 0.17em.
- **Fluid hero sizing:** headline line breaks are fixed by the copy; its size interpolates by hero
  width from 2.1rem at 320px to 3.6rem at 1440px, and shrinks rather than wraps if a line won't fit.
  The intro scales from 0.86rem to 1.4rem and wraps to the headline's width.
- **Hero:** full screen height (nav + hero fill the viewport). Animated star field with a survey
  trajectory threaded through real stars: waypoints, a dashed branch, and a probe drifting along
  the route. The route avoids the text, running beside it when there's room and above/below it
  when there isn't.
- **Grain:** film grain on every band (strength 0.34, 340px tile).
- **Depth:** bands cast soft shadows onto the band above (strength 0.27); corner radius 3px.
- **Motion:** scroll-reveal fade/slide-ins (IntersectionObserver), subtle hover effects on project
  cards, smooth anchor scrolling. Everything respects `prefers-reduced-motion`.
- **Fixed theme:** the alternating bands are the design, so there is no light/dark mode toggle.
- **Small screens:** the nav collapses into a menu button below 640px, and the hero eyebrow switches
  to "Field notes · world to workbench" when the full one would wrap.

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
| `/projects`         | Projects              | Grid of published project cards (art, title, summary, tags, dates).                                                                                        |
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

Data: `src/app/projects/armada-scaling/ships.json` holds the measured ships and the planned ships,
kept apart from the code that does the math. Each ship records its canon length (and, if
measured, its Armada model length), faction (Rebel Alliance, Galactic Empire, Galactic Republic or
Separatist Alliance (CIS)), era (Galactic Civil War Era or Clone Wars Era), where the canon and
measured numbers came from (ids into a shared `sources` list) and the date they were collected.
The build checks every entry and stops with a message naming the ship if anything is off. Edit
the file to add or correct a ship; the fits, numbers, equations and charts all follow.

Charts start on log axes, where the power law is a straight line and ships from 6 m fighters to
the 19 km Executor all stay readable; readers can switch to linear. The fits are compared by
average percentage error (with RMSE alongside), so the largest ships don't dominate the
comparison. The page's data reference lists every measurement source used in `ships.json`. A "How
the fitting works" section explains the method itself: ordinary least squares, how each curve is
turned into a straight-line fit, and the formulas for both error measures.

A "Why a power law?" section tests the choice of curve (`candidates.ts`). Eight forms (power,
logarithmic, quarter sine wave, logarithm through zero, levelling off, quadratic, cubic, and a
power law whose exponent drifts with size) are fitted to the same ships and scored on average
error and on leave-one-out error: each ship predicted by a fit made without it, which exposes
overfitting. The section also fits small and large ships separately, and charts each ship's
model length divided by the power fit's prediction to show the errors don't lean one way at any
size. All of it is computed from `ships.json` at build time.

Status (milestone 6, first version): the page is built as a preview on staging, with the three
charts, the calculator (canon length → model length), the XQ2 wireframes and the tuning panel.
Every number in the text is computed from the data; tests check them against the 2018 results.
That check found a typo in the original: the logarithmic fit is y = 31.84 ln(x) − 78.25, not
3.84 (the original's chart and error already used 31.84). Next: iterate on the design with the
tuner, then publish (posted date, card link, header link to `/projects`).

## Project backlog

Future write-ups to add after Armada Scaling. Tracking only: not scheduled yet. Topics double as
draft tags for the project registry.

| #   | Project                                 | Topics                                                                                                                    |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | The Mandalorian Cosplay                 | cosplay, CAD, 3D printing, fabrication, sewing, design, research, coding, electronics, props, Star Wars                   |
| 2   | Generic Graphing Library                | coding, software, Angular, TypeScript, graph theory, multi-purpose, tooling, GUI, HMI, utility, math                      |
| 3   | HI-SEAS Analog Mission                  | research, exploration, astronautics, space, physical, travel                                                              |
| 4   | HI-SEAS Photogrammetry                  | research, study, photography, photogrammetry, machine learning, space, experiment, data                                   |
| 5   | Mystery Novel                           | writing, fiction, science, detective, space, mystery                                                                      |
| 6   | Armada Electronic Conversion            | electronics, CAD, design, 3D printing, modeling, Star Wars, miniatures, tabletop, fabrication                             |
| 7   | Christmas Village                       | design, CAD, 3D printing, Christmas, miniatures                                                                           |
| 8   | Modular Cave Terrain                    | design, CAD, 3D printing, research, fabrication, OpenForge 2.0, Dungeons & Dragons, D&D, DnD, miniatures, tabletop, TTRPG |
| 9   | Hand Lamp                               | design, CAD, 3D printing, woodwork, fabrication, electronics                                                              |
| 10  | Kodiak Dropship Model                   | design, research, 3D printing, CAD, Mass Effect, space, spaceship, science fiction, miniature, model kit                  |
| 11  | Lavender Town Art                       | design, art, drawing, ink, perspective, exploration, Japan, Pokémon, creative                                             |
| 12  | Kyoto Art                               | design, art, drawing, ink, perspective, travel, exploration, Japan                                                        |
| 13  | Mew Carved Relief Art Piece             | design, CAD, 3D printing, art, fabrication, Pokémon                                                                       |
| 14  | Ornithopter Model                       | design, CAD, 3D printing, fabrication, mechanics, kinetic                                                                 |
| 15  | Pokémon Tissue Box Covers               | design, CAD, 3D printing, fabrication, Pokémon                                                                            |
| 16  | Soap Dish                               | design, CAD, 3D printing, fabrication                                                                                     |
| 17  | Tak Tile Set                            | board game, design, CAD, 3D printing, fabrication                                                                         |
| 18  | Spider's Clasp Dicebox                  | design, CAD, 3D printing, fabrication, Dungeons & Dragons, D&D, DnD, dice, tabletop, TTRPG                                |
| 19  | Portal Drawing Series                   | art, perspective, design, ink, illusion, creative                                                                         |
| 20  | Curvilinear Perspective Investigation   | research, books, exploration, art, history, math, design                                                                  |
| 21  | Untitled Art Nouveau Drawing            | research, art, design, ink, drawing, Art Nouveau, texture, motion                                                         |
| 22  | Inconsistent Perspective Drawing Series | art, perspective, illusion, creative, ink, design                                                                         |
| 23  | PADI Open Water Certification           | scuba, exploration, travel, learning, training                                                                            |
| 24  | PADI Advanced Open Water Certification  | scuba, exploration, travel, learning, training                                                                            |
| 25  | Running Training                        | running, training, fitness                                                                                                |

## Engineering workflow (milestone 4)

How changes land, set up in milestone 4. Day-to-day commands are in the README.

### Branching

- **Short-lived branches straight into `master`** (no `develop` branch): `feature/…`, `fix/…`,
  `content/…`, `chore/…`.
- Every change goes through a pull request and merges only once the required checks pass.
- `master` is what's deployed to staging; it's protected by a branch ruleset (no direct or force
  pushes).

### CI gates on pull requests

The **Checks** workflow (`.github/workflows/checks.yml`) runs these as separate jobs; all are
required by the ruleset:

1. **Format, lint, styles, spelling, types:** Prettier; ESLint with the type-aware
   typescript-eslint rule sets (no floating promises, no unnecessary conditions, no unsafe `any`),
   Angular rules (`OnPush` change detection) and template accessibility rules; Stylelint
   (`stylelint-config-standard-scss`, BEM class names); cspell over code, copy and docs (project
   words in `cspell.json`); TypeScript `strict` and Angular `strictTemplates`, checked for both the
   app and the tests.
2. **Unit tests:** Vitest.
3. **Build:** staging and production builds.
4. **Dependency audit:** `npm audit --omit=dev`, failing on high severity.
5. **Dependency review:** GitHub's review of new or changed dependencies on the PR.

Plus **CodeQL** (`codeql.yml`) code scanning on PRs, on `master`, and weekly. **Dependabot** opens
weekly update PRs for npm packages and GitHub Actions, which go through the same gates. Deploys
(`deploy-staging.yml`) run only on `master`.

**Branch ruleset on `master`** (in place; GitHub: Settings → Rules → Rulesets): require a pull request
before merging; require status checks to pass (the five Checks jobs and CodeQL); block force
pushes; restrict deletions.

### Dependency updates

Dependabot opens weekly update PRs (`.github/dependabot.yml`); they go through the same checks and
are merged like any other change. Closing one only skips that version: Dependabot offers the next
release when it comes out. Two kinds of update are ignored on purpose, because each has to wait for
something else to move first:

- **TypeScript major versions.** Angular supports a narrow TypeScript range (Angular 22 needs
  TypeScript 6.0.x), so a new TypeScript major breaks the build until an Angular release supports
  it. Take the TypeScript major as part of that Angular upgrade (`ng update` sets the version);
  minor and patch updates still come through.
- **`@types/node` major versions.** The site builds and runs on the Node version in `.nvmrc`
  (Node 24). Type definitions for a newer Node would let code compile against APIs that Node 24
  doesn't have, so the types stay on the same major as Node. Move them together when `.nvmrc`
  changes.

Remove a rule from the `ignore` list once what it waits for has happened.

### Later

- **Lighthouse CI** against the built site (performance, accessibility, SEO budgets) once there
  are real pages, from milestone 5 onward.
- **Coverage thresholds** for unit tests.
- Not planned: SonarCloud (mostly duplicates the above at this size) and pre-commit hooks (CI is
  the real gate).

## Code style & conventions

General rules we've agreed on. They're added to as we make decisions that apply beyond one change;
anything the linters already enforce isn't repeated here.

### Code

- **No magic values.** Give every number or string that encodes a decision a named constant, with
  a short comment when the name alone doesn't explain it (units in the name: `…Px`, `…Ms`).
  Group related values in a `const` object (`PROBE.trailStepPx`). Exceptions are values that are
  part of the arithmetic rather than a choice: `0`, `1`, `2` for halving or doubling, a formula's
  own coefficients (with a comment naming the formula).
- **Settings come from one place.** Design values live in the design tokens
  (`src/styles/_tokens.scss`) or, for the hero, in named constants traced to
  `design/hero-baseline.json`. Don't copy them into component code.
- **Generalize on second use.** Write a component, directive or helper for the place that needs it.
  It becomes shared (moved to `src/app/shared/`, with its own tests) only when a second use
  appears, even if both uses are in the same project page. Don't build shared pieces in advance.
- **Keep logic pure where it can be.** Geometry, parsing and data shaping go in plain functions
  with no DOM or Angular dependency, so they can be tested directly. Components and renderers
  stay thin: measure, call the pure functions, draw.
- **Pure refactors change no output.** When restructuring code that shouldn't change behavior,
  prove it: compare outputs or screenshots before and after.

### Tests

- **Test behavior, not implementation.** A test should only fail when something a user or caller
  would notice changes. For components, use Angular Testing Library and query the way a person
  would: by role, label or text, not CSS classes or component internals. For pure functions, test
  through the exported function with meaningful inputs.
- **No markup snapshots.** They fail on harmless changes and pass on broken behavior.
- **No magic values in tests either.** Name fixtures (`DESKTOP`, `PHONE`) and expected values
  (`FULLY_FADED`, `STEP_PX`). Prefer comparing a whole result (`toEqual([...])`) over checking a
  count and then an index.
- **Test calculations on known answers, not on the real data's results.** Feed a calculation
  inputs whose answer is known (points on an exact curve, a worked example done by hand) and
  check it gets that answer. Don't pin results computed from the site's real data: they change
  whenever the data does, and they only prove the code still gives what it gave before. Checks
  on the real data itself (unique names, positive lengths) are fine.
- **Shared components get tests when they become shared.** One-off code is tested where its logic
  is non-trivial (math, parsing, layout rules).

### Copy and docs

- Code, copy and docs pass cspell. Add real words (names, jargon) to `cspell.json`; fix typos.

## Milestones

1. ✅ **Scaffold & staging deploy:** Angular app with prerendering, environment configs, placeholder landing page, deployed to GitHub Pages.
2. ✅ **Design system:** tokens, fonts, color bands, header/nav/footer, scroll-reveal animations.
3. ✅ **Landing page:** long-scroll home with hero, featured projects, About and Contact. The
   featured-project summaries are drafts, to be written alongside each project's write-up.
4. ✅ **Engineering workflow:** set up the branching strategy, CI gates on pull requests and the
   branch ruleset described in [Engineering workflow](#engineering-workflow-milestone-4), and fix
   whatever the stricter checks flag. From here on, every change lands through a pull request;
   the project framework and Armada Scaling are the first real test of the branching strategy and
   of unit-testing special features (interactive charts, fits, math).
5. ✅ **Project framework:** project registry, `/projects` page, shared project card, routes and
   prerendering per slug. Article building blocks wait for a second project that needs them.
6. **Armada Scaling:** port the first project using the framework. _In progress: preview on
   staging, design iteration next._
7. **About / Resume:** bio, experience timeline, skills, PDF download.
8. **Polish:** SEO, sitemap, accessibility pass, Lighthouse performance check, favicon and social preview images.
   Trim the equation library: pages with math currently ship KaTeX's script (most of the Armada
   page's 83 KB compressed), though the equations are already rendered at build time. Options:
   render equations to static HTML at build time so no KaTeX code ships, or load it only where
   an equation changes in the browser.
9. **Production:** choose a host, connect the domain, add the production deploy workflow.

## Open questions

- Which production host? (Decide by milestone 9; nothing earlier depends on it.)
- Charting library: leaning D3, since the storytelling visuals above need custom drawing that
  Chart.js can't do.
- Which backlog projects to write up first, after Armada?

## Future ideas

Not scheduled. Revisit once the rest of the site is together.

- **Patched-conic trajectories in the star-field hero:** the hero's probe travelling along a curve
  between star waypoints is a favourite. Replace the current smooth spline (Catmull-Rom) with a
  physically plausible trajectory built from patched conics. Treat each waypoint star as a body
  with a sphere of influence, and stitch elliptical arcs (captured/orbital legs) and hyperbolic
  segments (flybys / gravity assists) together. Then animate the probe along them with
  Kepler-correct speed (faster near periapsis, slower far out).
