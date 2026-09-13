# AGENTS.md — Development Guidelines for VERIGRO

Welcome to the **VERIGRO** codebase. This guide is intended for AI agents and human developers collaborating on this project.

## 1. Project Overview
- **Name:** VERIGRO
- **Tagline:** Verify Products. Manage Stores. Shop Smarter.
- **Core Concept:** Scan barcode or upload product packaging images to instantly analyze ingredients, nutritional facts, health scores, eco-ratings, allergens, and healthier alternatives tailored for Indian consumers and retail stores.
- **Languages:** Dual Hindi & English UI copywriting.

## 2. Tech Stack & Architecture
- **Framework:** TanStack Start (full-stack SSR & server functions on top of Vite/Vinxi)
- **Routing:** TanStack Router (file-based routing under `src/routes/`). Root route is `src/routes/__root.tsx`.
- **Server Functions:** `createServerFn` from `@tanstack/react-start`. Defined in `src/lib/*.functions.ts`.
- **State & Data Fetching:** TanStack Query (`@tanstack/react-query`) with SSR hydration.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss" source(none);` in `src/styles.css`). Theme variables under `@theme inline`.
- **UI Components:** Radix UI primitives styled with Shadcn patterns in `src/components/ui/`.
- **Database & Auth:** Supabase (`@supabase/supabase-js`) with PostgreSQL and Row Level Security (RLS).
- **ORM / Migrations:** Drizzle ORM (`drizzle/schema.ts`, `drizzle/migrations/`).
- **Icons:** `lucide-react`.

## 3. Directory Conventions
```
nirakshan/
├── drizzle/              # Drizzle ORM migrations and schema
│   ├── migrations/       # SQL migrations (0000_nirikshan_core.sql)
│   └── schema.ts         # Schema definitions
├── public/               # Static public assets (favicons, robots.txt)
├── src/
│   ├── assets/           # Application images and media
│   ├── components/
│   │   └── ui/           # Radix/Shadcn design system components
│   ├── hooks/            # Custom React hooks (e.g. use-mobile)
│   ├── integrations/
│   │   ├── lovable/      # Lovable error tracking & integrations
│   │   └── supabase/     # Supabase client (client & server-side auth attacher)
│   ├── lib/              # Business logic, utilities, and server functions
│   ├── routes/           # TanStack Router file-based routes
│   │   ├── __root.tsx    # Root shell (Nav, Outlet, Toaster, HeadContent)
│   │   ├── index.tsx     # Landing page (hero, scanner preview, featured products)
│   │   ├── auth.tsx      # Authentication (login & signup with Supabase)
│   │   └── _authenticated/
│   │       ├── route.tsx # Authenticated layout guard
│   │       └── scan.tsx  # Interactive barcode & packaging scanner page
│   ├── routeTree.gen.ts  # Auto-generated TanStack Router tree
│   ├── router.tsx        # Router factory function
│   ├── server.ts         # SSR entry point with error handling
│   ├── start.ts          # Start instance & middleware configuration
│   └── styles.css        # Tailwind v4 styles & NIRIKSHAN scanner design tokens
├── supabase/
│   └── config.toml       # Local Supabase configuration
├── .env                  # Environment variables
├── components.json       # Shadcn UI configuration
├── drizzle.config.ts     # Drizzle Kit configuration
├── eslint.config.js      # Flat ESLint configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite & TanStack Start build configuration
```

## 4. Key Rules for Agents
1. **File-Based Routing:** Do not create Next.js style `pages/` or `app/` folders. All routes live in `src/routes/`.
2. **Server Functions vs Client Code:**
   - Server functions using `createServerFn` must import server-only packages (like `supabaseAdmin`) safely.
   - Client code imports `supabase` from `@/integrations/supabase/client`.
3. **Tailwind v4:** We use Tailwind CSS v4. Do not recreate `tailwind.config.js`. Theme tokens, fonts, and utilities are defined in `src/styles.css`.
4. **Error Boundaries:** The app uses custom error capture in `src/lib/error-capture.ts` and `src/lib/error-page.ts` for clean SSR recovery.
5. **Path Aliases:** Always use `@/` to import from `src/`.
