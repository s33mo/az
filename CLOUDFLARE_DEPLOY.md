# Smart DNS Proxy - Cloudflare Pages Deployment

## 🚀 One-Click Deploy to Cloudflare Pages

**No second server needed!** Everything runs on Cloudflare's global network.

---

## Quick Deploy via Dashboard

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Connect to Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select your repository
4. Configure:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
5. Click **Save and Deploy**

### Step 3: Done! 🎉
Your DNS proxy is now live at: `https://your-project.pages.dev`

---

## Quick Deploy via CLI

```bash
# 1. Login to Cloudflare
wrangler login

# 2. Build and deploy
bun run deploy:pages
```

---

## What You Get

| Endpoint | Description |
|----------|-------------|
| `/dns-query` | DNS-over-HTTPS (DoH) endpoint |
| `/api/resolve?domain=example.com` | REST API for DNS queries |
| `/api/stats` | Statistics |
| `/api/config` | Configuration |
| `/api/rules` | Proxy rules |
| `/health` | Health check |

---

## How It Works

```
┌─────────────────┐
│   User Device   │
│                 │
│ DNS Setting:    │
│ your-site.pages.dev/dns-query
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Pages + Functions│
│                 │
│ • DNS Proxy     │
│ • DoH Server    │
│ • REST API      │
│                 │
│ (300+ locations)│
└─────────────────┘
```

**ALL domains return Cloudflare's anycast IP** → Traffic goes through Cloudflare!

---

## Configure Your Devices

### Browser (Chrome/Firefox/Edge)
1. Settings → Privacy → Security
2. Enable "Use secure DNS"
3. Add: `https://your-site.pages.dev/dns-query`

### Windows
```
Settings → Network → DNS → Add DoH
https://your-site.pages.dev/dns-query
```

### macOS
```
System Preferences → Network → DNS
Add custom DNS profile with DoH URL
```

### iOS
```
Settings → General → VPN & Device Management
Install DNS profile with DoH URL
```

### Android
```
Settings → Network → Private DNS
Hostname: your-site.pages.dev
```

---

## Custom Domain

1. Cloudflare Dashboard → Pages → Your Project → Custom Domains
2. Add: `dns.yourdomain.com`
3. Update DNS settings to use: `https://dns.yourdomain.com/dns-query`

---

## Files Structure

```
├── functions/           # Cloudflare Pages Functions
│   ├── dns-query/      # DoH endpoint
│   │   └── index.js
│   ├── api/            # REST API
│   │   ├── resolve.js
│   │   ├── stats.js
│   │   ├── config.js
│   │   ├── rules.js
│   │   └── logs.js
│   └── health.js       # Health check
├── src/                # Next.js frontend
│   └── app/
│       └── page.tsx    # Dashboard
└── wrangler.toml       # Cloudflare config
```

---

## Free Tier Limits

- **100,000 requests/day** (free)
- **Unlimited** with Workers Paid ($5/mo)

---

## Test Your Deployment

```bash
# Test DNS resolution
curl "https://your-site.pages.dev/api/resolve?domain=google.com"

# Test DoH
curl "https://your-site.pages.dev/dns-query?dns=AAABAAABAAAAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQAB"

# Health check
curl "https://your-site.pages.dev/health"
```

All domains return proxy IP: `104.16.132.229` (Cloudflare's anycast)
