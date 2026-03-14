# SSO Identity Provider

JWT-based Single Sign-On IdP with OTP email verification, refresh token rotation, and session management.

## Requirements

- Node.js >= 18
- PostgreSQL >= 14

## Setup

```bash
npm install
```

Create `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sso_db"
JWT_SECRET="change-me-to-a-long-random-string"
PORT=3000
```

Run migrations and (optionally) seed an admin user:

```bash
npm run db:migrate
npm run seed
```

## Development

```bash
npm run dev
```

Server starts at `http://localhost:3000`.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/otp` | — | Request OTP (sent to email) |
| POST | `/auth/verify-otp` | — | Verify OTP → returns tokens |
| POST | `/auth/login` | — | Login with password → returns tokens |
| POST | `/auth/refresh` | — | Rotate refresh token |
| POST | `/auth/logout` | — | Revoke session |
| GET | `/auth/profile` | Bearer | Current user from access token |
| GET | `/sessions/:id` | — | Session details |

## Admin CLI

```bash
npm run cli -- <command>

# User management
npm run cli -- user:list
npm run cli -- user:get admin@example.com
npm run cli -- user:verify user@example.com
npm run cli -- user:revoke user@example.com   # invalidates all tokens
npm run cli -- user:delete user@example.com

# Session management
npm run cli -- session:list user@example.com
npm run cli -- session:revoke <session-id>

# Maintenance
npm run cli -- otp:purge    # delete expired / used OTPs
npm run cli -- stats        # system-wide counts
```

## Test flow

Runs a full register → OTP → verify → refresh → logout cycle against a live server. Requires `psql` and `jq`.

```bash
chmod +x test-flow.sh
./test-flow.sh
```

## Useful commands

```bash
npm run db:studio    # Prisma Studio
npm run db:migrate   # Run pending migrations
npx prisma migrate reset   # Reset DB (dev only)
```
