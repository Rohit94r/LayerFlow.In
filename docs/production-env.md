# Production environment URLs — LayerFlow

Use these exact values after your domain is live at [https://layerflow.dev](https://layerflow.dev).

Do **not** put Stripe keys yet — payments are disabled on the pricing page.

---

## Values you need

| Variable | Local | Production |
|----------|-------|------------|
| `WEB_URL` | `http://localhost:3000` | `https://layerflow.dev` |
| `API_URL` | `http://localhost:8787` | `https://api.layerflow.dev` |
| `BETTER_AUTH_URL` | `http://localhost:8787` | `https://api.layerflow.dev` |
| `CORS_ORIGINS` | `http://localhost:3000` | `https://layerflow.dev` |
| `NEXT_PUBLIC_API_URL` (frontend, later) | `http://localhost:8787` | `https://api.layerflow.dev` |

---

## Step by step

### 1. Point your domains

1. Open your domain registrar (wherever you bought `layerflow.dev`).
2. Add DNS for the website:
   - Type: `A` or `CNAME` as your host instructs
   - Name: `@` (or `www`)
   - Value: whatever your frontend host (e.g. Vercel) shows for a custom domain
3. Add DNS for the API:
   - Name: `api`
   - Type: `CNAME` or `A`
   - Value: your API host (e.g. Fly.io app hostname)
4. In the frontend host dashboard, set **primary domain** to `layerflow.dev` and redirect `www` if you use it.
5. Do **not** use the `*.vercel.app` URL in app config — only `https://layerflow.dev`.

### 2. Create Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create or select project **LayerFlow**.
3. **APIs & Services → OAuth consent screen** → External → fill app name + email → save.
4. Add yourself under **Test users** (until the app is verified).
5. **Credentials → Create credentials → OAuth client ID → Web application**.
6. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:8787`
   - `https://layerflow.dev`
   - `https://api.layerflow.dev`
7. Authorized redirect URIs:
   - `http://localhost:8787/api/auth/callback/google`
   - `https://api.layerflow.dev/api/auth/callback/google`
8. Copy **Client ID** → `GOOGLE_CLIENT_ID`
9. Copy **Client secret** → `GOOGLE_CLIENT_SECRET`

### 3. Generate secrets (run on your machine)

```bash
openssl rand -hex 32   # → BETTER_AUTH_SECRET
openssl rand -hex 32   # → PROVIDER_KEYS_KEK (different value)
```

### 4. Set frontend host env (website)

In your frontend project settings (e.g. Vercel → Project → Settings → Environment Variables):

| Name | Value |
|------|--------|
| (optional later) `NEXT_PUBLIC_API_URL` | `https://api.layerflow.dev` |

No Stripe variables. Domain is already `https://layerflow.dev` in code (`app/layout.tsx`, sitemap, robots).

### 5. Set API host env (backend)

In your API host (e.g. Fly secrets / dashboard):

```bash
DATABASE_URL=postgres://...          # Neon connection string
REDIS_URL=rediss://...               # Upstash Redis URL
BETTER_AUTH_SECRET=<from step 3>
BETTER_AUTH_URL=https://api.layerflow.dev
GOOGLE_CLIENT_ID=<from step 2>
GOOGLE_CLIENT_SECRET=<from step 2>
PROVIDER_KEYS_KEK=<from step 3>
WEB_URL=https://layerflow.dev
API_URL=https://api.layerflow.dev
CORS_ORIGINS=https://layerflow.dev
```

Leave these **unset** for now:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- R2 keys (optional)

### 6. Verify

1. Open [https://layerflow.dev](https://layerflow.dev) — site loads.
2. Open [https://layerflow.dev/pricing](https://layerflow.dev/pricing) — Basic/Pro show crossed price + ₹0; Advanced says Coming soon.
3. Open `https://api.layerflow.dev/health` — returns OK when API is deployed.
4. Google login uses redirect `https://api.layerflow.dev/api/auth/callback/google`.

---

## What you do **not** need yet

- Stripe / Razorpay / any payment gateway
- Billing webhooks
- Price IDs or checkout URLs

Pricing UI is free at launch on purpose.
