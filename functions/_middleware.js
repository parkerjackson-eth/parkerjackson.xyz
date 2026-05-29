/**
 * Edge password gate for parkerjackson.xyz
 *
 * Runs on every request before any static asset is served, so the site is
 * protected the moment it's deployed. Nothing is returned to an unauthenticated
 * visitor except the login page.
 *
 * Configure these in the Cloudflare Pages dashboard:
 *   Settings -> Variables and Secrets
 *     SITE_PASSWORD  (required)  the password visitors must enter
 *     AUTH_SECRET    (optional)  random string used to sign the session cookie
 *
 * If AUTH_SECRET is not set, SITE_PASSWORD is used to sign the cookie.
 */

const COOKIE_NAME = "pj_session";
const SESSION_TTL = 60 * 60 * 24 * 14; // 14 days, in seconds

export const onRequest = async (context) => {
  const { request, env, next } = context;
  const password = env.SITE_PASSWORD;

  // Fail safe: if no password is configured, don't silently expose the site.
  if (!password) {
    return new Response(
      "Site is not configured. Set the SITE_PASSWORD environment variable in Cloudflare Pages.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const secret = env.AUTH_SECRET || password;
  const url = new URL(request.url);

  // Handle the login form submission.
  if (request.method === "POST" && url.pathname === "/__auth") {
    const form = await request.formData();
    const submitted = String(form.get("password") || "");

    if (timingSafeEqual(submitted, password)) {
      const token = await createToken(secret);
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/",
          "Set-Cookie": cookie(COOKIE_NAME, token, SESSION_TTL),
        },
      });
    }
    return loginResponse(true);
  }

  // Already authenticated? Let the request through to the static assets.
  const session = getCookie(request, COOKIE_NAME);
  if (session && (await verifyToken(session, secret))) {
    return next();
  }

  // Not authenticated — show the gate (don't leak the requested page).
  return loginResponse(false);
};

/* ----------------------------- token helpers ----------------------------- */

const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64url(new Uint8Array(sig));
}

async function createToken(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = String(expires);
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

async function verifyToken(token, secret) {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(sig, expected)) return false;

  const expires = parseInt(payload, 10);
  return Number.isFinite(expires) && expires > Math.floor(Date.now() / 1000);
}

function base64url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Constant-time string comparison to avoid leaking length/content via timing.
function timingSafeEqual(a, b) {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/* ----------------------------- cookie helpers ---------------------------- */

function cookie(name, value, maxAge) {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

/* ------------------------------- login page ------------------------------ */

function loginResponse(error) {
  return new Response(loginPage(error), {
    status: error ? 401 : 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<title>Parker Jackson</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✦</text></svg>" />
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--text:#f5f5f7;--dim:#a1a1a6}
  html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
  body{
    min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
    background:#050505;color:var(--text);overflow:hidden;padding:24px;letter-spacing:-0.01em;
  }
  .bg{position:fixed;inset:0;z-index:-1;overflow:hidden;filter:blur(90px) saturate(1.2)}
  .bg span{position:absolute;border-radius:50%;opacity:.5}
  .b1{width:55vw;height:55vw;top:-15%;left:-10%;background:radial-gradient(circle,#3a6df0,transparent 70%)}
  .b2{width:50vw;height:50vw;bottom:-20%;right:-12%;background:radial-gradient(circle,#b14bf4,transparent 70%)}
  .card{
    width:100%;max-width:380px;padding:44px 36px;text-align:center;
    background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
    border-radius:26px;backdrop-filter:blur(30px) saturate(180%);
    -webkit-backdrop-filter:blur(30px) saturate(180%);
    box-shadow:0 30px 80px rgba(0,0,0,0.5);
    animation:rise .7s cubic-bezier(0.22,1,0.36,1) both;
  }
  @keyframes rise{from{opacity:0;transform:translateY(20px) scale(.98)}to{opacity:1;transform:none}}
  .glyph{font-size:34px;margin-bottom:18px;opacity:.9}
  h1{font-size:25px;font-weight:600;letter-spacing:-0.02em;margin-bottom:6px}
  p.sub{color:var(--dim);font-size:15px;margin-bottom:28px}
  form{display:flex;flex-direction:column;gap:14px}
  input{
    width:100%;padding:15px 18px;font-size:16px;color:var(--text);
    background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);
    border-radius:14px;outline:none;transition:border-color .2s,background .2s;font-family:inherit;
  }
  input::placeholder{color:var(--dim)}
  input:focus{border-color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.09)}
  button{
    width:100%;padding:15px;font-size:16px;font-weight:600;color:#000;
    background:#fff;border:none;border-radius:14px;cursor:pointer;font-family:inherit;
    transition:transform .15s cubic-bezier(0.22,1,0.36,1),opacity .2s;
  }
  button:hover{opacity:.9;transform:translateY(-1px)}
  button:active{transform:scale(.98)}
  .error{
    color:#ff6b6b;font-size:14px;margin-top:4px;min-height:18px;
    animation:shake .4s ease;
  }
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
</head>
<body>
  <div class="bg" aria-hidden="true"><span class="b1"></span><span class="b2"></span></div>
  <main class="card">
    <div class="glyph">✦</div>
    <h1>Parker Jackson</h1>
    <p class="sub">This space is private. Enter the password to continue.</p>
    <form method="POST" action="/__auth">
      <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required />
      <button type="submit">Enter</button>
      <div class="error">${error ? "Incorrect password. Try again." : ""}</div>
    </form>
  </main>
</body>
</html>`;
}
