# VERIGRO 🔍

> **Verify Products. Manage Stores. Shop Smarter.**

VERIGRO is an intelligent scanner and consumer intelligence web application designed to bring radical transparency to packaged consumer goods across India. By scanning barcodes or uploading packaging images, consumers and retailers instantly receive detailed nutritional insights, additive breakdowns, allergy alerts, health scores, and cleaner alternatives.

---

## ✨ Features

- 📷 **Smart Barcode & Image Scanner**: Instant barcode lookup or packaging photo analysis (OCR + AI recognition).
- 🏷️ **Indian Product Intelligence**: Database of everyday FMCG products (Maggi, Bournvita, Lay's, Amul Butter, Parle-G, Haldiram's Bhujia, Dabur Honey, Tata Salt, etc.).
- 📊 **Health & Eco Rating**: 0–100 health index score and eco-packaging rating for quick consumer decision making.
- ⚠️ **Allergen & Additive Warnings**: Clear flags for gluten, dairy, palm oil, refined sugars, preservatives, and artificial flavors.
- 💡 **Healthier Alternatives**: Suggests cleaner, healthier substitutes available in the Indian market.
- 🌐 **Bilingual (Hindi / English)**: Thoughtfully crafted interface designed for Indian users.
- 🔒 **User History & Authentication**: Supabase authentication with saved scan history.

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack SSR with Vite & Vinxi)
- **Routing**: [TanStack Router](https://tanstack.com/router) (Type-safe file-based routing)
- **State & Caching**: [TanStack Query](https://tanstack.com/query)
- **UI & Design**: React 19, [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com), [Lucide Icons](https://lucide.dev)
- **Backend & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Storage)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **Notifications**: Sonner Toasts

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended) or [Bun](https://bun.sh/)
- A Supabase project (or local Supabase CLI)

### 1. Clone & Install Dependencies

```bash
# Using npm
npm install

# Or using Bun
bun install
```

### 2. Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### 3. Run Database Migrations

Apply the initial schema and seed data located in `drizzle/migrations/0000_nirikshan_core.sql` via Supabase SQL Editor or:

```bash
npm run db:push
```

### 4. Start Development Server

```bash
# Using npm
npm run dev

# Or using Bun
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the Vite dev URL shown in terminal) to start scanning!

---

## 📁 Project Structure

```
nirakshan/
├── drizzle/              # Drizzle ORM migrations and schema
│   ├── migrations/       # SQL migrations (core tables & seed data)
│   └── schema.ts         # Drizzle schema definitions
├── public/               # Static assets & favicons
├── src/
│   ├── assets/           # Images & banners
│   ├── components/ui/    # Radix UI + Tailwind components
│   ├── hooks/            # Custom hooks
│   ├── integrations/     # Supabase & external client configs
│   ├── lib/              # Server functions, product logic, & utilities
│   ├── routes/           # TanStack Start file-based routes
│   │   ├── __root.tsx    # App shell & layout
│   │   ├── index.tsx     # Landing page
│   │   ├── auth.tsx      # Auth (Login / Sign Up)
│   │   └── _authenticated/
│   │       └── scan.tsx  # Scanner interface & product card
│   ├── router.tsx        # TanStack Router instance
│   ├── server.ts         # SSR entry point
│   ├── start.ts          # Start instance & middleware
│   └── styles.css        # Tailwind v4 styles
└── supabase/
    └── config.toml       # Local Supabase configuration
```

---

## 📄 License

MIT License © 2026 NIRIKSHAN.
