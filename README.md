# parkerjackson.xyz

A simple, modern, Apple-inspired personal landing page — **password protected at the edge** so nothing is served until a visitor authenticates. Built to deploy on **Cloudflare Pages**.

## What's here

```
index.html               The landing page
styles.css               Styling (dark, glassy, Apple-inspired)
_headers                 Security headers for Cloudflare Pages
functions/_middleware.js Edge password gate (runs on every request)
```

## How the password protection works

`functions/_middleware.js` is a [Cloudflare Pages Function](https://developers.cloudflare.com/pages/functions/) that runs **before** any static file is served. If the visitor isn't authenticated, they only ever see a styled login page — the actual site is never sent over the wire.

On a correct password it sets a signed, HttpOnly, Secure session cookie (HMAC-SHA256, valid 14 days). The password itself is never stored in the cookie or the code — it lives only in an environment variable.

## Deploy to Cloudflare Pages

1. **Push this repo to GitHub** (already done if you're reading this there).
2. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git** and select this repository.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
4. Before the first deploy finishes — or right after — set the environment variable:
   - **Settings → Variables and Secrets → Add**
   - `SITE_PASSWORD` = your chosen password *(add it as a Secret / encrypted)*
   - *(optional)* `AUTH_SECRET` = any long random string, used to sign session cookies. If omitted, the password is used to sign them.
5. **Redeploy** so the new variable is picked up (Deployments → ⋯ → Retry deployment).
6. Point your custom domain `parkerjackson.xyz` at the Pages project under **Custom domains**.

> If `SITE_PASSWORD` is not set, the site safely returns a 503 instead of exposing itself.

### Changing the password later

Update `SITE_PASSWORD` in the dashboard and redeploy. Changing `AUTH_SECRET` (or the password, if you didn't set a separate secret) instantly invalidates all existing sessions, forcing everyone to log in again.

## Local preview

```bash
npm install -g wrangler
wrangler pages dev . --binding SITE_PASSWORD=test123
```

Then open the printed local URL and log in with `test123`.

## Customizing the page

Edit `index.html` (copy/sections) and `styles.css` (colors live in the `:root` variables at the top). The login page's look is self-contained inside `functions/_middleware.js`.
