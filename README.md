# Personal Website: zachfejes.com

My personal website: a portfolio of projects and interactive write-ups, plus my resume.
See [PROJECT.md](PROJECT.md) for the full plan.

Built with Angular, prerendered to static HTML.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm start              # dev server at http://localhost:4200
npm test               # unit tests (watch mode)
npm run check          # everything CI checks: format, lint, styles, spelling, types, tests, builds
```

Individual checks: `npm run format:check`, `lint`, `lint:styles`, `spellcheck`, `typecheck`,
`test:ci`, `build`, `build:staging`, `audit:prod`. `npm run format` fixes formatting.

New words the spell-checker doesn't know (names, jargon) go in the `words` list in `cspell.json`.

## Adding a project

Projects are listed in `src/app/projects/registry.ts`. Add an entry with `status: 'coming-soon'`
to announce it, then build its page in `src/app/projects/<slug>/` and switch it to `draft`
(viewable on staging at `/projects/<slug>`, never in production) and finally `published`, with
its timeline and posting date. See "Project pages" in `PROJECT.md`.

## Contributing workflow

- Every change goes through a pull request from a short-lived branch into `master`:
  `feature/…`, `fix/…`, `content/…` or `chore/…`.
- The **Checks** workflow (`.github/workflows/checks.yml`) runs on each pull request: formatting,
  ESLint (type-aware), Stylelint, spelling, type checking, unit tests, staging and production
  builds, `npm audit` and dependency review. **CodeQL** (`codeql.yml`) scans the TypeScript.
- A branch ruleset on `master` requires those checks to pass and blocks direct pushes.
- Dependabot opens weekly update PRs for npm packages and GitHub Actions.

## Builds and environments

| Command                 | Configuration | Served from                                   | Indexed |
| ----------------------- | ------------- | --------------------------------------------- | ------- |
| `npm run build:dev`     | `development` | local                                         | no      |
| `npm run build:staging` | `staging`     | https://zachfejes.github.io/personal_website/ | no      |
| `npm run build`         | `production`  | https://zachfejes.com                         | yes     |

Output goes to `dist/personal-website/browser/`. Per-environment settings live in
`src/environments/`, and per-environment `robots.txt` files in `src/robots/`.

## Deployment

- **Staging:** every merge to `master` runs `.github/workflows/deploy-staging.yml`, which builds the
  staging configuration and deploys it to GitHub Pages. The checks run on the pull request before
  the merge.
- **Production:** not set up yet (milestone 9 in `PROJECT.md`).
