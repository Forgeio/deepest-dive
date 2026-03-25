# ⚔️ Deepest Dive

A 2D Zelda-like online RPG — Next.js 14 (App Router) + TypeScript + PostgreSQL.

## Features

- **Registration** — email, username, and password with server-side validation
- **Email verification** — 6-digit code sent via SMTP (Mailpit in dev)
- **Login / Logout** — DB-backed sessions with `httpOnly` cookies
- **Protected account page** — server-side session check, redirects to `/login` if unauthenticated
- **Security hardening** — Argon2id password hashing, timing-safe comparisons, rate limiting, security headers

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma |
| Password hashing | Argon2id |
| Email (dev) | Mailpit |
| Containerisation | Docker Compose |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### 1. Clone and install

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Edit .env — the defaults work with docker-compose as-is
```

### 3. Start services (PostgreSQL + Mailpit)

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Mailpit web UI (captured emails): [http://localhost:8025](http://localhost:8025).

## Project Structure

```
src/
├── app/
│   ├── api/auth/
│   │   ├── login/         POST — authenticate and set session cookie
│   │   ├── logout/        POST — destroy session and clear cookie
│   │   ├── register/      POST — create user + send verification email
│   │   ├── verify-email/  POST — verify 6-digit code
│   │   └── resend-verification/ POST — issue new code
│   ├── account/           Protected page (server component)
│   ├── login/
│   ├── register/
│   ├── verify-email/
│   ├── layout.tsx
│   ├── page.tsx           Landing page
│   └── globals.css
└── lib/
    ├── db.ts              Prisma client singleton
    ├── session.ts         Session create/read/delete helpers
    ├── validation.ts      Input validation rules (shared client + server)
    ├── email.ts           Nodemailer helper
    ├── rateLimit.ts       In-memory rate limiter
    └── csrf.ts            CSRF token utilities
prisma/
├── schema.prisma
└── migrations/
docker-compose.yml
```

## Security Notes

- Passwords hashed with **Argon2id** (64 MiB memory, 3 iterations)
- Verification codes stored as **SHA-256 hashes**; compared with `crypto.timingSafeEqual`
- Generic error messages prevent **account enumeration**
- **Rate limiting** on all auth endpoints (in-memory; swap for Redis in production)
- **Security headers** set via `next.config.ts` (CSP, X-Frame-Options, etc.)
- Sessions use `httpOnly; SameSite=Lax` cookies; rotated on login
2D Zelda-like online RPG
