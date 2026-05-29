# parkerjackson.xyz

A simple, modern, Apple-inspired personal landing page — **password protected at the edge** so nothing is served until a visitor authenticates. Deploys on **Cloudflare Workers** (with Static Assets).

## What's here

```
public/
  index.html             The landing page
  styles.css             Styling (dark, glassy, Apple-inspired)
  _headers               Security headers
src/
  index.js               Edge password gate (the Worker, runs on every request)
wrangler.jsonc           Cloudflare Workers config
```

## How the password protection works

`wrangler.jsonc` sets `run_worker_first: true`, so `src/index.js` runs on **every** request before any static file is served. If the visitor isn't authenticated they only ever see a styled login page — the actual site is never sent over the wire. Once authenticated, the Worker serves the files in `public/` via the `ASSETS` binding.

A correct password sets a signed, HttpOnly, Secure session cookie (HMAC-SHA256, valid 14 days). The password itself is never stored in the cookie or the code — it lives only in an environment variable.

## Deploy on Cloudflare

This repo is wired for **Workers Builds** (`npx wrangler deploy`).

1. **Push to GitHub** (done if you're reading this there).
2. **Match the Worker name.** Open `wrangler.jsonc` and set `"name"` to match the Worker shown in your Cloudflare dashboard for this project. (Currently `parkerjackson-xyz` — rename if yours differs, otherwise a second Worker gets created.)
3. **Set the password.** In the dashboard: **your Worker → Settings → Variables and Secrets → Add**
   - `SITE_PASSWORD` = your chosen password *(add as a Secret / encrypted)*
   - *(optional)* `AUTH_SECRET` = any long random string used to sign session cookies. Falls back to `SITE_PASSWORD` if unset.
4. **Redeploy** so the variable is picked up (Deployments → Retry / push a new commit).
5. Attach your custom domain `parkerjackson.xyz` under the Worker's **Domains & Routes**.

> If `SITE_PASSWORD` is not set, the site safely returns a 503 instead of exposing itself.

### Changing the password later

Update `SITE_PASSWORD` in the dashboard and redeploy. Changing `AUTH_SECRET` (or the password, if you didn't set a separate secret) instantly invalidates all existing sessions, forcing everyone to log in again.

## Local preview

```bash
npm install -g wrangler
SITE_PASSWORD=test123 wrangler dev
```

Then open the printed local URL and log in with `test123`. (You can also put `SITE_PASSWORD` in a `.dev.vars` file for local runs.)

## Customizing the page

Edit `public/index.html` (copy/sections) and `public/styles.css` (colors live in the `:root` variables at the top). The login page's look is self-contained inside `src/index.js`.
