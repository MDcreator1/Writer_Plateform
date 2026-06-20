# Deployment Guide

## 1. Provision Infrastructure

Use a Node.js host that supports Next.js App Router, such as Vercel, Railway, Render, Fly.io, or a containerized VPS. Provision PostgreSQL first and set `DATABASE_URL`.

## 2. Configure Secrets

Copy `.env.example` into your deployment environment and set:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- Razorpay, Stripe, PayPal keys as needed
- SMTP credentials for verification/reset emails
- CAPTCHA secret for production forms

Generate `AUTH_SECRET` with a cryptographically random 32+ byte value.

## 3. Install and Build

```bash
npm install
npm run prisma:generate
npm run build
```

## 4. Migrate Database

```bash
npx prisma migrate deploy
```

For first launch, seed default packages and demo story:

```bash
npm run seed
```

## 5. Payment Webhooks

Point payment webhooks to:

```text
https://your-domain.example/api/payments/webhook
```

Use provider-native signature verification before going live. The current route includes a simplified shared-secret check and the exact provider-specific checks should be enabled per account.

## 6. CDN and Media

Host cover images in a CDN bucket or image service and add the host to `next.config.mjs` `remotePatterns`.

## 7. Launch Checklist

- Run Lighthouse against `/` and `/read/ember-archive`
- Confirm `/robots.txt` and `/sitemap.xml`
- Verify auth cookies are secure in production
- Verify payment webhook signatures
- Verify admin routes are role-protected
- Confirm refund and wallet ledger reconciliation
- Configure monitoring for failed payments, unlock errors, and suspicious activity
