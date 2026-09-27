# Math Game Monorepo

A modern full-stack monorepo for the **Math Game** application built with [Turborepo](https://turbo.build/), [Bun](https://bun.sh/), [Prisma ORM v7](https://www.prisma.io/), PostgreSQL, and Express.

---

## 🏗️ Architecture & Project Structure

This repository is structured as a Turborepo monorepo sharing a single Prisma v7 database package across applications.

```
mathGame/
├── apps/
│   └── be/                   # Express Backend API
│       ├── index.ts          # Server entrypoint (/check, /users)
│       └── package.json
├── packages/
│   ├── db/                   # Shared Prisma ORM v7 Package
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema (PostgreSQL)
│   │   ├── src/
│   │   │   ├── client.ts     # Singleton Prisma Client with @prisma/adapter-pg
│   │   │   └── index.ts      # Package exports
│   │   ├── scripts/
│   │   │   └── test-database.ts # Database verification script
│   │   └── prisma.config.ts  # Prisma v7 config loader
│   ├── ui/                   # Shared UI component library
│   ├── typescript-config/    # Shared tsconfig bases
│   └── eslint-config/        # Shared ESLint configurations
├── turbo.json                # Turborepo task pipeline
├── package.json              # Workspace root scripts
└── .env                      # Environment variables
```

---

## ⚡ Tech Stack

- **Monorepo Manager**: [Turborepo v2](https://turbo.build/repo)
- **Runtime / Package Manager**: [Bun v1.3](https://bun.sh/)
- **Database ORM**: [Prisma v7](https://www.prisma.io/) with `@prisma/adapter-pg`
- **Database**: PostgreSQL
- **Backend Framework**: [Express v5](https://expressjs.com/)
- **Language**: TypeScript v5 / v7

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (`v1.3+`)
- [Node.js](https://nodejs.org/) (`>= 24`)
- PostgreSQL database instance

### 1. Installation

Clone the repository and install workspace dependencies:

```bash
git clone https://github.com/neyaz14/Math-Game.git
cd Math-Game
bun install
```

### 2. Environment Setup

Create a `.env` file at the root of the project (or copy from `.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mathgame?schema=public"
```

### 3. Generate Prisma Client

Generate the Prisma v7 client into `packages/db/src/generated/prisma`:

```bash
bun run db:generate
```

### 4. Database Schema Migration / Push

Push the schema to your PostgreSQL database:

```bash
bun run db:push
```

### 5. Start Development Server

Start all applications and services in development mode with Turborepo:

```bash
bun run dev
```

Or run only the backend server:

```bash
bun --filter @repo/be dev
```

---

## 🛠️ Available Scripts

Run these scripts from the repository root:

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts all apps in watch/development mode via Turbo |
| `bun run build` | Builds all apps and packages |
| `bun run check-types` | Runs TypeScript type checking across all workspace packages |
| `bun run db:generate` | Generates the Prisma ORM v7 client |
| `bun run db:push` | Pushes the Prisma schema to the target database |
| `bun run db:migrate` | Runs database migrations in development |
| `bun run db:test` | Runs the database connection verification script |
| `bun run db:studio` | Opens Prisma Studio GUI to view/edit database records |

---

## 🌐 API Endpoints (`apps/be`)

The backend Express application runs on `http://localhost:3001` by default.

- `GET /check` — Server status & health check endpoint.
- `GET /users` — Fetches all user records from PostgreSQL via `@repo/db`.

---

## 📄 License

Private repository. All rights reserved.
