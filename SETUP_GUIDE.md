# EnergyBee Backend — Setup Guide

> **Stack:** Express + TypeScript + PostgreSQL + Prisma + Better Auth
> **Architecture:** Modular layered (enterprise)
> **Last Updated:** 2026-03-30

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Initialization](#2-project-initialization)
3. [Install Dependencies](#3-install-dependencies)
4. [Project Structure](#4-project-structure)
5. [Environment Variables](#5-environment-variables)
6. [TypeScript Configuration](#6-typescript-configuration)
7. [Config Validation (Zod)](#7-config-validation-zod)
8. [Prisma Setup](#8-prisma-setup)
9. [Better Auth Configuration](#9-better-auth-configuration)
10. [Global Error Handling](#10-global-error-handling)
11. [Logging (Pino)](#11-logging-pino)
12. [Express Server Setup](#12-express-server-setup)
13. [Auth Middleware & Typed Request](#13-auth-middleware--typed-request)
14. [Module Pattern (Controller → Service → Route)](#14-module-pattern-controller--service--route)
15. [API Versioning](#15-api-versioning)
16. [Database Migration & Generation](#16-database-migration--generation)
17. [API Reference](#17-api-reference)
18. [Email Verification](#18-email-verification)
19. [Password Reset](#19-password-reset)
20. [Social Provider Setup (Google, Apple, Microsoft)](#20-social-provider-setup)
21. [Testing Setup (Vitest)](#21-testing-setup-vitest)
22. [Docker](#22-docker)
23. [Testing with cURL / Postman](#23-testing-with-curl--postman)
24. [Common Gotchas](#24-common-gotchas)

---

## 1. Prerequisites

| Tool       | Version  | Check Command        |
| ---------- | -------- | -------------------- |
| Node.js    | >= 18    | `node -v`            |
| npm        | >= 9     | `npm -v`             |
| PostgreSQL | >= 14    | `psql --version`     |
| Git        | any      | `git --version`      |
| Docker     | optional | `docker --version`   |

Create a PostgreSQL database before starting:

```sql
CREATE DATABASE energybee;
```

---

## 2. Project Initialization

```bash
mkdir energybee-backend && cd energybee-backend
npm init -y
```

**Critical:** Better Auth requires ESM. Open `package.json` and add:

```json
{
  "type": "module"
}
```

---

## 3. Install Dependencies

### Core

```bash
npm install express cors dotenv zod
npm install better-auth
npm install @prisma/client
```

### Enterprise Essentials

```bash
npm install helmet pino pino-http express-rate-limit
```

### Dev Dependencies

```bash
npm install -D typescript tsx prisma @types/express @types/cors @types/node
npm install -D vitest supertest @types/supertest pino-pretty
```

### Optional (only if using Apple Sign-In)

```bash
npm install jose
```

### Package Purpose

| Package              | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `express`            | HTTP framework                                   |
| `cors`               | Cross-origin requests (for mobile/web apps)      |
| `dotenv`             | Load `.env` variables                            |
| `zod`                | Request & config validation                      |
| `better-auth`        | Authentication (email/password, OAuth, sessions)  |
| `@prisma/client`     | Database ORM client                              |
| `helmet`             | Security HTTP headers (XSS, clickjacking, etc.)  |
| `pino` + `pino-http` | Structured JSON logging (fast, production-grade) |
| `express-rate-limit` | Rate limiting to prevent brute-force attacks      |
| `typescript`         | Type system                                      |
| `tsx`                | Run TypeScript directly (dev server)             |
| `prisma`             | CLI for migrations and schema management         |
| `vitest`             | Unit & integration testing                       |
| `supertest`          | HTTP assertion testing                           |
| `pino-pretty`        | Human-readable logs in development               |
| `jose`               | JWT signing for Apple client secret              |

---

## 4. Project Structure

```
energybee-backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── env.ts                  # Zod-validated environment variables
│   ├── lib/
│   │   ├── auth.ts                 # Better Auth instance
│   │   ├── prisma.ts               # Prisma client singleton
│   │   └── logger.ts               # Pino logger instance
│   ├── common/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # Session verification middleware
│   │   │   ├── error.middleware.ts  # Global error handler
│   │   │   └── rate-limit.middleware.ts
│   │   ├── errors/
│   │   │   └── app-error.ts        # Custom error classes
│   │   └── types/
│   │       └── express.d.ts        # Extended Express Request type
│   ├── modules/
│   │   └── user/
│   │       ├── user.controller.ts  # Handles HTTP req/res
│   │       ├── user.service.ts     # Business logic
│   │       ├── user.schema.ts      # Zod validation schemas
│   │       └── user.routes.ts      # Route definitions
│   ├── router.ts                   # API v1 router (aggregates all modules)
│   └── index.ts                    # Express server entry point
├── tests/
│   ├── setup.ts                    # Test setup file
│   └── modules/
│       └── user/
│           └── user.test.ts
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Why This Structure?

| Principle                     | How it's applied                                                         |
| ----------------------------- | ------------------------------------------------------------------------ |
| **Separation of concerns**    | Controllers handle HTTP, services handle logic, Prisma handles DB        |
| **Feature-based modules**     | Each feature (user, energy, billing, etc.) is self-contained             |
| **Shared common layer**       | Middleware, errors, types are reusable across all modules                 |
| **Testability**               | Services can be unit-tested without HTTP. Routes can be integration-tested |
| **Scalability**               | Adding a new feature = adding a new folder under `modules/`              |

### Adding a New Module

To add a new feature (e.g., `energy`), create:

```
src/modules/energy/
  ├── energy.controller.ts
  ├── energy.service.ts
  ├── energy.schema.ts
  └── energy.routes.ts
```

Then register it in `src/router.ts`.

---

## 5. Environment Variables

Create `.env` in the project root:

```env
# Server
PORT=3005
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/energybee?schema=public"

# Better Auth
BETTER_AUTH_SECRET="generate-a-min-32-char-secret-here"
BETTER_AUTH_URL="http://localhost:3005"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Apple OAuth
APPLE_CLIENT_ID=""
APPLE_TEAM_ID=""
APPLE_KEY_ID=""
APPLE_PRIVATE_KEY=""
APPLE_APP_BUNDLE_IDENTIFIER=""

# Microsoft OAuth
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
```

Generate `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Create `.env.example` with the same keys but empty values. **Never commit `.env` to git.**

---

## 6. TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts | pino-pretty",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "auth:generate": "npx @better-auth/cli generate",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "tsc --noEmit"
  }
}
```

> **Note:** `| pino-pretty` in the dev script formats JSON logs into human-readable output during development. In production, logs remain as JSON for log aggregators (Datadog, CloudWatch, etc.).

---

## 7. Config Validation (Zod)

This ensures the app **fails fast** at startup if any required env var is missing or invalid — instead of crashing at runtime when that var is first accessed.

Create `src/config/env.ts`:

```typescript
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3005),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),

  // Google OAuth (optional — empty string allowed if not using Google)
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),

  // Apple OAuth (optional)
  APPLE_CLIENT_ID: z.string().default(""),
  APPLE_TEAM_ID: z.string().default(""),
  APPLE_KEY_ID: z.string().default(""),
  APPLE_PRIVATE_KEY: z.string().default(""),
  APPLE_APP_BUNDLE_IDENTIFIER: z.string().default(""),

  // Microsoft OAuth (optional)
  MICROSOFT_CLIENT_ID: z.string().default(""),
  MICROSOFT_CLIENT_SECRET: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

**Usage everywhere in the app:**

```typescript
import { env } from "../config/env.js";

// Instead of: process.env.PORT (string | undefined)
// Use:        env.PORT (number — validated, typed, with default)
```

---

## 8. Prisma Setup

### 8.1 Initialize Prisma

```bash
npx prisma init
```

### 8.2 Define Schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  firstName     String?
  lastName      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]

  @@map("user")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("account")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verification")
}
```

> **Note:** `User`, `Session`, `Account`, and `Verification` are the four core tables required by Better Auth. The `firstName` and `lastName` fields are our custom additions.

### 8.3 Create Prisma Client Singleton

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

// Prevent multiple Prisma instances during hot reload in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 8.4 Run Migration

```bash
npx prisma migrate dev --name init
```

---

## 9. Better Auth Configuration

Create `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";

export const auth = betterAuth({
  // ─── Database ───────────────────────────────────────────
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ─── Email & Password Auth ─────────────────────────────
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  // ─── Custom User Fields ────────────────────────────────
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
        input: true,
      },
      lastName: {
        type: "string",
        required: true,
        input: true,
      },
    },
  },

  // ─── Session Config ────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh session daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // ─── Social Providers ──────────────────────────────────
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        firstName: profile.given_name,
        lastName: profile.family_name,
      }),
    },

    apple: {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: "", // See Section 20.2 for Apple JWT secret generation
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
      mapProfileToUser: (profile) => ({
        firstName: (profile as any).name?.firstName ?? "",
        lastName: (profile as any).name?.lastName ?? "",
      }),
    },

    microsoft: {
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET,
      tenantId: "common",
      mapProfileToUser: (profile) => ({
        firstName: (profile as any).givenName ?? "",
        lastName: (profile as any).surname ?? "",
      }),
    },
  },

  // ─── Trusted Origins (required for Apple) ──────────────
  trustedOrigins: ["https://appleid.apple.com"],
});
```

### About `mapProfileToUser`

Maps OAuth profile data into our custom `firstName` / `lastName` fields. Each provider returns names differently:

- **Google:** `given_name` and `family_name`
- **Apple:** `name.firstName` and `name.lastName`
- **Microsoft:** `givenName` and `surname`

---

## 10. Global Error Handling

### 10.1 Custom Error Class

Create `src/common/errors/app-error.ts`:

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Convenience factory functions
export const BadRequest = (msg: string) => new AppError(msg, 400);
export const Unauthorized = (msg: string) => new AppError(msg, 401);
export const Forbidden = (msg: string) => new AppError(msg, 403);
export const NotFound = (msg: string) => new AppError(msg, 404);
export const Conflict = (msg: string) => new AppError(msg, 409);
```

### 10.2 Error Handling Middleware

Create `src/common/middleware/error.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // ─── Zod Validation Errors ───────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation Error",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // ─── Known Operational Errors ────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // ─── Unknown / Programmer Errors ─────────────────────
  logger.error(err, "Unhandled error");

  res.status(500).json({
    error: env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message,
  });
}
```

### How to Use in Controllers

```typescript
import { NotFound, BadRequest } from "../../common/errors/app-error.js";

// In a controller — just throw. The middleware catches it.
throw NotFound("User not found");
throw BadRequest("Email is already in use");
```

---

## 11. Logging (Pino)

Create `src/lib/logger.ts`:

```typescript
import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  // In production, output raw JSON for log aggregators.
  // In development, pino-pretty (piped in npm dev script) handles formatting.
  ...(env.NODE_ENV === "production" && {
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});
```

### Usage Anywhere in the App

```typescript
import { logger } from "../lib/logger.js";

logger.info("Server started");
logger.info({ userId: "123" }, "User signed in");
logger.warn({ ip: req.ip }, "Rate limit approaching");
logger.error(err, "Database query failed");
```

### Why Pino Over Winston?

- **5x faster** — Pino uses worker threads for serialization
- **JSON by default** — production-ready for log aggregators (Datadog, CloudWatch, ELK)
- **`pino-pretty`** — readable dev output via pipe, not runtime overhead

---

## 12. Express Server Setup

Create `src/index.ts`:

```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./common/middleware/error.middleware.js";
import { apiRouter } from "./router.js";

const app = express();

// ─── Security Headers ─────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

// ─── Request Logging ──────────────────────────────────────
app.use(pinoHttp({ logger }));

// ─── Better Auth Handler ──────────────────────────────────
// IMPORTANT: This MUST come BEFORE express.json() middleware.
// Placing express.json() before this will cause auth API to hang.
app.all("/api/auth/*", toNodeHandler(auth));

// ─── Body Parsing ─────────────────────────────────────────
// MUST be placed AFTER the Better Auth handler above.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes (versioned) ──────────────────────────────
app.use("/api/v1", apiRouter);

// ─── Global Error Handler (must be last) ──────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
  logger.info(`Auth endpoints at http://localhost:${env.PORT}/api/auth/*`);
  logger.info(`API v1 at http://localhost:${env.PORT}/api/v1`);
});
```

### Verify Auth is Working

Start the server and hit:

```
GET http://localhost:3005/api/auth/ok
```

Should return a success response.

### Middleware Order (Critical)

The order of middleware matters. Here's why this order is used:

```
1. helmet()           → Security headers on every response
2. cors()             → Allow cross-origin before any route handling
3. pinoHttp()         → Log every incoming request
4. Better Auth        → Handle auth routes BEFORE body parsing
5. express.json()     → Parse JSON body for non-auth routes
6. API routes         → Your application routes
7. errorHandler       → Catch any errors thrown above
```

---

## 13. Auth Middleware & Typed Request

### 13.1 Extend Express Request Type

Create `src/common/types/express.d.ts`:

```typescript
import { User, Session } from "better-auth";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image: string | null;
        firstName: string | null;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      session?: {
        id: string;
        userId: string;
        token: string;
        expiresAt: Date;
      };
    }
  }
}
```

> This removes the need for `(req as any).user` — now `req.user` is properly typed everywhere.

### 13.2 Auth Middleware

Create `src/common/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../lib/auth.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = session.user as Express.Request["user"];
    req.session = session.session as Express.Request["session"];

    next();
  } catch (error) {
    next(error);
  }
}
```

### 13.3 Rate Limit Middleware

Create `src/common/middleware/rate-limit.middleware.ts`:

```typescript
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT_MAX,             // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Stricter limiter for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                    // 20 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later" },
});
```

---

## 14. Module Pattern (Controller → Service → Route)

This is the core pattern for every feature. Here's a complete example with the `user` module.

### 14.1 Zod Validation Schema

Create `src/modules/user/user.schema.ts`:

```typescript
import { z } from "zod";

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  image: z.string().url().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### 14.2 Service (Business Logic)

Create `src/modules/user/user.service.ts`:

```typescript
import { prisma } from "../../lib/prisma.js";
import { NotFound } from "../../common/errors/app-error.js";
import type { UpdateUserInput } from "./user.schema.js";

export class UserService {
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) throw NotFound("User not found");
    return user;
  }

  async updateUser(id: string, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw NotFound("User not found");

    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        // If firstName or lastName changed, update the composite name field too
        ...(data.firstName || data.lastName
          ? { name: `${data.firstName ?? user.firstName} ${data.lastName ?? user.lastName}` }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        image: true,
        emailVerified: true,
      },
    });
  }
}

export const userService = new UserService();
```

### 14.3 Controller (HTTP Layer)

Create `src/modules/user/user.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { userService } from "./user.service.js";
import { updateUserSchema } from "./user.schema.js";

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.user!.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await userService.updateUser(req.user!.id, data);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
```

### 14.4 Routes

Create `src/modules/user/user.routes.ts`:

```typescript
import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { userController } from "./user.controller.js";

const router = Router();

router.get("/me", requireAuth, (req, res, next) => userController.getMe(req, res, next));
router.patch("/me", requireAuth, (req, res, next) => userController.updateMe(req, res, next));

export default router;
```

### How It All Connects

```
Request → Route → Middleware (auth) → Controller → Service → Prisma → DB
                                         ↓
                                   Zod validates body
                                         ↓
                                   Service runs logic
                                         ↓
                                   Throws AppError if needed
                                         ↓
                              Error middleware catches it
```

---

## 15. API Versioning

Create `src/router.ts`:

```typescript
import { Router } from "express";
import { apiLimiter } from "./common/middleware/rate-limit.middleware.js";
import userRoutes from "./modules/user/user.routes.js";

export const apiRouter = Router();

// Apply rate limiting to all API v1 routes
apiRouter.use(apiLimiter);

// Register module routes
apiRouter.use("/users", userRoutes);

// As you add more modules:
// apiRouter.use("/energy", energyRoutes);
// apiRouter.use("/billing", billingRoutes);
```

### URL Structure

| Route                     | What handles it |
| ------------------------- | --------------- |
| `/api/auth/*`             | Better Auth (no versioning — auth is framework-level) |
| `/api/v1/users/me`        | User module     |
| `/api/v1/energy/...`      | Energy module (future) |
| `/health`                 | Health check    |

---

## 16. Database Migration & Generation

### First-Time Setup (run in order)

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Create and apply migration
npx prisma migrate dev --name init

# 3. Verify tables were created
npx prisma studio
```

### After Schema Changes

```bash
npx prisma migrate dev --name describe_your_change
```

### Alternative: Quick Sync (no migration file, good for prototyping)

```bash
npx prisma db push
```

---

## 17. API Reference

Better Auth auto-creates these endpoints under `/api/auth/`:

### 17.1 Sign Up (Email + Password)

```
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (200):**

```json
{
  "user": {
    "id": "clx...",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": false,
    "firstName": "John",
    "lastName": "Doe",
    "image": null,
    "createdAt": "2026-03-30T...",
    "updatedAt": "2026-03-30T..."
  },
  "session": {
    "id": "clx...",
    "userId": "clx...",
    "token": "abc...",
    "expiresAt": "2026-04-06T..."
  }
}
```

> **Note:** The `name` field is required by Better Auth's core schema. On the client side, set it to `"${firstName} ${lastName}"`.

### 17.2 Sign In (Email + Password)

```
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):** Same structure as sign-up (returns user + session).

**Response (401):** Invalid credentials.

### 17.3 Sign Out

```
POST /api/auth/sign-out
```

Requires the session cookie to be sent with the request.

### 17.4 Get Session

```
GET /api/auth/get-session
```

Returns the current session and user if authenticated, or `null`.

### 17.5 Social Sign-In

```
POST /api/auth/sign-in/social
Content-Type: application/json

{
  "provider": "google",
  "callbackURL": "/dashboard"
}
```

This returns a redirect URL. The user is sent to the provider's consent screen, then redirected back to:

```
GET /api/auth/callback/{provider}
```

#### ID Token Sign-In (for mobile apps)

If your mobile app already has a Google/Apple ID token (from native SDK), you can sign in directly without redirect:

```
POST /api/auth/sign-in/social
Content-Type: application/json

{
  "provider": "google",
  "idToken": {
    "token": "eyJhbG...",
    "accessToken": "ya29..."
  }
}
```

### 17.6 List Sessions

```
GET /api/auth/list-sessions
```

Returns all active sessions for the current user.

### 17.7 Revoke Session

```
POST /api/auth/revoke-session
Content-Type: application/json

{
  "token": "session-token-here"
}
```

---

## 18. Email Verification

### 18.1 Server Configuration

Update `src/lib/auth.ts` — add `emailVerification` config:

```typescript
export const auth = betterAuth({
  // ... existing config ...

  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // Replace with your email service (e.g., Resend, SendGrid, Nodemailer)
      // IMPORTANT: use void (do NOT await) to prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Verify your EnergyBee account",
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
      });
    },
    sendOnSignUp: true,
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // blocks login until verified
    // ... rest of config
  },
});
```

### 18.2 Verification Endpoint

Better Auth automatically handles:

```
GET /api/auth/verify-email?token=xxx
```

When the user clicks the link in their email, this endpoint verifies the token and sets `emailVerified: true`.

### 18.3 Request New Verification Email

```
POST /api/auth/send-verification-email
Content-Type: application/json

{
  "email": "john@example.com"
}
```

---

## 19. Password Reset

### 19.1 Server Configuration

Update `src/lib/auth.ts` — add `sendResetPassword` to `emailAndPassword`:

```typescript
emailAndPassword: {
  enabled: true,
  sendResetPassword: async ({ user, url, token }, request) => {
    // IMPORTANT: use void (do NOT await) to prevent timing attacks
    void sendEmail({
      to: user.email,
      subject: "Reset your EnergyBee password",
      html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
    });
  },
},
```

### 19.2 Request Password Reset

```
POST /api/auth/forget-password
Content-Type: application/json

{
  "email": "john@example.com",
  "redirectTo": "https://yourapp.com/reset-password"
}
```

The user receives an email with a link like:
`https://yourapp.com/reset-password?token=xxx`

### 19.3 Reset Password

```
POST /api/auth/reset-password
Content-Type: application/json

{
  "newPassword": "newSecurePassword456",
  "token": "token-from-url"
}
```

---

## 20. Social Provider Setup

### 20.1 Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URI:**
   ```
   http://localhost:3005/api/auth/callback/google
   ```
7. Copy **Client ID** and **Client Secret** to `.env`

### 20.2 Apple

> Apple does NOT support `localhost` or non-HTTPS URLs. You need a real domain with TLS for development (use ngrok or similar).

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Register an **App ID** with "Sign in with Apple" capability
4. Create a **Services ID** (this is your `APPLE_CLIENT_ID`)
5. Configure the Services ID:
   - **Domain:** `yourdomain.com`
   - **Return URL:** `https://yourdomain.com/api/auth/callback/apple`
6. Create a **Key** with "Sign in with Apple" enabled — download it
7. Note the **Key ID** and **Team ID**

For Apple, the client secret is a JWT that you generate. Add this helper and update the auth config:

```typescript
// src/lib/apple-secret.ts
import { importPKCS8, SignJWT } from "jose";
import { env } from "../config/env.js";

export async function generateAppleClientSecret(): Promise<string> {
  const privateKey = env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const key = await importPKCS8(privateKey, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60) // 6 months max
    .sign(key);
}
```

Then in `auth.ts`, generate the secret before creating the auth instance:

```typescript
const appleClientSecret = await generateAppleClientSecret();

export const auth = betterAuth({
  // ...
  socialProviders: {
    apple: {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: appleClientSecret,
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
      // ...
    },
  },
});
```

> Apple client secrets expire after **6 months** and must be regenerated.

### 20.3 Microsoft

1. Go to [Azure Portal > App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
3. Name: `EnergyBee`
4. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI: **Web** — `http://localhost:3005/api/auth/callback/microsoft`
6. After creation, go to **Certificates & secrets > New client secret**
7. Copy **Application (client) ID** and **Client secret value** to `.env`

---

## 21. Testing Setup (Vitest)

### 21.1 Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

### 21.2 Test Setup

Create `tests/setup.ts`:

```typescript
import { beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

beforeAll(async () => {
  // Use a test database — set DATABASE_URL in .env.test
  // or use prisma's test utilities
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### 21.3 Example Test

Create `tests/modules/user/user.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { UserService } from "../../../src/modules/user/user.service.js";

describe("UserService", () => {
  const service = new UserService();

  it("should throw NotFound for non-existent user", async () => {
    await expect(service.getUserById("non-existent-id")).rejects.toThrow(
      "User not found"
    );
  });
});
```

### Run Tests

```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

---

## 22. Docker

### 22.1 Dockerfile

Create `Dockerfile`:

```dockerfile
# ─── Build Stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# ─── Production Stage ────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 energybee

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

USER energybee

EXPOSE 3005

CMD ["node", "dist/index.js"]
```

### 22.2 Docker Compose (for local development)

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: energybee
      POSTGRES_PASSWORD: energybee_dev
      POSTGRES_DB: energybee
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    restart: unless-stopped
    ports:
      - "3005:3005"
    environment:
      DATABASE_URL: postgresql://energybee:energybee_dev@db:5432/energybee?schema=public
      NODE_ENV: production
    depends_on:
      - db

volumes:
  postgres_data:
```

### 22.3 .gitignore

Create `.gitignore`:

```
node_modules/
dist/
.env
*.log
coverage/
.DS_Store
cookies.txt
```

### Run with Docker

```bash
# Start database only (for local dev)
docker compose up db -d

# Start everything
docker compose up --build
```

---

## 23. Testing with cURL / Postman

### Sign Up

```bash
curl -X POST http://localhost:3005/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }' \
  -c cookies.txt
```

> The `-c cookies.txt` flag saves the session cookie for subsequent requests.

### Sign In

```bash
curl -X POST http://localhost:3005/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }' \
  -c cookies.txt
```

### Get Session (verify auth works)

```bash
curl http://localhost:3005/api/auth/get-session \
  -b cookies.txt
```

### Access Protected Route (API v1)

```bash
curl http://localhost:3005/api/v1/users/me \
  -b cookies.txt
```

### Update Profile

```bash
curl -X PATCH http://localhost:3005/api/v1/users/me \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Jane"}' \
  -b cookies.txt
```

### Sign Out

```bash
curl -X POST http://localhost:3005/api/auth/sign-out \
  -b cookies.txt
```

### Postman Setup

1. Import the endpoints above
2. In **Settings**, enable **"Automatically follow redirects"**
3. Under **Cookies**, ensure cookies from `localhost` are stored
4. For social sign-in, use the browser — OAuth redirects don't work well in Postman

---

## 24. Common Gotchas

### 1. `express.json()` placement

```
DO NOT place express.json() BEFORE the Better Auth handler.
It will cause auth API requests to hang indefinitely.
```

```typescript
// WRONG
app.use(express.json());
app.all("/api/auth/*", toNodeHandler(auth));

// CORRECT
app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json());
```

### 2. ESM is required

Better Auth does NOT support CommonJS. Your `package.json` must have:

```json
{ "type": "module" }
```

And all local imports must include the `.js` extension:

```typescript
// WRONG
import { auth } from "./lib/auth";

// CORRECT
import { auth } from "./lib/auth.js";
```

### 3. Express v4 vs v5 route syntax

```typescript
// Express v4
app.all("/api/auth/*", toNodeHandler(auth));

// Express v5
app.all("/api/auth/*splat", toNodeHandler(auth));
```

### 4. Do NOT `await` email-sending functions

Use `void` instead to prevent timing attacks that reveal whether an email exists:

```typescript
// WRONG
await sendEmail({ to: user.email, ... });

// CORRECT
void sendEmail({ to: user.email, ... });
```

### 5. Apple Sign-In requires HTTPS

Apple does not support `localhost` or `http://`. For local development, use a tunnel:

```bash
ngrok http 3005
```

Then update `BETTER_AUTH_URL` and Apple's redirect URI to the ngrok HTTPS URL.

### 6. The `name` field is required by Better Auth

Even though we use `firstName` and `lastName`, Better Auth's core schema requires a `name` field. On the client side, concatenate: `name: "${firstName} ${lastName}"`.

### 7. Cookie-based auth with mobile apps

If your mobile app can't handle cookies, use the ID token flow for social sign-in (Section 17.5). For email/password, the response includes the session token — store it and send it as a `Bearer` token or cookie in subsequent requests.

### 8. Always pass errors to `next()`

In controllers, always wrap async logic in try/catch and call `next(error)` — this lets the global error handler respond consistently:

```typescript
// WRONG — error becomes an unhandled promise rejection
async getMe(req: Request, res: Response) {
  const user = await userService.getUserById(req.user!.id);
  res.json(user);
}

// CORRECT
async getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.user!.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
}
```

### 9. Prisma hot-reload duplicate instances

In development with `tsx watch`, Prisma can create multiple client instances. The singleton pattern in `src/lib/prisma.ts` (Section 8.3) prevents this.

---

## Quick Start Checklist

```
[ ] 1. Clone repo and run `npm install`
[ ] 2. Copy `.env.example` to `.env` and fill in values
[ ] 3. Create PostgreSQL database (or run `docker compose up db -d`)
[ ] 4. Run `npx prisma generate`
[ ] 5. Run `npx prisma migrate dev --name init`
[ ] 6. Run `npm run dev`
[ ] 7. Test: GET http://localhost:3005/health
[ ] 8. Test: GET http://localhost:3005/api/auth/ok
[ ] 9. Test: POST sign-up with cURL (Section 23)
[ ] 10. Test: POST sign-in with cURL (Section 23)
[ ] 11. Test: GET /api/v1/users/me with cURL (Section 23)
```
