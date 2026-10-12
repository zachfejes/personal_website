# Personal Website: zachfejes.com

My personal website: a portfolio of projects and interactive write-ups, plus my resume.
See [PROJECT.md](PROJECT.md) for the full plan.

Built with Angular, prerendered to static HTML.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm start            # dev server at http://localhost:4200
npm test             # unit tests (watch mode)
npm run lint
npm run format       # Prettier
```

## Builds and environments

| Command                 | Configuration | Served from                                   | Indexed |
| ----------------------- | ------------- | --------------------------------------------- | ------- |
| `npm run build:dev`     | `development` | local                                         | no      |
| `npm run build:staging` | `staging`     | https://zachfejes.github.io/personal_website/ | no      |
| `npm run build`         | `production`  | https://zachfejes.com                         | yes     |

Output goes to `dist/personal-website/browser/`. Per-environment settings live in
`src/environments/`, and per-environment `robots.txt` files in `src/robots/`.

## Deployment

- **Staging:** every push to `master` runs `.github/workflows/deploy-staging.yml`, which checks
  formatting, lints, tests, builds, and deploys to GitHub Pages. Pull requests run the same checks
  without deploying.
- **Production:** not set up yet (milestone 8 in `PROJECT.md`).
