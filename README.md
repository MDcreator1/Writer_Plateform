# Velora Fiction

A production-oriented Next.js platform for a professional fiction writer: premium story marketplace, protected chapter reader, coin wallet, paid unlocks, auth flows, admin dashboard, PostgreSQL/Prisma schema, payment adapters, SEO routes, and deployment docs.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS and Framer Motion
- PostgreSQL with Prisma ORM
- JWT cookie sessions, bcrypt password hashing, OTP/email verification tables
- Razorpay, Stripe, and PayPal-ready payment adapter layer

## Local Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

For a real database:

```bash
npx prisma migrate dev --name init
npm run seed
```

## Important Routes

- `/` story marketplace, hero, library, coins, feedback, FAQ, footer policies
- `/read/ember-archive` premium chapter reader with locks and watermark deterrence
- `/dashboard` user wallet, purchases, history, favorites, and security state
- `/admin` story, user, wallet, payment, analytics, refund, and protection consoles
- `/auth` signup/login/security flow preview

## API Surface

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/password-reset`
- `POST /api/auth/otp/verify`
- `GET|POST /api/stories`
- `GET|POST /api/coins/packages`
- `POST /api/wallet/checkout`
- `GET /api/wallet/transactions`
- `POST /api/chapters/:chapterId/unlock`
- `GET /api/chapters/:chapterId/secure-content`
- `POST /api/payments/webhook`
- `POST /api/admin/refunds`
- `POST /api/comments`
- `POST /api/ratings`
- `POST /api/bookmarks`
- `POST /api/reading-history`
- `POST /api/newsletter`

## Production Notes

The app is intentionally environment-driven. Without live payment keys it returns mock checkout payloads, making previews safe. With environment variables configured, providers can be switched to live flows.
