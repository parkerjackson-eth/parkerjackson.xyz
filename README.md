# parkerjackson.xyz

Personal website.

## Contents

| Path | What it is |
| --- | --- |
| `index.html` | The landing page served at the apex domain. Static, no build step. |
| `survivor/` | Survivor Fantasy League — a Next.js app for running a private fantasy league with friends. See [`survivor/README.md`](survivor/README.md) for setup and deployment. |

The two are independent. The landing page stays a single static file; the fantasy league
app is deployed separately (set the Vercel root directory to `survivor` and point a
subdomain at it).
