# Hidden Walnuts Website

A modern, full-featured Next.js website optimized for deployment on **Cloudflare Pages**.

---

## 🏢 Company Tagline

> “Designing Great Things for You”

**Optional Announcement:** _(blank for now)_

---

## 🛍️ TeePublic Store

T-shirts, tote bags, and more at our TeePublic store!

Each category will have a link and a “hero” picture (placeholder for now):
- **Celebrating Fine Art**
- **Poetry**
- **Nature**
- **Space**
- **Pickleball**
- **Patriotism**


---

## 📱 Social Media

- Most recent Instagram content from [@hiddenwalnuts](https://instagram.com/hiddenwalnuts)  
  _Uses `INSTAGRAM_APP_SECRET.ENV` for password_

**Social Media Links:**
- Pinterest: [HiddenWalnuts](https://pinterest.com/HiddenWalnuts)
- Instagram: [hiddenwalnuts](https://instagram.com/hiddenwalnuts)
- X: [HiddenWalnuts](https://x.com/HiddenWalnuts)

---

## 🔒 Admin Functionality

Admin functionality is only visible to website admins:
- Separate, non-obvious URL (not linked anywhere)
- Initial account: `admin`, password from `ADMIN_SECRET.ENV`

**Admin can:**
- Edit the company tagline content (including updating the tagline)
- Create/edit/delete TeePublic categories (e.g., Celebrating Fine Art)
- Add optional “hero” picture of a recent product in the TeePublic categories

---

## 🚀 Tech Stack

| Layer        | Tech                           | Notes |
|--------------|--------------------------------|-------|
| Frontend     | Next.js (TypeScript)           | Pages, components, dynamic routing
| Hosting      | Cloudflare Pages               | Edge-deployed, CI/CD with Git
| SSR Adapter  | `@cloudflare/next-on-pages`    | Required to run Next.js on Cloudflare
| API Logic    | Cloudflare Workers (preferred) | Use instead of `pages/api` for portability
| Images       | Cloudflare Images or R2        | Use `<img>` instead of `next/image`
| Payments     | Stripe (for custom shop)       | Secure payments

---

## 📁 Directory Overview

```
your-website-folder/
├── public/               # Static assets (favicon, logo, etc.)
├── src/
│   ├── pages/            # Next.js routing
│   ├── components/       # Reusable UI
│   ├── styles/           # Global + module CSS
│   ├── lib/              # Utilities (API calls, redirects)
│   ├── context/          # Global state (e.g., cart)
│   └── types/            # TypeScript interfaces
├── .vercel/output/       # Build artifacts used by Cloudflare
├── wrangler.toml         # Cloudflare Pages & Workers config
├── package.json          # NPM scripts and dependencies
├── tsconfig.json         # TypeScript settings
└── README.md             # You're here
```

---

## 🌐 Deployment: Cloudflare Pages

### 1. Install Required Packages
```bash
npm install @cloudflare/next-on-pages
```

### 2. Add Build Scripts
In `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "postbuild": "next-on-pages",
  "deploy": "wrangler pages deploy .vercel/output/static --project-name=hidden-walnuts"
}
```

### 3. Create `wrangler.toml`
```toml
name = "hidden-walnuts-site"
compatibility_date = "2025-04-29"

[build]
command = "npm run build"

[[plugins]]
name = "next-on-pages"
```

---

## 🛍️ Pages Overview

- `/` — Landing page
- `/products` — Highlights company products
- `/shop` — Custom shop UI
  - `/shop/[slug]` — Individual product pages
- `/support` — Support documentation for apps
- `/teepublic` — External link or redirect to TeePublic store

---

## ⚙️ Notes on Cloudflare Compatibility

- Avoid Node-only APIs (like `fs`, `crypto`)
- Prefer **Cloudflare Workers** for backend logic
- Use static assets or R2 instead of `next/image`
- Pages API routes (`pages/api`) are limited — use **Workers** for reliability

---

## 📦 Future Integration: Online Game

The 3D asynchronous multiplayer game will be integrated via a dedicated route (`/game`) and powered by **Cloudflare Durable Objects** and **R2** for asset storage. That scaffold is separate and will plug into this structure.

---

## ✅ Status
- [x] Initial scaffold complete
- [ ] Product catalog setup
- [ ] Shop components wired to Stripe
- [ ] App support page content
- [ ] TeePublic redirect working
- [ ] Game integration (later)

---

## 🧠 Tips
- Use **modular components** and `Layout.tsx` to standardize page structure.
- Configure environment variables in Cloudflare Dashboard or via `.env` for local testing.
- Use [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) for lightweight serverless logic where Workers aren't needed.

---

## ⚙️ Notes
- Environment variables (e.g., `INSTAGRAM_APP_SECRET.ENV`, `ADMIN_SECRET.ENV`) are ignored by git for security.
- Social media and admin credentials are never committed to the repository.
- Placeholder images and links are used for now; update as needed.

---

Built with 🥥 by Hidden Walnuts 