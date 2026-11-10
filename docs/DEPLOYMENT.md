# Deployment

The site is fully static. On every host, build with `npm run build` and serve the `dist/` directory with Node 20.

| Variable | Required | Example |
| --- | --- | --- |
| `VITE_SITE_URL` | recommended | `https://worldstream-tv.pages.dev` (canonical URLs, sitemap, OG tags) |
| `VITE_BASE` | GitHub project pages only | `/worldstream-tv/` |
| `VITE_REPO_URL` | optional | `https://github.com/you/worldstream-tv` (report and removal links) |
| `VITE_CONTACT_EMAIL` | optional | Removal request address shown on the legal page |

Unknown client-side routes (`/search`, `/local/:id`, `/sports/:sport`) need an SPA fallback. The config files below provide it. Prerendered routes are served as real files.

## Cloudflare Pages (primary)

1. Push the repository to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, then select the repo.
3. Framework preset: **None**. Build command: `npm run build`. Output directory: `dist`.
4. **Environment variables:** set `NODE_VERSION=20` and `VITE_SITE_URL=https://<project>.pages.dev`.
5. Click **Save and Deploy**. The site goes live at `https://<project>.pages.dev`.
6. Automatic deployments: every push to `main` deploys to production, and other branches get preview URLs. The scheduled data workflow pushes commits, which triggers redeploys automatically.

`public/_redirects` (SPA fallback and the `/bangladesh` redirect) and `public/_headers` (CSP, HSTS, caching) are copied into `dist/` and applied by Pages.

## Vercel

1. **Add New → Project**, then import the GitHub repo.
2. Vercel detects Vite. `vercel.json` already sets `npm run build`, `dist`, the rewrites and the security headers.
3. Add `VITE_SITE_URL=https://<project>.vercel.app` under **Settings → Environment Variables**.
4. Deploy. Pull requests get preview deployments automatically.

## Netlify

1. **Add new site → Import an existing project → GitHub**, then pick the repo.
2. `netlify.toml` sets the build command to `npm run build`, the publish directory to `dist` and Node 20, and adds the SPA redirect. `public/_headers` is applied too.
3. Set `VITE_SITE_URL=https://<site>.netlify.app` under **Site configuration → Environment variables**.
4. Deploy. Deploy previews are created for pull requests.

## GitHub Pages

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. Optional repository variables (**Settings → Secrets and variables → Actions → Variables**):
   - `SITE_URL`: defaults to `https://<owner>.github.io`
   - `BASE_PATH`: defaults to `/<repo>/`. Set it to `/` for a custom domain or a `<owner>.github.io` repo.
3. Push to `main`. `.github/workflows/deploy.yml` builds with the right base path and publishes the site. It also redeploys after each successful data sync.
4. Routing fallback: GitHub Pages has no rewrites. Every directory route is prerendered, and other routes are handled by `404.html`, which boots the app and renders the correct page. `.nojekyll` is written automatically.

## Local production check

```bash
npm run build
npm run preview        # http://localhost:4173
npm run test:e2e       # Playwright against the build
```

## After deploying

- Run **Actions → Sync catalog & check streams** once. Statuses then change from "Not yet checked" to real results.
- Submit `https://<site>/sitemap.xml` in Google Search Console.
- Serve the site over HTTPS only. All four hosts do this by default, and `_headers` and `vercel.json` add HSTS.
