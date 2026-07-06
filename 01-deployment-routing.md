# Module 01 — Deployment Routing (404 on Reload / Direct Link / New Tab)

## Objective
Eliminate the 404 on `/bulk` (and any other deep route) when reloaded,
opened directly, or opened in a new tab.

## Observed Defect
`theaxonapp.vercel.app/bulk` → `404: NOT_FOUND` (Code `NOT_FOUND`, ID
`bom1::swq2s-...`). This is the standard SPA-on-Vercel failure mode: a
client-side-routed app served without a rewrite rule. Direct requests for a
non-root path are looked up as literal files on the CDN and miss, even though
the route exists fine when reached via in-app navigation.

## Diagnostic Branch — confirm which applies, don't guess-apply both

**If Vite / CRA / plain React Router (react-router-dom) SPA:**
Add a root-level `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**If Next.js (pages or app router):**
A 404 on a route that exists in source is a build/deploy artifact problem,
not a rewrite problem. Check, in order:
1. The page file actually shipped in the last production deployment (check
   the Vercel deployment's file listing, not just local source).
2. It isn't excluded by `.vercelignore`.
3. There's no `output: 'export'` config paired with a dynamic route that's
   missing `generateStaticParams`.

## Acceptance Criteria
- Hard refresh on `/bulk`, `/cases/:id`, `/wallet/:address`, and any other
  deep route returns the app, not a 404 JSON page.
- Middle-click / ctrl-click opening any in-app link in a new tab loads
  correctly.
- No change to existing root-path (`/`) behavior.
